import { gql, useLazyQuery } from '@apollo/client';

export default (query, options = {}) => {
    const queryAst = typeof query === 'string' ? gql(query) : query;
    return useLazyQuery(queryAst, options);
};
