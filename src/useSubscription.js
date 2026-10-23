import { useSubscription, gql } from '@apollo/client';
import { handleModifiers } from './helpers/modifiers';
import { handleLazyRefetch } from './helpers/lazyRefetch';
import { clearReducedQueryCache } from './helpers/reducedQueries';

export default (subscription, options = {}) => {
    const subscriptionAst = typeof subscription === 'string' ? gql(subscription) : subscription;
    const subscriptionName = subscriptionAst.definitions[0].selectionSet.selections[0].name.value;

    return useSubscription(subscriptionAst, {
        ...options,
        onData: (result) => {
            // Simplify cache updates after subscription notifications.
            handleModifiers(result.client.cache, result.data.data[subscriptionName], options.modifiers);

            if (options.modifiers) {
                // Unlike after a mutation, apollo has already broadcast the notification by now, and would deliver the
                // modifiers' changes to each query on its own timer. Components could then render some of them without
                // the others, e.g. an item still referring to an entry that another query has already dropped.
                result.client.queryManager.broadcastQueries();
            }

            if (options.lazyRefetch) {
                // The evictions performed by the refetch handler change which data is missing from
                // the cache, so any memoized query reductions are no longer valid.
                clearReducedQueryCache();

                handleLazyRefetch(result.client, options.lazyRefetch);
            }

            if (options.onData) {
                options.onData(result);
            }
        },
    });
};
