import { keyFieldsForTypeName } from './keyFields';

let itemCache;
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

const maybeInflate = (cache, cacheContents, item, path) => {
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
        return inflate(cache, cacheContents, cacheItem, path);
    }

    // Avoid infinite loops by tracking the path through the tree. If the same typename is encountered twice throughout
    // a branch, stop going deeper.
    if (path.includes(cacheItem.__typename)) {
        return buildLeaf(cache, cacheItem, cacheKey);
    }

    // Cache inflation can be expensive with large data trees, so avoid having to recalculate the same thing multiple times
    const itemCacheKey = `${cacheKey}:${path.join('.')}`;

    if (!itemCache[itemCacheKey]) {
        itemCache[itemCacheKey] = inflate(cache, cacheContents, cacheItem, [...path, cacheItem.__typename]);
    }

    return itemCache[itemCacheKey];
};

// Iterate through all the fields of a selection set and check whether any of them can be inflated.
const inflate = (cache, cacheContents, data, path) => (
    Object.entries(data).reduce((result, [key, item]) => {
        const fieldName = getFieldName(key);

        if (Array.isArray(item)) {
            return {
                ...result,
                [fieldName]: item.reduce((itemResult, entry) => {
                    const inflatedEntry = maybeInflate(cache, cacheContents, entry, path);

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
                [fieldName]: maybeInflate(cache, cacheContents, item, path),
            };
        }

        return {
            ...result,
            [fieldName]: item,
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
export default (cache, data) => {
    if (!data) {
        return data;
    }

    const cacheContents = cache.extract(true);

    itemCache = {};
    leafCache = {};

    if (Array.isArray(data)) {
        return data.map((item) => (
            inflate(cache, cacheContents, item, [])
        ));
    }

    return inflate(cache, cacheContents, data, []);
};
