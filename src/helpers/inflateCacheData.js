import { keyFieldsForTypeName } from './keyFields';
import { buildFieldName } from './fieldNames';

let leafCache;

const getFieldName = (storeFieldName) => {
    const parensIndex = storeFieldName.indexOf('(');

    if (parensIndex >= 0) {
        return storeFieldName.substring(0, parensIndex);
    }

    const colonIndex = storeFieldName.indexOf(':');

    if (colonIndex >= 0) {
        return storeFieldName.substring(0, colonIndex);
    }

    return storeFieldName;
};

const buildLeaf = (cache, cacheItem, cacheKey) => {
    if (!leafCache[cacheKey]) {
        leafCache[cacheKey] = {
            ...keyFieldsForTypeName(cache, cacheItem.__typename).reduce((result, keyField) => ({
                ...result,
                [keyField]: cacheItem[keyField],
            }), {}),
            __typename: cacheItem.__typename,
        };
    }

    return leafCache[cacheKey];
};

const hasDuplicateTypenameSubPaths = (typenamePath, cacheKey) => {
    const subPaths = typenamePath.reduce((result, key, index) => {
        if (typenamePath[index - 1] === cacheKey) {
            result.push('');
        }

        return [
            ...result.slice(0, -1),
            `${result[result.length - 1] || ''}.${key}`,
        ];
    }, ['']);

    subPaths[subPaths.length - 1] = `${subPaths[subPaths.length - 1]}.${cacheKey}`;

    return subPaths[subPaths.length - 1] === subPaths[subPaths.length - 2];
};

const maybeInflate = (cache, cacheContents, aliases, item, typenamePath, itemCache) => {
    if (!item || typeof item !== 'object') {
        return item;
    }

    const cacheKey = cache.identify(item);
    const cacheItem = cacheContents[cacheKey] || item;

    // An object that is no longer in the cache is being referenced, so we'll ignore it.
    if (cacheItem.__ref) {
        return undefined;
    }

    // If the item can't be found in the cache, any of the fields it references still might, though, so we have to go deeper.
    if (!cacheKey) {
        return inflate(cache, cacheContents, aliases, cacheItem, typenamePath, itemCache);
    }

    // Avoid infinite loops by keeping track of which cacheKey we've already seen. Stop cache inflation once a cacheKey has taken the same
    // sub path through the cache twice.
    if (hasDuplicateTypenameSubPaths(typenamePath, cacheItem.__typename)) {
        return buildLeaf(cache, cacheItem, cacheKey);
    }

    // Cache inflation can take a long time with large amounts of data, so don't inflate the same thing twice.
    if (!itemCache[cacheKey]) {
        // Include both the regular field name and the alias in the object.
        const cacheItemWithAliases = Object.entries(cacheItem).reduce((result, [fieldName, value]) => ({
            ...result,
            [fieldName]: value,
            [aliases[fieldName] || fieldName]: value,
        }), {});

        itemCache[cacheKey] = inflate(
            cache,
            cacheContents,
            aliases,
            cacheItemWithAliases,
            [...typenamePath, cacheItem.__typename],
            itemCache
        );
    }

    return itemCache[cacheKey];
};

// Iterate through all the fields of a selection set and check whether any of them can be inflated.
const inflate = (cache, cacheContents, aliases, data, typenamePath, itemCache) => (
    Object.entries(data).reduce((result, [key, item]) => {
        const fieldName = getFieldName(key);

        if (Array.isArray(item)) {
            return {
                ...result,
                [fieldName]: item.reduce((itemResult, entry) => {
                    const inflatedEntry = maybeInflate(cache, cacheContents, aliases, entry, typenamePath, itemCache);

                    if (inflatedEntry === undefined) {
                        return itemResult;
                    }

                    return [...itemResult, inflatedEntry];
                }, []),
            };
        }

        if (typeof item === 'object') {
            return {
                ...result,
                [fieldName]: maybeInflate(cache, cacheContents, aliases, item, typenamePath, itemCache),
            };
        }

        return {
            ...result,
            [fieldName]: item,
        };
    }, {})
);

const extractAliases = (selectionSet, variables) => (
    selectionSet.selections.reduce((result, selection) => {
        const fieldName = buildFieldName(selection, variables);
        const subSelections = selection.selectionSet
            ? extractAliases(selection.selectionSet, variables)
            : {};
        const alias = selection.alias
            ? { [fieldName]: selection.alias.value }
            : {};

        return {
            ...result,
            ...subSelections,
            ...alias,
        };
    }, {})
);

/*
This causes each sub selection to contain all the cache data it can find rather than just the selected fields.

A reduced example:

query {
    todos {
        id
        name
        createdAt
        done
    }
    users {
        id
        todos {
            id
        }
    }
}

Usually, the returned data would look something like this:

{
    todos: [{
        id: 1,
        name: 'Buy groceries',
        createdAt: '2021-06-13',
        done: false
    }],
    users: [{
        id: 2,
        todos: [{
            id: 1
        }]
    }]
}

The users's todos only contain the id because that is what was requested, but we have more data in the cache
due to the todos root query. Cache inflation makes all that data available without having to request it:

{
    todos: [{
        id: 1,
        name: 'Buy groceries',
        createdAt: '2021-06-13',
        done: false
    }],
    users: [{
        id: 2,
        todos: [{
            id: 1,
            name: 'Buy groceries',
            createdAt: '2021-06-13',
            done: false
        }]
    }]
}
*/
export default (cache, data, queryAst, variables) => {
    if (!data) {
        return data;
    }

    const cacheContents = cache.extract(true);
    const aliases = extractAliases(queryAst.definitions[0].selectionSet, variables);

    leafCache = {};

    if (Array.isArray(data)) {
        return data.map((item) => (
            inflate(cache, cacheContents, aliases, item, [], {})
        ));
    }

    return inflate(cache, cacheContents, aliases, data, [], {});
};
