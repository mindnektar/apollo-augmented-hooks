"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _react = require("react");

var _client = require("@apollo/client");

var _pagination = require("./helpers/pagination");

var _useReducedQuery = _interopRequireDefault(require("./hooks/useReducedQuery"));

var _useCacheQuery = _interopRequireDefault(require("./hooks/useCacheQuery"));

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { (0, _defineProperty2["default"])(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

var _default = function _default(query) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var queryAst = typeof query === 'string' ? (0, _client.gql)(query) : query;
  var cacheData = (0, _useCacheQuery["default"])(queryAst, options);
  var reducedResult = (0, _useReducedQuery["default"])(_client.useSuspenseQuery, queryAst, cacheData, options);
  var cacheDataRef = (0, _react.useRef)(cacheData);
  (0, _react.useEffect)(function () {
    // Store cache result in ref so its contents remain fresh when calling `nextPage`.
    cacheDataRef.current = cacheData;
  });
  return _objectSpread(_objectSpread({}, reducedResult), {}, {
    nextPage: (0, _pagination.handleNextPage)(queryAst, cacheDataRef, reducedResult, options),
    data: cacheData
  });
};

exports["default"] = _default;