import { DocumentNode, OperationVariables, QueryHookOptions, QueryResult, TypedDocumentNode } from '@apollo/client';
interface AugmentedQueryHookOptions extends QueryHookOptions {
    reducedQuery: boolean;
    dataMap: any;
    pagination: any;
}
interface AugmentedQueryResult extends QueryResult {
    nextPage: () => Promise<any>;
}
export default function <TData = any, TVariables = OperationVariables>(query: DocumentNode | TypedDocumentNode<TData, TVariables> | string, options?: AugmentedQueryHookOptions): AugmentedQueryResult;
export {};
