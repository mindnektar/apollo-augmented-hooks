import merge from 'deepmerge';

const combineMerge = (target, source, options) => {
    const result = [...target];

    source.forEach((item, index) => {
        if (result[index] === undefined) {
            result[index] = options.cloneUnlessOtherwiseSpecified(item, options);
        } else if (options.isMergeableObject(item)) {
            result[index] = merge(target[index], item, options);
        } else if (target.indexOf(item) === -1) {
            result.push(item);
        }
    });

    return result;
};

export default (...results) => ({
    // Simply return all those attributes of the first passed result that cannot be sensibly
    // combined.
    ...results[0],
    loading: results.some(({ loading }) => loading),
    data: merge.all(
        results.map(({ data }) => data || {}),
        // Assume that array items across the results with the same index are supposed to be merged
        // rather than concatenated. Otherwise you might end up with duplicated items if two queries
        // request the same array resource.
        { arrayMerge: combineMerge }
    ),
    error: merge.all(
        // Here we stick to deepmerge's default behaviour of concatenating arrays so we don't lose
        // any error messages if more than one of the combined queries happen to throw an error.
        results.map(({ error }) => error || {})
    ),
});
