import { useQuery } from '@apollo/client';
import apolloClient from '../apolloClient';
import mapData from '../helpers/mapData';

export default (queryAst, variables, options) => {
    const client = apolloClient();

    // Grab all the requested data from the cache. If some or all of the data is missing, the reduced query will get it.
    const cacheResult = useQuery(queryAst, {
        client,
        variables,
        fetchPolicy: 'cache-only',
    });

    return mapData(cacheResult.data, options.dataMap);
};
