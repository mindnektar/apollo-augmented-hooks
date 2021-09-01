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

    const inflatedData = inflateCacheData(cache, cache.readQuery({ query }), query);

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

it('includes every field of a sub selection even if it was already seen in the traversal', () => {
    const query = gql`
        query {
            conversations {
                id
                latestMessage {
                    id
                }
                communication {
                    id
                }
            }
            notifications {
                id
                message {
                    id
                    name
                    conversation {
                        id
                    }
                }
            }
        }
    `;
    const data = {
        notifications: [{
            __typename: 'Notification',
            id: 'some-notification-id',
            message: {
                __typename: 'Message',
                id: 'some-message-id',
                name: 'foo',
                conversation: {
                    __typename: 'Conversation',
                    id: 'some-conversation-id',
                },
            },
        }, {
            __typename: 'Notification',
            id: 'some-notification-id-2',
            message: {
                __typename: 'Message',
                id: 'some-message-id-2',
                name: 'foo',
                conversation: {
                    __typename: 'Conversation',
                    id: 'some-conversation-id',
                },
            },
        }],
        conversations: [{
            __typename: 'Conversation',
            id: 'some-conversation-id',
            latestMessage: {
                __typename: 'Message',
                id: 'some-message-id-2',
            },
            communication: {
                __typename: 'Communication',
                id: 'some-communication-id',
            },
        }],
    };
    const expected = {
        notifications: [{
            __typename: 'Notification',
            id: 'some-notification-id',
            message: {
                __typename: 'Message',
                id: 'some-message-id',
                name: 'foo',
                conversation: {
                    __typename: 'Conversation',
                    id: 'some-conversation-id',
                    latestMessage: {
                        __typename: 'Message',
                        id: 'some-message-id-2',
                        name: 'foo',
                        conversation: {
                            __typename: 'Conversation',
                            id: 'some-conversation-id',
                            latestMessage: {
                                __typename: 'Message',
                                id: 'some-message-id-2',
                            },
                            communication: {
                                __typename: 'Communication',
                                id: 'some-communication-id',
                            },
                        },
                    },
                    communication: {
                        __typename: 'Communication',
                        id: 'some-communication-id',
                    },
                },
            },
        }, {
            __typename: 'Notification',
            id: 'some-notification-id-2',
            message: {
                __typename: 'Message',
                id: 'some-message-id-2',
                name: 'foo',
                conversation: {
                    __typename: 'Conversation',
                    id: 'some-conversation-id',
                    latestMessage: {
                        __typename: 'Message',
                        id: 'some-message-id-2',
                    },
                    communication: {
                        __typename: 'Communication',
                        id: 'some-communication-id',
                    },
                },
            },
        }],
        conversations: [{
            __typename: 'Conversation',
            id: 'some-conversation-id',
            latestMessage: {
                __typename: 'Message',
                id: 'some-message-id-2',
                name: 'foo',
                conversation: {
                    __typename: 'Conversation',
                    id: 'some-conversation-id',
                    latestMessage: {
                        __typename: 'Message',
                        id: 'some-message-id-2',
                    },
                    communication: {
                        __typename: 'Communication',
                        id: 'some-communication-id',
                    },
                },
            },
            communication: {
                __typename: 'Communication',
                id: 'some-communication-id',
            },
        }],
    };

    cache.writeQuery({ query, data });

    const inflatedData = inflateCacheData(cache, cache.readQuery({ query }), query);

    expect(inflatedData).toEqual(expected);
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

    const inflatedData = inflateCacheData(cache, cache.readQuery({ query }), query);

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
                    title: 'some-title',
                    users: [{
                        __typename: 'User',
                        id: 'some-id-2',
                    }],
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

it('works with child data of the same type down the tree', () => {
    const query = gql`
        query {
            todos {
                id
                title
                assignee {
                    id
                    assignedTodos {
                        id
                        title
                    }
                }
            }
        }
    `;
    const data = {
        todos: [{
            __typename: 'Todo',
            id: 'some-id',
            title: 'Do the dishes',
            assignee: [{
                __typename: 'Person',
                id: 'alice',
                assignedTodos: [{
                    __typename: 'Todo',
                    id: 'some-id-2',
                    title: 'Do the dishes',
                }],
            }],
        }],
    };

    cache.writeQuery({ query, data });

    const inflatedData = inflateCacheData(cache, cache.readQuery({ query }), query);

    expect(inflatedData).toEqual(data);
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

    const inflatedData = inflateCacheData(cache, cache.readQuery({ query }), query);

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

    const inflatedData = inflateCacheData(cache, cache.readQuery({ query }), query);

    expect(inflatedData).toEqual({
        todos: [{
            __typename: 'Todo',
            id: 'some-id',
            things: [],
        }],
    });
});

it('includes both the alias and the regular name', () => {
    const query = gql`
        query {
            todos(someVar: "foo") {
                id
                childTodos {
                    id
                }
                childTodosWithVariable: todos(someVar: "bar") {
                    id
                }
                todos(someVar: "baz") {
                    id
                }
            }
            things {
                id
                todos {
                    id
                }
            }
        }
    `;
    const data = {
        todos: [{
            __typename: 'Todo',
            id: 'some-id',
            childTodos: [{
                __typename: 'Todo',
                id: 'some-id-2',
            }],
            childTodosWithVariable: [{
                __typename: 'Todo',
                id: 'some-id-3',
            }],
            todos: [{
                __typename: 'Todo',
                id: 'some-id-4',
            }],
        }],
        things: [{
            __typename: 'Thing',
            id: 'some-id-5',
            todos: [{
                __typename: 'Todo',
                id: 'some-id',
            }],
        }],
    };
    const expected = {
        todos: [{
            __typename: 'Todo',
            id: 'some-id',
            childTodos: [{
                __typename: 'Todo',
                id: 'some-id-2',
            }],
            childTodosWithVariable: [{
                __typename: 'Todo',
                id: 'some-id-3',
            }],
            todos: [{
                __typename: 'Todo',
                id: 'some-id-4',
            }],
        }],
        things: [{
            __typename: 'Thing',
            id: 'some-id-5',
            todos: [{
                __typename: 'Todo',
                id: 'some-id',
                childTodos: [{
                    __typename: 'Todo',
                    id: 'some-id-2',
                }],
                childTodosWithVariable: [{
                    __typename: 'Todo',
                    id: 'some-id-3',
                }],
                todos: [{
                    __typename: 'Todo',
                    id: 'some-id-4',
                }],
            }],
        }],
    };

    cache.writeQuery({ query, data });

    const inflatedData = inflateCacheData(cache, cache.readQuery({ query }), query);

    expect(inflatedData).toEqual(expected);
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

    const inflatedData = inflateCacheData(cache, cache.readQuery({ query }), query);

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

    const inflatedData = inflateCacheData(cache, cache.readQuery({ query }), query);

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
