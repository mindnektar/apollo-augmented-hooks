"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = exports.handleLazyRefetch = void 0;

var _toConsumableArray2 = _interopRequireDefault(require("@babel/runtime/helpers/toConsumableArray"));

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _fieldNames = require("./fieldNames");

var _reducedQueries = require("./reducedQueries");

var _inFlightTracking = require("./inFlightTracking");

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { (0, _defineProperty2["default"])(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

var getFieldName = function getFieldName(storeFieldName) {
  return storeFieldName.match(/^[^({:]+/)[0];
};

var collectFragmentNames = function collectFragmentNames(selectionSet) {
  var fragmentNames = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : new Set();
  ((selectionSet === null || selectionSet === void 0 ? void 0 : selectionSet.selections) || []).forEach(function (selection) {
    if (selection.kind === 'FragmentSpread') {
      fragmentNames.add(selection.name.value);
    }

    if (selection.selectionSet) {
      collectFragmentNames(selection.selectionSet, fragmentNames);
    }
  });
  return fragmentNames;
}; // Builds a query containing only the given top-level selections of the original query, so that
// just these fields can be requested from the server rather than the entire query.


var makeFieldRefetchQueryAst = function makeFieldRefetchQueryAst(queryAst, operation, selections) {
  var _operation$name;

  var selectionSet = _objectSpread(_objectSpread({}, operation.selectionSet), {}, {
    selections: selections
  });

  var fragmentNames = collectFragmentNames(selectionSet);
  var previousSize = -1; // Fragments may reference further fragments, so keep collecting until nothing new is found.

  while (fragmentNames.size !== previousSize) {
    previousSize = fragmentNames.size;
    queryAst.definitions.filter(function (definition) {
      return definition.kind === 'FragmentDefinition' && fragmentNames.has(definition.name.value);
    }).forEach(function (definition) {
      collectFragmentNames(definition.selectionSet, fragmentNames);
    });
  }

  return _objectSpread(_objectSpread({}, queryAst), {}, {
    definitions: [_objectSpread(_objectSpread({}, operation), {}, {
      name: {
        kind: 'Name',
        // Prefix the query name with something that clearly marks it as manipulated.
        value: "__REFETCH__".concat((((_operation$name = operation.name) === null || _operation$name === void 0 ? void 0 : _operation$name.value) || '').replace(/^__REDUCED__/, ''))
      },
      selectionSet: selectionSet,
      // Remove variable definitions that are no longer referenced anywhere in the selection
      // set.
      variableDefinitions: (operation.variableDefinitions || []).filter(function (_ref) {
        var variable = _ref.variable;
        return (0, _reducedQueries.hasVariable)(selectionSet, variable.name.value);
      })
    })].concat((0, _toConsumableArray2["default"])(queryAst.definitions.filter(function (definition) {
      return definition.kind === 'FragmentDefinition' && fragmentNames.has(definition.name.value);
    })))
  });
};

var handleLazyRefetch = function handleLazyRefetch(client, fieldNames) {
  var coveredStoreFieldNames = new Set();
  var refetches = []; // Find all the active queries containing any of the requested fields at the top level of
  // their selection sets. Rather than refetching these queries in their entirety, request just
  // the matching fields. The responses update the cache, which in turn updates all consumers of
  // the fields, so anything else the queries contain need not be requested again. Reduced
  // queries are considered last, so that the refetches are preferably built from the complete
  // originals.

  var queries = (0, _toConsumableArray2["default"])(client.getObservableQueries().values()).sort(function (a, b) {
    return (a.queryName || '').startsWith('__REDUCED__') - (b.queryName || '').startsWith('__REDUCED__');
  });
  queries.forEach(function (query) {
    if (query.observers.size === 0) {
      return;
    }

    var _query$options = query.options,
        queryAst = _query$options.query,
        variables = _query$options.variables,
        context = _query$options.context;
    var operation = queryAst.definitions.find(function (_ref2) {
      var kind = _ref2.kind;
      return kind === 'OperationDefinition';
    });
    var selections = ((operation === null || operation === void 0 ? void 0 : operation.selectionSet.selections) || []).filter(function (selection) {
      return selection.kind === 'Field' && fieldNames.includes(selection.name.value) // Skip fields whose cache contents are already covered by another query's refetch
      && !(0, _fieldNames.buildFieldNames)(selection, variables).every(function (storeFieldName) {
        return coveredStoreFieldNames.has(storeFieldName);
      });
    });

    if (selections.length === 0) {
      return;
    }

    selections.forEach(function (selection) {
      (0, _fieldNames.buildFieldNames)(selection, variables).forEach(function (storeFieldName) {
        coveredStoreFieldNames.add(storeFieldName);
      });
    });
    refetches.push({
      queryAst: queryAst,
      operation: operation,
      selections: selections,
      variables: variables,
      context: context
    });
  });
  refetches.forEach(function (_ref3) {
    var queryAst = _ref3.queryAst,
        operation = _ref3.operation,
        selections = _ref3.selections,
        variables = _ref3.variables,
        context = _ref3.context;
    var refetchQueryAst = makeFieldRefetchQueryAst(queryAst, operation, selections);
    var requestName = refetchQueryAst.definitions[0].name.value; // Remember the request while it is in flight, so that mutations completing before it can
    // defer their cache updates rather than being overwritten by its potentially stale data.

    (0, _inFlightTracking.registerRequest)(requestName);
    client.query({
      query: refetchQueryAst,
      variables: variables,
      // Pass the original query's context along, so that e.g. context-dependent request
      // headers are preserved
      context: context,
      fetchPolicy: 'network-only'
    })["catch"](function () {
      return null;
    })["finally"](function () {
      (0, _inFlightTracking.deregisterRequest)(requestName);
    });
  }); // Fields that no active query contains can't be sensibly refetched right now, so remove them
  // from the cache entirely. The next query using them will request them again (and thanks to
  // query reduction request only them).

  var rootFields = client.cache.extract().ROOT_QUERY || {};
  Object.keys(rootFields).forEach(function (storeFieldName) {
    if (fieldNames.includes(getFieldName(storeFieldName)) && !coveredStoreFieldNames.has(storeFieldName)) {
      // No active query contains these fields, so nothing needs to be notified about their
      // removal.
      client.cache.evict({
        id: 'ROOT_QUERY',
        fieldName: storeFieldName,
        broadcast: false
      });
    }
  });
};

exports.handleLazyRefetch = handleLazyRefetch;
var _default = handleLazyRefetch;
exports["default"] = _default;