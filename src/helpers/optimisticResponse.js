export const handleOptimisticResponse = (optimisticResponse, input, mutationName) => {
    if (!optimisticResponse) {
        return undefined;
    }

    let data = optimisticResponse;

    if (typeof optimisticResponse === 'object' && !Array.isArray(optimisticResponse)) {
        data = {
            ...(typeof input === 'object' ? input : {}),
            ...optimisticResponse,
        };
    }

    return {
        __typename: 'Mutation',
        __optimistic: true,
        [mutationName]: data,
    };
};
