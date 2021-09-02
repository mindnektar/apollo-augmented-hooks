"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _client = require("@apollo/client");

var _apolloClient = _interopRequireDefault(require("../apolloClient"));

var _mapData = _interopRequireDefault(require("../helpers/mapData"));

var _default = function _default(queryAst, variables, options) {
  var client = (0, _apolloClient["default"])(); // Grab all the requested data from the cache. If some or all of the data is missing, the reduced query will get it.

  var cacheResult = (0, _client.useQuery)(queryAst, {
    client: client,
    variables: variables,
    fetchPolicy: 'cache-only'
  });
  return (0, _mapData["default"])(cacheResult.data, options.dataMap);
};

exports["default"] = _default;