[![npm version](https://badge.fury.io/js/apollo-augmented-hooks.svg)](//npmjs.com/package/apollo-augmented-hooks)

# apollo-augmented-hooks

Drop-in replacements for [@apollo/client](https://github.com/apollographql/apollo-client)'s `useQuery`, `useLazyQuery`, `useMutation` and `useSubscription` hooks with reduced overhead and additional functionality.

## What problems does this package solve?

- It attempts to make complex cache modification as painless as possible by providing additional helpers to `cache.modify` calls. See [this guide on caching](CACHING.md) for more information.
- It improves performance by automatically reducing the size of queries sent to the server by stripping all the fields from them that are already in the cache. See [this guide on reduced queries](REDUCED_QUERIES.md) for more information.
- It allows for smaller queries to be written by passing a data map to `useQuery`. See [this guide on data mapping](DATA_MAPPING.md) for more information.
- It allows you to globally provide context data for all queries and mutations using a hook. See [this guide on the global context hook](GLOBAL_CONTEXT_HOOK.md) for more information.
- It allows you to omit the [`gql`](https://www.apollographql.com/docs/resources/graphql-glossary/#gql-function) wrapper function from all query strings.
- It fixes a race condition causing cache updates with stale data when simultaneously performing mutations and poll requests.

## Installation

```bash
yarn add apollo-augmented-hooks
```

or

```bash
npm install --save apollo-augmented-hooks
```

In order to use the hooks, you need to make them aware of your apollo client instance during setup:

```js
import { ApolloClient } from '@apollo/client';
import { initAugmentedHooks } from 'apollo-augmented-hooks';

const client = new ApolloClient();

initAugmentedHooks(client);
```

## API

### useQuery

`useQuery` has the same signature as its [@apollo/client](https://www.apollographql.com/docs/react/api/react/hooks/#usequery) counterpart. Additionally, it supports the following new options:

#### - reducedQuery

Default: `true`. Set to `false` if you wish to disable the query reduction functionality. See [this guide on reduced queries](REDUCED_QUERIES.md) for more information.

#### - dataMap

An object telling `useQuery` which parts of the response data should be mapped to other parts. See [this guide on data mapping](DATA_MAPPING.md) for more information.

#### - pagination

*Experimental and WIP.*

### useMutation

`useMutation` has the same signature as its [@apollo/client](https://www.apollographql.com/docs/react/api/react/hooks/#usemutation) counterpart. Additionally, the mutation function supports the following new options:

#### - input

`input` can be used in place of the `variables` option. If the mutation takes only a single argument, `input` allows the omission of that argument's name. This reduces a bit of overhead with APIs where that is true for the vast majority of mutations.

Example:

*With @apollo/client*

```js
mutate({
    variables: {
        data: {
            someKey: 'some value'
        }
    }
});
```

*With apollo-augmented-hooks*

```js
mutate({
    input: {
        someKey: 'some value'
    }
});
```

#### - optimisticResponse

`optimisticResponse` is already available in the original `useMutation`, but it now provides a way to reduce some overhead. It automatically adds the attributes from the `input` object as well as the `__typename: 'Mutation'` part.

Example:

*With @apollo/client*

```js
const input = {
    someKey: 'some value',
    someOtherKey: 'some other value'
};

mutate({
    variables: {
        input
    },
    optimisticResponse: {
        __typename: 'Mutation',
        createThing: {
            __typename: 'Thing',
            someKey: 'some value',
            someOtherKey: 'some other value',
            someKeyNotInTheInput: 'foo'
        }
    }
});
```

*With apollo-augmented-hooks*

```js
const input = {
    someKey: 'some value',
    someOtherKey: 'some other value'
};

mutate({
    input,
    optimisticResponse: {
        __typename: 'Thing',
        someKeyNotInTheInput: 'foo'
    }
});
```

#### - modifiers

`modifiers` serves as a helper to make cache updates after a mutation as pain-free as possible. It accepts an array of modifiers, and each modifier is either an object supporting the following options or a function returning such an object. See [this guide on caching](CACHING.md) for a more detailed explanation and plenty of examples.

##### cacheObject

The object that you wish to update in the cache. If you have an object with a `__typename` and an `id` property, you can pass it here, and the modifier will use apollo's `cache.identify` on it so you don't have to. Alternatively you can pass a function returning your cache object. If you do so, the function's single parameter will be the data returned by your mutation, which you can use to determine your cache object.

##### typename

If you have more than one object to update after your mutation, you can pass a `typename`, which will cause all objects in your cache with that typename to be modified.

If you pass neither `cacheObject` nor `typename`, the modifier will assume `ROOT_QUERY`.

##### fields

This works the same as apollo's [cache.modify](https://www.apollographql.com/docs/react/caching/cache-interaction/#cachemodify), except that each field function gets passed only the `details` object. To make cache updating easier, the `details` object of each field function contains a few additional helpers:

###### *previous*

This is what used to be the field function's first parameter, the field's previous value. Since it is often not needed, it is now part of the `details` object and can simply be ignored.

###### *cacheObject*

This is the cache object that you are currently modifying a field on. This helper is especially useful in conjunction with the `typename` option. See [this section in the caching guide](CACHING.md#how-do-i-handle-nm-relationships-in-the-cache) for a walk-through of a concrete use case.

###### *item*

The data returned by your mutation.

###### *itemRef*

The ref object that you should return in your modifier function. Equivalent to `cache.toReference(item)`.

###### *variables*

The variables that were used to create the field that you are currently modifying. Its stringified form is already available on `details.storeFieldName`, but a proper variables object is missing in apollo's implementation.

###### *includeIf*

If the field you are modifying is an array, you can call `includeIf` with a boolean parameter saying whether or not the mutation result should be part of the array. If it is not already part of it but should be, it will be added; if it is already part of it but shouldn't be, it will be removed.

Example:

*With @apollo/client*

```js
mutate({
    variables: {
        input: someInput
    },
    update: (cache, result) => {
        cache.modify({
            id: cache.identify(someObject),
            fields: {
                things: (previous, { readField, toReference }) => (
                    const next = previous.filter((ref) => details.readField('id', ref) !== item.id);

                    if (includeIf) {
                        next.push(details.toReference(item));
                    }

                    return next;
                ),
            },
        })
    },
});
```

*With apollo-augmented-hooks*

```js
mutate({
    input: someInput,
    modifiers: [{
        cacheObject: someObject,
        fields: {
            things: ({ includeIf }) => (
                includeIf(true)
            ),
        },
    }],
});
```

You can pass a second parameter to `includeIf` that allows you to specify exactly what subjects you'd like to add to the field (if you don't want to add your mutation's result directly) and what the field's original value should be (if you don't want the field's previous value to be used): `includeIf(true, { subjects: [thingA, thingB], origin: [] })`

###### *setIf*

`setIf` works just like `includeIf` but should be used for objects rather than arrays:

```js
mutate({
    input: someInput,
    modifiers: [{
        cacheObject: someObject,
        fields: {
            thing: ({ setIf }) => (
                setIf(true)
            ),
        },
    }],
});
```

##### newFields

Sometimes you might want to add fields to cache objects that do not exist yet in order to avoid another server roundtrip to fetch data that your mutation already provides. `cache.modify` can't do that (as the name suggests, you can only modify existing fields), and `cache.writeQuery` is very verbose, so `newFields` provides a compact way to accomplish it. It has essentially the same API as `fields`, but the only available helpers are `cacheObject`, `item`, `itemRef` and `toReference`. Since there is no previous data (as we're adding a new field), many of the helpers necessary for `fields` are obsolete here.

Example for adding the field `things` to the root query:

```js
mutate({
    input: someInput,
    modifiers: [{
        newFields: {
            things: ({ itemRef }) => itemRef,
        },
    }],
});
```

If you wish to add a parameterized field to the cache, you can pass the variables like this:

```js
mutate({
    input: someInput,
    modifiers: [{
        newFields: {
            things: {
                variables: { someKey: someValue },
                modify: ({ itemRef }) => itemRef,
            },
        },
    }],
});
```

The `variables` attribute also supports a functional notation. Its single parameter is an object containing an `item` attribute, which is the data returned by your mutation:

```js
mutate({
    input: someInput,
    modifiers: [{
        newFields: {
            things: {
                variables: ({ item }) => ({
                    id: item.id
                }),
                modify: ({ itemRef }) => itemRef,
            },
        },
    }],
});
```

##### evict

If the cache object(s) of your modifier should be removed from the cache entirely, simply use `evict: true`.

### useLazyQuery

`useLazyQuery` has the same signature as its [@apollo/client](https://www.apollographql.com/docs/react/api/react/hooks/#uselazyquery) counterpart. Additionally, the execute function supports the following new options:

#### - modifiers

Works exactly the same as its [useMutation counterpart](#-modifiers).

### useSubscription

`useSubscription` has the same signature as its [@apollo/client](https://www.apollographql.com/docs/react/api/react/hooks/#usesubscription) counterpart. Additionally, it supports the following new options:

#### - modifiers

Works exactly the same as its [useMutation counterpart](#-modifiers).

### combineResults

If you have more than one instance of `useQuery` in your hook (e.g. one regular query and one query for polling), you can easily merge their results like this:

```js
export default () => {
    const result = useQuery(...);
    const pollResult = useQuery(...);

    return combineResults(result, pollResult);
};
```

### setGlobalContextHook

See [this guide on the global context hook](GLOBAL_CONTEXT_HOOK.md).

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate.

### Build

```bash
npm run build
```

### Test

```bash
npm test
```

## License
[MIT](https://opensource.org/licenses/MIT)
