import { useRef } from 'react';
import { useQuery } from '@apollo/client';
import mapData from '../helpers/mapData';
import { useGlobalContext } from '../globalContextHook';
import { useDataMapSources } from '../dataMapSourcesHook';

const isSameDataMapEntry = (a, b) => (
    a === b || (
        typeof a === 'object' && typeof b === 'object' && !!a && !!b
        && a.target === b.target
        && a.fieldName === b.fieldName
        && a.data === b.data
    )
);

// Data maps are usually object literals created during render, so they need to be compared by
// content rather than identity.
const isSameDataMap = (a = {}, b = {}) => {
    const keys = Object.keys(a);

    return keys.length === Object.keys(b).length && keys.every((key) => isSameDataMapEntry(a[key], b[key]));
};

// Only the source fields actually referenced by the data map can affect the mapping, so changes
// to unrelated parts of the registered sources must not invalidate it.
const hasSameReferencedSources = (map = {}, a, b) => (
    Object.values(map).every((to) => {
        const target = typeof to === 'object' ? to.target : to;

        return target === undefined || a?.[target] === b?.[target];
    })
);

export default (queryAst, options) => {
    const globalContext = useGlobalContext();
    const dataMapSources = useDataMapSources();
    const memoRef = useRef({});

    // Grab all the requested data from the cache. If some or all of the data is missing, the reduced query will get it.
    const cacheResult = useQuery(queryAst, {
        variables: options.variables,
        fetchPolicy: 'cache-only',
        skip: options.skip,
        context: {
            ...globalContext,
            ...options.context,
        },
    });

    // Mapping the data produces new object identities along every mapped path, so it must only
    // happen when the inputs actually change. Otherwise every render would return new data,
    // breaking downstream identity checks (memoized context values, React.memo etc.) and
    // re-running the entire mapping.
    const memo = memoRef.current;

    if (
        memo.data !== cacheResult.data
        || !isSameDataMap(memo.dataMap, options.dataMap)
        || !hasSameReferencedSources(options.dataMap, memo.sources, dataMapSources)
    ) {
        memoRef.current = {
            data: cacheResult.data,
            sources: dataMapSources,
            dataMap: options.dataMap,
            result: mapData(cacheResult.data, options.dataMap, dataMapSources),
        };
    }

    return memoRef.current.result;
};
