import { ApolloClient, InMemoryCache, gql } from '@apollo/client';
import inflateCacheData from './inflateCacheData';

const cache = new InMemoryCache();
const client = new ApolloClient({ cache });

afterEach(() => {
    client.resetStore();
});

it('inflates sub selections with matching cache data', () => {
    const query = gql`
        query {
            todos {
                id
                title
                createdAt
                done
            }
            users {
                id
                todos {
                    id
                }
            }
        }
    `;

    cache.writeQuery({
        query,
        data: {
            todos: [{
                __typename: 'Todo',
                id: 'some-id',
                title: 'some-title',
                createdAt: 'some-createdAt',
                done: 'some-done',
            }],
            users: [{
                __typename: 'User',
                id: 'some-id-2',
                todos: [{
                    __typename: 'Todo',
                    id: 'some-id',
                }],
            }],
        },
    });

    const inflatedData = inflateCacheData(cache, cache.readQuery({ query }));

    expect(inflatedData).toEqual({
        todos: [{
            __typename: 'Todo',
            id: 'some-id',
            title: 'some-title',
            createdAt: 'some-createdAt',
            done: 'some-done',
        }],
        users: [{
            __typename: 'User',
            id: 'some-id-2',
            todos: [{
                __typename: 'Todo',
                id: 'some-id',
                title: 'some-title',
                createdAt: 'some-createdAt',
                done: 'some-done',
            }],
        }],
    });
});

it('avoids infinite loops', () => {
    const query = gql`
        query {
            todos {
                id
                title
                users {
                    id
                }
            }
            users {
                id
                name
                todos {
                    id
                }
            }
        }
    `;

    cache.writeQuery({
        query,
        data: {
            todos: [{
                __typename: 'Todo',
                id: 'some-id',
                title: 'some-title',
                users: [{
                    __typename: 'User',
                    id: 'some-id-2',
                }],
            }],
            users: [{
                __typename: 'User',
                id: 'some-id-2',
                name: 'some-name',
                todos: [{
                    __typename: 'Todo',
                    id: 'some-id',
                }],
            }],
        },
    });

    const inflatedData = inflateCacheData(cache, cache.readQuery({ query }));

    expect(inflatedData).toEqual({
        todos: [{
            __typename: 'Todo',
            id: 'some-id',
            title: 'some-title',
            users: [{
                __typename: 'User',
                id: 'some-id-2',
                name: 'some-name',
                todos: [{
                    __typename: 'Todo',
                    id: 'some-id',
                }],
            }],
        }],
        users: [{
            __typename: 'User',
            id: 'some-id-2',
            name: 'some-name',
            todos: [{
                __typename: 'Todo',
                id: 'some-id',
                title: 'some-title',
                users: [{
                    __typename: 'User',
                    id: 'some-id-2',
                }],
            }],
        }],
    });
});

it('does not inflate arrays of non-objects', () => {
    const query = gql`
        query {
            todos {
                id
                someArray
            }
        }
    `;

    cache.writeQuery({
        query,
        data: {
            todos: [{
                __typename: 'Todo',
                id: 'some-id',
                someArray: ['valueA', 'valueB'],
            }],
        },
    });

    const inflatedData = inflateCacheData(cache, cache.readQuery({ query }));

    expect(inflatedData).toEqual({
        todos: [{
            __typename: 'Todo',
            id: 'some-id',
            someArray: ['valueA', 'valueB'],
        }],
    });
});

it('removes references to non-existing cache objects', () => {
    const query = gql`
        query {
            todos {
                id
                things {
                    id
                }
            }
        }
    `;

    cache.writeQuery({
        query,
        data: {
            todos: [{
                __typename: 'Todo',
                id: 'some-id',
                things: [{
                    __typename: 'Thing',
                    id: 'some-id-2',
                }],
            }],
        },
    });

    cache.evict({ id: 'Thing:some-id-2' });

    const inflatedData = inflateCacheData(cache, cache.readQuery({ query }));

    expect(inflatedData).toEqual({
        todos: [{
            __typename: 'Todo',
            id: 'some-id',
            things: [],
        }],
    });
});

it('works with child data of the same type', () => {
    const query = gql`
        query {
            todos {
                id
                title
                childTodos {
                    id
                    title
                }
            }
        }
    `;
    const data = {
        todos: [{
            __typename: 'Todo',
            id: 'some-id',
            title: 'Do the dishes',
            childTodos: [{
                __typename: 'Todo',
                id: 'some-id-2',
                title: 'Buy groceries',
            }],
        }],
    };

    cache.writeQuery({ query, data });

    const inflatedData = inflateCacheData(cache, cache.readQuery({ query }));

    expect(inflatedData).toEqual(data);
});

it('works with selection sets that are not in the cache', () => {
    const query = gql`
        query {
            users {
                id
                name
                address {
                    street
                }
                avatar {
                    url
                }
            }
        }
    `;

    cache.writeQuery({
        query,
        data: {
            users: [{
                __typename: 'User',
                id: 'some-id',
                name: 'some-name',
                address: {
                    __typename: 'Address',
                    street: 'some-street',
                },
                avatar: {
                    __typename: 'Media',
                    url: 'some-url',
                },
            }],
        },
    });

    const inflatedData = inflateCacheData(cache, cache.readQuery({ query }));

    expect(inflatedData).toEqual({
        users: [{
            __typename: 'User',
            id: 'some-id',
            name: 'some-name',
            address: {
                __typename: 'Address',
                street: 'some-street',
            },
            avatar: {
                __typename: 'Media',
                url: 'some-url',
            },
        }],
    });
});
