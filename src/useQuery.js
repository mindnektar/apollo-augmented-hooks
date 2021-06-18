import { useState, useRef, useEffect } from 'react';
import { gql, useQuery } from '@apollo/client';
import { makeReducedQueryAst } from './helpers/reducedQueries';
import { getVariablesWithPagination, handleNextPage } from './helpers/pagination';
import { registerRequest, deregisterRequest } from './helpers/inFlightTracking';
import inflateCacheData from './helpers/inflateCacheData';
import apolloClient from './apolloClient';
import { useGlobalContext } from './globalContextHook';

// Create a reduced version of the query that contains only the fields that are not in the
// cache already. Do not do this when polling, because polling implies the need for fresh data.
// Also don't do it if the fetch policy is 'cache-only', because then we don't want to request
// anything from the server anyway. Also provide the option to disable this behaviour.
const getQueryAst = (queryAst, client, options) => (
    options.pollInterval || options.fetchPolicy === 'cache-only' || options.reducedQuery === false
        ? queryAst
        : makeReducedQueryAst(client.cache, queryAst, options.variables)
);

const getFetchPolicy = (reducedQueryAst, options) => {
    if (!reducedQueryAst) {
        // If all the requested data is already in the cache, we can skip this query.
        return 'cache-only';
    }

    // Always fetch data from the server on component mount when polling is enabled.
    // Polling indicates that fresh data is more important than caching, so prefer an extra
    // request on mount rather than waiting the duration of the poll interval for the first poll
    // request.
    return options.pollInterval ? 'cache-and-network' : options.fetchPolicy;
};

export default (query, options = {}) => {
    const cacheDataRef = useRef();
    const client = apolloClient();
    const queryAst = typeof query === 'string' ? gql(query) : query;
    const variables = getVariablesWithPagination(options);
    const globalContext = useGlobalContext();
    const [inflatedCacheData, setInflatedCacheData] = useState(null);

    // Functional default state to avoid recomputing the reduced query on each render.
    const [reducedQueryAst, setReducedQueryAst] = useState(() => (
        getQueryAst(queryAst, client, options)
    ));

    const resetReducedQueries = () => {
        setReducedQueryAst(getQueryAst(queryAst, client, options));
    };

    const reducedResult = useQuery(reducedQueryAst || queryAst, {
        // If all the requested data is already in the cache, we can skip this query.
        skip: !reducedQueryAst,
        ...options,
        context: {
            ...globalContext,
            ...options.context,
        },
        variables,
        client,
        // This toggles `loading` every time a polling request starts and completes. We need this
        // for the effect hook to work.
        notifyOnNetworkStatusChange: !!options.pollInterval,
        fetchPolicy: getFetchPolicy(reducedQueryAst, options),
        // This prevents polling queries to refetch data from the server each time the cache is
        // mutated.
        nextFetchPolicy: options.pollInterval ? 'cache-first' : options.nextFetchPolicy,
        onCompleted: () => {
            // The reduced query is kept in state to avoid making another request if a request is
            // already in flight and the cache contents change in the meantime. Once the request is
            // completed, we can recompute the reduced query.
            resetReducedQueries();
        },
    });

    // Remember all the query requests that are currently in flight, so we can ensure that any mutations
    // happening while such a request is in flight updates the cache *after* the request completes and
    // is not overwritten by potentially stale data.
    useEffect(() => {
        if (reducedResult.loading) {
            registerRequest(query);
        } else {
            deregisterRequest(query);
        }
    }, [reducedResult.loading]);

    useEffect(() => (
        () => {
            deregisterRequest(query);
        }
    ), []);

    // Listen for mutation modifiers requesting a reduced query reset. This happens if one or more
    // modifiers returned the DELETE sentinel object.
    useEffect(() => {
        window.addEventListener('reset-reduced-queries', resetReducedQueries);

        return () => {
            window.removeEventListener('reset-reduced-queries', resetReducedQueries);
        };
    }, []);

    // Whenever the query variables change, we need to generate a new reduced query because we are in
    // fact dealing with a new query.
    useEffect(() => {
        resetReducedQueries();
    }, [JSON.stringify(options.variables || {})]);

    // Grab all the requested data from the cache. If some or all of the data is missing, the
    // reduced query above will get it.
    const cacheResult = useQuery(queryAst, {
        client,
        variables,
        fetchPolicy: 'cache-only',
    });

    useEffect(() => {
        if (cacheResult.data) {
            setInflatedCacheData(
                options.inflateCacheData !== false
                    // This makes sure that every requested field always contains the entire cache item, and
                    // not just the requested sub selection.
                    ? inflateCacheData(client.cache, cacheResult.data)
                    : cacheResult.data
            );
        }

        // Store cache result in ref so its contents remain fresh when calling `nextPage`.
        cacheDataRef.current = cacheResult.data;
    }, [JSON.stringify(cacheResult.data)]);

    return {
        ...reducedResult,
        nextPage: handleNextPage(queryAst, cacheDataRef, reducedResult, options.pagination),
        data: inflatedCacheData,
        // XXX: Make the loading state dependent on the presence of data in the cache query result.
        // This is a workaround for https://github.com/apollographql/react-apollo/issues/2601
        loading: !options.skip && !inflatedCacheData,
    };
};
