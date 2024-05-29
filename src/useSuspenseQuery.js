import { useRef, useEffect } from 'react';
import { gql } from '@apollo/client';
import { handleNextPage } from './helpers/pagination';
import useReducedQuery from './hooks/useReducedQuery';
import useCacheQuery from './hooks/useCacheQuery';

export default (query, options = {}) => {
    const queryAst = typeof query === 'string' ? gql(query) : query;
    const cacheData = useCacheQuery(queryAst, options);
    const reducedResult = useReducedQuery('useSuspenseQuery', queryAst, cacheData, options);
    const cacheDataRef = useRef(cacheData);

    useEffect(() => {
        // Store cache result in ref so its contents remain fresh when calling `nextPage`.
        cacheDataRef.current = cacheData;
    });

    // Trigger suspense if there is no or incomplete data in the cache because we need to wait for the reduced query to fetch it and
    // populate the cache. It's possible for apollo client to release the suspense while the cache item is still unavailable.
    if (!cacheData && !reducedResult.error && !options.skip) {
        throw new Promise(() => {});
    }

    return {
        ...reducedResult,
        nextPage: handleNextPage(queryAst, cacheDataRef, reducedResult, options),
        data: cacheData,
    };
};
