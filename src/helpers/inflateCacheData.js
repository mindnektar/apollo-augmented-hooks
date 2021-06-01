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
    if (!item) {
        return item;
    }

    const cacheKey = cache.identify(item);
    const cacheItem = cacheContents[cacheKey] || item;

    if (!cacheItem.__typename) {
        return inflate(cache, cacheContents, cacheItem, path);
    }

    if (path.includes(cacheItem.__typename)) {
        return buildLeaf(cache, cacheItem, cacheKey);
    }

    if (!itemCache[cacheKey]) {
        itemCache[cacheKey] = inflate(cache, cacheContents, cacheItem, [...path, cacheItem.__typename]);
    }

    return itemCache[cacheKey];
};

const inflate = (cache, cacheContents, data, path) => (
    Object.entries(data).reduce((result, [key, item]) => {
        const fieldName = getFieldName(key);

        if (Array.isArray(item)) {
            return {
                ...result,
                [fieldName]: item.map((entry) => maybeInflate(cache, cacheContents, entry, path)),
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

export default (cache, data) => {
    if (!data) {
        return data;
    }

    const cacheContents = cache.extract(true);

    itemCache = {};
    leafCache = {};

    return inflate(cache, cacheContents, data, []);
};
