import { ApolloClient, InMemoryCache, gql } from '@apollo/client';
import { print } from 'graphql/language/printer';
import { makeReducedQueryAst } from './reducedQueries';

const cache = new InMemoryCache();
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

it('keeps fields if no array item in the cache contains useful data to continue traversing', () => {
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

it('returns the same query if all the requested data is in the cache', () => {
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

    expect(reducedQueryAst).toEqual(gql(requestedQuery));
});
