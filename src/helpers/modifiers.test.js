import { ApolloClient, InMemoryCache, gql } from '@apollo/client';
import { handleModifiers } from './modifiers';

const cache = new InMemoryCache({
    typePolicies: {
        WithKeyFields: {
            keyFields: ['keyA', 'keyB'],
        },
        WithNestedKeyFields: {
            keyFields: ['thing', ['id']],
        },
    },
});
const client = new ApolloClient({ cache });

afterEach(() => {
    client.resetStore();
});

it('includes the item if the parameter is true and the item is not already present', () => {
    const query = gql`
        query {
            things {
                id
            }
        }
    `;

    cache.writeQuery({
        query,
        data: {
            things: [{
                __typename: 'Thing',
                id: 'some-id',
            }],
        },
    });

    const item = {
        __typename: 'Thing',
        id: 'some-id-2',
    };
    const modifiers = [{
        fields: {
            things: ({ includeIf }) => includeIf(true),
        },
    }];

    cache.writeFragment({
        fragment: gql`
            fragment NewThing on Thing {
                id
            }
        `,
        data: item,
    });

    handleModifiers(cache, item, modifiers);

    const received = cache.readQuery({ query });
    const expected = {
        things: [{
            __typename: 'Thing',
            id: 'some-id',
        }, {
            __typename: 'Thing',
            id: 'some-id-2',
        }],
    };

    expect(received).toEqual(expected);
});

it('does not include the item if the parameter is true and the item is already present', () => {
    const query = gql`
        query {
            things {
                id
            }
        }
    `;

    cache.writeQuery({
        query,
        data: {
            things: [{
                __typename: 'Thing',
                id: 'some-id',
            }],
        },
    });

    const item = {
        __typename: 'Thing',
        id: 'some-id',
    };
    const modifiers = [{
        fields: {
            things: ({ includeIf }) => includeIf(true),
        },
    }];

    handleModifiers(cache, item, modifiers);

    const received = cache.readQuery({ query });
    const expected = {
        things: [{
            __typename: 'Thing',
            id: 'some-id',
        }],
    };

    expect(received).toEqual(expected);
});

it('excludes the item if the parameter is false and the item is present', () => {
    const query = gql`
        query {
            things {
                id
            }
        }
    `;

    cache.writeQuery({
        query,
        data: {
            things: [{
                __typename: 'Thing',
                id: 'some-id',
            }],
        },
    });

    const item = {
        __typename: 'Thing',
        id: 'some-id',
    };
    const modifiers = [{
        fields: {
            things: ({ includeIf }) => includeIf(false),
        },
    }];

    handleModifiers(cache, item, modifiers);

    const received = cache.readQuery({ query });
    const expected = {
        things: [],
    };

    expect(received).toEqual(expected);
});

it('does not exclude the item if the parameter is false and the item is not present', () => {
    const query = gql`
        query {
            things {
                id
            }
        }
    `;

    cache.writeQuery({
        query,
        data: {
            things: [{
                __typename: 'Thing',
                id: 'some-id',
            }],
        },
    });

    const item = {
        __typename: 'Thing',
        id: 'some-id-2',
    };
    const modifiers = [{
        fields: {
            things: ({ includeIf }) => includeIf(false),
        },
    }];

    handleModifiers(cache, item, modifiers);

    const received = cache.readQuery({ query });
    const expected = {
        things: [{
            __typename: 'Thing',
            id: 'some-id',
        }],
    };

    expect(received).toEqual(expected);
});

it('includes an item with custom key fields if the parameter is true and the item is not already present', () => {
    const query = gql`
        query {
            withKeyFields {
                keyA
                keyB
            }
        }
    `;

    cache.writeQuery({
        query,
        data: {
            withKeyFields: [{
                __typename: 'WithKeyFields',
                keyA: 'some-key-a',
                keyB: 'some-key-b',
            }],
        },
    });

    const item = {
        __typename: 'WithKeyFields',
        keyA: 'some-key-a-2',
        keyB: 'some-key-b-2',
    };
    const modifiers = [{
        fields: {
            withKeyFields: ({ includeIf }) => includeIf(true),
        },
    }];

    cache.writeFragment({
        fragment: gql`
            fragment NewWithKeyFields on WithKeyFields {
                keyA
                keyB
            }
        `,
        data: item,
    });

    handleModifiers(cache, item, modifiers);

    const received = cache.readQuery({ query });
    const expected = {
        withKeyFields: [{
            __typename: 'WithKeyFields',
            keyA: 'some-key-a',
            keyB: 'some-key-b',
        }, {
            __typename: 'WithKeyFields',
            keyA: 'some-key-a-2',
            keyB: 'some-key-b-2',
        }],
    };

    expect(received).toEqual(expected);
});

it('excludes an item with custom key fields if the parameter is false and the item is already present', () => {
    const query = gql`
        query {
            withKeyFields {
                keyA
                keyB
            }
        }
    `;

    cache.writeQuery({
        query,
        data: {
            withKeyFields: [{
                __typename: 'WithKeyFields',
                keyA: 'some-key-a',
                keyB: 'some-key-b',
            }],
        },
    });

    const item = {
        __typename: 'WithKeyFields',
        keyA: 'some-key-a',
        keyB: 'some-key-b',
    };
    const modifiers = [{
        fields: {
            withKeyFields: ({ includeIf }) => includeIf(false),
        },
    }];

    handleModifiers(cache, item, modifiers);

    const received = cache.readQuery({ query });
    const expected = {
        withKeyFields: [],
    };

    expect(received).toEqual(expected);
});

it('includes an item with nested custom key fields if the parameter is true and the item is not already present', () => {
    const query = gql`
        query {
            withNestedKeyFields {
                thing {
                    id
                }
            }
        }
    `;

    cache.writeQuery({
        query,
        data: {
            withNestedKeyFields: [{
                __typename: 'WithNestedKeyFields',
                thing: {
                    __typename: 'Thing',
                    id: 'some-id',
                },
            }],
        },
    });

    const item = {
        __typename: 'WithNestedKeyFields',
        thing: {
            __typename: 'Thing',
            id: 'some-id-2',
        },
    };
    const modifiers = [{
        fields: {
            withNestedKeyFields: ({ includeIf }) => includeIf(true),
        },
    }];

    cache.writeFragment({
        fragment: gql`
            fragment NewWithNestedKeyFields on WithNestedKeyFields {
                thing {
                    id
                }
            }
        `,
        data: item,
    });

    handleModifiers(cache, item, modifiers);

    const received = cache.readQuery({ query });
    const expected = {
        withNestedKeyFields: [{
            __typename: 'WithNestedKeyFields',
            thing: {
                __typename: 'Thing',
                id: 'some-id',
            },
        }, {
            __typename: 'WithNestedKeyFields',
            thing: {
                __typename: 'Thing',
                id: 'some-id-2',
            },
        }],
    };

    expect(received).toEqual(expected);
});

it('excludes an item with nested custom key fields if the parameter is false and the item is already present', () => {
    const query = gql`
        query {
            withNestedKeyFields {
                thing {
                    id
                }
            }
        }
    `;

    cache.writeQuery({
        query,
        data: {
            withNestedKeyFields: [{
                __typename: 'WithNestedKeyFields',
                thing: {
                    __typename: 'Thing',
                    id: 'some-id',
                },
            }],
        },
    });

    const item = {
        __typename: 'WithNestedKeyFields',
        thing: {
            __typename: 'Thing',
            id: 'some-id',
        },
    };
    const modifiers = [{
        fields: {
            withNestedKeyFields: ({ includeIf }) => includeIf(false),
        },
    }];

    handleModifiers(cache, item, modifiers);

    const received = cache.readQuery({ query });
    const expected = {
        withNestedKeyFields: [],
    };

    expect(received).toEqual(expected);
});
