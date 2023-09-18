"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _slicedToArray2 = _interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _typeof2 = _interopRequireDefault(require("@babel/runtime/helpers/typeof"));

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { (0, _defineProperty2["default"])(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

var mapObjectData = function mapObjectData(object, path, target, fieldName, refs) {
  var key = path[0];

  if (!object[key]) {
    return object;
  }

  if (path.length === 1) {
    var value;

    if (Array.isArray(object[key])) {
      value = object[key].map(function (item) {
        return refs[item.id] || item;
      });
    } else if ((0, _typeof2["default"])(object[key]) === 'object') {
      value = refs[object[key].id] || object[key];
    } else {
      value = refs[object[key]] || object[key];
    }

    return _objectSpread(_objectSpread({}, object), {}, (0, _defineProperty2["default"])({}, fieldName, value));
  }

  if (Array.isArray(object[key])) {
    return _objectSpread(_objectSpread({}, object), {}, (0, _defineProperty2["default"])({}, key, object[key].map(function (item) {
      return mapObjectData(item, path.slice(1), target, fieldName, refs);
    })));
  }

  return _objectSpread(_objectSpread({}, object), {}, (0, _defineProperty2["default"])({}, key, mapObjectData(object[key], path.slice(1), target, fieldName, refs)));
};

var getRefs = function getRefs(data) {
  if (!data) {
    return {};
  }

  return Array.isArray(data) ? Object.fromEntries(data.map(function (item) {
    return [item.id, item];
  })) : (0, _defineProperty2["default"])({}, data.id, data);
};

var _default = function _default(data) {
  var map = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  if (!data) {
    return data;
  }

  return Object.entries(map).reduce(function (result, _ref2) {
    var _ref3 = (0, _slicedToArray2["default"])(_ref2, 2),
        from = _ref3[0],
        to = _ref3[1];

    var fromPath = from.split('.');

    var _ref4 = (0, _typeof2["default"])(to) === 'object' ? to : {
      target: to,
      fieldName: fromPath.at(-1)
    },
        target = _ref4.target,
        fieldName = _ref4.fieldName;

    return mapObjectData(result, fromPath, target, fieldName, getRefs(data[target]));
  }, data);
};

exports["default"] = _default;