import { useState } from 'react';
import { gql, useQuery } from '@apollo/client';
import { makeReducedQueryAst } from './helpers/reducedQueries';
import apolloClient from './apolloClient';

// Create a reduced version of the query that contains only the fields that are not in the
// cache already. Do not do this when polling, because polling implies the need for fresh data.
// Also don't do it if the fetch policy is 'cache-only', because then we don't want to request
// anything from the server anyway.
const getQueryAst = (queryAst, client, options) => (
    options.pollInterval || options.fetchPolicy === 'cache-only'
        ? queryAst
        : makeReducedQueryAst(client.cache, queryAst, options.variables)
);

export default (query, options = {}) => {
    const client = apolloClient();
    const queryAst = gql(query);
    const [reducedQueryAst, setReducedQueryAst] = useState((
        getQueryAst(queryAst, client, options)
    ));
    const reducedResult = useQuery(reducedQueryAst, {
        ...options,
        client,
        // Always fetch data from the server on component mount when polling is enabled.
        // Polling indicates that fresh data is more important than caching, so prefer an extra
        // request on mount rather than waiting the poll interval for the first poll request.
        fetchPolicy: options.pollInterval ? 'cache-and-network' : options.fetchPolicy,
        // This prevents polling queries to refetch server from the data each time the cache is
        // mutated.
        nextFetchPolicy: options.pollInterval ? 'cache-first' : options.nextFetchPolicy,
        onCompleted: () => {
            // The reduced query is kept in state to avoid making another request if a request is
            // already in flight and the cache contents change in the meantime. Once the request is
            // completed, we can recompute the reduced query. Incidentally, this also improves
            // performance because we don't recompute on every render.
            setReducedQueryAst(getQueryAst(queryAst, client, options));
        },
    });
    // Grab all the requested data from the cache. If some or all of the data is missing, the
    // reduced query above will get it.
    const cacheResult = useQuery(queryAst, {
        client,
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
