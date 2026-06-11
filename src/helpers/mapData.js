import merge from 'deepmerge';

// All caches are module-level WeakMaps keyed on the objects being mapped, so cache entries are
// garbage-collected along with the apollo cache items they belong to. Mapping the same objects
// with the same refs must return the very same output objects: this referential stability allows
// repeated mappings to skip almost all of the work, and it keeps unrelated cache updates from
// cascading into app-wide re-renders (e.g. through context values memoized on mapped query data).
const dataCache = new WeakMap();
const refsCache = new WeakMap();
const mergedRefsCache = new WeakMap();
const mergedEntityCache = new WeakMap();

const emptyRefs = {};

const getCached = (object, cacheKey, refs) => {
    const cached = dataCache.get(object)?.get(cacheKey);

    return cached?.refs === refs ? cached.output : undefined;
};

const setCached = (object, cacheKey, refs, output) => {
    if (!dataCache.has(object)) {
        dataCache.set(object, new Map());
    }

    dataCache.get(object).set(cacheKey, { refs, output });

    return output;
};

const getRefs = (data) => {
    if (!data || typeof data !== 'object') {
        return emptyRefs;
    }

    if (!refsCache.has(data)) {
        refsCache.set(data, Array.isArray(data)
            ? Object.fromEntries(data.map((item) => [item.id, item]))
            : { [data.id]: data });
    }

    return refsCache.get(data);
};

// Entity arrays are matched by id, keeping the membership and order of the result-side array so
// deliberately filtered lists stay filtered. Items without a matching id (including arrays of
// non-entity values) resolve to the result side wholesale.
const mergeArrays = (target, source, options) => {
    const targetRefs = Object.fromEntries(
        target.filter((item) => item?.id !== undefined).map((item) => [item.id, item])
    );

    return source.map((item) => (
        options.isMergeableObject(item) && targetRefs[item?.id]
            ? merge(targetRefs[item.id], item, options)
            : item
    ));
};

const mergeEntities = (sourceEntity, resultEntity) => {
    if (!mergedEntityCache.has(sourceEntity)) {
        mergedEntityCache.set(sourceEntity, new WeakMap());
    }

    const cache = mergedEntityCache.get(sourceEntity);

    if (!cache.has(resultEntity)) {
        cache.set(resultEntity, merge(sourceEntity, resultEntity, { arrayMerge: mergeArrays }));
    }

    return cache.get(resultEntity);
};

// When the same id exists in both the query result and the registered sources, the two entities
// are deep-merged per field with the query result taking precedence, so the same target may be
// requested in both places with different sub selections. Entities present on only one side are
// passed through as is to avoid unnecessary cloning.
const mergeRefs = (sourceRefs, resultRefs) => {
    if (!Object.keys(sourceRefs).length) {
        return resultRefs;
    }

    if (!Object.keys(resultRefs).length) {
        return sourceRefs;
    }

    if (!mergedRefsCache.has(sourceRefs)) {
        mergedRefsCache.set(sourceRefs, new WeakMap());
    }

    const cache = mergedRefsCache.get(sourceRefs);

    if (!cache.has(resultRefs)) {
        cache.set(resultRefs, {
            ...sourceRefs,
            ...Object.fromEntries(Object.entries(resultRefs).map(([id, item]) => [
                id,
                sourceRefs[id] ? mergeEntities(sourceRefs[id], item) : item,
            ])),
        });
    }

    return cache.get(resultRefs);
};

// If data is passed directly, it is used exclusively. Otherwise the target is resolved against
// both the query result and the sources registered via `setDataMapSourcesHook`.
const getTargetRefs = ({ target, data }, result, sources) => {
    if (data !== undefined) {
        return getRefs(data);
    }

    return mergeRefs(getRefs(sources?.[target]), getRefs(result[target]));
};

const mapLeafValue = (node, key, refs) => {
    if (Array.isArray(node[key])) {
        return getCached(node[key], 'leaf', refs) || setCached(node[key], 'leaf', refs, (
            node[key].map((item) => refs[item.id] || item)
        ));
    }

    if (typeof node[key] === 'object') {
        return refs[node[key].id] || node[key];
    }

    return refs[node[key]] || node[key];
};

const mapNodeData = (node, path, fieldName, refs) => {
    const cacheKey = `${path.join('.')}:${fieldName}`;

    if (Array.isArray(node)) {
        return getCached(node, cacheKey, refs) || setCached(node, cacheKey, refs, (
            node.map((item) => mapNodeData(item, path, fieldName, refs))
        ));
    }

    const key = path[0];

    if (!node[key]) {
        return node;
    }

    const cached = getCached(node, cacheKey, refs);

    if (cached) {
        return cached;
    }

    if (path.length === 1) {
        return setCached(node, cacheKey, refs, {
            ...node,
            [fieldName]: mapLeafValue(node, key, refs),
        });
    }

    return setCached(node, cacheKey, refs, {
        ...node,
        [key]: mapNodeData(node[key], path.slice(1), fieldName, refs),
    });
};

export default (data, map = {}, sources = {}) => {
    if (!data) {
        return data;
    }

    return Object.entries(map).reduce((result, [from, to]) => {
        const fromPath = from.split('.');
        const options = typeof to === 'object' ? to : { target: to };
        const fieldName = options.fieldName || fromPath.at(-1);

        return mapNodeData(result, fromPath, fieldName, getTargetRefs(options, result, sources));
    }, data);
};
