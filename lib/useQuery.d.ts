import { DocumentNode, QueryHookOptions, QueryResult } from '@apollo/client';
interface AugmentedQueryHookOptions extends QueryHookOptions {
    reducedQuery: boolean;
    dataMap: any;
    pagination: any;
}
interface AugmentedQueryResult extends QueryResult {
    nextPage: () => Promise<any>;
}
declare const _default: (query: DocumentNode | string, options: AugmentedQueryHookOptions) => AugmentedQueryResult;
export default _default;
