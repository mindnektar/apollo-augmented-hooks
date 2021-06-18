# How does caching work with apollo-client and apollo-augmented-hooks?

By default, the results of all graphql requests made with `ApolloClient` are cached in the browser's memory, so that on subsequent requests of the same query there won't be another round trip to the server, because the requested data can be served from the cache instead. Of course, this approach vastly reduces server load, but it also introduces a whole world of cache management issues.

- What if you do something that changes the data in your application? You'll have to keep the cache up to date somehow.
- What if another user changes something that affects the data you see? Since there won't be another server request, you'll have to find another way to update your cache.

`ApolloClient` offers a bunch of cache management tools and some documentation to solve these issues, but unfortunately they ignore or glance over some of the more complicated use cases, many of which will have to be tackled at some point in a moderately complex real-world application.

`ApolloClient` includes a caching interface called `ApolloCache` and one proprietary implementation called `InMemoryCache`. It's the most prominent cache implementation for `ApolloClient` and the one we're going to focus on, because it's the only one that `apollo-augmented-hooks` works with.

## Table of contents

- [What does the cache look like?](#what-does-the-cache-look-like)
- [How do I update the cache after a mutation?](#how-do-i-update-the-cache-after-a-mutation)
- [How do I add something to the cache?](#how-do-i-add-something-to-the-cache)
- [How do I add something to the cache using apollo-augmented-hooks?](#how-do-i-add-something-to-the-cache-using-apollo-augmented-hooks)
- [How do I update a specific cache item rather than the root query?](#how-do-i-update-a-specific-cache-item-rather-than-the-root-query)
- [How do I delete something from the cache?](#how-do-i-delete-something-from-the-cache)

## What does the cache look like?

In order to correctly handle cache updates, it's important to understand the cache's structure. A little tip before we dive into it: For debugging purposes, you can use the [Apollo Client Devtools Chrome Extension](https://chrome.google.com/webstore/detail/apollo-client-devtools/jdkknkkbebbapilgoeccciglkfbmbnfm). Its most useful feature is that it allows you to inspect the current cache contents at any time.

The `InMemoryCache`'s structure is a simple normalised object. When the cache is empty, it is an empty object:

```javascript
{}
```

Now imagine we're requesting the following query from the server:

```graphql
query {
    todos {
        id
        title
    }
}
```

The server responds with two todos:

```javascript
{
    data: {
        todos: [{
            __typename: 'Todo',
            id: '36bad921-8fcf-4f33-9f29-0d3cd70205c8',
            title: 'Buy groceries'
        }, {
            __typename: 'Todo',
            id: 'a2096556-9a4e-4994-9de8-86c9e85ed6a1',
            title: 'Do the dishes'
        }]
    }
}
```

Without any further action on your part, `ApolloClient` will update the cache so that it looks like this:

```javascript
{
    ROOT_QUERY: {
        __typename: 'Query',
        todos: [{
            __ref: 'Todo:36bad921-8fcf-4f33-9f29-0d3cd70205c8'
        }, {
            __ref: 'Todo:a2096556-9a4e-4994-9de8-86c9e85ed6a1'
        }]
    },
    'Todo:36bad921-8fcf-4f33-9f29-0d3cd70205c8': {
        __typename: 'Todo',
        id: '36bad921-8fcf-4f33-9f29-0d3cd70205c8',
        title: 'Buy groceries'
    },
    'Todo:a2096556-9a4e-4994-9de8-86c9e85ed6a1': {
        __typename: 'Todo',
        id: 'a2096556-9a4e-4994-9de8-86c9e85ed6a1',
        title: 'Do the dishes'
    }
}
```

Let's unpack this. The cache object now has an element with the key `ROOT_QUERY`. This element is an object containing the results of all the queries we have made. Since we requested the field `todos`, the `ROOT_QUERY` object contains an element with the key `todos`. You'll notice that the `todos` array doesn't have the same structure as the server response. Instead, each array item consists of an object containing simply an element with the `__ref` key and a value built from the todo's `__typename` and its `id`. The data itself has been normalised and added to the cache object itself. Next to the `ROOT_QUERY` element, you will find the actual todos, each with the same key as the `__ref`s we saw before.

This happens with arbitrarily deep queries. Imagine we're requesting the following query:

```graphql
query {
    todos {
        id
        title
        user {
            id
            name
        }
    }
}
```

The server response might look like this:

```javascript
{
    data: {
        todos: [{
            __typename: 'Todo',
            id: '36bad921-8fcf-4f33-9f29-0d3cd70205c8',
            title: 'Buy groceries',
            user: {
                __typename: 'User',
                id: '2adb1120-d911-4196-ab1b-d5043cc7a00a',
                name: 'mindnektar'
            }
        }, {
            __typename: 'Todo',
            id: 'a2096556-9a4e-4994-9de8-86c9e85ed6a1',
            title: 'Do the dishes',
            user: {
                __typename: 'User',
                id: '2adb1120-d911-4196-ab1b-d5043cc7a00a',
                name: 'mindnektar'
            }
        }]
    }
}
```

Because the cache is normalised, it will now look like this:

```javascript
{
    ROOT_QUERY: {
        __typename: 'Query',
        todos: [{
            __ref: 'Todo:36bad921-8fcf-4f33-9f29-0d3cd70205c8'
        }, {
            __ref: 'Todo:a2096556-9a4e-4994-9de8-86c9e85ed6a1'
        }]
    },
    'Todo:36bad921-8fcf-4f33-9f29-0d3cd70205c8': {
        __typename: 'Todo',
        id: '36bad921-8fcf-4f33-9f29-0d3cd70205c8',
        title: 'Buy groceries',
        user: {
            __ref: 'User:2adb1120-d911-4196-ab1b-d5043cc7a00a'
        }
    },
    'Todo:a2096556-9a4e-4994-9de8-86c9e85ed6a1': {
        __typename: 'Todo',
        id: 'a2096556-9a4e-4994-9de8-86c9e85ed6a1',
        title: 'Do the dishes',
        user: {
            __ref: 'User:2adb1120-d911-4196-ab1b-d5043cc7a00a'
        }
    },
    'User:2adb1120-d911-4196-ab1b-d5043cc7a00a': {
        __typename: 'User',
        id: '2adb1120-d911-4196-ab1b-d5043cc7a00a',
        name: 'mindnektar'
    }
}
```

The `ROOT_QUERY` looks exactly like before, and each todo contains a reference to the user. And even though - since both todos are allocated to the same user - the server responded with duplicated data (the user's name attached to each todo), the cache's normalisation causes that data to be present only once.

This behaviour has one great advantage: Whenever a cache item is updated (e.g. because the user's name has changed), the entire cache object (with possibly hundreds or thousands of items) doesn't have to be traversed in search for instances of that user, but only a single item needs to be taken care of.

What happens if we request a field that doesn't have an id, though? Then the cache item won't be normalised. An example query:

```graphql
query {
    todos {
        id
        title
        user {
            name
        }
    }
}
```

The server response:

```javascript
{
    data: {
        todos: [{
            __typename: 'Todo',
            id: '36bad921-8fcf-4f33-9f29-0d3cd70205c8',
            title: 'Buy groceries',
            user: {
                __typename: 'User',
                name: 'mindnektar'
            }
        }, {
            __typename: 'Todo',
            id: 'a2096556-9a4e-4994-9de8-86c9e85ed6a1',
            title: 'Do the dishes',
            user: {
                __typename: 'User',
                name: 'mindnektar'
            }
        }]
    }
}
```

And the cache:

```javascript
{
    ROOT_QUERY: {
        __typename: 'Query',
        todos: [{
            __ref: 'Todo:36bad921-8fcf-4f33-9f29-0d3cd70205c8'
        }, {
            __ref: 'Todo:a2096556-9a4e-4994-9de8-86c9e85ed6a1'
        }]
    },
    'Todo:36bad921-8fcf-4f33-9f29-0d3cd70205c8': {
        __typename: 'Todo',
        id: '36bad921-8fcf-4f33-9f29-0d3cd70205c8',
        title: 'Buy groceries',
        user: {
            name: 'mindnektar'
        }
    },
    'Todo:a2096556-9a4e-4994-9de8-86c9e85ed6a1': {
        __typename: 'Todo',
        id: 'a2096556-9a4e-4994-9de8-86c9e85ed6a1',
        title: 'Do the dishes',
        user: {
            name: 'mindnektar'
        }
    }
}
```

This should be avoided at all costs. If any data of an unnormalised cache item needs to be updated, you will have to manually update each occurrence in the entire cache, which is unmaintainable. You must also never request the same thing sometimes with an id and sometimes without, because `ApolloClient` will throw an error when trying to update the cache after such a query.

Let me reiterate: Always include an id for each requested field.

Of course, sometimes an id might not be available because that particular type is identified differently, either by another name or by a combination of fields:

```graphql
query {
    users {
        name
        email
    }
}
```

Maybe users have no id and are instead identified by their combination of name and email. Luckily, you can very easily specify these exceptions in your `InMemoryCache` [configuration](https://www.apollographql.com/docs/react/caching/cache-configuration/#customizing-identifier-generation-by-type). This is what the cache might look like:

```javascript
{
    ROOT_QUERY: {
        __typename: 'Query',
        users: [{
            __ref: 'User:{"name":"mindnektar","email":"user@example.com"}'
        }]
    },
    'User:{"name":"mindnektar","email":"user@example.com"}': {
        __typename: 'User',
        name: 'mindnektar',
        email: 'user@example.com'
    }
}
```

## How do I update the cache after a mutation?

The vast majority of cache updates that you want to do are one of these three things:

1. You want to update an item that is already in the cache
1. You want to add a new item to the cache
1. You want to delete an item from the cache

Conveniently, `ApolloClient` automatically takes care of point 1 for us. Imagine the cache looks like this:

```javascript
{
    ROOT_QUERY: {
        __typename: 'Query',
        users: [{
            __ref: 'User:2adb1120-d911-4196-ab1b-d5043cc7a00a'
        }]
    },
    'User:2adb1120-d911-4196-ab1b-d5043cc7a00a': {
        __typename: 'User',
        id: '2adb1120-d911-4196-ab1b-d5043cc7a00a',
        name: 'mindnektar',
        email: 'test@example.com'
    }
}
```

Now the user calls a mutation that changes his email address:

```graphql
mutation {
    updateUserEmail(email: "mindnektar@example.com") {
        id
        email
    }
}
```

The server returns:

```javascript
{
    data: {
        updateUserEmail: {
            __typename: 'User',
            id: '2adb1120-d911-4196-ab1b-d5043cc7a00a',
            email: 'mindnektar@example.com'
        }
    }
}
```

Because we already have an item with the key `User:2adb1120-d911-4196-ab1b-d5043cc7a00a` in the cache, `ApolloClient` knows to automatically update it with the data returned by the mutation:

```javascript
{
    ROOT_QUERY: {
        __typename: 'Query',
        users: [{
            __ref: 'User:2adb1120-d911-4196-ab1b-d5043cc7a00a'
        }]
    },
    'User:2adb1120-d911-4196-ab1b-d5043cc7a00a': {
        __typename: 'User',
        id: '2adb1120-d911-4196-ab1b-d5043cc7a00a',
        name: 'mindnektar',
        email: 'mindnektar@example.com'
    }
}
```

If we hadn't requested the id along with the email, `ApolloClient` would have been unable to find the matching item in the cache and no update would have occurred. I will reiterate again: Always include the id field (or any other applicable key fields) everywhere.

When it comes to adding or deleting cache items however, `ApolloClient` can't possibly know what we expect to happen with the mutation response, so we have to do that manually. There are a couple of ways to achieve that. Before Apollo 3, cache updates were quite cumbersome and caused a lot of overhead. You had to use methods like `cache.readQuery`, `cache.writeQuery`, `cache.readFragement` and `cache.writeFragment`, which required you to use queries much like the ones you use to request data from the server. We will ignore those methods in favour of `cache.modify`, which is easier to use and much more flexible. Unfortunately, even `cache.modify` has its slew of problems, many of which `apollo-augmented-hooks` attempts to solve. We will take a look at how cache updates work the regular way using `cache.modify`, and then contrast that with the `apollo-augmented-hooks` solution.

## How do I add something to the cache?

Keeping with the example above, our cache initially looks like this:

```javascript
{
    ROOT_QUERY: {
        __typename: 'Query',
        users: [{
            __ref: 'User:2adb1120-d911-4196-ab1b-d5043cc7a00a'
        }]
    },
    'User:2adb1120-d911-4196-ab1b-d5043cc7a00a': {
        __typename: 'User',
        id: '2adb1120-d911-4196-ab1b-d5043cc7a00a',
        name: 'mindnektar'
    }
}
```

Now we create a new user with this mutation:

```graphql
mutation {
    createUser(name: "foobar") {
        id
        name
    }
}
```

The server returns:

```javascript
{
    data: {
        createUser: {
            __typename: 'User',
            id: '141738bf-3622-4beb-b0c5-0622e1e7311f',
            name: 'foobar'
        }
    }
}
```

The cache does not include a user with this id, so no automatic updates are performed. The item *will*, however, be appended to the cache automatically - it just won't be referenced anywhere:

```javascript
{
    ROOT_QUERY: {
        __typename: 'Query',
        users: [{
            __ref: 'User:2adb1120-d911-4196-ab1b-d5043cc7a00a'
        }]
    },
    'User:2adb1120-d911-4196-ab1b-d5043cc7a00a': {
        __typename: 'User',
        id: '2adb1120-d911-4196-ab1b-d5043cc7a00a',
        name: 'mindnektar'
    },
    'User:141738bf-3622-4beb-b0c5-0622e1e7311f': {
        __typename: 'User',
        id: '141738bf-3622-4beb-b0c5-0622e1e7311f',
        name: 'foobar'
    }
}
```

Let's take a look at the mutation hook:

```javascript
import { gql, useMutation } from '@apollo/client';

// Hard-coded name parameter for simplicity
const mutation = gql`
    mutation {
        createUser(name: "foobar") {
            id
            name
        }
    }
`;

export default () => {
    const [mutate] = useMutation(mutation);

    return () => (
        mutate({
            update: (cache, mutationResult) => {
                // TODO: Update cache here
            }
        })
    );
}
```

When calling the mutate function returned by this hook, the server request will be launched. Once it completes, the update function passed to the mutate function will be called, allowing you to manipulate the cache using the mutation result. We do that by calling `cache.modify`. `cache.modify` accepts a single options parameter, and for the vast majority of use cases you'll only need two of these options: `id` and `fields`.

Remembering the shape of the normalised cache object, each key references either an item in the cache or the `ROOT_QUERY`. `cache.modify`'s `id` option lets you choose which cache item to modify. For example, to modify a specific user, you might pass `User:2adb1120-d911-4196-ab1b-d5043cc7a00a`, or to modify the root query, you'll either pass `ROOT_QUERY` or simply omit the `id` option.

`fields` is a bit more complex. It is an object that allows you to specify how each field of the chosen cache item should be modified. In our example above, we are creating a new user, so it stands to reason that we would like to add it to our list of users in the cache. This can be done the following way:

```javascript
update: (cache, mutationResult) => {
    cache.modify({
        fields: {
            users: (previous) => {
                const newUserRef = cache.writeFragment({
                    data: mutationResult.data.createUser,
                    fragment: gql`
                        fragment NewUser on User {
                            id
                            name
                        }
                    `
                });

                return [...previous, newUserRef];
            }
        }
    });
}
```

As you can see, even in this very simple example, the cache modification is rather verbose already. Here's what's happening: We're calling `cache.modify` with its options parameter, omitting `id` (because we want to modify the root query) and passing `fields`. `fields` is an object containing all the fields that we wish to modify on the cache item - in this case we are only interested in `users`, but we could modify any number of fields on the root query at once. `users` is a modifier function. It has two parameters: the current cache contents and an object containing several helpers for interacting with the cache. In our example, we only need the current cache contents, so we omit the second parameter. The modifier function expects us to return the new cache contents, so with `[...previous, newUserRef]` we do exactly that: we return an array containing all the previous users and the user that was just created.

Now the question is, why do we have to do all that `cache.writeFragment` stuff rather than just return `[...previous, mutationResult.data.createUser]`? It's because the cache is normalised. If we didn't generate a reference using `cache.writeFragment`, the cache would end up looking like this:

```javascript
{
    ROOT_QUERY: {
        __typename: 'Query',
        users: [{
            __ref: 'User:2adb1120-d911-4196-ab1b-d5043cc7a00a'
        }, {
            __typename: 'User',
            id: '9541f397-69ce-4abf-9275-9e80b5058853',
            name: 'foobar'
        }]
    },
    'User:2adb1120-d911-4196-ab1b-d5043cc7a00a': {
        __typename: 'User',
        id: '2adb1120-d911-4196-ab1b-d5043cc7a00a',
        name: 'mindnektar'
    }
}
```

We would have a mix of normalised and non-normalised items in our users array, which would actually still work for the time being, but it would cause all kinds of trouble down the line, when trying to update the cache in the future. This happens to be one of the biggest gotchas in Apollo's cache management, because if you do it like this, you will likely not notice at first because no errors or warnings are thrown. You will only notice the aftereffects at a later point, when it will be difficult to figure out where the problem originally came from. So with emphasis: Always return refs in modifier functions, never the object itself.

The method explained above is the one recommended by the [official documentation](https://www.apollographql.com/docs/react/data/mutations/#making-all-other-cache-updates), but there happens to be a simpler way (even without using `apollo-augmented-hooks`) that for some reason is not part of the `cache.modify` [documentation](https://www.apollographql.com/docs/react/api/cache/InMemoryCache/#modifier-function-api) but buried deep in an [unrelated section](https://www.apollographql.com/docs/react/caching/advanced-topics/#cache-redirects-using-field-policy-read-functions). This is how it works:

```javascript
update: (cache, mutationResult) => {
    cache.modify({
        fields: {
            users: (previous, { toReference }) => (
                [...previous, toReference(mutationResult.data.createUser)]
            )
        }
    });
}
```

The modifier function's second parameter includes an undocumented helper function called `toReference`, which essentially does the same thing as the entire `cache.writeFragment` block above. It's much easier to use and produces cleaner and more maintainable code. I am not aware of any reason to use `cache.writeFragment` in favour of this.

Before we take a look at how this works with `apollo-augmented-hooks`, let's cover a slightly more complex example that you have to deal with all the time in real-world applications, but for which there exists no official solution at the time I'm writing this.

Imagine our todos query was parameterised:

```graphql
query todos($filter: TodoFilter!) {
    todos(filter: $filter) {
        id
        title
    }
}
```

The `TodoFilter` might allow the user to specify a time interval so the server only responds with todos that were created in that interval:

```javascript
import { gql, useQuery } from '@apollo/client';

const query = gql`
    query todos($filter: TodoFilter!) {
        todos(filter: $filter) {
            id
            title
        }
    }
`;

export default () => (
    useQuery(query, {
        variables: {
            filter: {
                from: '2021-04-01',
                to: '2021-04-30'
            }
        }
    })
);
```

Now what would the cache look like if we fired off such a query, possibly multiple times with different filters?

```javascript
{
    ROOT_QUERY: {
        __typename: 'Query',
        'todos({"filter":{"from":"2021-04-01","to":"2021-04-30"}})': [{
            __ref: 'Todo:36bad921-8fcf-4f33-9f29-0d3cd70205c8'
        }, {
            __ref: 'Todo:a2096556-9a4e-4994-9de8-86c9e85ed6a1'
        }],
        'todos({"filter":{"from":"2021-05-01","to":"2021-05-31"}})': [],
        'todos({"filter":{"from":"2021-04-01","to":"2021-05-31"}})': [{
            __ref: 'Todo:36bad921-8fcf-4f33-9f29-0d3cd70205c8'
        }, {
            __ref: 'Todo:a2096556-9a4e-4994-9de8-86c9e85ed6a1'
        }]
    },
    'Todo:36bad921-8fcf-4f33-9f29-0d3cd70205c8': {
        __typename: 'Todo',
        id: '36bad921-8fcf-4f33-9f29-0d3cd70205c8',
        title: 'Buy groceries'
    },
    'Todo:a2096556-9a4e-4994-9de8-86c9e85ed6a1': {
        __typename: 'Todo',
        id: 'a2096556-9a4e-4994-9de8-86c9e85ed6a1',
        title: 'Do the dishes'
    }
}
```

Depending on how many possible permutations there are for the filter, the root query might fill up quickly with lots of different items for the same query. Each different set of filters produces an additional cache item. So what happens if we create a new todo and update the cache using `cache.modify` like we did before?

```javascript
update: (cache, mutationResult) => {
    cache.modify({
        fields: {
            todos: (previous, { toReference }) => (
                [...previous, toReference(mutationResult.data.createTodo)]
            )
        }
    });
}
```

If we specifiy the `todos` field, the modifier function will be called once for every single cache item that was created with the todos query. The result is straightforward: Our new todo will be added to each cache item, no matter if it matches the parameters or not. This means that we may now have incorrect data in the cache. What we need to do instead is check if the new todo should be added to the cache item in each call of the modifier function.

Unfortunately, Apollo doesn't provide a convenient way to tell what the parameters for the current modifier function call are. The only thing we get is the `storeFieldName` helper. It contains the full name of the `todos` field we're currently handling, e.g. `todos({"filter":{"from":"2021-04-01","to":"2021-04-30"}})`. So while it is possible to access the filter parameters, it is on you to extract the data from the string so you can do your checks, possibly like this:

```javascript
update: (cache, mutationResult) => {
    cache.modify({
        fields: {
            todos: (previous, { toReference, storeFieldName }) => {
                const jsonVariables = storeFieldName.substring(
                    storeFieldName.indexOf('{'),
                    storeFieldName.lastIndexOf('}') + 1
                );
                const variables = JSON.parse(jsonVariables);
                const now = new Date();
                const from = new Date(variables.filter.from);
                const to = new Date(variables.filter.to);

                if (now >= from && now <= to) {
                    return [...previous, toReference(mutationResult.data.createTodo)];
                }

                return previous;
            }
        }
    });
}
```

Though this is already annoying enough, there are some cases in which the parameterised cache keys are formatted like this instead: `todos:{"filter":{"from":"2021-04-01","to":"2021-04-30"}}`, so you'll have to handle those cases as well. All of these things are not mentioned in the official documentation, so you'll have to stumble across them yourself or one of the [many](https://github.com/apollographql/react-apollo/issues/708) [years-spanning](https://github.com/apollographql/apollo-client/issues/1697) [github](https://github.com/apollographql/apollo-client/issues/2991) [issues](https://github.com/apollographql/apollo-client/issues/1546) where people are endlessly discussing this. This is one of the main problems that `apollo-augmented-hooks` seeks to solve.

## How do I add something to the cache using apollo-augmented-hooks?

Pretty similarly to the official way, but there are some key differences:

```javascript
import { useMutation } from 'apollo-augmented-hooks';

// Hard-coded name parameter for simplicity
const mutation = `
    mutation {
        createUser(name: "foobar") {
            id
            name
        }
    }
`;

export default () => {
    const mutate = useMutation(mutation);

    return () => (
        mutate({
            modifiers: [
                // TODO: Update cache here
            ]
        })
    );
}
```

1. We import `useMutation` from `apollo-augmented-hooks`, not from `@apollo/client`.
1. We don't need `gql` to transform the graphql string into an abstract syntax tree - this is done internally by `useMutation` (though you can still manually wrap the string in `gql`, if you wish).
1. `useMutation` doesn't return a tuple, the first element of which is the mutate function - instead, it only returns the mutate function (so you can omit the brackets).
1. Rather than passing an `update` function to the mutate call, you pass a `modifiers` array.

Let's take a look at how we can modify the cache in our example using the `modifiers` array.

```javascript
modifiers: [{
    fields: {
        todos: ({ includeIf, variables }) => {
            const now = new Date();
            const from = new Date(variables.filter.from);
            const to = new Date(variables.filter.to);

            return includeIf(now >= from && now <= to);
        }
    }
}]
```

`modifiers` is an array of objects, each of which will result in one call of `cache.modify`. The main difference is the signature of the modifier function. Originally, the first parameter was the previous cache content and the second parameter an object containing a bunch of helpers. The new signature includes only that helper object, because often you don't even need the previous cache content. If you do, you can access it on the helper object, with the `previous` key.

In our example, we don't need it because we make use of the `includeIf` helper instead. `includeIf` is a convenience function used for updating arrays in the cache - it returns the previous cache content, either with the server response included or removed, depending on whether the passed parameter is truthy or falsy. Additionally, we can use the `variables` helper, which contains the query variables for each cache item that we're updating, saving us the trouble of manually parsing `storeFieldName`.

Aside from `previous`, `variables`, `includeIf` and all the other [official helpers](https://www.apollographql.com/docs/react/api/cache/InMemoryCache/#modifier-function-api), the helper object also includes `item` (which is a less verbose way to access the server response than `mutationResult.data.createTodo`) and `itemRef`, which is synonymous with `toReference(item)`.

## How do I update a specific cache item rather than the root query?

For this use case, let's start with this cache:

```javascript
{
    ROOT_QUERY: {
        __typename: 'Query',
        users: [{
            __ref: 'User:2adb1120-d911-4196-ab1b-d5043cc7a00a'
        }, {
            __ref: 'User:141738bf-3622-4beb-b0c5-0622e1e7311f'
        }]
    },
    'User:2adb1120-d911-4196-ab1b-d5043cc7a00a': {
        __typename: 'User',
        id: '2adb1120-d911-4196-ab1b-d5043cc7a00a',
        name: 'mindnektar',
        todos: []
    },
    'User:141738bf-3622-4beb-b0c5-0622e1e7311f': {
        __typename: 'User',
        id: '141738bf-3622-4beb-b0c5-0622e1e7311f',
        name: 'foobar',
        todos: []
    }
}
```

Our application might consist of a number of user profiles, each of which contains a list of todos, and a user can create todos to display on their profile. The user `foobar` might want to do just that:

```graphql
mutation {
    createTodo(title: "Do the dishes") {
        id
        title
    }
}
```

The server returns:

```javascript
{
    data: {
        createTodo: {
            __typename: 'Todo',
            id: 'a2096556-9a4e-4994-9de8-86c9e85ed6a1',
            title: 'Do the dishes'
        }
    }
}
```

In this example, there is no `todos` root query we would append this new todo to - instead, we want to add it to the `todos` list belonging to the user who created it. The official way works like this:

```javascript
update: (cache, mutationResult) => {
    cache.modify({
        id: 'User:141738bf-3622-4beb-b0c5-0622e1e7311f',
        fields: {
            todos: (previous, { toReference }) => (
                [...previous, toReference(mutationResult.data.createTodo)]
            )
        }
    });
}
```

The `id` parameter specifies the key of the cache item that we wish to update - other than that, it works just like a modification to the root query. Of course, we want this code to work for any user, not just `foobar`, so we need to generate the `id` parameter dynamically.

```javascript
import { gql, useMutation } from '@apollo/client';

// Hard-coded title parameter for simplicity
const mutation = gql`
    mutation {
        createTodo(title: "Do the dishes") {
            id
            title
        }
    }
`;

export default (user) => {
    const [mutate] = useMutation(mutation);

    return () => (
        mutate({
            update: (cache, mutationResult) => {
                cache.modify({
                    id: `${user.__typename}:${user.id}`,
                    fields: {
                        todos: (previous, { toReference }) => (
                            [...previous, toReference(mutationResult.data.createTodo)]
                        )
                    }
                });
            }
        })
    );
}
```

You could pass the user object into the mutation hook from the component rendering it, assuming you've previously requested it with a graphql query. The user object contains `__typename` and `id` properties, so we can concatenate those to build our cache key. I'm sure you'll agree that this is not particularly elegant, and it will even fail to work when `id` is not the key field - luckily, there is a built-in convenience method:

```javascript
update: (cache, mutationResult) => {
    cache.modify({
        id: cache.identify(user),
        fields: {
            todos: (previous, { toReference }) => (
                [...previous, toReference(mutationResult.data.createTodo)]
            )
        }
    });
}
```

`cache.identify` transforms an object containing `__typename` and the respective key fields to generate the cache key for us.

With `apollo-augmented-hooks`, you simply provide a `cacheObject` prop rather than `id`. `cache.identify` is done internally.

```javascript
modifiers: [{
    cacheObject: user,
    fields: {
        todos: ({ includeIf }) => (
            includeIf(true)
        )
    }
}]
```

## How do I delete something from the cache?

There are a couple of ways, depending on what needs to be deleted. One of the most common use cases is removing an item from a list. Here's our example cache:

```javascript
{
    ROOT_QUERY: {
        __typename: 'Query',
        'todos': [{
            __ref: 'Todo:36bad921-8fcf-4f33-9f29-0d3cd70205c8'
        }, {
            __ref: 'Todo:a2096556-9a4e-4994-9de8-86c9e85ed6a1'
        }]
    },
    'Todo:36bad921-8fcf-4f33-9f29-0d3cd70205c8': {
        __typename: 'Todo',
        id: '36bad921-8fcf-4f33-9f29-0d3cd70205c8',
        title: 'Buy groceries'
    },
    'Todo:a2096556-9a4e-4994-9de8-86c9e85ed6a1': {
        __typename: 'Todo',
        id: 'a2096556-9a4e-4994-9de8-86c9e85ed6a1',
        title: 'Do the dishes'
    }
}
```

The mutation to delete a todo might look like this:

```graphql
mutation {
    deleteTodo(id: "36bad921-8fcf-4f33-9f29-0d3cd70205c8") {
        id
    }
}
```

And this is how we would remove the todo after the mutation the Apollo way:

```javascript
update: (cache, mutationResult) => {
    cache.modify({
        fields: {
            todos: (previous, { readField }) => (
                previous.filter((ref) => (
                    readField('id', ref) !== mutationResult.data.deleteTodo.id
                ))
            )
        }
    });
}
```

Just like when adding a todo, we modify the `todos` field by returning a new array - but this time, we need to filter the todo returned by the server from the list rather than append it. The problem is that each item in the `todos` array is not the actual todo in the cache, but the reference object (e.g. `{ __ref: 'Todo:36bad921-8fcf-4f33-9f29-0d3cd70205c8' }`), so we can't just use that for the comparison with the mutation result's id. Instead, we'll have to use the `readField` helper to get the `id` field from the actual cache item.

With `apollo-augmented-hooks`, we can simply use the `includeIf` helper again, which does the same thing internally:

```javascript
modifiers: [{
    fields: {
        todos: ({ includeIf }) => (
            includeIf(false)
        )
    }
}]
```

In either case, the cache will look like this:

```javascript
{
    ROOT_QUERY: {
        __typename: 'Query',
        'todos': [{
            __ref: 'Todo:a2096556-9a4e-4994-9de8-86c9e85ed6a1'
        }]
    },
    'Todo:36bad921-8fcf-4f33-9f29-0d3cd70205c8': {
        __typename: 'Todo',
        id: '36bad921-8fcf-4f33-9f29-0d3cd70205c8',
        title: 'Buy groceries'
    },
    'Todo:a2096556-9a4e-4994-9de8-86c9e85ed6a1': {
        __typename: 'Todo',
        id: 'a2096556-9a4e-4994-9de8-86c9e85ed6a1',
        title: 'Do the dishes'
    }
}
```

The reference is no longer in the `todos` array, but the cache item is still there. This is not an inherently terrible thing, but it is always better to keep the cache as clean as possible, and it will also benefit performance. One way is to call `cache.gc()`, which will garbage-collect all cache items that are not referenced anywhere else in the cache. Another is cache eviction:

```javascript
update: (cache, mutationResult) => {
    cache.evict({
        id: cache.identify(mutationResult.data.deleteTodo)
    });
    cache.gc();
}
```

Calling `cache.evict` will remove the specified item from the cache, and it also removes all references to it from any array in the cache. It is advisable to do a `cache.gc` afterwards anyway, because evicting the cache item might cause other cache items to no longer be referenced. See [this very helpful section](https://www.apollographql.com/docs/react/caching/garbage-collection/#cacheevict) in the official documentation for more info on what happens under the hood when using cache eviction.

The `modifiers` option in `apollo-augmented-hooks` also includes a convenient way to do the above:

```javascript
modifiers: [{
    cacheObject: (item) => item,
    evict: true,
}]
```

Since we don't have access to the mutation result in the modifiers array, `cacheObject` allows us to pass a function rather than the required cache object itself. That function's only parameter is synonymous with `mutationResult.data.deleteTodo`, so since that is exactly what we want to evict, we can simply return it here.

Evicting cache items is the recommended way to remove them from the cache, because with it you won't have to modify every single reference to the removed cache item manually. The automatic reference clean-up only works for arrays, however, so if your cache item is referenced not as a list member, you'll have to remove the reference yourself.
