import merge from 'deepmerge';

const mapObjectData = (object, path, fieldName, refs) => {
    const key = path[0];

    if (!object[key]) {
        return object;
    }

    if (path.length === 1) {
        let value;

        if (Array.isArray(object[key])) {
            value = object[key].map((item) => refs[item.id] || item);
        } else if (typeof object[key] === 'object') {
            value = refs[object[key].id] || object[key];
        } else {
            value = refs[object[key]] || object[key];
        }

        return { ...object, [fieldName]: value };
    }

    const nextPath = path.slice(1);

    if (Array.isArray(object[key])) {
        return {
            ...object,
            [key]: object[key].map((item) => (
                mapObjectData(item, nextPath, fieldName, refs)
            )),
        };
    }

    return {
        ...object,
        [key]: mapObjectData(object[key], nextPath, fieldName, refs),
    };
};

const getRefs = (data) => {
    if (!data) {
        return {};
    }

    return Array.isArray(data)
        ? Object.fromEntries(data.map((item) => [item.id, item]))
        : { [data.id]: data };
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

    return {
        ...sourceRefs,
        ...Object.fromEntries(Object.entries(resultRefs).map(([id, item]) => [
            id,
            sourceRefs[id] ? merge(sourceRefs[id], item, { arrayMerge: mergeArrays }) : item,
        ])),
    };
};

// If data is passed directly, it is used exclusively. Otherwise the target is resolved against
// both the query result and the sources registered via `setDataMapSourcesHook`.
const getTargetRefs = ({ target, data }, result, sources) => {
    if (data !== undefined) {
        return getRefs(data);
    }

    return mergeRefs(getRefs(sources?.[target]), getRefs(result[target]));
};

export default (data, map = {}, sources = {}) => {
    if (!data) {
        return data;
    }

    return Object.entries(map).reduce((result, [from, to]) => {
        const fromPath = from.split('.');
        const options = typeof to === 'object' ? to : { target: to };
        const fieldName = options.fieldName || fromPath.at(-1);

        return mapObjectData(result, fromPath, fieldName, getTargetRefs(options, result, sources));
    }, data);
};
