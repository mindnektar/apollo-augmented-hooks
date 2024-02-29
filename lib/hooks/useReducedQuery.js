"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _slicedToArray2 = _interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));

var _react = require("react");

var _client = require("@apollo/client");

var _reducedQueries = require("../helpers/reducedQueries");

var _inFlightTracking = require("../helpers/inFlightTracking");

var _globalContextHook = require("../globalContextHook");

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { (0, _defineProperty2["default"])(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

// Create a reduced version of the query that contains only the fields that are not in the cache already.
var getQueryAst = function getQueryAst(queryAst, client, options) {
  if ( // Polling implies the need for fresh data.
  options.pollInterval // `cache-only` means we don't want to request anything from the server.
  // `network-only` and `no-cache` imply that we always want to request everything from the server.
  // In either scenario we need to keep the entire query.
  || ['cache-only', 'network-only', 'no-cache'].includes(options.fetchPolicy) // Also provide an explicit option to disable query reduction.
  || options.reducedQuery === false) {
    return queryAst;
  }

  return (0, _reducedQueries.makeReducedQueryAst)(client.cache, queryAst, options.variables);
};

var _default = function _default(queryAst, options) {
  var _queryAst$definitions;

  var client = (0, _client.useApolloClient)();
  var globalContext = (0, _globalContextHook.useGlobalContext)();
  var queryName = ((_queryAst$definitions = queryAst.definitions[0].name) === null || _queryAst$definitions === void 0 ? void 0 : _queryAst$definitions.value) || ''; // Functional default state to avoid recomputing the reduced query on each render.

  var _useState = (0, _react.useState)(function () {
    return getQueryAst(queryAst, client, options);
  }),
      _useState2 = (0, _slicedToArray2["default"])(_useState, 2),
      reducedQueryAst = _useState2[0],
      setReducedQueryAst = _useState2[1];

  var resetReducedQueries = function resetReducedQueries() {
    setReducedQueryAst(getQueryAst(queryAst, client, options));
  };

  var reducedResult = (0, _client.useQuery)(reducedQueryAst || queryAst, _objectSpread(_objectSpread({
    // If all the requested data is already in the cache, we can skip this query.
    skip: !reducedQueryAst
  }, options), {}, {
    context: _objectSpread(_objectSpread({}, globalContext), options.context),
    variables: options.variables,
    // This toggles `loading` every time a polling request starts and completes. We need this
    // for the effect hook to work.
    notifyOnNetworkStatusChange: !!options.pollInterval,
    // If all the requested data is already in the cache, we can skip this query.
    fetchPolicy: reducedQueryAst ? options.fetchPolicy : 'cache-only',
    onCompleted: function onCompleted() {
      var _options$variables;

      // The reduced query is kept in state to avoid making another request if a request is
      // already in flight and the cache contents change in the meantime. Once the request is
      // completed, we can recompute the reduced query.
      // XXX: Don't do this if pagination is enabled because this causes an as yet unexplained
      // infinite rendering loop.
      if (!((_options$variables = options.variables) !== null && _options$variables !== void 0 && _options$variables.pagination)) {
        resetReducedQueries();
      }
    }
  })); // Remember all the query requests that are currently in flight, so we can ensure that any mutations
  // happening while such a request is in flight updates the cache *after* the request completes and
  // is not overwritten by potentially stale data.

  (0, _react.useEffect)(function () {
    if (reducedResult.loading) {
      (0, _inFlightTracking.registerRequest)(queryName);
    } else {
      (0, _inFlightTracking.deregisterRequest)(queryName);
    }
  }, [reducedResult.loading]);
  (0, _react.useEffect)(function () {
    return function () {
      (0, _inFlightTracking.deregisterRequest)(queryName);
    };
  }, []); // Listen for mutation modifiers requesting a reduced query reset. This happens if one or more
  // modifiers returned the DELETE sentinel object.

  (0, _react.useEffect)(function () {
    window.addEventListener('reset-reduced-queries', resetReducedQueries);
    return function () {
      window.removeEventListener('reset-reduced-queries', resetReducedQueries);
    };
  }, []); // Whenever the query variables change, we need to generate a new reduced query because we are in
  // fact dealing with a new query.

  (0, _react.useEffect)(function () {
    resetReducedQueries();
  }, [JSON.stringify(options.variables || {})]);
  return reducedResult;
};

exports["default"] = _default;