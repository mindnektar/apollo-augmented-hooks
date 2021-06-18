import { useSubscription, gql } from '@apollo/client';
import apolloClient from './apolloClient';
import { handleModifiers } from './helpers/modifiers';

export default (subscription, options = {}) => {
    const client = apolloClient();
    const subscriptionAst = typeof subscription === 'string' ? gql(subscription) : subscription;
    const subscriptionName = subscriptionAst.definitions[0].selectionSet.selections[0].name.value;

    return useSubscription(subscriptionAst, {
        ...options,
        client,
        onSubscriptionData: (result) => {
            // Simplify cache updates after subscription notifications.
            handleModifiers(client.cache, result.subscriptionData.data[subscriptionName], options.modifiers);

            if (options.onSubscriptionData) {
                options.onSubscriptionData(result);
            }
        },
    });
};
