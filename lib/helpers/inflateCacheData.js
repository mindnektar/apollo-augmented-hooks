"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _keyFields = require("./keyFields");

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _iterableToArrayLimit(arr, i) { if (typeof Symbol === "undefined" || !(Symbol.iterator in Object(arr))) return; var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && Symbol.iterator in Object(iter)) return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var itemCache = {};
var leafCache = {};

var getFieldName = function getFieldName(storeFieldName) {
  var parensIndex = storeFieldName.indexOf('(');

  if (parensIndex >= 0) {
    return storeFieldName.substring(0, parensIndex);
  }

  var colonIndex = storeFieldName.indexOf(':');

  if (colonIndex >= 0) {
    return storeFieldName.substring(0, colonIndex);
  }

  return storeFieldName;
};

var buildLeaf = function buildLeaf(cache, cacheItem, cacheKey) {
  if (!leafCache[cacheKey]) {
    leafCache[cacheKey] = _objectSpread(_objectSpread({}, (0, _keyFields.keyFieldsForTypeName)(cache, cacheItem.__typename).reduce(function (result, keyField) {
      return _objectSpread(_objectSpread({}, result), {}, _defineProperty({}, keyField, cacheItem[keyField]));
    }, {})), {}, {
      __typename: cacheItem.__typename
    });
  }

  return leafCache[cacheKey];
};

var maybeInflate = function maybeInflate(cache, cacheContents, item, path) {
  if (!item) {
    return item;
  }

  var cacheKey = cache.identify(item);
  var cacheItem = cacheContents[cacheKey] || item;

  if (!cacheItem.__typename) {
    return inflate(cache, cacheContents, cacheItem, path);
  }

  if (path.includes(cacheItem.__typename)) {
    return buildLeaf(cache, cacheItem, cacheKey);
  }

  if (!itemCache[cacheKey]) {
    itemCache[cacheKey] = inflate(cache, cacheContents, cacheItem, [].concat(_toConsumableArray(path), [cacheItem.__typename]));
  }

  return itemCache[cacheKey];
};

var inflate = function inflate(cache, cacheContents, data, path) {
  return Object.entries(data).reduce(function (result, _ref) {
    var _ref2 = _slicedToArray(_ref, 2),
        key = _ref2[0],
        item = _ref2[1];

    var fieldName = getFieldName(key);

    if (Array.isArray(item)) {
      return _objectSpread(_objectSpread({}, result), {}, _defineProperty({}, fieldName, item.map(function (entry) {
        return maybeInflate(cache, cacheContents, entry, path);
      })));
    }

    if (_typeof(item) === 'object') {
      return _objectSpread(_objectSpread({}, result), {}, _defineProperty({}, fieldName, maybeInflate(cache, cacheContents, item, path)));
    }

    return _objectSpread(_objectSpread({}, result), {}, _defineProperty({}, fieldName, item));
  }, {});
};

var _default = function _default(cache, data) {
  if (!data) {
    return data;
  }

  var cacheContents = cache.extract();
  return inflate(cache, cacheContents, data, []);
};

exports["default"] = _default;