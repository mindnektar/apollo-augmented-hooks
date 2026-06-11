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

You can also reference cache objects using a simple ID string:

```javascript
useQuery(query, {
    dataMap: {
        'todos.userId': { fieldName: 'user', target: 'users' },
    },
});
```

In the above example, `userId` is a string referencing the `id` property in each object within the `users` array (as specified by the `target` attribute). The `fieldName` attribute determines how you can access the mapped object. The original `userId` property will still be present, but it will be accompanied by a `user` property (as specified by the `fieldName` attribute).

## Mapping to external data

All the examples above map data within the same query result, but sometimes the data you wish to reference has already been requested elsewhere — e.g. by a query for global data that your application executes on startup. In that case, you can pass the data to the `dataMap` directly using the `data` attribute:

```javascript
const { todos } = useGlobalData();

useQuery(query, {
    dataMap: {
        'users.todos': { data: todos },
    },
});
```

This works just like the `target` attribute, except that the objects to map to are taken from the provided data rather than from the query result. Make sure the provided data comes from a reactive source (such as a hook reading from a context or another query), so your components re-render with fresh data whenever it changes. The provided data is compared by identity to determine whether the mapping needs to be recomputed, so if you derive it during render (e.g. `[...groups, ...flexGroups]`), memoize it — otherwise the mapped data is rebuilt on every render.

If you omit the `fieldName` attribute, it defaults to the last part of the mapped path (`todos` in the example above).

## Globally registered sources

If you find yourself mapping to the same external data in many different queries, you can register it globally once instead of passing it to each `dataMap` individually. `apollo-augmented-hooks` exposes a `setDataMapSourcesHook` function for this purpose, working just like [setGlobalContextHook](GLOBAL_CONTEXT_HOOK.md). Simply call it after your `initAugmentedHooks` call and pass it a hook returning an object with all the data you wish to make available:

```javascript
import { initAugmentedHooks, setDataMapSourcesHook } from 'apollo-augmented-hooks';
import useGlobalData from 'hooks/useGlobalData';

initAugmentedHooks(client);
setDataMapSourcesHook(useGlobalData);
```

Each key of the returned object acts as an additional mapping target, using the exact same syntax as targets within the query result:

```javascript
useQuery(query, {
    dataMap: {
        'users.todos': 'todos',
    },
});
```

This mapping works whether `todos` is a field in the query result, a registered source, or both. If it is both, the entities are deep-merged per field, with the query result taking precedence, so the two places may freely differ in their sub selections. Nested entity arrays are matched by id, keeping the membership and order of the query result's array, so deliberately filtered lists stay filtered while their items are still enriched with the source's data.

This has two practical consequences: you can move fields out of individual queries and into a globally available query without having to touch any of your data maps, and you can request just the page-specific fields locally while the common fields come from the registered source:

```graphql
query {
    users {
        id
        todos {
            id
        }
    }
    todos {
        id
        priority
    }
}
```

If a registered `todos` source provides `title` and `image`, the mapped `users.todos` will contain `id`, `priority`, `title` and `image` — the local query only needs to request what the source does not already provide.

If the target is missing from both the result and the sources at render time (e.g. because the data providing it has not finished loading yet), the mapping is simply skipped.

A few things to keep in mind:

- The registered hook is called during every render of every `useQuery` and `useSuspenseQuery` instance, so it should be cheap — reading from a context is ideal.
- The registered hook must not call `apollo-augmented-hooks`'s own query hooks, as that would cause infinite recursion. Reading from a context (populated by a query in a provider component higher up in the tree) or using `@apollo/client`'s vanilla hooks is safe.
- Like all hooks, it is subject to the rules of hooks, so it must call the same hooks on every render.
- While data maps are applied in order and each mapping sees the output of the previous one (as described above), the registered sources are a fixed snapshot for the entire `dataMap` — mappings do not chain into sources.
