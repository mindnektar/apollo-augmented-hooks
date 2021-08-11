"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.handleModifiers = void 0;

var _slicedToArray2 = _interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _jsonStableStringify = _interopRequireDefault(require("json-stable-stringify"));

var _keyFields = require("./keyFields");

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { (0, _defineProperty2["default"])(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

// Apollo offers no streamlined way to extract the query variables for the cache object we are
// modifying, so this helper has to exist.
var getVariables = function getVariables(details) {
  var _details$storeFieldNa, _details$storeFieldNa2;

  var variableString = ((_details$storeFieldNa = details.storeFieldName.match(/\((.+)\)/)) === null || _details$storeFieldNa === void 0 ? void 0 : _details$storeFieldNa[1]) || ((_details$storeFieldNa2 = details.storeFieldName.match(/:(.+)/)) === null || _details$storeFieldNa2 === void 0 ? void 0 : _details$storeFieldNa2[1]);
  return variableString ? JSON.parse(variableString) : null;
}; // A helper that adds/removes a cache object to/from an array, depending on whether the handler
// returns true or false. Reduces overhead.


var handleIncludeIf = function handleIncludeIf(cache, item, previous, details) {
  return function (condition, _ref) {
    var subjects = _ref.subjects,
        origin = _ref.origin;
    var subjectsToFilter = subjects || [item];
    var previousArray = origin || previous;

    if (subjectsToFilter.length === 0) {
      return previousArray;
    }

    var keyFields = (0, _keyFields.keyFieldsForTypeName)(cache, subjectsToFilter[0].__typename);
    var next = previousArray.filter(function (ref) {
      return subjectsToFilter.some(function (subject) {
        return !keyFields.every(function (keyField) {
          return details.readField(keyField, ref) === subject[keyField];
        });
      });
    });
    subjectsToFilter.forEach(function (subject) {
      var shouldInclude = typeof condition === 'function' ? condition(subject) : condition;

      if (shouldInclude) {
        next.push(details.toReference(subject));
      }
    });
    return next;
  };
};

var shouldResetReducedQueries = false;

var augmentFields = function augmentFields(cache, cacheObject, item, fields) {
  var modify = function modify(callback, previous, details) {
    // Attach a couple additional helpers to apollo's standard details object.
    var callbackResult = callback(_objectSpread(_objectSpread({}, details), {}, {
      previous: previous,
      item: item,
      itemRef: details.toReference(item),
      variables: getVariables(details),
      includeIf: handleIncludeIf(cache, item, previous, details),
      cacheObject: cacheObject
    })); // Since the reduced queries are cached, they need to be notified when the DELETE sentinel
    // object is returned, so that a refetch happens if they include the deleted field. We set
    // the flag here and trigger the respective event after all modifiers have been handled.

    if (callbackResult === details.DELETE) {
      shouldResetReducedQueries = true;
    }

    return callbackResult;
  };

  if (typeof fields === 'function') {
    return function (previous, details) {
      return modify(fields, previous, details);
    };
  }

  return Object.entries(fields).reduce(function (result, _ref2) {
    var _ref3 = (0, _slicedToArray2["default"])(_ref2, 2),
        field = _ref3[0],
        modifier = _ref3[1];

    return _objectSpread(_objectSpread({}, result), {}, (0, _defineProperty2["default"])({}, field, function (previous, details) {
      return modify(modifier, previous, details);
    }));
  }, {});
};

var getCacheIds = function getCacheIds(cache, cacheData, item, cacheObject, typename) {
  if (!cacheObject && !typename) {
    return ['ROOT_QUERY'];
  }

  if (cacheObject) {
    if (typeof cacheObject === 'function') {
      return [cache.identify(cacheObject(item))];
    }

    return [cache.identify(cacheObject)];
  }

  return Object.keys(cacheData).filter(function (key) {
    return key.startsWith("".concat(typename, ":"));
  });
};

var handleEviction = function handleEviction(cache, cacheId) {
  // Remove the specified cache object from the cache along with all references to it
  // on any other cache objects.
  cache.evict({
    id: cacheId
  });
  cache.gc();
};

var handleNewFields = function handleNewFields(cache, cacheData, cacheId, item, newFields) {
  // Sometimes you might want to add fields to cache objects that do not exist yet in order to
  // avoid another server roundtrip to fetch data that your mutation already provides. `cache.modify`
  // can't do that (as the name suggests, you can only modify existing fields), and `cache.writeQuery`
  // is very verbose, so let's provide a compact way via a modifier.
  var dataToMerge = Object.entries(newFields).reduce(function (result, _ref4) {
    var _ref5 = (0, _slicedToArray2["default"])(_ref4, 2),
        fieldName = _ref5[0],
        modifier = _ref5[1];

    var helpers = {
      toReference: cache.data.toReference,
      item: item,
      itemRef: cache.data.toReference(item),
      cacheObject: cacheData[cacheId]
    };

    if (typeof modifier === 'function') {
      return _objectSpread(_objectSpread({}, result), {}, (0, _defineProperty2["default"])({}, fieldName, modifier(helpers)));
    }

    var variables;
    var storeFieldName = fieldName;

    if (modifier.variables) {
      variables = typeof modifier.variables === 'function' ? modifier.variables({
        item: item
      }) : modifier.variables;
      storeFieldName = "".concat(fieldName, "(").concat((0, _jsonStableStringify["default"])(variables), ")");
    }

    return _objectSpread(_objectSpread({}, result), {}, (0, _defineProperty2["default"])({}, storeFieldName, modifier.modify(_objectSpread(_objectSpread({}, helpers), {}, {
      variables: variables
    }))));
  }, {});
  cache.data.merge(cacheId, dataToMerge);
};

var handleFields = function handleFields(cache, cacheData, cacheId, item, fields) {
  try {
    cache.modify({
      id: cacheId,
      fields: augmentFields(cache, cacheData[cacheId], item, fields)
    });
  } catch (error) {
    // Cache errors are swallowed, so specifically output them to the console.

    /* eslint-disable-next-line no-console */
    console.error(error);
    throw error;
  }
};

var handleModifier = function handleModifier(cache, cacheData, item, modifier) {
  var cacheObject = modifier.cacheObject,
      typename = modifier.typename,
      fields = modifier.fields,
      newFields = modifier.newFields,
      evict = modifier.evict;
  var cacheIds = getCacheIds(cache, cacheData, item, cacheObject, typename);
  cacheIds.forEach(function (cacheId) {
    if (evict) {
      handleEviction(cache, cacheId);
    }

    if (newFields) {
      handleNewFields(cache, cacheData, cacheId, item, newFields);
    }

    if (fields) {
      handleFields(cache, cacheData, cacheId, item, fields);
    }
  });
};

var handleModifiers = function handleModifiers(cache, item, modifiers) {
  if (!modifiers) {
    return;
  }

  var cacheData = cache.extract();
  modifiers.forEach(function (modifier) {
    if (typeof modifier === 'function') {
      if (!Array.isArray(item)) {
        throw new Error('Functional modifiers are only possible if your mutation returned an array');
      }

      item.forEach(function (arrayElement) {
        handleModifier(cache, cacheData, arrayElement, modifier(arrayElement));
      });
      return;
    }

    handleModifier(modifier);
  }); // If at least one modifier contained a field returning the DELETE sentinel object, cause all
  // active reduced queries to recompute, so that a refetch happens if they include the deleted field.

  if (shouldResetReducedQueries) {
    window.dispatchEvent(new Event('reset-reduced-queries'));
    shouldResetReducedQueries = false;
  }
};

exports.handleModifiers = handleModifiers;