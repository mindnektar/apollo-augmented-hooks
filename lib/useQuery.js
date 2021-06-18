"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _react = require("react");

var _client = require("@apollo/client");

var _reducedQueries = require("./helpers/reducedQueries");

var _pagination = require("./helpers/pagination");

var _inFlightTracking = require("./helpers/inFlightTracking");

var _inflateCacheData = _interopRequireDefault(require("./helpers/inflateCacheData"));

var _apolloClient = _interopRequireDefault(require("./apolloClient"));

var _globalContextHook = require("./globalContextHook");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _iterableToArrayLimit(arr, i) { if (typeof Symbol === "undefined" || !(Symbol.iterator in Object(arr))) return; var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

// Create a reduced version of the query that contains only the fields that are not in the
// cache already. Do not do this when polling, because polling implies the need for fresh data.
// Also don't do it if the fetch policy is 'cache-only', because then we don't want to request
// anything from the server anyway. Also provide the option to disable this behaviour.
var getQueryAst = function getQueryAst(queryAst, client, options) {
  return options.pollInterval || options.fetchPolicy === 'cache-only' || options.reducedQuery === false ? queryAst : (0, _reducedQueries.makeReducedQueryAst)(client.cache, queryAst, options.variables);
};

var getFetchPolicy = function getFetchPolicy(reducedQueryAst, options) {
  if (!reducedQueryAst) {
    // If all the requested data is already in the cache, we can skip this query.
    return 'cache-only';
  } // Always fetch data from the server on component mount when polling is enabled.
  // Polling indicates that fresh data is more important than caching, so prefer an extra
  // request on mount rather than waiting the duration of the poll interval for the first poll
  // request.


  return options.pollInterval ? 'cache-and-network' : options.fetchPolicy;
};

var _default = function _default(query) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var cacheDataRef = (0, _react.useRef)();
  var client = (0, _apolloClient["default"])();
  var queryAst = typeof query === 'string' ? (0, _client.gql)(query) : query;
  var variables = (0, _pagination.getVariablesWithPagination)(options);
  var globalContext = (0, _globalContextHook.useGlobalContext)();

  var _useState = (0, _react.useState)(null),
      _useState2 = _slicedToArray(_useState, 2),
      inflatedCacheData = _useState2[0],
      setInflatedCacheData = _useState2[1]; // Functional default state to avoid recomputing the reduced query on each render.


  var _useState3 = (0, _react.useState)(function () {
    return getQueryAst(queryAst, client, options);
  }),
      _useState4 = _slicedToArray(_useState3, 2),
      reducedQueryAst = _useState4[0],
      setReducedQueryAst = _useState4[1];

  var resetReducedQueries = function resetReducedQueries() {
    setReducedQueryAst(getQueryAst(queryAst, client, options));
  };

  var reducedResult = (0, _client.useQuery)(reducedQueryAst || queryAst, _objectSpread(_objectSpread({
    // If all the requested data is already in the cache, we can skip this query.
    skip: !reducedQueryAst
  }, options), {}, {
    context: _objectSpread(_objectSpread({}, globalContext), options.context),
    variables: variables,
    client: client,
    // This toggles `loading` every time a polling request starts and completes. We need this
    // for the effect hook to work.
    notifyOnNetworkStatusChange: !!options.pollInterval,
    fetchPolicy: getFetchPolicy(reducedQueryAst, options),
    // This prevents polling queries to refetch data from the server each time the cache is
    // mutated.
    nextFetchPolicy: options.pollInterval ? 'cache-first' : options.nextFetchPolicy,
    onCompleted: function onCompleted() {
      // The reduced query is kept in state to avoid making another request if a request is
      // already in flight and the cache contents change in the meantime. Once the request is
      // completed, we can recompute the reduced query.
      resetReducedQueries();
    }
  })); // Remember all the query requests that are currently in flight, so we can ensure that any mutations
  // happening while such a request is in flight updates the cache *after* the request completes and
  // is not overwritten by potentially stale data.

  (0, _react.useEffect)(function () {
    if (reducedResult.loading) {
      (0, _inFlightTracking.registerRequest)(query);
    } else {
      (0, _inFlightTracking.deregisterRequest)(query);
    }
  }, [reducedResult.loading]);
  (0, _react.useEffect)(function () {
    return function () {
      (0, _inFlightTracking.deregisterRequest)(query);
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
  }, [JSON.stringify(options.variables || {})]); // Grab all the requested data from the cache. If some or all of the data is missing, the
  // reduced query above will get it.

  var cacheResult = (0, _client.useQuery)(queryAst, {
    client: client,
    variables: variables,
    fetchPolicy: 'cache-only'
  });
  (0, _react.useEffect)(function () {
    if (cacheResult.data) {
      setInflatedCacheData(options.inflateCacheData !== false // This makes sure that every requested field always contains the entire cache item, and
      // not just the requested sub selection.
      ? (0, _inflateCacheData["default"])(client.cache, cacheResult.data) : cacheResult.data);
    } // Store cache result in ref so its contents remain fresh when calling `nextPage`.


    cacheDataRef.current = cacheResult.data;
  }, [JSON.stringify(cacheResult.data)]);
  return _objectSpread(_objectSpread({}, reducedResult), {}, {
    nextPage: (0, _pagination.handleNextPage)(queryAst, cacheDataRef, reducedResult, options.pagination),
    data: inflatedCacheData,
    // XXX: Make the loading state dependent on the presence of data in the cache query result.
    // This is a workaround for https://github.com/apollographql/react-apollo/issues/2601
    loading: !options.skip && !inflatedCacheData
  });
};

exports["default"] = _default;