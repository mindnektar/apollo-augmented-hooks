import { useRef, useEffect } from 'react';
import { gql } from '@apollo/client';
import { handleNextPage } from './helpers/pagination';
import useReducedQuery from './hooks/useReducedQuery';
import useCacheQuery from './hooks/useCacheQuery';

export default (query, options = {}) => {
    const queryAst = typeof query === 'string' ? gql(query) : query;
    const cacheData = useCacheQuery(queryAst, options);
    const reducedResult = useReducedQuery('useQuery', queryAst, cacheData, options);
    const cacheDataRef = useRef(cacheData);

    useEffect(() => {
        // Store cache result in ref so its contents remain fresh when calling `nextPage`.
        cacheDataRef.current = cacheData;
    });

    return {
        ...reducedResult,
        nextPage: handleNextPage(queryAst, cacheDataRef, reducedResult, options),
        data: cacheData,
        // XXX: Make the loading state dependent on the presence of data in the cache query result.
        // This is a workaround for https://github.com/apollographql/react-apollo/issues/2601
        loading: !options.skip && !cacheData,
    };
};
