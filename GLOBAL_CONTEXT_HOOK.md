# How does the global context hook work in apollo-augmented-hooks?

In a larger application, you might wish to provide data to the `@apollo/client/link/context` depending on where in the application the user is or what kind of user they are. For example, your application might contain different sections accessible only to certain kinds of users, such as an admin area and an area for standard users. In that case, you are probably handling different kinds of authentication tokens. You might also end up having to write code deciding which token to use in the context of each query, which can be particularly bothersome if you have queries that are accessible to more than one kind of user. On this page, you will find a recipe that completely removes this kind of overhead and makes it possible to easily allow access to any query, mutation and subscription for any number of user types.

```javascript
import { ApolloClient } from '@apollo/client';
import { initAugmentedHooks, setGlobalContextHook } from 'apollo-augmented-hooks';
import useGlobalApolloContext from 'hooks/useGlobalApolloContext';

const client = new ApolloClient({
    ...
});

initAugmentedHooks(client);
setGlobalContextHook(useGlobalApolloContext);
```

`apollo-augmented-hooks` exposes a `setGlobalContextHook` function. Simply call it after your `initAugmentedHooks` call and pass it your global context hook.

```javascript
import { useContext } from 'react';
import AuthContext from 'contexts/auth';

export default () => {
    const authType = useContext(AuthContext);

    return { authType };
};
```

The global context hook in this scenario is quite simple. It uses `useContext` to retrieve the data we need to determine the type of user and returns an object with that data. `setGlobalContextHook` will simply attach this object to the context object of every single request within your application.

Providing the global context hook itself with that data is a simple matter of using react's context API. Here is a very reduced example using `react-router`:

```jsx
const App = () => (
    <Routes>
        <Router
            element={(
                <AuthContext.Provider value="token-type-admin">
                    <AdminArea />
                </AuthContext.Provider>
            )}
            path="admin"
        />
        <Router
            element={(
                <AuthContext.Provider value="token-type-user">
                    <UserArea />
                </AuthContext.Provider>
            )}
            path="user"
        />
    </Routes>
);
```

Any graphQL requests executed within the `AdminArea` component will now automatically have `{ authType: 'token-type-admin' }` appended to the context object, and the same goes for the `UserArea` and `{ authType: 'token-type-user' }`. Now all that remains to be done is to use it in the `setContext` function:

```javascript
import { ApolloClient } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { initAugmentedHooks, setGlobalContextHook } from 'apollo-augmented-hooks';
import useGlobalApolloContext from 'hooks/useGlobalApolloContext';

const client = new ApolloClient({
    ...
    setContext((request, context) => {
        // Retrieve the correct auth token using the now always available authType ...
        const token = getToken(context.authType);

        // ... then add it to the request depending on your backend
        return {
            ...context,
            headers: {
                ...context.headers,
                Authorization: `Bearer ${token}`
            }
        };
    }),
    ...
});

initAugmentedHooks(client);
setGlobalContextHook(useGlobalApolloContext);
```
