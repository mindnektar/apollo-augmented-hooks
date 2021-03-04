import { gql, useQuery, useApolloClient } from '@apollo/client';
import { makeReducedQueryAst } from './helpers/reducedQueries';

export default (query, options = {}) => {
    const { cache } = useApolloClient();
    const queryAst = gql(query);
    // Create a reduced version of the query that contains only the fields that are not in the
    // cache already. Do not do this when polling, because polling implies the need for fresh data.
    const reducedQueryAst = options.pollInterval ? queryAst : makeReducedQueryAst(cache, queryAst);
    const reducedResult = useQuery(reducedQueryAst, {
        ...options,
        // Always fetch data from the server on component mount when polling is enabled.
        // Polling indicates that fresh data is more important than caching, so prefer an extra
        // request on mount rather than waiting the poll interval for the first poll request.
        fetchPolicy: options.pollInterval ? 'cache-and-network' : options.fetchPolicy,
        // This prevents polling queries to refetch server from the data each time the cache is
        // mutated.
        nextFetchPolicy: options.pollInterval ? 'cache-first' : options.nextFetchPolicy,
    });
    // Grab all the requested data from the cache. If some or all of the data is missing, the
    // reduced query above will get it.
    const cacheResult = useQuery(queryAst, {
        variables: options.variables,
        fetchPolicy: 'cache-only',
    });

    return {
        ...reducedResult,
        data: cacheResult.data,
        // XXX: Make the loading state dependent on the presence of data in the cache query result.
        // This is a workaround for https://github.com/apollographql/react-apollo/issues/2601
        loading: !options.skip && !cacheResult.data,
    };
};
