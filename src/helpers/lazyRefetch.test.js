import { ApolloClient, InMemoryCache, ApolloLink, Observable, gql } from '@apollo/client';
import { print } from 'graphql/language/printer';
import { handleLazyRefetch } from './lazyRefetch';

let requests = [];
let responses = {};

const link = new ApolloLink((operation) => new Observable((observer) => {
    requests.push({
        name: operation.operationName,
        query: print(operation.query).replace(/\s+/g, ' ').trim(),
        variables: operation.variables,
        context: operation.getContext(),
    });

    observer.next({ data: responses[operation.operationName] || {} });
    observer.complete();
}));

const cache = new InMemoryCache();
const client = new ApolloClient({ link, cache });

const subscriptions = [];

const activateQuery = (query, variables, context) => {
    const observableQuery = client.watchQuery({ query: gql(query), variables, context });

    subscriptions.push(observableQuery.subscribe(() => {}));

    return observableQuery;
};

const settle = () => (
    new Promise((resolve) => { setTimeout(resolve, 10); })
);

afterEach(async () => {
    subscriptions.forEach((subscription) => subscription.unsubscribe());
    subscriptions.length = 0;
    requests = [];
    responses = {};
    await client.clearStore();
});

it('refetches only the matching fields of active queries, respecting aliases', async () => {
    responses = {
        globalData: {
            months: [],
            kids: [{ __typename: 'Kid', id: 'k1' }],
        },
        __REFETCH__globalData: {
            months: ['2026-06-01'],
        },
    };

    activateQuery(`
        query globalData($someFilter: Filter) {
            months: observationMonths(filter: { hasPhotos: true })
            kids(filter: $someFilter) { id }
        }
    `, { someFilter: { group: 'g1' } });
    await settle();
    requests = [];

    handleLazyRefetch(client, ['observationMonths']);
    await settle();

    expect(requests).toHaveLength(1);
    expect(requests[0].query).toBe('query __REFETCH__globalData { months: observationMonths(filter: {hasPhotos: true}) }');
    expect(cache.extract().ROOT_QUERY['observationMonths({"filter":{"hasPhotos":true}})']).toEqual(['2026-06-01']);
});

it('requests each store field only once across multiple active queries', async () => {
    responses = {
        pageA: { observationMonths: [] },
        pageB: { observationMonths: [] },
        __REFETCH__pageA: { observationMonths: ['2026-06-01'] },
    };

    activateQuery('query pageA { observationMonths(filter: { pinned: true }) }');
    activateQuery('query pageB { observationMonths(filter: { pinned: true }) }');
    await settle();
    requests = [];

    handleLazyRefetch(client, ['observationMonths']);
    await settle();

    expect(requests).toHaveLength(1);
    expect(requests[0].name).toBe('__REFETCH__pageA');
});

it('refetches each active variable variant separately', async () => {
    responses = {
        pageA: { observationMonths: [] },
        pageB: { observationMonths: [] },
        __REFETCH__pageA: { observationMonths: ['2026-06-01'] },
        __REFETCH__pageB: { observationMonths: ['2026-05-01'] },
    };

    activateQuery('query pageA($filter: Filter) { observationMonths(filter: $filter) }', { filter: { pinned: true } });
    activateQuery('query pageB($filter: Filter) { observationMonths(filter: $filter) }', { filter: { pinned: false } });
    await settle();
    requests = [];

    handleLazyRefetch(client, ['observationMonths']);
    await settle();

    expect(requests).toHaveLength(2);
    expect(requests[0].query).toBe('query __REFETCH__pageA($filter: Filter) { observationMonths(filter: $filter) }');
    expect(requests[0].variables).toEqual({ filter: { pinned: true } });
    expect(requests[1].variables).toEqual({ filter: { pinned: false } });
});

it('includes fragments used within the matching fields', async () => {
    responses = {
        page: {
            things: [{ __typename: 'Thing', id: 't1', name: 'thing' }],
            other: [{ __typename: 'Other', id: 'o1' }],
        },
        __REFETCH__page: {
            things: [{ __typename: 'Thing', id: 't1', name: 'updated' }],
        },
    };

    activateQuery(`
        query page {
            things { ...thingFields }
            other { id }
        }

        fragment thingFields on Thing {
            id
            name
        }
    `);
    await settle();
    requests = [];

    handleLazyRefetch(client, ['things']);
    await settle();

    expect(requests).toHaveLength(1);
    expect(requests[0].query).toBe('query __REFETCH__page { things { ...thingFields __typename } } fragment thingFields on Thing { id name __typename }');
});

it('evicts cached variants that no active query contains', async () => {
    responses = {
        page: { observationMonths: [] },
    };

    // an inactive query's data, written directly into the cache
    cache.writeQuery({
        query: gql('query inactive { observationMonths(filter: { hasPhotos: true }) }'),
        data: { observationMonths: ['2026-01-01'] },
    });

    activateQuery('query page { observationMonths(filter: { pinned: true }) }');
    await settle();
    requests = [];

    handleLazyRefetch(client, ['observationMonths']);
    await settle();

    const rootFields = cache.extract().ROOT_QUERY;

    // the active variant was refetched and remains
    expect(rootFields['observationMonths({"filter":{"pinned":true}})']).toBeDefined();
    // the inactive variant was evicted so it will be requested again when it is next used
    expect(rootFields['observationMonths({"filter":{"hasPhotos":true}})']).toBeUndefined();
});

it('passes the original query context along to the refetch', async () => {
    responses = {
        page: { observationMonths: [] },
        __REFETCH__page: { observationMonths: ['2026-06-01'] },
    };

    activateQuery(
        'query page { observationMonths(filter: { pinned: true }) }',
        undefined,
        { authType: 'some-token-type' },
    );
    await settle();
    requests = [];

    handleLazyRefetch(client, ['observationMonths']);
    await settle();

    expect(requests).toHaveLength(1);
    expect(requests[0].context.authType).toBe('some-token-type');
});

it('does not refetch queries without matching fields', async () => {
    responses = {
        page: { kids: [{ __typename: 'Kid', id: 'k1' }] },
    };

    activateQuery('query page { kids { id } }');
    await settle();
    requests = [];

    handleLazyRefetch(client, ['observationMonths']);
    await settle();

    expect(requests).toHaveLength(0);
});
