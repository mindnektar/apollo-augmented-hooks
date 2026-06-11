"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _typeof2 = _interopRequireDefault(require("@babel/runtime/helpers/typeof"));

var _react = require("react");

var _client = require("@apollo/client");

var _mapData = _interopRequireDefault(require("../helpers/mapData"));

var _globalContextHook = require("../globalContextHook");

var _dataMapSourcesHook = require("../dataMapSourcesHook");

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { (0, _defineProperty2["default"])(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

var isSameDataMapEntry = function isSameDataMapEntry(a, b) {
  return a === b || (0, _typeof2["default"])(a) === 'object' && (0, _typeof2["default"])(b) === 'object' && !!a && !!b && a.target === b.target && a.fieldName === b.fieldName && a.data === b.data;
}; // Data maps are usually object literals created during render, so they need to be compared by
// content rather than identity.


var isSameDataMap = function isSameDataMap() {
  var a = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  var b = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every(function (key) {
    return isSameDataMapEntry(a[key], b[key]);
  });
}; // Only the source fields actually referenced by the data map can affect the mapping, so changes
// to unrelated parts of the registered sources must not invalidate it.


var hasSameReferencedSources = function hasSameReferencedSources() {
  var map = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  var a = arguments.length > 1 ? arguments[1] : undefined;
  var b = arguments.length > 2 ? arguments[2] : undefined;
  return Object.values(map).every(function (to) {
    var target = (0, _typeof2["default"])(to) === 'object' ? to.target : to;
    return target === undefined || (a === null || a === void 0 ? void 0 : a[target]) === (b === null || b === void 0 ? void 0 : b[target]);
  });
};

var _default = function _default(queryAst, options) {
  var globalContext = (0, _globalContextHook.useGlobalContext)();
  var dataMapSources = (0, _dataMapSourcesHook.useDataMapSources)();
  var memoRef = (0, _react.useRef)({}); // Grab all the requested data from the cache. If some or all of the data is missing, the reduced query will get it.

  var cacheResult = (0, _client.useQuery)(queryAst, {
    variables: options.variables,
    fetchPolicy: 'cache-only',
    skip: options.skip,
    context: _objectSpread(_objectSpread({}, globalContext), options.context)
  }); // Mapping the data produces new object identities along every mapped path, so it must only
  // happen when the inputs actually change. Otherwise every render would return new data,
  // breaking downstream identity checks (memoized context values, React.memo etc.) and
  // re-running the entire mapping.

  var memo = memoRef.current;

  if (memo.data !== cacheResult.data || !isSameDataMap(memo.dataMap, options.dataMap) || !hasSameReferencedSources(options.dataMap, memo.sources, dataMapSources)) {
    memoRef.current = {
      data: cacheResult.data,
      sources: dataMapSources,
      dataMap: options.dataMap,
      result: (0, _mapData["default"])(cacheResult.data, options.dataMap, dataMapSources)
    };
  }

  return memoRef.current.result;
};

exports["default"] = _default;