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

var _fieldNames = require("./fieldNames");

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { (0, _defineProperty2["default"])(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

var areCacheObjectsEqual = function areCacheObjectsEqual(refA, refB, keyFields, readField) {
  return keyFields.every(function (keyField, index) {
    if (Array.isArray(keyField)) {
      return areCacheObjectsEqual(readField(keyFields[index - 1], refA), readField(keyFields[index - 1], refB), keyField, readField);
    }

    if (Array.isArray(keyFields[index + 1])) {
      return true;
    }

    return readField(keyField, refA) === readField(keyField, refB);
  });
}; // A helper that adds/removes a cache object to/from an array, depending on whether the handler
// returns true or false. Reduces overhead.


var handleIncludeIf = function handleIncludeIf(cache, item, previous, details) {
  return function (condition) {
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    var subjects = options.subjects || [item];
    var origin = options.origin || previous;

    if (subjects.length === 0) {
      return origin;
    }

    var keyFields = (0, _keyFields.keyFieldsForTypeName)(cache, subjects[0].__typename);
    var next = origin.filter(function (ref) {
      return subjects.some(function (subject) {
        return !areCacheObjectsEqual(ref, subject, keyFields, details.readField);
      });
    });
    subjects.forEach(function (subject) {
      var shouldInclude = typeof condition === 'function' ? condition(subject) : condition;

      if (shouldInclude) {
        next.push(details.toReference(subject));
      }
    });
    return next;
  };
};

var handleSetIf = function handleSetIf(cache, item, itemRef, previous, details) {
  return function (condition) {
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    if (condition) {
      return itemRef;
    }

    var subject = options.subject || item;

    if (!subject) {
      return previous;
    }

    var keyFields = (0, _keyFields.keyFieldsForTypeName)(cache, subject.__typename);
    return keyFields.every(function (keyField) {
      return details.readField(keyField, previous) === details.readField(keyField, subject);
    }) ? null : previous;
  };
};

var augmentFields = function augmentFields(cache, cacheObject, item, fields) {
  var modify = function modify(callback, previous, details) {
    // Attach a couple additional helpers to apollo's standard details object.
    var itemRef = details.toReference(item);
    return callback(_objectSpread(_objectSpread({}, details), {}, {
      previous: previous,
      item: item,
      itemRef: itemRef,
      variables: (0, _fieldNames.extractVariablesFromFieldName)(details.storeFieldName),
      includeIf: handleIncludeIf(cache, item, previous, details),
      setIf: handleSetIf(cache, item, itemRef, previous, details),
      cacheObject: cacheObject
    }));
  };

  if (typeof fields === 'function') {
    return function (previous, details) {
      return modify(fields, previous, details);
    };
  }

  return Object.entries(fields).reduce(function (result, _ref) {
    var _ref2 = (0, _slicedToArray2["default"])(_ref, 2),
        field = _ref2[0],
        modifier = _ref2[1];

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
      var result = cacheObject(item);

      if (!result) {
        return [];
      }

      return [cache.identify(result)];
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
  var dataToMerge = Object.entries(newFields).reduce(function (result, _ref3) {
    var _ref4 = (0, _slicedToArray2["default"])(_ref3, 2),
        fieldName = _ref4[0],
        modifier = _ref4[1];

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

    handleModifier(cache, cacheData, item, modifier);
  });
};

exports.handleModifiers = handleModifiers;