declare function _default(query: any, options?: {}): {
    nextPage: () => Promise<any>;
    data: any;
    loading: boolean;
    client: import("@apollo/client").ApolloClient<any>;
    previousData?: any;
    error?: import("@apollo/client").ApolloError;
    networkStatus: import("@apollo/client").NetworkStatus;
    called: true;
    variables: import("@apollo/client").OperationVariables;
    startPolling: (pollInterval: number) => void;
    stopPolling: () => void;
    subscribeToMore: <TSubscriptionData = any, TSubscriptionVariables = import("@apollo/client").OperationVariables>(options: import("@apollo/client").SubscribeToMoreOptions<any, TSubscriptionVariables, TSubscriptionData>) => () => void;
    updateQuery: <TVars = import("@apollo/client").OperationVariables>(mapFn: (previousQueryResult: any, options: Pick<import("@apollo/client").WatchQueryOptions<TVars, any>, "variables">) => any) => void;
    refetch: (variables?: Partial<import("@apollo/client").OperationVariables>) => Promise<import("@apollo/client").ApolloQueryResult<any>>;
    fetchMore: (<K extends string>(fetchMoreOptions: import("@apollo/client").FetchMoreQueryOptions<import("@apollo/client").OperationVariables, K, any> & import("@apollo/client").FetchMoreOptions<any, import("@apollo/client").OperationVariables>) => Promise<import("@apollo/client").ApolloQueryResult<any>>) & (<TData2, TVariables2, K_1 extends keyof TVariables2>(fetchMoreOptions: {
        query?: import("@apollo/client").DocumentNode | import("@graphql-typed-document-node/core").TypedDocumentNode<any, import("@apollo/client").OperationVariables>;
    } & import("@apollo/client").FetchMoreQueryOptions<TVariables2, K_1, any> & import("@apollo/client").FetchMoreOptions<TData2, TVariables2>) => Promise<import("@apollo/client").ApolloQueryResult<TData2>>);
};
export default _default;
