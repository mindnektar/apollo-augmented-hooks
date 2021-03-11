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

WIP

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
