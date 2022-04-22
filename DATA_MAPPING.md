# How does data mapping work in apollo-augmented-hooks?

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

In this query, we are requesting todos in two different places and even include a sub selection in both places (image). Depending on how your server is implemented, this might cause unnecessary database queries, which can have quite the performance impact in large GraphQL queries and/or with a large amount of data in the database.

One way to alleviate this problem would be to only request the duplicate data once and manually reference the missing the data:

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

```javascript
const users = data.users.map((user) => ({
    ...user,
    todos: user.todos.map((todo) => ({
        ...todo,
        ...data.todos.find(({ id }) => id === todo.id),
    })),
}));
```

This slims the query down a bit but causes some overhead in the code, which is where data mapping comes in. `apollo-augmented-hooks`'s `useQuery` contains an option to specify exactly how one part of the data is supposed to reference another part:

```javascript
useQuery(query, {
    dataMap: {
        'users.todos': 'todos',
    },
});
```

This tells `useQuery` to map all the `todos` within `users` to also contain the data found in the `todos` root query. `useQuery` will do the same thing as shown in the code snippet above.

You can pass as many data maps as you wish:

```javascript
useQuery(query, {
    dataMap: {
        'users.todos': 'todos',
        'sections.users': 'users',
    },
});
```

Make sure to keep an eye on the order: The above `dataMap` will cause the `sections` to contain both the `users` and their `todos` because we specified `users.todos` first. If we had specified it last, there would be no mapping from `sections.users.todos` to `todos`.
