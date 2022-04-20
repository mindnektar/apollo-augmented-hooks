# How do reduced queries work in apollo-augmented-hooks?

In a large application using GraphQL, it is likely that its queries share certain selection sets. Unless two queries are perfectly identical, they will be fetched from the server in their entireties, however, no matter how many fields they share.

Imagine our application has a page with the following query:

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
    users {
        id
        name
        email
        createdAt
        todos {
            id
            title
        }
        friends {
            id
            name
        }
    }
}
```

The first time we visit it, the request will be sent to the server, and on each subsequent visit we can pull the data from the cache. Now we visit a different page, where the following query is executed:

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
    users {
        id
        name
        email
        createdAt
        todos {
            id
            title
        }
        friends {
            id
            name
            email # The only additional field
        }
    }
}
```

The queries are almost identical, but since there is a single additional field, there will be a cache miss, and the entire query will be requested from the server. This is unnecessary because a lot of the requested data is already in the cache. `apollo-augmented-hooks` will automatically reduce the query so that this will be sent instead:

```graphql
query {
    users {
        id
        friends {
            id
            email
        }
    }
}
```

Depending on how many shared selection sets there are in your application's queries, you can potentially save a lot of server resources using this method.

If you use fragments in your queries, they will be kept as they are, no matter if the fields within the fragment are already present in the cache.

If you ever need to disable this functionality, you can pass the option `reducedQuery: false` to `useQuery`.
