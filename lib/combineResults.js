"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _toConsumableArray2 = _interopRequireDefault(require("@babel/runtime/helpers/toConsumableArray"));

var _deepmerge = _interopRequireDefault(require("deepmerge"));

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { (0, _defineProperty2["default"])(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

var combineMerge = function combineMerge(target, source, options) {
  var result = (0, _toConsumableArray2["default"])(target);
  source.forEach(function (item, index) {
    if (result[index] === undefined) {
      result[index] = options.cloneUnlessOtherwiseSpecified(item, options);
    } else if (options.isMergeableObject(item)) {
      result[index] = (0, _deepmerge["default"])(target[index], item, options);
    } else if (target.indexOf(item) === -1) {
      result.push(item);
    }
  });
  return result;
};

var _default = function _default() {
  for (var _len = arguments.length, results = new Array(_len), _key = 0; _key < _len; _key++) {
    results[_key] = arguments[_key];
  }

  return _objectSpread(_objectSpread({}, results[0]), {}, {
    loading: results.some(function (_ref) {
      var loading = _ref.loading;
      return loading;
    }),
    data: _deepmerge["default"].all(results.map(function (_ref2) {
      var data = _ref2.data;
      return data || {};
    }), // Assume that array items across the results with the same index are supposed to be merged
    // rather than concatenated. Otherwise you might end up with duplicated items if two queries
    // request the same array resource.
    {
      arrayMerge: combineMerge
    }),
    error: _deepmerge["default"].all( // Here we stick to deepmerge's default behaviour of concatenating arrays so we don't lose
    // any error messages if more than one of the combined queries happen to throw an error.
    results.reduce(function (result, _ref3) {
      var error = _ref3.error;
      return error ? [].concat((0, _toConsumableArray2["default"])(result), [error]) : result;
    }, []))
  });
};

exports["default"] = _default;