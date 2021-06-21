"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _typeof2 = _interopRequireDefault(require("@babel/runtime/helpers/typeof"));

var _slicedToArray2 = _interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));

var _toConsumableArray2 = _interopRequireDefault(require("@babel/runtime/helpers/toConsumableArray"));

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _keyFields = require("./keyFields");

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { (0, _defineProperty2["default"])(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

var itemCache;
var leafCache;

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
      return _objectSpread(_objectSpread({}, result), {}, (0, _defineProperty2["default"])({}, keyField, cacheItem[keyField]));
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
  var cacheItem = cacheContents[cacheKey] || item; // If the item can't be found in the cache, any of the fields it references still might, though, so we have to go deeper.

  if (!cacheKey) {
    return inflate(cache, cacheContents, cacheItem, path);
  } // Avoid infinite loops by tracking the path through the tree. If the same typename is encountered twice throughout
  // a branch, stop going deeper.


  if (path.includes(cacheItem.__typename)) {
    return buildLeaf(cache, cacheItem, cacheKey);
  } // Cache inflation can be expensive with large data trees, so avoid having to recalculate the same thing multiple times


  var itemCacheKey = "".concat(cacheKey, ":").concat(path.join('.'));

  if (!itemCache[itemCacheKey]) {
    itemCache[itemCacheKey] = inflate(cache, cacheContents, cacheItem, [].concat((0, _toConsumableArray2["default"])(path), [cacheItem.__typename]));
  }

  return itemCache[itemCacheKey];
}; // Iterate through all the fields of a selection set and check whether any of them can be inflated.


var inflate = function inflate(cache, cacheContents, data, path) {
  return Object.entries(data).reduce(function (result, _ref) {
    var _ref2 = (0, _slicedToArray2["default"])(_ref, 2),
        key = _ref2[0],
        item = _ref2[1];

    var fieldName = getFieldName(key);

    if (Array.isArray(item)) {
      return _objectSpread(_objectSpread({}, result), {}, (0, _defineProperty2["default"])({}, fieldName, item.map(function (entry) {
        return maybeInflate(cache, cacheContents, entry, path);
      })));
    }

    if ((0, _typeof2["default"])(item) === 'object') {
      return _objectSpread(_objectSpread({}, result), {}, (0, _defineProperty2["default"])({}, fieldName, maybeInflate(cache, cacheContents, item, path)));
    }

    return _objectSpread(_objectSpread({}, result), {}, (0, _defineProperty2["default"])({}, fieldName, item));
  }, {});
};
/*
This causes each sub selection to contain all the cache data it can find rather than just the selected fields.

A reduced example:

query {
    todos {
        id
        name
        createdAt
        done
    }
    users {
        id
        todos {
            id
        }
    }
}

Usually, the returned data would look something like this:

{
    todos: [{
        id: 1,
        name: 'Buy groceries',
        createdAt: '2021-06-13',
        done: false
    }],
    users: [{
        id: 2,
        todos: [{
            id: 1
        }]
    }]
}

The users's todos only contain the id because that is what was requested, but we have more data in the cache
due to the todos root query. Cache inflation makes all that data available without having to request it:

{
    todos: [{
        id: 1,
        name: 'Buy groceries',
        createdAt: '2021-06-13',
        done: false
    }],
    users: [{
        id: 2,
        todos: [{
            id: 1,
            name: 'Buy groceries',
            createdAt: '2021-06-13',
            done: false
        }]
    }]
}
*/


var _default = function _default(cache, data) {
  if (!data) {
    return data;
  }

  var cacheContents = cache.extract(true);
  itemCache = {};
  leafCache = {};
  return inflate(cache, cacheContents, data, []);
};

exports["default"] = _default;