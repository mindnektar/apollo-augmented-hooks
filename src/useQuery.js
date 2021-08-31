import { useRef, useEffect } from 'react';
import { gql } from '@apollo/client';
import { getVariablesWithPagination, handleNextPage } from './helpers/pagination';
import useReducedQuery from './hooks/useReducedQuery';
import useCacheQuery from './hooks/useCacheQuery';

export default (query, options = {}) => {
    const queryAst = typeof query === 'string' ? gql(query) : query;
    const variables = getVariablesWithPagination(options);
    const reducedResult = useReducedQuery(queryAst, variables, options);
    const inflatedCacheData = useCacheQuery(queryAst, variables, options);
    const cacheDataRef = useRef(inflatedCacheData);

    useEffect(() => {
        // Store cache result in ref so its contents remain fresh when calling `nextPage`.
        cacheDataRef.current = inflatedCacheData;
    });

    return {
        ...reducedResult,
        nextPage: handleNextPage(queryAst, cacheDataRef, reducedResult, options.pagination),
        data: inflatedCacheData,
        // XXX: Make the loading state dependent on the presence of data in the cache query result.
        // This is a workaround for https://github.com/apollographql/react-apollo/issues/2601
        loading: !options.skip && !inflatedCacheData,
    };
};
