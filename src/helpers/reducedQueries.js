import stringify from 'json-stable-stringify';

const buildFieldName = (selection) => {
    if (!selection.arguments?.length) {
        return selection.name.value;
    }

    const variables = selection.arguments.reduce((result, { name, value }) => ({
        ...result,
        [name.value]: value.value,
    }), {});

    // The field names in apollo's in-memory-cache are built like this:
    //
    // someField
    // someField({"someParam":"someValue"})
    //
    // If there are multiple variables, they are sorted alphabetically, which is why we use
    // json-stable-stringify here (which guarantees alphabetical order).
    return `${selection.name.value}(${stringify(variables)})`;
};

// cacheObjectOrRef may contain either the actual cache object or a reference to it. In the latter
// case, this function returns the actual cache object that is being referenced. If a fieldName is
// passed, the function will attempt to retrieve a cache object of the same typename where there is
// useful data for that fieldName, so we are able to dig deeper into the sub selections.
//
// Example:
//
// {
//     things: [
//         { someObject: null },
//         { someObject: { [...] } }
//     ]
// }
//
// If 'someObject' is passed as the fieldName, the second element of the things array will be
// retrieved, because it contains useful data, and we can continue iterating through the tree.
const getCacheObject = (cacheData, cacheObjectOrRef, fieldName) => {
    const ref = cacheObjectOrRef?.__ref;

    if (ref) {
        if (fieldName) {
            if (cacheData[ref]?.[fieldName] !== null) {
                return cacheData[ref];
            }

            const typeName = ref.match(/^(.*):/)[1];

            return (
                Object.values(cacheData).find((value) => (
                    value.__typeName === typeName && value[fieldName] !== null
                ))
            ) || cacheData[ref];
        }

        if (cacheData[ref] !== null) {
            return cacheData[ref];
        }
    }

    return cacheObjectOrRef;
};

const isPresentInCache = (cacheData, cacheObjectOrRef, fieldName) => {
    const cacheObject = getCacheObject(cacheData, cacheObjectOrRef);

    // Null means that the cache object exists but contains no data (unlike undefined, which would
    // mean the cache object is missing).
    if (cacheObject === null) {
        return true;
    }

    return cacheObject[fieldName] !== undefined;
};

const filterSubSelections = (selections, cacheData, cacheObjectOrRef) => {
    // If there is no cache object or reference, there is no data in the cache for this field, so we
    // keep this part of the query.
    if (cacheObjectOrRef === undefined) {
        return selections;
    }

    const reducedSelections = selections.reduce((result, selection) => {
        const fieldName = buildFieldName(selection);

        // The current field is not a leaf in the tree, so we may need to go deeper.
        if (selection.selectionSet) {
            let cacheObject;

            if (Array.isArray(cacheObjectOrRef)) {
                const index = cacheObjectOrRef.findIndex((item) => {
                    const itemCacheObject = getCacheObject(cacheData, item);

                    if (Array.isArray(itemCacheObject[fieldName])) {
                        return itemCacheObject[fieldName].length > 0;
                    }

                    return itemCacheObject[fieldName] !== null;
                });

                cacheObject = getCacheObject(cacheData, cacheObjectOrRef[index]);
            } else {
                cacheObject = getCacheObject(cacheData, cacheObjectOrRef, fieldName);
            }

            // If we can't find any data for this field in the cache at all, we'll keep the entire
            // selection. This may also be the case if we have already requested this field before,
            // but it has returned null data or empty arrays for every single item.
            if (cacheObject === null || cacheObject === undefined) {
                return [...result, selection];
            }

            return handleSubSelections(
                result,
                selection,
                cacheData,
                cacheObject[fieldName],
            );
        }

        // Always keep the id field, otherwise apollo can't merge the cache items after the
        // request is done.
        if (fieldName === 'id') {
            return [...result, selection];
        }

        if (Array.isArray(cacheObjectOrRef)) {
            return cacheObjectOrRef.every((item) => isPresentInCache(cacheData, item, fieldName))
                ? result
                : [...result, selection];
        }

        return isPresentInCache(cacheData, cacheObjectOrRef, fieldName)
            ? result
            : [...result, selection];
    }, []);

    // If the reduced selection set is empty or only contains the mandatory id, the cache already
    // contains all the data we need, so we can ignore this selection.
    if (
        reducedSelections.length <= 1
        && (!reducedSelections[0] || reducedSelections[0].name.value === 'id')
    ) {
        return [];
    }

    return reducedSelections;
};

const handleSubSelections = (result, selection, cacheData, cacheObjectOrRef) => {
    const subSelections = filterSubSelections(
        selection.selectionSet.selections,
        cacheData,
        cacheObjectOrRef,
    );

    if (subSelections.length === 0) {
        return result;
    }

    return [
        ...result,
        {
            ...selection,
            selectionSet: {
                ...selection.selectionSet,
                selections: subSelections,
            },
        },
    ];
};

export const makeReducedQueryAst = (cache, queryAst) => {
    const cacheContents = cache.extract();

    // Recursively iterate through the entire graphql query tree, removing the fields for which we
    // already have data in the cache.
    const selections = (
        queryAst.definitions[0].selectionSet.selections.reduce((result, selection) => {
            const fieldName = buildFieldName(selection);
            const cacheObjectOrRef = cacheContents.ROOT_QUERY?.[fieldName];

            if (cacheObjectOrRef === undefined) {
                // If the field cannot be found in the cache, keep the entire selection.
                return [...result, selection];
            }

            if (Array.isArray(cacheObjectOrRef)) {
                const hasRefs = !!cacheObjectOrRef[0]?.__ref;

                if (hasRefs && cacheObjectOrRef.every(({ __ref }) => cacheContents[__ref])) {
                    return handleSubSelections(result, selection, cacheContents, cacheObjectOrRef);
                }
            } else {
                const hasRef = !!cacheObjectOrRef?.__ref;

                if (hasRef && cacheContents[cacheObjectOrRef.__ref]) {
                    return handleSubSelections(result, selection, cacheContents, cacheObjectOrRef);
                }
            }

            return [...result, selection];
        }, [])
    );
    // Construct a new tree from the reduced selection set.
    const reducedQueryAst = {
        ...queryAst,
        definitions: [{
            ...queryAst.definitions[0],
            name: {
                kind: 'Name',
                // Prefix the query name with something that clearly marks it as manipulated.
                value: `__REDUCED__${queryAst.definitions[0].name?.value || ''}`,
            },
            selectionSet: {
                ...queryAst.definitions[0].selectionSet,
                selections,
            },
        }],
    };

    // If the reduced query happens to have no more selections because everything is already
    // available in the cache, simply return the original query. Apollo will fetch everything from
    // the cache by itself rather than make a request to the server.
    if (reducedQueryAst.definitions[0].selectionSet.selections.length === 0) {
        return queryAst;
    }

    return reducedQueryAst;
};
