import { ApolloClient, InMemoryCache, ApolloLink, Observable, gql, useSubscription as useApolloSubscription } from '@apollo/client';
import useSubscription from './useSubscription';

jest.mock('@apollo/client', () => ({
    ...jest.requireActual('@apollo/client'),
    useSubscription: jest.fn(),
}));

let requests = [];
let responses = {};

const link = new ApolloLink((operation) => new Observable((observer) => {
    requests.push(operation.operationName);

    observer.next({ data: responses[operation.operationName] || {} });
    observer.complete();
}));

const client = new ApolloClient({ link, cache: new InMemoryCache() });

const subscriptions = [];

const activateQuery = (query) => {
    const observableQuery = client.watchQuery({ query: gql(query) });

    subscriptions.push(observableQuery.subscribe(() => {}));

    return observableQuery;
};

const settle = () => (
    new Promise((resolve) => { setTimeout(resolve, 10); })
);

// Renders nothing; just hands a notification to the options the hook passes to apollo's useSubscription.
const notify = (subscription, options, data) => {
    useSubscription(subscription, options);

    const { onData } = useApolloSubscription.mock.calls.at(-1)[1];

    onData({ client, data: { data } });
};

afterEach(async () => {
    subscriptions.forEach((subscription) => subscription.unsubscribe());
    subscriptions.length = 0;
    requests = [];
    responses = {};
    useApolloSubscription.mockClear();
    await client.clearStore();
});

it('refetches only the specified fields of active queries after a notification, keeping the previous data meanwhile', async () => {
    responses = {
        globalData: {
            activities: [{ __typename: 'Activity', id: 'a1' }],
            kids: [{ __typename: 'Kid', id: 'k1' }],
        },
        __REFETCH__globalData: {
            activities: [{ __typename: 'Activity', id: 'a1' }, { __typename: 'Activity', id: 'a2' }],
        },
    };

    const observableQuery = activateQuery('query globalData { activities { id } kids { id } }');

    await settle();
    requests = [];

    notify(
        'subscription activityCreated { activityCreated { id } }',
        { lazyRefetch: ['activities'] },
        { activityCreated: { __typename: 'Activity', id: 'a2' } },
    );

    expect(observableQuery.getCurrentResult().data.activities.map(({ id }) => id)).toEqual(['a1']);

    await settle();

    expect(requests).toEqual(['__REFETCH__globalData']);
    expect(observableQuery.getCurrentResult().data.activities.map(({ id }) => id)).toEqual(['a1', 'a2']);
});

it('still calls the onData option', () => {
    const onData = jest.fn();

    notify('subscription activityCreated { activityCreated { id } }', { lazyRefetch: ['activities'], onData }, { activityCreated: null });

    expect(onData).toHaveBeenCalledTimes(1);
});

it('delivers the changes of the modifiers to all active queries at once, before any timers run', async () => {
    responses = {
        kids: { kids: [{ __typename: 'Kid', id: 'k1' }, { __typename: 'Kid', id: 'k2' }] },
        groups: { groups: [{ __typename: 'Group', id: 'g1', kids: [{ __typename: 'Kid', id: 'k1' }] }] },
    };

    const kidsQuery = activateQuery('query kids { kids { id } }');
    const groupsQuery = activateQuery('query groups { groups { id kids { id } } }');

    await settle();

    const order = [];

    subscriptions.push(kidsQuery.subscribe(({ data }) => order.push(`kids: ${data.kids.map(({ id }) => id)}`)));
    subscriptions.push(groupsQuery.subscribe(({ data }) => order.push(`group: ${data.groups[0].kids.map(({ id }) => id)}`)));

    await settle();
    order.length = 0;
    setTimeout(() => order.push('timer'));

    notify(
        'subscription kidsDeactivated { kidsDeactivated { id } }',
        {
            modifiers: [{
                fields: {
                    kids: ({ includeIf }) => includeIf(false),
                },
            }, {
                typename: 'Group',
                fields: {
                    kids: ({ includeIf }) => includeIf(false),
                },
            }],
        },
        { kidsDeactivated: [{ __typename: 'Kid', id: 'k1' }] },
    );

    await settle();

    expect(order).toEqual(['kids: k2', 'group: ', 'timer']);
});
