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

// All caches are module-level WeakMaps keyed on the objects being mapped, so cache entries are
// garbage-collected along with the apollo cache items they belong to. Mapping the same objects
// with the same refs must return the very same output objects: this referential stability allows
// repeated mappings to skip almost all of the work, and it keeps unrelated cache updates from
// cascading into app-wide re-renders (e.g. through context values memoized on mapped query data).
var dataCache = new WeakMap();
var refsCache = new WeakMap();
var mergedRefsCache = new WeakMap();
var mergedEntityCache = new WeakMap();
var emptyRefs = {};

var getCached = function getCached(object, cacheKey, refs) {
  var _dataCache$get;

  var cached = (_dataCache$get = dataCache.get(object)) === null || _dataCache$get === void 0 ? void 0 : _dataCache$get.get(cacheKey);
  return (cached === null || cached === void 0 ? void 0 : cached.refs) === refs ? cached.output : undefined;
};

var setCached = function setCached(object, cacheKey, refs, output) {
  if (!dataCache.has(object)) {
    dataCache.set(object, new Map());
  }

  dataCache.get(object).set(cacheKey, {
    refs: refs,
    output: output
  });
  return output;
};

var getRefs = function getRefs(data) {
  if (!data || (0, _typeof2["default"])(data) !== 'object') {
    return emptyRefs;
  }

  if (!refsCache.has(data)) {
    refsCache.set(data, Array.isArray(data) ? Object.fromEntries(data.map(function (item) {
      return [item.id, item];
    })) : (0, _defineProperty2["default"])({}, data.id, data));
  }

  return refsCache.get(data);
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
};

var mergeEntities = function mergeEntities(sourceEntity, resultEntity) {
  if (!mergedEntityCache.has(sourceEntity)) {
    mergedEntityCache.set(sourceEntity, new WeakMap());
  }

  var cache = mergedEntityCache.get(sourceEntity);

  if (!cache.has(resultEntity)) {
    cache.set(resultEntity, (0, _deepmerge["default"])(sourceEntity, resultEntity, {
      arrayMerge: mergeArrays
    }));
  }

  return cache.get(resultEntity);
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

  if (!mergedRefsCache.has(sourceRefs)) {
    mergedRefsCache.set(sourceRefs, new WeakMap());
  }

  var cache = mergedRefsCache.get(sourceRefs);

  if (!cache.has(resultRefs)) {
    cache.set(resultRefs, _objectSpread(_objectSpread({}, sourceRefs), Object.fromEntries(Object.entries(resultRefs).map(function (_ref2) {
      var _ref3 = (0, _slicedToArray2["default"])(_ref2, 2),
          id = _ref3[0],
          item = _ref3[1];

      return [id, sourceRefs[id] ? mergeEntities(sourceRefs[id], item) : item];
    }))));
  }

  return cache.get(resultRefs);
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

var mapLeafValue = function mapLeafValue(node, key, refs) {
  if (Array.isArray(node[key])) {
    return getCached(node[key], 'leaf', refs) || setCached(node[key], 'leaf', refs, node[key].map(function (item) {
      return refs[item.id] || item;
    }));
  }

  if ((0, _typeof2["default"])(node[key]) === 'object') {
    return refs[node[key].id] || node[key];
  }

  return refs[node[key]] || node[key];
};

var mapNodeData = function mapNodeData(node, path, fieldName, refs) {
  var cacheKey = "".concat(path.join('.'), ":").concat(fieldName);

  if (Array.isArray(node)) {
    return getCached(node, cacheKey, refs) || setCached(node, cacheKey, refs, node.map(function (item) {
      return mapNodeData(item, path, fieldName, refs);
    }));
  }

  var key = path[0];

  if (!node[key]) {
    return node;
  }

  var cached = getCached(node, cacheKey, refs);

  if (cached) {
    return cached;
  }

  if (path.length === 1) {
    return setCached(node, cacheKey, refs, _objectSpread(_objectSpread({}, node), {}, (0, _defineProperty2["default"])({}, fieldName, mapLeafValue(node, key, refs))));
  }

  return setCached(node, cacheKey, refs, _objectSpread(_objectSpread({}, node), {}, (0, _defineProperty2["default"])({}, key, mapNodeData(node[key], path.slice(1), fieldName, refs))));
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
    return mapNodeData(result, fromPath, fieldName, getTargetRefs(options, result, sources));
  }, data);
};

exports["default"] = _default;