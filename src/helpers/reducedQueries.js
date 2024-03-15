import stringify from 'json-stable-stringify';
import { Trie } from '@wry/trie';
import { getKeyFields } from './keyFields';
import { buildFieldNames } from './fieldNames';

const reducedQueryCache = new Trie();

// cacheObjectOrRef may contain either the actual cache object or a reference to it. In the latter
// case, this function returns the actual cache object that is being referenced.
const getCacheObject = (cacheData, cacheObjectOrRef) => {
    const ref = cacheObjectOrRef?.__ref;

    if (ref && cacheData[ref] !== null) {
        return cacheData[ref];
    }

    return cacheObjectOrRef;
};

const isPresentInCache = (cacheData, cacheObjectOrRef, fieldNames) => {
    const cacheObject = getCacheObject(cacheData, cacheObjectOrRef);

    // Null means that the cache object exists but contains no data.
    if (cacheObject === null) {
        return true;
    }

    // The cache object may have been evicted from the cache. So any of its children aren't in the
    // cache either.
    if (cacheObject === undefined) {
        return false;
    }

    return fieldNames.some((fieldName) => cacheObject[fieldName] !== undefined);
};

const findNextCacheObjectsOrRefs = (cacheData, cacheObjectsOrRefs, fieldNames) => (
    cacheObjectsOrRefs.reduce((result, item) => {
        const itemCacheObject = getCacheObject(cacheData, item);

        if (itemCacheObject === null) {
            return result;
        }

        const fieldName = fieldNames.find((value) => itemCacheObject[value] !== undefined);
        const fieldData = itemCacheObject[fieldName];

        if (Array.isArray(fieldData)) {
            return [...result, ...fieldData];
        }

        return [...result, fieldData];
    }, [])
);

const isKeyField = (cacheData, cacheObjectsOrRefs, fieldName, keyFields) => {
    const cacheObject = cacheObjectsOrRefs.reduce((result, item) => (
        result || getCacheObject(cacheData, item)
    ), null);
    // The default key field is "id", but it can be altered for specific typenames.
    const keyFieldsForThisTypename = keyFields[cacheObject?.__typename] || ['id'];

    return keyFieldsForThisTypename.includes(fieldName);
};

const filterSubSelections = (selections, cacheData, cacheObjectsOrRefs, variables, keyFields) => {
    // If there is no cache object or reference, there is no data in the cache for this field, so we
    // keep this part of the query.
    if (cacheObjectsOrRefs === undefined) {
        return selections;
    }

    const reducedSelections = selections.reduce((result, selection) => {
        if (selection.kind !== 'Field') {
            return [...result, selection];
        }

        const fieldNames = buildFieldNames(selection, variables);

        if (
            // Always keep any key fields, otherwise apollo can't merge the cache items after the
            // request is done.
            isKeyField(cacheData, cacheObjectsOrRefs, selection.name.value, keyFields)
            // Keep the entire selection if at least one of its items is not in the cache (it may
            // have been evicted at some point).
            || !cacheObjectsOrRefs.every((item) => isPresentInCache(cacheData, item, fieldNames))
        ) {
            return [...result, selection];
        }

        // Drop the selection if it is marked with the @client directive, since that means it's
        // local-only.
        if (selection.directives.some((directive) => directive.name.value === 'client')) {
            return result;
        }

        // The current field is not a leaf in the tree, so we may need to go deeper.
        if (selection.selectionSet) {
            // Gather all cache objects or refs of the next level in the tree. Ignore any null
            // values. By not only using a single object as a reference but rather as many like
            // objects as possible, we increase our chances of finding a useful reference for any
            // deeper-level fields.
            const nextCacheObjectsOrRefs = findNextCacheObjectsOrRefs(cacheData, cacheObjectsOrRefs, fieldNames);

            // If we can't find any data for this field in the cache at all, we'll drop the entire
            // selection. This may also be the case if we have already requested this field before,
            // but it has returned empty arrays for every single item.
            if (nextCacheObjectsOrRefs.length === 0) {
                return result;
            }

            // If every single item is in the cache but contains a null value, we can drop the rest
            // of the selection because there will be no data on deeper levels.
            if (nextCacheObjectsOrRefs.every((item) => item === null)) {
                return result;
            }

            return handleSubSelections(result, selection, cacheData, nextCacheObjectsOrRefs, variables, keyFields);
        }

        return result;
    }, []);

    // If the reduced selection set is empty or only contains key fields, the cache already
    // contains all the data we need, so we can ignore this selection.
    const containsOnlyKeyFields = reducedSelections.every(({ name, kind }) => (
        kind === 'Field'
        && isKeyField(cacheData, cacheObjectsOrRefs, name.value, keyFields)
    ));

    if (containsOnlyKeyFields) {
        return [];
    }

    return reducedSelections;
};

const handleSubSelections = (result, selection, cacheData, cacheObjectsOrRefs, variables, keyFields) => {
    const subSelections = filterSubSelections(selection.selectionSet.selections, cacheData, cacheObjectsOrRefs, variables, keyFields);

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

const hasArgumentVariable = (args, variable) => (
    args.some((argument) => {
        if (argument.kind === 'Variable') {
            return argument.name.value === variable;
        }

        if (argument.kind === 'Argument' || argument.kind === 'ObjectField') {
            return hasArgumentVariable([argument.value], variable);
        }

        if (argument.kind === 'ObjectValue') {
            return hasArgumentVariable(argument.fields, variable);
        }

        if (argument.kind === 'ListValue') {
            return hasArgumentVariable(argument.values, variable);
        }

        return argument.value === variable;
    })
);

const hasVariable = (selectionSet, variable) => (
    (selectionSet?.selections || []).some((selection) => {
        if (selection.kind !== 'Field') {
            return true;
        }

        const isVariableInArguments = hasArgumentVariable(selection.arguments, variable);
        const isVariableInDirectives = selection.directives.some((directive) => (
            directive.arguments.some(({ value }) => value?.name?.value === variable)
        ));
        const isVariableInSelectionSet = hasVariable(selection.selectionSet, variable);

        return isVariableInArguments || isVariableInDirectives || isVariableInSelectionSet;
    })
);

export const makeReducedQueryAst = (cache, queryAst, variables) => {
    const cacheKey = [queryAst, stringify(variables)];
    const ref = reducedQueryCache.lookupArray(cacheKey);

    if (ref.current) {
        return ref.current;
    }

    const cacheContents = cache.extract();
    const keyFields = getKeyFields(cache);

    let reducedQueryAst = {
        ...queryAst,
        definitions: queryAst.definitions.map((definition) => {
            if (definition.kind !== 'OperationDefinition') {
                return definition;
            }

            // Recursively iterate through the entire graphql query tree, removing the fields for which we
            // already have data in the cache.
            const selections = (
                definition.selectionSet.selections.reduce((result, selection) => {
                    if (selection.kind !== 'Field') {
                        return [...result, selection];
                    }

                    const fieldNames = buildFieldNames(selection, variables);
                    const fieldName = fieldNames.find((item) => cacheContents.ROOT_QUERY?.[item] !== undefined);
                    let cacheObjectsOrRefs = cacheContents.ROOT_QUERY?.[fieldName];

                    if (cacheObjectsOrRefs === undefined) {
                        // If the field cannot be found in the cache, keep the entire selection.
                        return [...result, selection];
                    }

                    if (!selection.selectionSet) {
                        // If the field is not an object or array and it's already in the cache, there are no sub selections to handle.
                        return result;
                    }

                    if (!Array.isArray(cacheObjectsOrRefs)) {
                        cacheObjectsOrRefs = [cacheObjectsOrRefs];
                    }

                    return handleSubSelections(result, selection, cacheContents, cacheObjectsOrRefs, variables, keyFields);
                }, [])
            );
            // Construct a new tree from the reduced selection set.
            const selectionSet = {
                ...definition.selectionSet,
                selections,
            };

            return {
                ...definition,
                name: {
                    kind: 'Name',
                    // Prefix the query name with something that clearly marks it as manipulated.
                    value: `__REDUCED__${definition.name?.value || ''}`,
                },
                selectionSet,
                // Remove variable definitions that are no longer referenced anywhere in the selection
                // set.
                variableDefinitions: definition.variableDefinitions.filter(({ variable }) => (
                    hasVariable(selectionSet, variable.name.value)
                )),
            };
        }),
    };

    // If the reduced query happens to have no more selections because everything is already
    // available in the cache, return null so we can skip this query.
    if (reducedQueryAst.definitions[0].selectionSet.selections.length === 0) {
        reducedQueryAst = null;
    }

    ref.current = reducedQueryAst;

    return reducedQueryAst;
};
