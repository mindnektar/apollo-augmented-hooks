import { useRef, useEffect } from 'react';
import { useSuspenseQuery, gql } from '@apollo/client';
import { handleNextPage } from './helpers/pagination';
import useReducedQuery from './hooks/useReducedQuery';
import useCacheQuery from './hooks/useCacheQuery';

export default (query, options = {}) => {
    const queryAst = typeof query === 'string' ? gql(query) : query;
    const reducedResult = useReducedQuery(useSuspenseQuery, queryAst, options);
    const cacheData = useCacheQuery(queryAst, options);
    const cacheDataRef = useRef(cacheData);

    useEffect(() => {
        // Store cache result in ref so its contents remain fresh when calling `nextPage`.
        cacheDataRef.current = cacheData;
    });

    return {
        ...reducedResult,
        nextPage: handleNextPage(queryAst, cacheDataRef, reducedResult, options),
        data: cacheData,
    };
};
