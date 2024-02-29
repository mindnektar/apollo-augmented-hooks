import { useQuery } from '@apollo/client';
import apolloClient from '../apolloClient';
import mapData from '../helpers/mapData';
import { useGlobalContext } from '../globalContextHook';

export default (queryAst, options) => {
    const client = apolloClient();
    const globalContext = useGlobalContext();

    // Grab all the requested data from the cache. If some or all of the data is missing, the reduced query will get it.
    const cacheResult = useQuery(queryAst, {
        client,
        variables: options.variables,
        fetchPolicy: 'cache-only',
        skip: options.skip,
        context: {
            ...globalContext,
            ...options.context,
        },
    });

    return mapData(cacheResult.data, options.dataMap);
};
