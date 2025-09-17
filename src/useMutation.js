import { gql, useMutation, useApolloClient } from '@apollo/client';
import { handleOptimisticResponse } from './helpers/optimisticResponse';
import { handleModifiers } from './helpers/modifiers';
import { waitForRequestsInFlight, areRequestsInFlight } from './helpers/inFlightTracking';
import { useGlobalContext } from './globalContextHook';

export default (mutation, hookOptions = {}) => {
    const client = useApolloClient();
    const mutationAst = typeof mutation === 'string' ? gql(mutation) : mutation;
    const mutationName = mutationAst.definitions[0].selectionSet.selections[0].name.value;
    const [mutate, ...mutationResult] = useMutation(mutationAst, hookOptions);
    const args = mutationAst.definitions[0].selectionSet.selections[0].arguments;
    const globalContext = useGlobalContext();

    const augmentedMutate = async ({ input, ...options } = {}) => {
        // Automatically prepend the argument name when there's only a single argument, which is
        // most of the time ($input or $id), reducing overhead.
        const variables = args.length === 1 ? { [args[0].name.value]: input } : input;

        const result = await mutate({
            variables,
            ...options,
            context: {
                ...globalContext,
                ...options.context,
            },
            optimisticResponse: (
                // Automatically prepend what is common across all optimistic responses, reducing
                // overhead.
                handleOptimisticResponse(options.optimisticResponse, input, mutationName)
            ),
            update: async (cache, result) => {
                if (options.update) {
                    options.update(cache, result);
                }

                // Simplify cache updates after mutations.
                handleModifiers(cache, result.data[mutationName], options.modifiers);

                // If this is a server response (and not an optimistic response), wait until any queries
                // in flight are completed, to avoid the mutation result getting overwritten by
                // potentially stale data. This is done in addition to the regular cache update above
                // because apollo doesn't like asynchronous post-mutation updates and would restore the
                // previous cache result otherwise.
                if (!result.data.__optimistic && areRequestsInFlight()) {
                    await waitForRequestsInFlight();
                    handleModifiers(cache, result.data[mutationName], options.modifiers);
                }
            },
        });

        if (options.lazyRefetch) {
            // Make sure that only queries that are currently active are refetched immediately.
            await client.refetchQueries({
                include: 'active',
                onQueryUpdated: (query, { result }) => (
                    query.observers.size > 0
                    && query.options.fetchPolicy !== 'cache-only'
                    && !query.queryName.startsWith('__REDUCED__')
                    && options.lazyRefetch.some((fieldName) => result[fieldName])
                ),
            });

            // Queries that are not currently active should be refetched only once they become active again.
            options.lazyRefetch.forEach((fieldName) => {
                client.cache.evict({ fieldName, broadcast: false });
            });
        }

        return result;
    };

    return [augmentedMutate, ...mutationResult];
};
