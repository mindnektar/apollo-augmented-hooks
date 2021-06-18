import { gql, useMutation } from '@apollo/client';
import { handleOptimisticResponse } from './helpers/optimisticResponse';
import { handleModifiers } from './helpers/modifiers';
import { waitForRequestsInFlight, areRequestsInFlight } from './helpers/inFlightTracking';
import apolloClient from './apolloClient';
import { useGlobalContext } from './globalContextHook';

export default (mutation, hookOptions = {}) => {
    const client = apolloClient();
    const mutationAst = typeof mutation === 'string' ? gql(mutation) : mutation;
    const mutationName = mutationAst.definitions[0].selectionSet.selections[0].name.value;
    const [mutate] = useMutation(mutationAst, {
        ...hookOptions,
        client,
    });
    const args = mutationAst.definitions[0].selectionSet.selections[0].arguments;
    const globalContext = useGlobalContext();

    return ({ input, ...options } = {}) => (
        mutate({
            // Automatically prepend the argument name when there's only a single argument, which is
            // most of the time ($input or $id), reducing overhead.
            variables: args.length === 1 ? { [args[0].name.value]: input } : input,
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
                const c = cache;

                if (options.update) {
                    options.update(c, result);
                }

                // Simplify cache updates after mutations.
                handleModifiers(c, result.data[mutationName], options.modifiers);

                // If this is a server response (and not an optimistic response), wait until any queries
                // in flight are completed, to avoid the mutation result getting overwritten by
                // potentially stale data. This is done in addition to the regular cache update above
                // because apollo doesn't like asynchronous post-mutation updates and would restore the
                // previous cache result otherwise.
                if (!result.data.__optimistic && areRequestsInFlight()) {
                    await waitForRequestsInFlight();
                    handleModifiers(c, result.data[mutationName], options.modifiers);
                }
            },
        })
    );
};
