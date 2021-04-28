# How does caching work with apollo-client and apollo-augmented-hooks?

By default, the results of all graphql requests made with `ApolloClient` are cached in the browser's memory, so that on subsequent requests of the same query there won't be another round trip to the server, because the requested data can be served from the cache instead. Of course, this approach vastly reduces server load, but it also introduces a whole world of cache management issues.

- What if you do something that changes the data in your application? You'll have to keep the cache up to date somehow.
- What if another user changes something that affects the data you see? Since there won't be another server request, you'll have to find another way to update your cache.

`ApolloClient` offers a bunch of cache management tools and some documentation to solve these issues, but unfortunately they ignore or glance over some of the more complicated use cases, many of which will have to be tackled at some point in a moderately complex real-world application.

`ApolloClient` includes a caching interface called `ApolloCache` and one proprietary implementation called `InMemoryCache`. It's the most prominent cache implementation for `ApolloClient` and the one we're going to focus on, because it's the only one that `apollo-augmented-hooks` works with and I'm not aware of any other production-ready implementations.

## What does the cache look like?

In order to correctly handle cache updates, it's important to understand the cache's structure. A little tip before we dive into it: For debugging purposes, you can use the [Apollo Client Devtools Chrome Extension](https://chrome.google.com/webstore/detail/apollo-client-devtools/jdkknkkbebbapilgoeccciglkfbmbnfm). Its most useful feature is that it allows you to inspect the current cache contents at any time.

The `InMemoryCache`'s structure is a simple normalised object. When the cache is empty, it is an empty object:

```
{}
```

Now imagine we're requesting the following query from the server:

```
query {
    todos {
        id
        title
    }
}
```

The server responds with two todos:

```
{
    data: {
        todos: [{
            id: '36bad921-8fcf-4f33-9f29-0d3cd70205c8',
            title: 'Buy groceries'
        }, {
            id: 'a2096556-9a4e-4994-9de8-86c9e85ed6a1',
            title: 'Do the dishes'
        }]
    }
}
```

Without any further action on your part, `ApolloClient` will update the cache so that it looks like this:

```
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

```
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

```
{
    data: {
        todos: [{
            id: '36bad921-8fcf-4f33-9f29-0d3cd70205c8',
            title: 'Buy groceries',
            user: {
                id: '2adb1120-d911-4196-ab1b-d5043cc7a00a'
                name: 'mindnektar
            }
        }, {
            id: 'a2096556-9a4e-4994-9de8-86c9e85ed6a1',
            title: 'Do the dishes',
            user: {
                id: '2adb1120-d911-4196-ab1b-d5043cc7a00a'
                name: 'mindnektar
            }
        }]
    }
}
```

Because the cache is normalised, it will now look like this:

```
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
        name: 'mindnektar
    }
}
```

The `ROOT_QUERY` looks exactly like before, and each todo contains a reference to the user. And even though - since both todos are allocated to the same user - the server responded with duplicated data (the user's name attached to each todo), the cache's normalisation causes that data to be present only once.

This behaviour has one great advantage: Whenever a cache item is updated (e.g. because the user's name has changed), the entire cache object (with possibly hundreds or thousands of items) doesn't have to be traversed in search for instances of that user, but only a single item needs to be taken care of.

## What if I am requesting a field that doesn't have an id?

The cache item won't be normalised. An example query:

```
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

```
{
    data: {
        todos: [{
            id: '36bad921-8fcf-4f33-9f29-0d3cd70205c8',
            title: 'Buy groceries',
            user: {
                name: 'mindnektar
            }
        }, {
            id: 'a2096556-9a4e-4994-9de8-86c9e85ed6a1',
            title: 'Do the dishes',
            user: {
                name: 'mindnektar
            }
        }]
    }
}
```

And the cache:

```
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
            name: 'mindnektar
        }
    },
    'Todo:a2096556-9a4e-4994-9de8-86c9e85ed6a1': {
        __typename: 'Todo',
        id: 'a2096556-9a4e-4994-9de8-86c9e85ed6a1',
        title: 'Do the dishes',
        user: {
            name: 'mindnektar
        }
    }
}
```

This should be avoided at all costs. If any data of an unnormalised cache item needs to be updated, you will have to manually update each occurrence in the entire cache, which is unmaintainable. You must also never request the same thing sometimes with an id and sometimes without, because `ApolloClient` will throw an error when trying to update the cache after such a query.

Let me reiterate: Always include an id for each requested field.

Of course, sometimes an id might not be available because that particular type is identified differently, either by another name or by a combination of fields:

```
query {
    users {
        name
        email
    }
}
```

Maybe users have no id and are instead identified by their combination of name and email. Luckily, you can very easily specify these exceptions in your `InMemoryCache` [configuration](https://www.apollographql.com/docs/react/caching/cache-configuration/#customizing-identifier-generation-by-type).
