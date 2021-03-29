export const handleOptimisticResponse = (optimisticResponse, input, mutationName) => (
    optimisticResponse
        ? {
            __typename: 'Mutation',
            __optimistic: true,
            [mutationName]: {
                ...(typeof input === 'object' ? input : {}),
                ...optimisticResponse,
            },
        }
        : undefined
);
