"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.handleModifiers = void 0;

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _iterableToArrayLimit(arr, i) { if (typeof Symbol === "undefined" || !(Symbol.iterator in Object(arr))) return; var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

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

var augmentFields = function augmentFields(cache, item, fields) {
  var modify = function modify(callback, previous, details) {
    return (// Attach a couple additional helpers to apollo's standard details object.
      callback(_objectSpread(_objectSpread({}, details), {}, {
        previous: previous,
        item: item,
        itemRef: details.toReference(item),
        variables: getVariables(details),
        includeIf: handleIncludeIf(cache, item, previous, details)
      }))
    );
  };

  if (typeof fields === 'function') {
    return function (previous, details) {
      return modify(fields, previous, details);
    };
  }

  return Object.entries(fields).reduce(function (result, _ref) {
    var _ref2 = _slicedToArray(_ref, 2),
        field = _ref2[0],
        modifier = _ref2[1];

    return _objectSpread(_objectSpread({}, result), {}, _defineProperty({}, field, function (previous, details) {
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
  });
};

exports.handleModifiers = handleModifiers;