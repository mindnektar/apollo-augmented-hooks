"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _client = require("@apollo/client");

var _reducedQueries = require("./helpers/reducedQueries");

var _apolloClient = _interopRequireDefault(require("./apolloClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var _default = function _default(query) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var client = (0, _apolloClient["default"])();
  var queryAst = (0, _client.gql)(query); // Create a reduced version of the query that contains only the fields that are not in the
  // cache already. Do not do this when polling, because polling implies the need for fresh data.
  // Also don't do it if the fetch policy is 'cache-only', because then we don't want to request
  // anything from the server anyway.

  var reducedQueryAst = options.pollInterval || options.fetchPolicy === 'cache-only' ? queryAst : (0, _reducedQueries.makeReducedQueryAst)(client.cache, queryAst, options.variables);
  var reducedResult = (0, _client.useQuery)(reducedQueryAst, _objectSpread(_objectSpread({}, options), {}, {
    client: client,
    // Always fetch data from the server on component mount when polling is enabled.
    // Polling indicates that fresh data is more important than caching, so prefer an extra
    // request on mount rather than waiting the poll interval for the first poll request.
    fetchPolicy: options.pollInterval ? 'cache-and-network' : options.fetchPolicy,
    // This prevents polling queries to refetch server from the data each time the cache is
    // mutated.
    nextFetchPolicy: options.pollInterval ? 'cache-first' : options.nextFetchPolicy
  })); // Grab all the requested data from the cache. If some or all of the data is missing, the
  // reduced query above will get it.

  var cacheResult = (0, _client.useQuery)(queryAst, {
    client: client,
    variables: options.variables,
    fetchPolicy: 'cache-only'
  });
  return _objectSpread(_objectSpread({}, reducedResult), {}, {
    data: cacheResult.data,
    // XXX: Make the loading state dependent on the presence of data in the cache query result.
    // This is a workaround for https://github.com/apollographql/react-apollo/issues/2601
    loading: !options.skip && !cacheResult.data
  });
};

exports["default"] = _default;