import { keyFieldsForTypeName } from './keyFields';

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

const maybeInflate = (cache, cacheContents, item, path) => {
    if (!item) {
        return item;
    }

    const cacheItem = cacheContents[cache.identify(item)] || item;

    return !cacheItem.__typename || !path.includes(cacheItem.__typename)
        ? inflate(
            cache,
            cacheContents,
            cacheItem,
            cacheItem.__typename ? [...path, cacheItem.__typename] : path,
        )
        : {
            ...keyFieldsForTypeName(cache, cacheItem.__typename).reduce((result, keyField) => ({
                ...result,
                [keyField]: cacheItem[keyField],
            }), {}),
            __typename: cacheItem.__typename,
        };
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

    const cacheContents = cache.extract();

    return inflate(cache, cacheContents, data, []);
};
