export const handleOptimisticResponse = (optimisticResponse, input, mutationName) => (
    optimisticResponse
        ? {
            __typename: 'Mutation',
            [mutationName]: {
                ...(typeof input === 'object' ? input : {}),
                ...optimisticResponse,
            },
        }
        : undefined
);
