// Apollo offers no streamlined way to extract the query variables for the cache object we are
// modifying, so this helper has to exist.
const getVariables = (details) => {
    const variableString = details.storeFieldName.match(/\((.*)\)/)?.[1];

    return variableString ? JSON.parse(variableString) : null;
};

// A helper that adds/removes a cache object to/from an array, depending on whether the handler
// returns true or false. Reduces overhead.
const handleIncludeIf = (cache, item) => (
    (handler) => (
        (previous, details) => {
            const next = previous.filter((ref) => details.readField('id', ref) !== item.id);
            const variables = getVariables(details);
            const include = typeof handler === 'function'
                ? handler({ item, variables })
                : handler;

            if (include) {
                next.push(details.toReference(item));
            }

            return next;
        }
    )
);

export const handleModifiers = (cache, item, modifiers) => {
    if (!modifiers) {
        return;
    }

    const params = {
        item,
        includeIf: handleIncludeIf(cache, item),
        getVariables,
    };

    modifiers(params).forEach(({ cacheObject, fields, evict }) => {
        if (evict) {
            // Remove the specified cache object from the cache and remove all references to it
            // from any other cache objects.
            cache.evict({ id: cache.identify(cacheObject) });
            cache.gc();
        } else {
            try {
                cache.modify({
                    id: cacheObject ? cache.identify(cacheObject) : 'ROOT_QUERY',
                    fields,
                });
            } catch (error) {
                /* eslint-disable-next-line no-console */
                console.error(error);
                throw error;
            }
        }
    });
};
