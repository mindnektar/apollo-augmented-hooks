"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _slicedToArray2 = _interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _typeof2 = _interopRequireDefault(require("@babel/runtime/helpers/typeof"));

var _deepmerge = _interopRequireDefault(require("deepmerge"));

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { (0, _defineProperty2["default"])(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

var mapObjectData = function mapObjectData(object, path, fieldName, refs) {
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

  var nextPath = path.slice(1);

  if (Array.isArray(object[key])) {
    return _objectSpread(_objectSpread({}, object), {}, (0, _defineProperty2["default"])({}, key, object[key].map(function (item) {
      return mapObjectData(item, nextPath, fieldName, refs);
    })));
  }

  return _objectSpread(_objectSpread({}, object), {}, (0, _defineProperty2["default"])({}, key, mapObjectData(object[key], nextPath, fieldName, refs)));
};

var getRefs = function getRefs(data) {
  if (!data) {
    return {};
  }

  return Array.isArray(data) ? Object.fromEntries(data.map(function (item) {
    return [item.id, item];
  })) : (0, _defineProperty2["default"])({}, data.id, data);
}; // Entity arrays are matched by id, keeping the membership and order of the result-side array so
// deliberately filtered lists stay filtered. Items without a matching id (including arrays of
// non-entity values) resolve to the result side wholesale.


var mergeArrays = function mergeArrays(target, source, options) {
  var targetRefs = Object.fromEntries(target.filter(function (item) {
    return (item === null || item === void 0 ? void 0 : item.id) !== undefined;
  }).map(function (item) {
    return [item.id, item];
  }));
  return source.map(function (item) {
    return options.isMergeableObject(item) && targetRefs[item === null || item === void 0 ? void 0 : item.id] ? (0, _deepmerge["default"])(targetRefs[item.id], item, options) : item;
  });
}; // When the same id exists in both the query result and the registered sources, the two entities
// are deep-merged per field with the query result taking precedence, so the same target may be
// requested in both places with different sub selections. Entities present on only one side are
// passed through as is to avoid unnecessary cloning.


var mergeRefs = function mergeRefs(sourceRefs, resultRefs) {
  if (!Object.keys(sourceRefs).length) {
    return resultRefs;
  }

  if (!Object.keys(resultRefs).length) {
    return sourceRefs;
  }

  return _objectSpread(_objectSpread({}, sourceRefs), Object.fromEntries(Object.entries(resultRefs).map(function (_ref2) {
    var _ref3 = (0, _slicedToArray2["default"])(_ref2, 2),
        id = _ref3[0],
        item = _ref3[1];

    return [id, sourceRefs[id] ? (0, _deepmerge["default"])(sourceRefs[id], item, {
      arrayMerge: mergeArrays
    }) : item];
  })));
}; // If data is passed directly, it is used exclusively. Otherwise the target is resolved against
// both the query result and the sources registered via `setDataMapSourcesHook`.


var getTargetRefs = function getTargetRefs(_ref4, result, sources) {
  var target = _ref4.target,
      data = _ref4.data;

  if (data !== undefined) {
    return getRefs(data);
  }

  return mergeRefs(getRefs(sources === null || sources === void 0 ? void 0 : sources[target]), getRefs(result[target]));
};

var _default = function _default(data) {
  var map = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var sources = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

  if (!data) {
    return data;
  }

  return Object.entries(map).reduce(function (result, _ref5) {
    var _ref6 = (0, _slicedToArray2["default"])(_ref5, 2),
        from = _ref6[0],
        to = _ref6[1];

    var fromPath = from.split('.');
    var options = (0, _typeof2["default"])(to) === 'object' ? to : {
      target: to
    };
    var fieldName = options.fieldName || fromPath.at(-1);
    return mapObjectData(result, fromPath, fieldName, getTargetRefs(options, result, sources));
  }, data);
};

exports["default"] = _default;