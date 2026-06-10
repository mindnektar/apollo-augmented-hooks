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

it('maps an array to directly provided data', () => {
    const cacheData = {
        users: [{
            __typename: 'User',
            id: 'some-user-id',
            todos: [{
                __typename: 'Todo',
                id: 'some-todo-id',
            }],
        }],
    };
    const todos = [{
        __typename: 'Todo',
        id: 'some-todo-id',
        title: 'Do the dishes',
    }];
    const inflatedData = {
        users: [{
            __typename: 'User',
            id: 'some-user-id',
            todos: [{
                __typename: 'Todo',
                id: 'some-todo-id',
                title: 'Do the dishes',
            }],
        }],
    };
    const dataMap = {
        'users.todos': { data: todos },
    };

    expect(mapData(cacheData, dataMap)).toEqual(inflatedData);
});

it('maps a string to directly provided data', () => {
    const cacheData = {
        users: [{
            __typename: 'User',
            id: 'some-user-id',
            todoId: 'some-todo-id',
        }],
    };
    const todos = [{
        __typename: 'Todo',
        id: 'some-todo-id',
        title: 'Do the dishes',
    }];
    const inflatedData = {
        users: [{
            __typename: 'User',
            id: 'some-user-id',
            todoId: 'some-todo-id',
            todo: {
                __typename: 'Todo',
                id: 'some-todo-id',
                title: 'Do the dishes',
            },
        }],
    };
    const dataMap = {
        'users.todoId': { fieldName: 'todo', data: todos },
    };

    expect(mapData(cacheData, dataMap)).toEqual(inflatedData);
});

it('maps an array to a globally registered source', () => {
    const cacheData = {
        users: [{
            __typename: 'User',
            id: 'some-user-id',
            todos: [{
                __typename: 'Todo',
                id: 'some-todo-id',
            }],
        }],
    };
    const sources = {
        todos: [{
            __typename: 'Todo',
            id: 'some-todo-id',
            title: 'Do the dishes',
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
            }],
        }],
    };
    const dataMap = {
        'users.todos': 'todos',
    };

    expect(mapData(cacheData, dataMap, sources)).toEqual(inflatedData);
});

it('prefers the query result over a globally registered source per id', () => {
    const cacheData = {
        users: [{
            __typename: 'User',
            id: 'some-user-id',
            todos: [{
                __typename: 'Todo',
                id: 'some-todo-id',
            }, {
                __typename: 'Todo',
                id: 'some-todo-id-2',
            }],
        }],
        todos: [{
            __typename: 'Todo',
            id: 'some-todo-id',
            title: 'Do the dishes',
        }],
    };
    const sources = {
        todos: [{
            __typename: 'Todo',
            id: 'some-todo-id',
            title: 'An outdated title',
        }, {
            __typename: 'Todo',
            id: 'some-todo-id-2',
            title: 'Walk the dog',
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
            }, {
                __typename: 'Todo',
                id: 'some-todo-id-2',
                title: 'Walk the dog',
            }],
        }],
        todos: [{
            __typename: 'Todo',
            id: 'some-todo-id',
            title: 'Do the dishes',
        }],
    };
    const dataMap = {
        'users.todos': 'todos',
    };

    expect(mapData(cacheData, dataMap, sources)).toEqual(inflatedData);
});

it('deep-merges entities that exist in both the query result and a registered source', () => {
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
            priority: 'high',
        }],
    };
    const sources = {
        todos: [{
            __typename: 'Todo',
            id: 'some-todo-id',
            title: 'Do the dishes',
            image: {
                __typename: 'Image',
                id: 'some-image-id',
                url: 'some-url',
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
                priority: 'high',
                image: {
                    __typename: 'Image',
                    id: 'some-image-id',
                    url: 'some-url',
                },
            }],
        }],
        todos: [{
            __typename: 'Todo',
            id: 'some-todo-id',
            priority: 'high',
        }],
    };
    const dataMap = {
        'users.todos': 'todos',
    };

    expect(mapData(cacheData, dataMap, sources)).toEqual(inflatedData);
});

it('merges nested entity arrays by id, keeping the query result\'s membership and order', () => {
    const cacheData = {
        users: [{
            __typename: 'User',
            id: 'some-user-id',
            todoId: 'some-todo-id',
        }],
        todos: [{
            __typename: 'Todo',
            id: 'some-todo-id',
            tags: [{
                __typename: 'Tag',
                id: 'some-tag-id-2',
            }],
        }],
    };
    const sources = {
        todos: [{
            __typename: 'Todo',
            id: 'some-todo-id',
            tags: [{
                __typename: 'Tag',
                id: 'some-tag-id',
                label: 'urgent',
            }, {
                __typename: 'Tag',
                id: 'some-tag-id-2',
                label: 'chores',
            }],
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
                tags: [{
                    __typename: 'Tag',
                    id: 'some-tag-id-2',
                    label: 'chores',
                }],
            },
        }],
        todos: [{
            __typename: 'Todo',
            id: 'some-todo-id',
            tags: [{
                __typename: 'Tag',
                id: 'some-tag-id-2',
            }],
        }],
    };
    const dataMap = {
        'users.todoId': { fieldName: 'todo', target: 'todos' },
    };

    expect(mapData(cacheData, dataMap, sources)).toEqual(inflatedData);
});

it('resolves nested arrays without ids to the query result wholesale', () => {
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
            labels: ['some-label'],
        }],
    };
    const sources = {
        todos: [{
            __typename: 'Todo',
            id: 'some-todo-id',
            labels: ['some-other-label', 'yet-another-label'],
        }],
    };
    const inflatedData = {
        users: [{
            __typename: 'User',
            id: 'some-user-id',
            todos: [{
                __typename: 'Todo',
                id: 'some-todo-id',
                labels: ['some-label'],
            }],
        }],
        todos: [{
            __typename: 'Todo',
            id: 'some-todo-id',
            labels: ['some-label'],
        }],
    };
    const dataMap = {
        'users.todos': 'todos',
    };

    expect(mapData(cacheData, dataMap, sources)).toEqual(inflatedData);
});

it('does not map if the target is neither in the query result nor in a registered source', () => {
    const cacheData = {
        users: [{
            __typename: 'User',
            id: 'some-user-id',
            todos: [{
                __typename: 'Todo',
                id: 'some-todo-id',
            }],
        }],
    };
    const dataMap = {
        'users.todos': 'todos',
    };

    expect(mapData(cacheData, dataMap)).toEqual(cacheData);
    expect(mapData(cacheData, dataMap, null)).toEqual(cacheData);
});

it('does not map if the directly provided data does not contain the origin data', () => {
    const cacheData = {
        users: [{
            __typename: 'User',
            id: 'some-user-id',
            todos: [{
                __typename: 'Todo',
                id: 'some-todo-id',
            }],
        }],
    };
    const todos = [{
        __typename: 'Todo',
        id: 'some-todo-id-2',
        title: 'Do the dishes',
    }];
    const dataMap = {
        'users.todos': { data: todos },
    };

    expect(mapData(cacheData, dataMap)).toEqual(cacheData);
});

it('handles empty data gracefully', () => {
    expect(mapData()).toBe(undefined);
});
