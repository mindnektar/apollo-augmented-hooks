import { useState, useEffect } from 'react';
import { useQuery } from '@apollo/client';
import { makeReducedQueryAst } from '../helpers/reducedQueries';
import { registerRequest, deregisterRequest } from '../helpers/inFlightTracking';
import apolloClient from '../apolloClient';
import { useGlobalContext } from '../globalContextHook';

// Create a reduced version of the query that contains only the fields that are not in the
// cache already. Do not do this when polling, because polling implies the need for fresh data.
// Also don't do it if the fetch policy is 'cache-only', because then we don't want to request
// anything from the server anyway. Also provide the option to disable this behaviour.
const getQueryAst = (queryAst, client, options) => (
    options.pollInterval || options.fetchPolicy === 'cache-only' || options.reducedQuery === false
        ? queryAst
        : makeReducedQueryAst(client.cache, queryAst, options.variables)
);

export default (queryAst, variables, options) => {
    const client = apolloClient();
    const globalContext = useGlobalContext();
    const queryName = queryAst.definitions[0].name?.value || '';

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
        // If all the requested data is already in the cache, we can skip this query.
        fetchPolicy: reducedQueryAst ? options.fetchPolicy : 'cache-only',
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
            registerRequest(queryName);
        } else {
            deregisterRequest(queryName);
        }
    }, [reducedResult.loading]);

    useEffect(() => (
        () => {
            deregisterRequest(queryName);
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

    return reducedResult;
};
