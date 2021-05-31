export const keyFieldsForTypeName = (cache, typeName) => (
    cache.config.typePolicies[typeName]?.keyFields || ['id']
);

export const getKeyFields = (cache) => {
    const typePolicies = Object.entries(cache.config.typePolicies);

    return typePolicies.reduce((result, [typename, { keyFields }]) => {
        if (!keyFields) {
            return result;
        }

        return {
            ...result,
            [typename]: keyFields,
        };
    }, {});
};
