"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _client = require("@apollo/client");

var _apolloClient = _interopRequireDefault(require("../apolloClient"));

var _mapData = _interopRequireDefault(require("../helpers/mapData"));

var _globalContextHook = require("../globalContextHook");

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { (0, _defineProperty2["default"])(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

var _default = function _default(queryAst, variables, options) {
  var client = (0, _apolloClient["default"])();
  var globalContext = (0, _globalContextHook.useGlobalContext)(); // Grab all the requested data from the cache. If some or all of the data is missing, the reduced query will get it.

  var cacheResult = (0, _client.useQuery)(queryAst, {
    client: client,
    variables: variables,
    fetchPolicy: 'cache-only',
    skip: options.skip,
    context: _objectSpread(_objectSpread({}, globalContext), options.context)
  });
  return (0, _mapData["default"])(cacheResult.data, options.dataMap);
};

exports["default"] = _default;