"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _slicedToArray2 = _interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));

var _react = require("react");

var _client = require("@apollo/client");

var _inflateCacheData = _interopRequireDefault(require("../helpers/inflateCacheData"));

var _apolloClient = _interopRequireDefault(require("../apolloClient"));

var _default = function _default(queryAst, variables, options) {
  var client = (0, _apolloClient["default"])(); // Grab all the requested data from the cache. If some or all of the data is missing, the reduced query will get it.

  var cacheResult = (0, _client.useQuery)(queryAst, {
    client: client,
    variables: variables,
    fetchPolicy: 'cache-only'
  });

  var getInflatedCacheData = function getInflatedCacheData() {
    return options.inflateCacheData !== false // This makes sure that every requested field always contains the entire cache item, and not just the requested sub selection.
    ? (0, _inflateCacheData["default"])(client.cache, cacheResult.data, queryAst, variables) : cacheResult.data;
  };

  var _useState = (0, _react.useState)(function () {
    return getInflatedCacheData();
  }),
      _useState2 = (0, _slicedToArray2["default"])(_useState, 2),
      inflatedCacheData = _useState2[0],
      setInflatedCacheData = _useState2[1];

  (0, _react.useEffect)(function () {
    setInflatedCacheData(getInflatedCacheData());
  }, [JSON.stringify(cacheResult.data)]);
  return inflatedCacheData;
};

exports["default"] = _default;