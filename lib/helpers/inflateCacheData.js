"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _toConsumableArray2 = _interopRequireDefault(require("@babel/runtime/helpers/toConsumableArray"));

var _slicedToArray2 = _interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));

var _typeof2 = _interopRequireDefault(require("@babel/runtime/helpers/typeof"));

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _keyFields = require("./keyFields");

var _fieldNames = require("./fieldNames");

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { (0, _defineProperty2["default"])(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

var leafCache;
var itemCache;

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

var maybeInflate = function maybeInflate(cache, cacheContents, aliases, item, typenamePath, cacheKeyCache) {
  if (!item || (0, _typeof2["default"])(item) !== 'object') {
    return item;
  }

  var cacheKey = cache.identify(item);
  var cacheItem = cacheContents[cacheKey] || item; // An object that is no longer in the cache is being referenced, so we'll ignore it.

  if (cacheItem.__ref) {
    return undefined;
  } // If the item can't be found in the cache, any of the fields it references still might, though, so we have to go deeper.


  if (!cacheKey) {
    return inflate(cache, cacheContents, aliases, cacheItem, typenamePath, cacheKeyCache);
  } // Avoid infinite loops by keeping track of which cacheKey we've already seen. Once a cache key is seen twice, stop inflation.


  if (cacheKeyCache.filter(function (what) {
    return what === cacheKey;
  }).length >= 2) {
    return buildLeaf(cache, cacheItem, cacheKey);
  } // Cache inflation can take a long time with large amounts of data, so don't inflate the same thing twice.


  if (!itemCache[cacheKey]) {
    // Include both the regular field name and the alias in the object.
    var cacheItemWithAliases = Object.entries(cacheItem).reduce(function (result, _ref) {
      var _objectSpread3;

      var _ref2 = (0, _slicedToArray2["default"])(_ref, 2),
          fieldName = _ref2[0],
          value = _ref2[1];

      return _objectSpread(_objectSpread({}, result), {}, (_objectSpread3 = {}, (0, _defineProperty2["default"])(_objectSpread3, fieldName, value), (0, _defineProperty2["default"])(_objectSpread3, aliases[fieldName] || fieldName, value), _objectSpread3));
    }, {});
    itemCache[cacheKey] = inflate(cache, cacheContents, aliases, cacheItemWithAliases, [].concat((0, _toConsumableArray2["default"])(typenamePath), [cacheItemWithAliases.__typename]), [].concat((0, _toConsumableArray2["default"])(cacheKeyCache), [cacheKey]));
  }

  return itemCache[cacheKey];
}; // Iterate through all the fields of a selection set and check whether any of them can be inflated.


var inflate = function inflate(cache, cacheContents, aliases, data, typenamePath) {
  var cacheKeyCache = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : [];
  return Object.entries(data).reduce(function (result, _ref3) {
    var _ref4 = (0, _slicedToArray2["default"])(_ref3, 2),
        key = _ref4[0],
        item = _ref4[1];

    var fieldName = getFieldName(key);

    if (Array.isArray(item)) {
      return _objectSpread(_objectSpread({}, result), {}, (0, _defineProperty2["default"])({}, fieldName, item.reduce(function (itemResult, entry) {
        var inflatedEntry = maybeInflate(cache, cacheContents, aliases, entry, typenamePath, cacheKeyCache);

        if (inflatedEntry === undefined) {
          return itemResult;
        }

        return [].concat((0, _toConsumableArray2["default"])(itemResult), [inflatedEntry]);
      }, [])));
    }

    if ((0, _typeof2["default"])(item) === 'object') {
      return _objectSpread(_objectSpread({}, result), {}, (0, _defineProperty2["default"])({}, fieldName, maybeInflate(cache, cacheContents, aliases, item, typenamePath, cacheKeyCache)));
    }

    return _objectSpread(_objectSpread({}, result), {}, (0, _defineProperty2["default"])({}, fieldName, item));
  }, {});
};

var extractAliases = function extractAliases(selectionSet, variables) {
  return selectionSet.selections.reduce(function (result, selection) {
    var fieldName = (0, _fieldNames.buildFieldName)(selection, variables);
    var subSelections = selection.selectionSet ? extractAliases(selection.selectionSet, variables) : {};
    var alias = selection.alias ? (0, _defineProperty2["default"])({}, fieldName, selection.alias.value) : {};
    return _objectSpread(_objectSpread(_objectSpread({}, result), subSelections), alias);
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


var _default = function _default(cache, data, queryAst, variables) {
  if (!data) {
    return data;
  }

  var cacheContents = cache.extract(true);
  var aliases = extractAliases(queryAst.definitions[0].selectionSet, variables);
  leafCache = {};
  itemCache = {};

  if (Array.isArray(data)) {
    return data.map(function (item) {
      return inflate(cache, cacheContents, aliases, item, []);
    });
  }

  return inflate(cache, cacheContents, aliases, data, []);
};

exports["default"] = _default;