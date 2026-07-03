import { buildFieldNames } from './fieldNames';
import { hasVariable } from './reducedQueries';
import { registerRequest, deregisterRequest } from './inFlightTracking';

const getFieldName = (storeFieldName) => (
    storeFieldName.match(/^[^({:]+/)[0]
);

const collectFragmentNames = (selectionSet, fragmentNames = new Set()) => {
    (selectionSet?.selections || []).forEach((selection) => {
        if (selection.kind === 'FragmentSpread') {
            fragmentNames.add(selection.name.value);
        }

        if (selection.selectionSet) {
            collectFragmentNames(selection.selectionSet, fragmentNames);
        }
    });

    return fragmentNames;
};

// Builds a query containing only the given top-level selections of the original query, so that
// just these fields can be requested from the server rather than the entire query.
const makeFieldRefetchQueryAst = (queryAst, operation, selections) => {
    const selectionSet = {
        ...operation.selectionSet,
        selections,
    };
    const fragmentNames = collectFragmentNames(selectionSet);
    let previousSize = -1;

    // Fragments may reference further fragments, so keep collecting until nothing new is found.
    while (fragmentNames.size !== previousSize) {
        previousSize = fragmentNames.size;
        queryAst.definitions
            .filter((definition) => (
                definition.kind === 'FragmentDefinition' && fragmentNames.has(definition.name.value)
            ))
            .forEach((definition) => {
                collectFragmentNames(definition.selectionSet, fragmentNames);
            });
    }

    return {
        ...queryAst,
        definitions: [{
            ...operation,
            name: {
                kind: 'Name',
                // Prefix the query name with something that clearly marks it as manipulated.
                value: `__REFETCH__${(operation.name?.value || '').replace(/^__REDUCED__/, '')}`,
            },
            selectionSet,
            // Remove variable definitions that are no longer referenced anywhere in the selection
            // set.
            variableDefinitions: (operation.variableDefinitions || []).filter(({ variable }) => (
                hasVariable(selectionSet, variable.name.value)
            )),
        }, ...queryAst.definitions.filter((definition) => (
            definition.kind === 'FragmentDefinition' && fragmentNames.has(definition.name.value)
        ))],
    };
};

export const handleLazyRefetch = (client, fieldNames) => {
    const coveredStoreFieldNames = new Set();
    const refetches = [];

    // Find all the active queries containing any of the requested fields at the top level of
    // their selection sets. Rather than refetching these queries in their entirety, request just
    // the matching fields. The responses update the cache, which in turn updates all consumers of
    // the fields, so anything else the queries contain need not be requested again. Reduced
    // queries are considered last, so that the refetches are preferably built from the complete
    // originals.
    const queries = [...client.getObservableQueries().values()].sort((a, b) => (
        (a.queryName || '').startsWith('__REDUCED__') - (b.queryName || '').startsWith('__REDUCED__')
    ));

    queries.forEach((query) => {
        if (query.observers.size === 0) {
            return;
        }

        const { query: queryAst, variables, context } = query.options;
        const operation = queryAst.definitions.find(({ kind }) => kind === 'OperationDefinition');
        const selections = (operation?.selectionSet.selections || []).filter((selection) => (
            selection.kind === 'Field'
            && fieldNames.includes(selection.name.value)
            // Skip fields whose cache contents are already covered by another query's refetch
            && !buildFieldNames(selection, variables).every((storeFieldName) => (
                coveredStoreFieldNames.has(storeFieldName)
            ))
        ));

        if (selections.length === 0) {
            return;
        }

        selections.forEach((selection) => {
            buildFieldNames(selection, variables).forEach((storeFieldName) => {
                coveredStoreFieldNames.add(storeFieldName);
            });
        });

        refetches.push({ queryAst, operation, selections, variables, context });
    });

    refetches.forEach(({ queryAst, operation, selections, variables, context }) => {
        const refetchQueryAst = makeFieldRefetchQueryAst(queryAst, operation, selections);
        const requestName = refetchQueryAst.definitions[0].name.value;

        // Remember the request while it is in flight, so that mutations completing before it can
        // defer their cache updates rather than being overwritten by its potentially stale data.
        registerRequest(requestName);

        client
            .query({
                query: refetchQueryAst,
                variables,
                // Pass the original query's context along, so that e.g. context-dependent request
                // headers are preserved
                context,
                fetchPolicy: 'network-only',
            })
            .catch(() => null)
            .finally(() => {
                deregisterRequest(requestName);
            });
    });

    // Fields that no active query contains can't be sensibly refetched right now, so remove them
    // from the cache entirely. The next query using them will request them again (and thanks to
    // query reduction request only them).
    const rootFields = client.cache.extract().ROOT_QUERY || {};

    Object.keys(rootFields).forEach((storeFieldName) => {
        if (
            fieldNames.includes(getFieldName(storeFieldName))
            && !coveredStoreFieldNames.has(storeFieldName)
        ) {
            // No active query contains these fields, so nothing needs to be notified about their
            // removal.
            client.cache.evict({ id: 'ROOT_QUERY', fieldName: storeFieldName, broadcast: false });
        }
    });
};

export default handleLazyRefetch;
