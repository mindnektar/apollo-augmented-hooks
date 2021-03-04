import { gql, useMutation } from '@apollo/client';
import { handleOptimisticResponse } from './helpers/optimisticResponse';
import { handleModifiers } from './helpers/modifiers';
import apolloClient from './apolloClient';

export default (mutation, hookOptions = {}) => {
    const client = apolloClient();
    const mutationAst = gql(mutation);
    const mutationName = mutationAst.definitions[0].name.value;
    const [mutate] = useMutation(mutationAst, {
        ...hookOptions,
        client,
    });
    const args = mutationAst.definitions[0].selectionSet.selections[0].arguments;

    return ({ input, ...options } = {}) => (
        mutate({
            // Automatically prepend the argument name when there's only a single argument, which is
            // most of the time ($input or $id), reducing overhead.
            variables: args.length === 1 ? { [args[0].name.value]: input } : input,
            ...options,
            optimisticResponse: (
                // Automatically prepend what is common across all optimistic responses, reducing
                // overhead.
                handleOptimisticResponse(options.optimisticResponse, input, mutationName)
            ),
            update: (cache, result) => {
                // Simplify cache updates after mutations.
                handleModifiers(cache, result.data[mutationName], options.modifiers);

                if (options.update) {
                    options.update(cache, result);
                }
            },
        })
    );
};
