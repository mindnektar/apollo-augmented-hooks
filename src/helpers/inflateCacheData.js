import { buildFieldName } from './fieldNames';

let leafCache;
let itemCache;
let cacheKeyCache;

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
        leafCache[cacheKey] = Object.entries(cacheItem).reduce((result, [key, value]) => {
            if (typeof value === 'object') {
                return result;
            }

            return { ...result, [key]: value };
        }, {});
    }

    return leafCache[cacheKey];
};

const maybeInflate = (cache, cacheContents, aliases, item, rootQueryKey) => {
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
        return inflate(cache, cacheContents, aliases, cacheItem, rootQueryKey);
    }

    // Avoid infinite loops by keeping track of which cacheKey we've already seen.
    if (cacheKeyCache[rootQueryKey].includes(cacheKey)) {
        return itemCache[cacheKey] || buildLeaf(cache, cacheItem, cacheKey);
    }

    // Include both the regular field name as well as the alias in the object.
    const cacheItemWithAliases = Object.entries(cacheItem).reduce((result, [fieldName, value]) => ({
        ...result,
        [fieldName]: value,
        [aliases[fieldName] || fieldName]: value,
    }), {});

    cacheKeyCache[rootQueryKey].push(cacheKey);

    itemCache[cacheKey] = inflate(cache, cacheContents, aliases, cacheItemWithAliases, rootQueryKey);

    return itemCache[cacheKey];
};

// Iterate through all the fields of a selection set and check whether any of them can be inflated.
const inflate = (cache, cacheContents, aliases, data, rootQueryKey) => (
    Object.entries(data).reduce((result, [key, item]) => {
        const fieldName = getFieldName(key);

        if (!rootQueryKey) {
            cacheKeyCache[key] = [];
        }

        if (Array.isArray(item)) {
            return {
                ...result,
                [fieldName]: item.reduce((itemResult, entry) => {
                    const inflatedEntry = maybeInflate(cache, cacheContents, aliases, entry, rootQueryKey || key);

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
                [fieldName]: maybeInflate(cache, cacheContents, aliases, item, rootQueryKey || key),
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
    itemCache = {};
    cacheKeyCache = {};

    if (Array.isArray(data)) {
        return data.map((item) => (
            inflate(cache, cacheContents, aliases, item)
        ));
    }

    return inflate(cache, cacheContents, aliases, data);
};
