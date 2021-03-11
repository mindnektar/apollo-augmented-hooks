# apollo-augmented-hooks

Drop-in replacements for [@apollo/client](https://github.com/apollographql/apollo-client)'s `useQuery` and `useMutation` hooks with reduced overhead and additional functionality.

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

`useQuery` implements an algorithm that strips all fields from your query that are already present in the cache. So if e.g. the cache contains the following:

```js
{
    ROOT_QUERY: {
        things: [
            { __ref: 'Thing:1' },
            { __ref: 'Thing:2' }
        ]
    },
    'Thing:1': {
        id: 1,
        name: 'some name',
        description: 'some description'
    },
    'Thing:2': {
        id: 2,
        name: 'some other name',
    }
}
```

and your query looks like this:

```
query {
    things {
        id
        name
        description
    }
}
```

the actual query being sent to the server will look like this:

```
query {
    things {
        id
        description
    }
}
```

This works arbitrarily deep and out of the box without any extra configuration. Depending on how often the same data is requested across your app's queries, this can severely reduce the server load and increase response time.

`useQuery` has the same signature as its [@apollo/client](https://www.apollographql.com/docs/react/api/react/hooks/#usequery) counterpart. Additionally, it supports the following new options:

#### reducedQuery

Default: `true`. Set to `false` if you wish to disable the above query reduction functionality.

### useMutation

`useMutation` has the same signature as its [@apollo/client](https://www.apollographql.com/docs/react/api/react/hooks/#usemutation) counterpart. However, it does not return a tuple of the mutation function and the mutation result, but just the mutation function, since the result can easily be accessed from the mutation's resolved promise. Additionally, the mutation function supports the following new options:

#### input

`input` can be used in place of the `variables` option. If the mutation takes only a single argument, `input` allows the omission of that argument's name. This reduces a bit of overhead with APIs where that is true for the vast majority of mutations.

Example:

```js
mutate({
    variables: {
        data: {
            someKey: 'some value'
        }
    }
});
```

is equivalent to

```js
mutate({
    input: {
        someKey: 'some value'
    }
});
```

#### optimisticResponse

`optimisticResponse` is already available in the original `useMutation`, but it now provides a way to reduce some overhead. It automatically adds the attributes from the `input` object as well as the `__typename: 'Mutation'` part.

Example:

```js
const input = {
    someKey: 'some value',
    someOtherKey: 'some other value'
};

mutate({
    input,
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

is equivalent to:

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

#### modifiers

`modifiers` serves as a helper to make cache updates after a mutation as pain-free as possible. It accepts an array of modifier objects with the following properties:

##### cacheObject

The object that you wish to update in the cache. If you have an object with a `__typename` and an `id` property, you can pass it here, and the modifier will use apollo's `cache.identify` on it so you don't have to. Alternatively you can pass a function returning your cache object. If you do so, the function's single parameter will be the data returned by your mutation, which you can use to determine your cache object.

##### typename

If you have more than one object to update after your mutation, you can pass a `typename`, which will cause all objects in your cache with that typename to be modified.

If you pass neither `cacheObject` nor `typename`, the modifier will assume `ROOT_QUERY`.

##### fields

This works the same as apollo's [cache.modify](https://www.apollographql.com/docs/react/caching/cache-interaction/#cachemodify), except that each field function gets passed only the `details` object. To make cache updating easier, the `details` object of each field function contains a few additional helpers:

###### previous

This is what used to be the field function's first parameter, the field's previous value. Since it is often not needed, it is now part of the `details` object and can simply be ignored.

###### item

The data returned by your mutation.

###### itemRef

The ref object that you should return in your modifier function. Equivalent to `cache.toReference(item)`.

###### variables

The variables that were used to create the field that you are currently modifying. Its stringified form is already available on `details.storeFieldName`, but a proper variables object is missing in apollo's implementation.

###### includeIf

If the field you are modifying is an array, you can call `includeIf` with a boolean parameter saying whether or not the mutation result should be part of the array. If it is not already part of it but should be, it will be added; if it is already part of it but shouldn't be, it will be removed.

##### evict

If the cache object(s) of your modifier should be removed from the cache entirely, simply use `evict: true`. Use this if writing the cache update logic is impossible or too complicated. The deleted cache objects will be refetched the next time a query using them is rerendered. This should be used in place of [refetchQueries](https://www.apollographql.com/docs/react/caching/advanced-topics/#rerunning-queries-after-a-mutation) to avoid potentially bombarding the server with too many requests after a cache update. In combination with `useQuery`s reduced queries, this can be really powerful, because it causes only the invalidated fields to be refetched, not the entire query.

Example:

```js
mutate({
    input: someInput,
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

is equivalent to:

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
[ISC](https://opensource.org/licenses/ISC)
