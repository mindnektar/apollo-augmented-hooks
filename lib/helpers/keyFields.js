"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getKeyFields = exports.keyFieldsForTypeName = void 0;

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _slicedToArray2 = _interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { (0, _defineProperty2["default"])(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

var keyFieldsForTypeName = function keyFieldsForTypeName(cache, typeName) {
  var _cache$config$typePol;

  return ((_cache$config$typePol = cache.config.typePolicies[typeName]) === null || _cache$config$typePol === void 0 ? void 0 : _cache$config$typePol.keyFields) || ['id'];
};

exports.keyFieldsForTypeName = keyFieldsForTypeName;

var getKeyFields = function getKeyFields(cache) {
  var typePolicies = Object.entries(cache.config.typePolicies);
  return typePolicies.reduce(function (result, _ref) {
    var _ref2 = (0, _slicedToArray2["default"])(_ref, 2),
        typename = _ref2[0],
        keyFields = _ref2[1].keyFields;

    if (!keyFields) {
      return result;
    }

    return _objectSpread(_objectSpread({}, result), {}, (0, _defineProperty2["default"])({}, typename, keyFields));
  }, {});
};

exports.getKeyFields = getKeyFields;