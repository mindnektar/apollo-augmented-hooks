# How does cache inflation work with apollo-augmented-hooks?

It is not unlikely for larger queries to contain multiple fields with the same typename. You might need to request the same thing in different contexts. This can easily be illustrated with a small example:

```graphql
query {
    todos {
        id
        title
        name
        createdAt
        image {
            id
            url
        }
    }
    users {
        id
        todos {
            id
            title
            name
            image {
                id
                url
            }
        }
    }
}
```

In this query, we are requesting todos in two different places and even include a sub selection in both places (`image`). Depending on how your server is implemented, this might cause unnecessary database queries, which can have quite the performance impact in large GraphQL queries and/or with a large amount of data in the database.

Since Apollo's cache is normalized, all todos will end up only once in the cache anyway, so we might as well use this query instead:

```graphql
query {
    todos {
        id
        title
        name
        createdAt
        image {
            id
            url
        }
    }
    users {
        id
        todos {
            id
        }
    }
}
```

The problem is that each todo within `users` will only contain the `id` field, not the other fields, even though they are available in the cache. And that's exactly what `apollo-augmented-hooks` does: It will inflate each of these todos so that they won't only contain the `id` field but also every other field that can be found in the cache. This allows you to strip all the fields from your query that are present more than once.

Be careful, though: Cache inflation will of course only work if the respective items are actually in the cache. So if for some reason there are more todos within `users` as within the root `todos` query, those additional todos cannot be inflated.

If you wish to disable this functionality, you can pass the `inflateCacheData` option to `useQuery`.
