import { useSubscription, gql } from '@apollo/client';
import { handleModifiers } from './helpers/modifiers';

export default (subscription, options = {}) => {
    const subscriptionAst = typeof subscription === 'string' ? gql(subscription) : subscription;
    const subscriptionName = subscriptionAst.definitions[0].selectionSet.selections[0].name.value;

    return useSubscription(subscriptionAst, {
        ...options,
        onData: (result) => {
            // Simplify cache updates after subscription notifications.
            handleModifiers(result.client.cache, result.data.data[subscriptionName], options.modifiers);

            if (options.onData) {
                options.onData(result);
            }
        },
    });
};
