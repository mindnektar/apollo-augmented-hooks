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
