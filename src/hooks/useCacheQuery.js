import { useState, useEffect } from 'react';
import { useQuery } from '@apollo/client';
import inflateCacheData from '../helpers/inflateCacheData';
import apolloClient from '../apolloClient';

export default (queryAst, variables, options) => {
    const client = apolloClient();

    // Grab all the requested data from the cache. If some or all of the data is missing, the reduced query will get it.
    const cacheResult = useQuery(queryAst, {
        client,
        variables,
        fetchPolicy: 'cache-only',
    });

    const getInflatedCacheData = () => (
        options.inflateCacheData !== false
            // This makes sure that every requested field always contains the entire cache item, and not just the requested sub selection.
            ? inflateCacheData(client.cache, cacheResult.data, queryAst, variables)
            : cacheResult.data
    );

    const [inflatedCacheData, setInflatedCacheData] = useState(() => getInflatedCacheData());

    useEffect(() => {
        setInflatedCacheData(getInflatedCacheData());
    }, [JSON.stringify(cacheResult.data)]);

    return inflatedCacheData;
};
