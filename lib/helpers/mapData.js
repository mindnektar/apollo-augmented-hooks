"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _slicedToArray2 = _interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { (0, _defineProperty2["default"])(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

var mapObjectData = function mapObjectData(object, path, toData) {
  var key = path[0];
  var value;

  if (!object[key]) {
    return object;
  }

  if (path.length === 1) {
    if (Array.isArray(object[key])) {
      value = object[key].map(function (item) {
        return _objectSpread(_objectSpread({}, item), (toData || []).find(function (_ref) {
          var id = _ref.id;
          return id === item.id;
        }));
      });
    } else if (Array.isArray(toData)) {
      value = _objectSpread(_objectSpread({}, object[key]), toData.find(function (_ref2) {
        var id = _ref2.id;
        return id === object[key].id;
      }));
    } else {
      value = _objectSpread(_objectSpread({}, object[key]), toData || {});
    }
  } else if (Array.isArray(object[key])) {
    value = object[key].map(function (item) {
      return _objectSpread(_objectSpread({}, item), mapObjectData(item, path.slice(1), toData));
    });
  } else {
    value = mapObjectData(object[key], path.slice(1), toData);
  }

  return _objectSpread(_objectSpread({}, object), {}, (0, _defineProperty2["default"])({}, key, value));
};

var _default = function _default(data) {
  var map = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  if (!data) {
    return data;
  }

  return Object.entries(map).reduce(function (result, _ref3) {
    var _ref4 = (0, _slicedToArray2["default"])(_ref3, 2),
        from = _ref4[0],
        to = _ref4[1];

    var fromPath = from.split('.');
    return mapObjectData(result, fromPath, result[to]);
  }, data);
};

exports["default"] = _default;