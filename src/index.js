import useQuery from './useQuery';
import useLazyQuery from './useLazyQuery';
import useSuspenseQuery from './useSuspenseQuery';
import useMutation from './useMutation';
import useSubscription from './useSubscription';
import combineResults from './combineResults';
import { setGlobalContextHook } from './globalContextHook';
import { setDataMapSourcesHook } from './dataMapSourcesHook';
import { clearReducedQueryCache } from './helpers/reducedQueries';

export {
    useQuery,
    useLazyQuery,
    useSuspenseQuery,
    useMutation,
    useSubscription,
    combineResults,
    setGlobalContextHook,
    setDataMapSourcesHook,
    clearReducedQueryCache,
};
