"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.handleModifiers = void 0;

var _slicedToArray2 = _interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

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
  return function (includeIf) {
    var next = previous.filter(function (ref) {
      return details.readField('id', ref) !== item.id;
    });

    if (includeIf) {
      next.push(details.toReference(item));
    }

    return next;
  };
};

var shouldResetReducedQueries = false;

var augmentFields = function augmentFields(cache, item, fields) {
  var modify = function modify(callback, previous, details) {
    // Attach a couple additional helpers to apollo's standard details object.
    var callbackResult = callback(_objectSpread(_objectSpread({}, details), {}, {
      previous: previous,
      item: item,
      itemRef: details.toReference(item),
      variables: getVariables(details),
      includeIf: handleIncludeIf(cache, item, previous, details)
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

  return Object.entries(fields).reduce(function (result, _ref) {
    var _ref2 = (0, _slicedToArray2["default"])(_ref, 2),
        field = _ref2[0],
        modifier = _ref2[1];

    return _objectSpread(_objectSpread({}, result), {}, (0, _defineProperty2["default"])({}, field, function (previous, details) {
      return modify(modifier, previous, details);
    }));
  }, {});
};

var getCacheIds = function getCacheIds(cache, item, cacheObject, typename) {
  if (!cacheObject && !typename) {
    return ['ROOT_QUERY'];
  }

  if (cacheObject) {
    if (typeof cacheObject === 'function') {
      return [cache.identify(cacheObject(item))];
    }

    return [cache.identify(cacheObject)];
  }

  return Object.keys(cache.extract()).filter(function (key) {
    return key.startsWith("".concat(typename, ":"));
  });
};

var handleModifiers = function handleModifiers(cache, item, modifiers) {
  if (!modifiers) {
    return;
  }

  modifiers.forEach(function (_ref3) {
    var cacheObject = _ref3.cacheObject,
        typename = _ref3.typename,
        fields = _ref3.fields,
        evict = _ref3.evict;
    var cacheIds = getCacheIds(cache, item, cacheObject, typename);
    cacheIds.forEach(function (cacheId) {
      if (evict) {
        // Remove the specified cache object from the cache along with all references to it
        // on any other cache objects.
        cache.evict({
          id: cacheId
        });
        cache.gc();
        return;
      }

      try {
        cache.modify({
          id: cacheId,
          fields: augmentFields(cache, item, fields)
        });
      } catch (error) {
        // Cache errors are swallowed, so specifically output them to the console.

        /* eslint-disable-next-line no-console */
        console.error(error);
        throw error;
      }
    });
  }); // If at least one modifier contained a field returning the DELETE sentinel object, cause all
  // active reduced queries to recompute, so that a refetch happens if they include the deleted field.

  if (shouldResetReducedQueries) {
    window.dispatchEvent(new Event('reset-reduced-queries'));
    shouldResetReducedQueries = false;
  }
};

exports.handleModifiers = handleModifiers;