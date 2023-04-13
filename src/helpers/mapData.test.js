import mapData from './mapData';

it('maps an object to another object', () => {
    const cacheData = {
        users: [{
            __typename: 'User',
            id: 'some-user-id',
            todo: {
                __typename: 'Todo',
                id: 'some-todo-id',
            },
        }],
        todo: {
            __typename: 'Todo',
            id: 'some-todo-id',
            title: 'Do the dishes',
            user: {
                __typename: 'User',
                id: 'some-user-id',
            },
        },
    };
    const inflatedData = {
        users: [{
            __typename: 'User',
            id: 'some-user-id',
            todo: {
                __typename: 'Todo',
                id: 'some-todo-id',
                title: 'Do the dishes',
                user: {
                    __typename: 'User',
                    id: 'some-user-id',
                },
            },
        }],
        todo: {
            __typename: 'Todo',
            id: 'some-todo-id',
            title: 'Do the dishes',
            user: {
                __typename: 'User',
                id: 'some-user-id',
            },
        },
    };
    const dataMap = {
        'users.todo': 'todo',
    };

    expect(mapData(cacheData, dataMap)).toEqual(inflatedData);
});

it('maps an object to an array', () => {
    const cacheData = {
        users: [{
            __typename: 'User',
            id: 'some-user-id',
            todo: {
                __typename: 'Todo',
                id: 'some-todo-id',
            },
        }],
        todos: [{
            __typename: 'Todo',
            id: 'some-todo-id',
            title: 'Do the dishes',
            user: {
                __typename: 'User',
                id: 'some-user-id',
            },
        }],
    };
    const inflatedData = {
        users: [{
            __typename: 'User',
            id: 'some-user-id',
            todo: {
                __typename: 'Todo',
                id: 'some-todo-id',
                title: 'Do the dishes',
                user: {
                    __typename: 'User',
                    id: 'some-user-id',
                },
            },
        }],
        todos: [{
            __typename: 'Todo',
            id: 'some-todo-id',
            title: 'Do the dishes',
            user: {
                __typename: 'User',
                id: 'some-user-id',
            },
        }],
    };
    const dataMap = {
        'users.todo': 'todos',
    };

    expect(mapData(cacheData, dataMap)).toEqual(inflatedData);
});

it('maps an array to an array', () => {
    const cacheData = {
        users: [{
            __typename: 'User',
            id: 'some-user-id',
            todos: [{
                __typename: 'Todo',
                id: 'some-todo-id',
            }],
        }],
        todos: [{
            __typename: 'Todo',
            id: 'some-todo-id',
            title: 'Do the dishes',
            user: {
                __typename: 'User',
                id: 'some-user-id',
            },
        }],
    };
    const inflatedData = {
        users: [{
            __typename: 'User',
            id: 'some-user-id',
            todos: [{
                __typename: 'Todo',
                id: 'some-todo-id',
                title: 'Do the dishes',
                user: {
                    __typename: 'User',
                    id: 'some-user-id',
                },
            }],
        }],
        todos: [{
            __typename: 'Todo',
            id: 'some-todo-id',
            title: 'Do the dishes',
            user: {
                __typename: 'User',
                id: 'some-user-id',
            },
        }],
    };
    const dataMap = {
        'users.todos': 'todos',
    };

    expect(mapData(cacheData, dataMap)).toEqual(inflatedData);
});

it('maps a string to an object', () => {
    const cacheData = {
        users: [{
            __typename: 'User',
            id: 'some-user-id',
            todoId: 'some-todo-id',
        }],
        todo: {
            __typename: 'Todo',
            id: 'some-todo-id',
            title: 'Do the dishes',
            user: {
                __typename: 'User',
                id: 'some-user-id',
            },
        },
    };
    const inflatedData = {
        users: [{
            __typename: 'User',
            id: 'some-user-id',
            todoId: 'some-todo-id',
            todo: {
                __typename: 'Todo',
                id: 'some-todo-id',
                title: 'Do the dishes',
                user: {
                    __typename: 'User',
                    id: 'some-user-id',
                },
            },
        }],
        todo: {
            __typename: 'Todo',
            id: 'some-todo-id',
            title: 'Do the dishes',
            user: {
                __typename: 'User',
                id: 'some-user-id',
            },
        },
    };
    const dataMap = {
        'users.todoId': { fieldName: 'todo', target: 'todo' },
    };

    expect(mapData(cacheData, dataMap)).toEqual(inflatedData);
});

it('maps a string to an array', () => {
    const cacheData = {
        users: [{
            __typename: 'User',
            id: 'some-user-id',
            todoId: 'some-todo-id',
        }],
        todos: [{
            __typename: 'Todo',
            id: 'some-todo-id',
            title: 'Do the dishes',
            user: {
                __typename: 'User',
                id: 'some-user-id',
            },
        }],
    };
    const inflatedData = {
        users: [{
            __typename: 'User',
            id: 'some-user-id',
            todoId: 'some-todo-id',
            todo: {
                __typename: 'Todo',
                id: 'some-todo-id',
                title: 'Do the dishes',
                user: {
                    __typename: 'User',
                    id: 'some-user-id',
                },
            },
        }],
        todos: [{
            __typename: 'Todo',
            id: 'some-todo-id',
            title: 'Do the dishes',
            user: {
                __typename: 'User',
                id: 'some-user-id',
            },
        }],
    };
    const dataMap = {
        'users.todoId': { fieldName: 'todo', target: 'todos' },
    };

    expect(mapData(cacheData, dataMap)).toEqual(inflatedData);
});

it('does not map if no data map is provided', () => {
    const cacheData = {
        users: [{
            __typename: 'User',
            id: 'some-user-id',
            todos: [{
                __typename: 'Todo',
                id: 'some-todo-id',
            }],
        }],
        todos: [{
            __typename: 'Todo',
            id: 'some-todo-id',
            title: 'Do the dishes',
            user: {
                __typename: 'User',
                id: 'some-user-id',
            },
        }],
    };

    expect(mapData(cacheData)).toEqual(cacheData);
});

it('does not map if there is no target data', () => {
    const cacheData = {
        users: [{
            __typename: 'User',
            id: 'some-user-id',
            todos: [{
                __typename: 'Todo',
                id: 'some-todo-id',
            }],
        }],
        todos: [{
            __typename: 'Todo',
            id: 'some-todo-id',
            title: 'Do the dishes',
            user: {
                __typename: 'User',
                id: 'some-user-id',
            },
        }],
    };
    const dataMap = {
        'users.todos': 'foo',
    };

    expect(mapData(cacheData, dataMap)).toEqual(cacheData);
});

it('does not map if the target data does not contain the origin data', () => {
    const cacheData = {
        users: [{
            __typename: 'User',
            id: 'some-user-id',
            todos: [{
                __typename: 'Todo',
                id: 'some-todo-id',
            }],
        }],
        todos: [{
            __typename: 'Todo',
            id: 'some-todo-id-2',
            title: 'Do the dishes',
            user: {
                __typename: 'User',
                id: 'some-user-id',
            },
        }],
    };
    const dataMap = {
        'users.todos': 'todos',
    };

    expect(mapData(cacheData, dataMap)).toEqual(cacheData);
});

it('handles empty data gracefully', () => {
    expect(mapData()).toBe(undefined);
});
