import { ApolloClient, InMemoryCache, gql } from '@apollo/client';
import { print } from 'graphql/language/printer';
import { makeReducedQueryAst } from './reducedQueries';

const cache = new InMemoryCache({
    typePolicies: {
        WithKeyFields: {
            keyFields: ['keyA', 'keyB'],
        },
    },
});
const client = new ApolloClient({ cache });

const compare = (reducedQueryAst, actualQuery) => {
    const received = print(reducedQueryAst).replace(/\s+/g, ' ').trim();
    const expected = actualQuery.replace(/\s+/g, ' ').trim();

    expect(received).toBe(expected);
};

afterEach(() => {
    client.resetStore();
});

it('removes fields that are already in the cache', () => {
    const queryInCache = `
        query {
            thing {
                id
                name
                description
            }
        }
    `;
    const requestedQuery = `
        query {
            thing {
                id
                name
                description
                age
            }
        }
    `;
    const actualQuery = `
        query __REDUCED__ {
            thing {
                id
                age
            }
        }
    `;

    cache.writeQuery({
        query: gql(queryInCache),
        data: {
            thing: {
                __typename: 'Thing',
                id: 'some-id',
                name: 'some-name',
                description: 'some-description',
            },
        },
    });

    const reducedQueryAst = makeReducedQueryAst(cache, gql(requestedQuery));

    compare(reducedQueryAst, actualQuery);
});

it('removes fields arbitrarily deep', () => {
    const queryInCache = `
        query {
            thing {
                id
                name
                description
                thing {
                    id
                    name
                    description
                    thing {
                        id
                        name
                        description
                    }
                }
            }
        }
    `;
    const requestedQuery = `
        query {
            thing {
                id
                name
                description
                age
                thing {
                    id
                    name
                    description
                    age
                    thing {
                        id
                        name
                        description
                    }
                }
            }
        }
    `;
    const actualQuery = `
        query __REDUCED__ {
            thing {
                id
                age
                thing {
                    id
                    age
                }
            }
        }
    `;

    cache.writeQuery({
        query: gql(queryInCache),
        data: {
            thing: {
                __typename: 'Thing',
                id: 'some-id',
                name: 'some-name',
                description: 'some-description',
                thing: {
                    __typename: 'Thing',
                    id: 'some-id-2',
                    name: 'some-name-2',
                    description: 'some-description-2',
                    thing: {
                        __typename: 'Thing',
                        id: 'some-id-3',
                        name: 'some-name-3',
                        description: 'some-description-3',
                    },
                },
            },
        },
    });

    const reducedQueryAst = makeReducedQueryAst(cache, gql(requestedQuery));

    compare(reducedQueryAst, actualQuery);
});

it('keeps fields when using arrays if at least one array item is missing the field in the cache', () => {
    const queryInCache = `
        query {
            things {
                id
                name
                description
            }
        }
    `;
    const requestedQuery = `
        query {
            things {
                id
                name
                description
                age
            }
        }
    `;
    const actualQuery = `
        query __REDUCED__ {
            things {
                id
                age
            }
        }
    `;

    cache.writeQuery({
        query: gql(queryInCache),
        data: {
            things: [{
                __typename: 'Thing',
                id: 'some-id',
                name: 'some-name',
                description: 'some-description',
                age: 'some-age',
            }, {
                __typename: 'Thing',
                id: 'some-id',
                name: 'some-name',
                description: 'some-description',
            }],
        },
    });

    const reducedQueryAst = makeReducedQueryAst(cache, gql(requestedQuery));

    compare(reducedQueryAst, actualQuery);
});

it('removes fields arbitrarily deep when using arrays', () => {
    const queryInCache = `
        query {
            things {
                id
                name
                description
                thing {
                    id
                    name
                    description
                    things {
                        id
                        name
                        description
                    }
                }
            }
        }
    `;
    const requestedQuery = `
        query {
            things {
                id
                name
                description
                age
                thing {
                    id
                    name
                    description
                    age
                    things {
                        id
                        name
                        description
                    }
                }
            }
        }
    `;
    const actualQuery = `
        query __REDUCED__ {
            things {
                id
                age
                thing {
                    id
                    age
                }
            }
        }
    `;

    cache.writeQuery({
        query: gql(queryInCache),
        data: {
            things: [{
                __typename: 'Thing',
                id: 'some-id',
                name: 'some-name',
                description: 'some-description',
                thing: {
                    __typename: 'Thing',
                    id: 'some-id-2',
                    name: 'some-name-2',
                    description: 'some-description-2',
                    things: [{
                        __typename: 'Thing',
                        id: 'some-id-3',
                        name: 'some-name-3',
                        description: 'some-description-3',
                    }],
                },
            }],
        },
    });

    const reducedQueryAst = makeReducedQueryAst(cache, gql(requestedQuery));

    compare(reducedQueryAst, actualQuery);
});

it('removes fields if all items in the array contain a null value', () => {
    const queryInCache = `
        query {
            thing {
                id
                things {
                    id
                    thing {
                        id
                        name
                    }
                }
            }
        }
    `;
    const requestedQuery = `
        query {
            thing {
                id
                things {
                    id
                    name
                    thing {
                        id
                        name
                        thing {
                            id
                        }
                    }
                }
            }
        }
    `;
    const actualQuery = `
        query __REDUCED__ {
            thing {
                id
                things {
                    id
                    name
                }
            }
        }
    `;

    cache.writeQuery({
        query: gql(queryInCache),
        data: {
            thing: {
                __typename: 'Thing',
                id: 'some-id',
                things: [{
                    __typename: 'Thing',
                    id: 'some-id-2',
                    thing: null,
                }, {
                    __typename: 'Thing',
                    id: 'some-id-3',
                    thing: null,
                }],
            },
        },
    });

    const reducedQueryAst = makeReducedQueryAst(cache, gql(requestedQuery));

    compare(reducedQueryAst, actualQuery);
});

it('removes fields if the cache item is there but the array is empty', () => {
    const queryInCache = `
        query {
            thing {
                id
                things {
                    id
                    thing {
                        id
                        name
                    }
                }
            }
        }
    `;
    const requestedQuery = `
        query {
            thing {
                id
                name
                things {
                    id
                    name
                    thing {
                        id
                        name
                        thing {
                            id
                        }
                    }
                }
            }
        }
    `;
    const actualQuery = `
        query __REDUCED__ {
            thing {
                id
                name
            }
        }
    `;

    cache.writeQuery({
        query: gql(queryInCache),
        data: {
            thing: {
                __typename: 'Thing',
                id: 'some-id',
                things: [],
            },
        },
    });

    const reducedQueryAst = makeReducedQueryAst(cache, gql(requestedQuery));

    compare(reducedQueryAst, actualQuery);
});

it('removes fields if there are other items in the array that contain useful data to continue traversing', () => {
    const queryInCache = `
        query {
            thing {
                id
                things {
                    id
                    thing {
                        id
                        name
                        thing {
                            id
                        }
                    }
                }
            }
        }
    `;
    const requestedQuery = `
        query {
            thing {
                id
                things {
                    id
                    name
                    thing {
                        id
                        name
                        thing {
                            id
                        }
                    }
                }
            }
        }
    `;
    const actualQuery = `
        query __REDUCED__ {
            thing {
                id
                things {
                    id
                    name
                }
            }
        }
    `;

    cache.writeQuery({
        query: gql(queryInCache),
        data: {
            thing: {
                __typename: 'Thing',
                id: 'some-id',
                things: [{
                    __typename: 'Thing',
                    id: 'some-id-2',
                    thing: null,
                }, {
                    __typename: 'Thing',
                    id: 'some-id-3',
                    thing: {
                        __typename: 'Thing',
                        id: 'some-id-4',
                        name: 'some-name-4',
                        thing: {
                            __typename: 'Thing',
                            id: 'some-id-5',
                        },
                    },
                }],
            },
        },
    });

    const reducedQueryAst = makeReducedQueryAst(cache, gql(requestedQuery));

    compare(reducedQueryAst, actualQuery);
});

it('keeps fields if there are other items in the cache with the same typename that contain useful data to continue traversing but they are not part of the array', () => {
    const queryInCache = `
        query {
            things {
                id
                foo {
                    id
                    bar {
                        id
                        name
                    }
                    bar2 {
                        id
                        name
                    }
                }
            }
            foo {
                id
                bar {
                    id
                    name
                }
                bar2 {
                    id
                    name
                }
            }
        }
    `;
    const requestedQuery = `
        query {
            things {
                id
                foo {
                    id
                    bar2 {
                        id
                        name
                    }
                }
            }
            boop {
                id
            }
        }
    `;
    const actualQuery = `
        query __REDUCED__ {
            things {
                id
                foo {
                    id
                    bar2 {
                        id
                        name
                    }
                }
            }
            boop {
                id
            }
        }
    `;

    cache.writeQuery({
        query: gql(queryInCache),
        data: {
            things: [{
                __typename: 'Thing',
                id: 'some-id',
                foo: {
                    __typename: 'Foo',
                    id: 'some-id-2',
                    bar: {
                        __typename: 'Bar',
                        id: 'some-id-3',
                        name: 'some-name-3',
                    },
                    bar2: null,
                },
            }, {
                __typename: 'Thing',
                id: 'some-id-4',
                foo: {
                    __typename: 'Foo',
                    id: 'some-id-5',
                    bar: {
                        __typename: 'Bar',
                        id: 'some-id-6',
                        name: 'some-name-6',
                    },
                },
            }],
            foo: {
                __typename: 'Foo',
                id: 'some-id-7',
                bar: {
                    __typename: 'Bar',
                    id: 'some-id-7',
                    name: 'some-name-7',
                },
                bar2: {
                    __typename: 'Bar',
                    id: 'some-id-8',
                    name: 'some-name-8',
                },
            },
        },
    });

    const reducedQueryAst = makeReducedQueryAst(cache, gql(requestedQuery));

    compare(reducedQueryAst, actualQuery);
});

it('removes fields if it exists in the cache but the value is null', () => {
    const queryInCache = `
        query {
            thing {
                id
                name
                description
            }
        }
    `;
    const requestedQuery = `
        query {
            thing {
                id
                name
                description
            }
            otherThing {
                id
            }
        }
    `;
    const actualQuery = `
        query __REDUCED__ {
            otherThing {
                id
            }
        }
    `;

    cache.writeQuery({
        query: gql(queryInCache),
        data: {
            thing: null,
        },
    });

    const reducedQueryAst = makeReducedQueryAst(cache, gql(requestedQuery));

    compare(reducedQueryAst, actualQuery);
});

it('removes fields if the same variables are used', () => {
    const queryInCache = `
        query test($filter: Filter) {
            things(filter: $filter) {
                id
                name
            }
        }
    `;
    const requestedQuery = `
        query test($filter: Filter) {
            things(filter: $filter) {
                id
                name
                description
            }
        }
    `;
    const actualQuery = `
        query __REDUCED__test($filter: Filter) {
            things(filter: $filter) {
                id
                description
            }
        }
    `;
    const variables = {
        filter: {
            someFilter: 'some-value',
        },
    };

    cache.writeQuery({
        query: gql(queryInCache),
        data: {
            things: [{
                __typename: 'Thing',
                id: 'some-id',
                name: 'some-name',
            }],
        },
        variables,
    });

    const reducedQueryAst = makeReducedQueryAst(cache, gql(requestedQuery), variables);

    compare(reducedQueryAst, actualQuery);
});

it('keeps fields if different variables are used', () => {
    const queryInCache = `
        query test($filter: Filter) {
            things(filter: $filter) {
                id
                name
            }
        }
    `;
    const requestedQuery = `
        query test($filter: Filter) {
            things(filter: $filter) {
                id
                name
            }
        }
    `;
    const actualQuery = `
        query __REDUCED__test($filter: Filter) {
            things(filter: $filter) {
                id
                name
            }
        }
    `;
    const variablesInCache = {
        filter: {
            someFilter: 'some-value',
        },
    };
    const requestedVariables = {
        filter: {
            someFilter: 'some-other-value',
        },
    };

    cache.writeQuery({
        query: gql(queryInCache),
        data: {
            things: [{
                __typename: 'Thing',
                id: 'some-id',
                name: 'some-name',
            }],
        },
        variables: variablesInCache,
    });

    const reducedQueryAst = makeReducedQueryAst(cache, gql(requestedQuery), requestedVariables);

    compare(reducedQueryAst, actualQuery);
});

it('removes fields if the same inline variables are used', () => {
    const queryInCache = `
        query {
            things(filter: "some-value") {
                id
                name
            }
        }
    `;
    const requestedQuery = `
        query {
            things(filter: "some-value") {
                id
                name
                description
            }
        }
    `;
    const actualQuery = `
        query __REDUCED__ {
            things(filter: "some-value") {
                id
                description
            }
        }
    `;

    cache.writeQuery({
        query: gql(queryInCache),
        data: {
            things: [{
                __typename: 'Thing',
                id: 'some-id',
                name: 'some-name',
            }],
        },
    });

    const reducedQueryAst = makeReducedQueryAst(cache, gql(requestedQuery));

    compare(reducedQueryAst, actualQuery);
});

it('removes the variable definition if it is no longer used', () => {
    const queryInCache = `
        query test($filter: Filter) {
            things(filter: $filter) {
                id
                name
            }
        }
    `;
    const requestedQuery = `
        query test($filter: Filter) {
            things(filter: $filter) {
                id
                name
            }
            thing(filter: "some-inline-value") {
                id
            }
        }
    `;
    const actualQuery = `
        query __REDUCED__test {
            thing(filter: "some-inline-value") {
                id
            }
        }
    `;
    const variables = {
        filter: {
            someFilter: 'some-value',
        },
    };

    cache.writeQuery({
        query: gql(queryInCache),
        data: {
            things: [{
                __typename: 'Thing',
                id: 'some-id',
                name: 'some-name',
            }],
        },
        variables,
    });

    const reducedQueryAst = makeReducedQueryAst(cache, gql(requestedQuery), variables);

    compare(reducedQueryAst, actualQuery);
});

it('keeps the variable definition if it is used in directives', () => {
    const queryInCache = `
        query test {
            things {
                id
                name
            }
        }
    `;
    const requestedQuery = `
        query test($isIncluded: Boolean, $isNotIncluded: Boolean) {
            things @include(if: $isNotIncluded) {
                id
                name
            }
            moreThings @include(if: $isIncluded) {
                id
                name
            }
        }
    `;
    const actualQuery = `
        query __REDUCED__test($isIncluded: Boolean) {
            moreThings @include(if: $isIncluded) {
                id
                name
            }
        }
    `;
    const variables = {
        filter: {
            isIncluded: true,
            $isNotIncluded: true,
        },
    };

    cache.writeQuery({
        query: gql(queryInCache),
        data: {
            things: [{
                __typename: 'Thing',
                id: 'some-id',
                name: 'some-name',
            }],
        },
        variables,
    });

    const reducedQueryAst = makeReducedQueryAst(cache, gql(requestedQuery), variables);

    compare(reducedQueryAst, actualQuery);
});

it('keeps the variable definition if it is used in nested variables', () => {
    const queryInCache = `
        query test($variable: Boolean) {
            things(input: {variable: $variable}) {
                id
                name
            }
        }
    `;
    const requestedQuery = `
        query test($variable: Boolean) {
            things(input: {variable: $variable}) {
                id
                name
                value
            }
        }
    `;
    const actualQuery = `
        query __REDUCED__test($variable: Boolean) {
            things(input: {variable: $variable}) {
                id
                value
            }
        }
    `;
    const variables = {
        variable: true,
    };

    cache.writeQuery({
        query: gql(queryInCache),
        data: {
            things: [{
                __typename: 'Thing',
                id: 'some-id',
                name: 'some-name',
            }],
        },
        variables,
    });

    const reducedQueryAst = makeReducedQueryAst(cache, gql(requestedQuery), variables);

    compare(reducedQueryAst, actualQuery);
});

it('works with nested inline variables', () => {
    const queryInCache = `
        query {
            thing {
                id
                withNestedVariables(
                    input: {first: 1}
                    filter: {happening: Future}
                    sort: ASC
                ) {
                    id
                    name
                }
            }
        }
    `;
    const requestedQuery = `
        query {
            thing {
                id
                withNestedVariables(
                    input: {first: 1}
                    filter: {happening: Future}
                    sort: ASC
                ) {
                    id
                    name
                    type
                }
            }
        }
    `;
    const actualQuery = `
        query __REDUCED__ {
            thing {
                id
                withNestedVariables(input: {first: 1}, filter: {happening: Future}, sort: ASC) {
                    id
                    type
                }
            }
        }
    `;

    cache.writeQuery({
        query: gql(queryInCache),
        data: {
            thing: {
                __typename: 'Thing',
                id: 'some-id',
                withNestedVariables: {
                    __typename: 'WithNestedVariables',
                    id: 'some-id-2',
                    name: 'some-name',
                },
            },
        },
    });

    const reducedQueryAst = makeReducedQueryAst(cache, gql(requestedQuery));

    compare(reducedQueryAst, actualQuery);
});

it('removes fields if they are in the cache but have no id', () => {
    const queryInCache = `
        query {
            things {
                id
                name
                subThing {
                    name
                }
            }
            otherThings {
                name
                subThing {
                    id
                    name
                }
            }
        }
    `;
    const requestedQuery = `
        query {
            things {
                id
                name
                subThing {
                    name
                }
            }
            otherThings {
                name
                subThing {
                    id
                    name
                    description
                }
            }
        }
    `;
    const actualQuery = `
        query __REDUCED__ {
            otherThings {
                subThing {
                    id
                    description
                }
            }
        }
    `;

    cache.writeQuery({
        query: gql(queryInCache),
        data: {
            things: [{
                __typename: 'Thing',
                id: 'some-id',
                name: 'some-name',
                subThing: {
                    __typename: 'Thing',
                    name: 'some-name-2',
                },
            }],
            otherThings: [{
                __typename: 'Thing',
                name: 'some-name-3',
                subThing: {
                    __typename: 'Thing',
                    id: 'some-id-4',
                    name: 'some-name-4',
                },
            }],
        },
    });

    const reducedQueryAst = makeReducedQueryAst(cache, gql(requestedQuery));

    compare(reducedQueryAst, actualQuery);
});

it('returns null if all the requested data is in the cache', () => {
    const queryInCache = `
        query {
            thing {
                id
                name
                description
            }
        }
    `;
    const requestedQuery = queryInCache;

    cache.writeQuery({
        query: gql(queryInCache),
        data: {
            thing: {
                __typename: 'Thing',
                id: 'some-id',
                name: 'some-name',
                description: 'some-description',
            },
        },
    });

    const reducedQueryAst = makeReducedQueryAst(cache, gql(requestedQuery));

    expect(reducedQueryAst).toEqual(null);
});

it('keeps fields if the data has been evicted from the cache', () => {
    const queryInCache = `
        query {
            thing {
                id
                name
                thing {
                    id
                    name
                }
            }
        }
    `;
    const requestedQuery = `
        query {
            thing {
                id
                name
                description
                thing {
                    id
                    name
                }
            }
        }
    `;
    const actualQuery = `
        query __REDUCED__ {
            thing {
                id
                description
                thing {
                    id
                    name
                }
            }
        }
    `;

    cache.writeQuery({
        query: gql(queryInCache),
        data: {
            thing: {
                __typename: 'Thing',
                id: 'some-id',
                name: 'some-name',
                thing: {
                    __typename: 'Thing',
                    id: 'some-id-2',
                    name: 'some-name-2',
                },
            },
        },
    });

    cache.evict({ id: 'Thing:some-id-2' });

    const reducedQueryAst = makeReducedQueryAst(cache, gql(requestedQuery));

    compare(reducedQueryAst, actualQuery);
});

it('removes scalar root fields if they are in the cache', () => {
    const queryInCache = `
        query {
            thing
        }
    `;
    const requestedQuery = `
        query {
            thing
            otherThing
        }
    `;
    const actualQuery = `
        query __REDUCED__ {
            otherThing
        }
    `;

    cache.writeQuery({
        query: gql(queryInCache),
        data: {
            thing: 'some-value',
        },
    });

    const reducedQueryAst = makeReducedQueryAst(cache, gql(requestedQuery));

    compare(reducedQueryAst, actualQuery);
});

it('keeps non-id key fields', () => {
    const queryInCache = `
        query {
            withKeyFields {
                keyA
                keyB
                id
                name
            }
        }
    `;
    const requestedQuery = `
        query {
            withKeyFields {
                keyA
                keyB
                id
                name
                description
            }
        }
    `;
    const actualQuery = `
        query __REDUCED__ {
            withKeyFields {
                keyA
                keyB
                description
            }
        }
    `;

    cache.writeQuery({
        query: gql(queryInCache),
        data: {
            withKeyFields: {
                __typename: 'WithKeyFields',
                keyA: 'some-special-key-a',
                keyB: 'some-special-key-b',
                id: 'some-id',
                name: 'some-name',
            },
        },
    });

    const reducedQueryAst = makeReducedQueryAst(cache, gql(requestedQuery));

    compare(reducedQueryAst, actualQuery);
});

it('removes fields if they are already in the cache when using key fields', () => {
    const queryInCache = `
        query {
            withKeyFields {
                keyA
                keyB
                id
                name
            }
        }
    `;
    const requestedQuery = `
        query {
            withKeyFields {
                keyA
                keyB
                id
                name
            }
            thing {
                id
            }
        }
    `;
    const actualQuery = `
        query __REDUCED__ {
            thing {
                id
            }
        }
    `;

    cache.writeQuery({
        query: gql(queryInCache),
        data: {
            withKeyFields: {
                __typename: 'WithKeyFields',
                keyA: 'some-special-key-a',
                keyB: 'some-special-key-b',
                id: 'some-id',
                name: 'some-name',
            },
        },
    });

    const reducedQueryAst = makeReducedQueryAst(cache, gql(requestedQuery));

    compare(reducedQueryAst, actualQuery);
});

it('ignores fragments', () => {
    const queryInCache = `
        query {
            thing {
                id
                name
                type
            }
        }
    `;
    const requestedQuery = `
        query {
            thing {
                id
                name
                ...SomeFragment
            }
        }
    `;
    const actualQuery = `
        query __REDUCED__ {
            thing {
                id
                ...SomeFragment
            }
        }
    `;

    cache.writeQuery({
        query: gql(queryInCache),
        data: {
            thing: {
                __typename: 'Thing',
                id: 'some-id',
                name: 'some-name',
                type: 'some-type',
            },
        },
    });

    const reducedQueryAst = makeReducedQueryAst(cache, gql(requestedQuery));

    compare(reducedQueryAst, actualQuery);
});

it('keeps variables if there are fragments', () => {
    const queryInCache = `
        query test($variableA: String, $variableB: String) {
            thing(variableA: $variableA) {
                id
                subThing(variableB: $variableB) {
                    id
                }
            }
        }
    `;
    const requestedQuery = `
        query test($variableA: String, $variableB: String) {
            thing(variableA: $variableA) {
                id
                ...SomeFragment
            }
        }
    `;
    const actualQuery = `
        query __REDUCED__test($variableA: String, $variableB: String) {
            thing(variableA: $variableA) {
                id
                ...SomeFragment
            }
        }
    `;
    const variables = {
        variableA: 'a',
        variableB: 'b',
    };

    cache.writeQuery({
        query: gql(queryInCache),
        data: {
            thing: {
                __typename: 'Thing',
                id: 'some-id',
                subThing: {
                    __typename: 'Thing',
                    id: 'some-id-2',
                },
            },
        },
        variables,
    });

    const reducedQueryAst = makeReducedQueryAst(cache, gql(requestedQuery), variables);

    compare(reducedQueryAst, actualQuery);
});

it('always drops local-only fields', () => {
    const queryInCache = `
        query {
            thing {
                id
                local @client
            }
        }
    `;
    const requestedQuery = `
        query {
            thing {
                id
                name
                local @client
            }
        }
    `;
    const actualQuery = `
        query __REDUCED__ {
            thing {
                id
                name
            }
        }
    `;

    cache.writeQuery({
        query: gql(queryInCache),
        data: {
            thing: {
                __typename: 'Thing',
                id: 'some-id',
                local: 'some-value',
            },
        },
    });

    const reducedQueryAst = makeReducedQueryAst(cache, gql(requestedQuery));

    compare(reducedQueryAst, actualQuery);
});

it('has the expected result in a complex query', () => {
    const queryInCache = `
        query test($a: A, $b: B, $c: C) {
            inCache {
                id
                name
                inCacheSub {
                    id
                    name
                }
                inCacheSubWithVars(a: $a) {
                    id
                    name
                }
            }
            inCacheWithVars(bDifferentName: $b) {
                id
                name
                inCacheWithVarsSub {
                    id
                    name
                }
                inCacheWithVarsSubWithVars(c: $c) {
                    id
                    name
                }
            }
        }
    `;
    const requestedQuery = `
        query test($a: A, $b: B, $c: C) {
            inCache {
                id
                name
                inCacheSub {
                    id
                    name
                }
                inCacheSubWithVars(a: $a) {
                    id
                    name
                    inCacheSubWithVarsSubNotInCache {
                        id
                        name
                    }
                }
                inCacheSubNotInCache {
                    id
                    name
                }
            }
            inCacheWithVars(bDifferentName: $b) {
                id
                name
                inCacheWithVarsSub {
                    id
                    name
                }
                inCacheWithVarsSubWithVars(c: $c) {
                    id
                    name
                }
            }
            notInCache {
                id
                name
            }
        }
    `;
    const actualQuery = `
        query __REDUCED__test($a: A, $b: B, $c: C) {
            inCache {
                id
                inCacheSubWithVars(a: $a) {
                    id
                    inCacheSubWithVarsSubNotInCache {
                        id
                        name
                    }
                }
                inCacheSubNotInCache {
                    id
                    name
                }
            }
            inCacheWithVars(bDifferentName: $b) {
                id
                inCacheWithVarsSubWithVars(c: $c) {
                    id
                    name
                }
            }
            notInCache {
                id
                name
            }
        }
    `;
    const variablesInCache = {
        a: 'a',
        b: 'b',
        c: 'c',
    };
    const requestedVariables = {
        a: 'a',
        b: 'b',
        c: 'c-altered',
    };

    cache.writeQuery({
        query: gql(queryInCache),
        data: {
            inCache: {
                __typename: 'Thing',
                id: 'some-id',
                name: 'some-name',
                inCacheSub: [{
                    __typename: 'Thing',
                    id: 'some-id-2',
                    name: 'some-name-2',
                }],
                inCacheSubWithVars: {
                    __typename: 'Thing',
                    id: 'some-id-3',
                    name: 'some-name-3',
                },
            },
            inCacheWithVars: [{
                __typename: 'Thing',
                id: 'some-id-4',
                name: 'some-name-4',
                inCacheWithVarsSub: {
                    __typename: 'Thing',
                    id: 'some-id-5',
                    name: 'some-name-5',
                },
                inCacheWithVarsSubWithVars: [{
                    __typename: 'Thing',
                    id: 'some-id-6',
                    name: 'some-name-6',
                }],
            }],
        },
        variables: variablesInCache,
    });

    const reducedQueryAst = makeReducedQueryAst(cache, gql(requestedQuery), requestedVariables);

    compare(reducedQueryAst, actualQuery);
});
