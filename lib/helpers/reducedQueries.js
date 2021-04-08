"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.makeReducedQueryAst = void 0;

var _jsonStableStringify = _interopRequireDefault(require("json-stable-stringify"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

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

var buildFieldName = function buildFieldName(selection, variables) {
  var _selection$arguments;

  if (!((_selection$arguments = selection.arguments) !== null && _selection$arguments !== void 0 && _selection$arguments.length)) {
    return selection.name.value;
  }

  var args = selection.arguments.reduce(function (result, _ref) {
    var name = _ref.name,
        value = _ref.value;
    return _objectSpread(_objectSpread({}, result), {}, _defineProperty({}, name.value, value.value || (variables === null || variables === void 0 ? void 0 : variables[value.name.value])));
  }, {}); // The field names in apollo's in-memory-cache are built like this:
  //
  // someField
  // someField({"someParam":"someValue"})
  //
  // If there are multiple arguments, they are sorted alphabetically, which is why we use
  // json-stable-stringify here (which guarantees alphabetical order).

  return "".concat(selection.name.value, "(").concat((0, _jsonStableStringify["default"])(args), ")");
}; // cacheObjectOrRef may contain either the actual cache object or a reference to it. In the latter
// case, this function returns the actual cache object that is being referenced.


var getCacheObject = function getCacheObject(cacheData, cacheObjectOrRef) {
  var ref = cacheObjectOrRef === null || cacheObjectOrRef === void 0 ? void 0 : cacheObjectOrRef.__ref;

  if (ref && cacheData[ref] !== null) {
    return cacheData[ref];
  }

  return cacheObjectOrRef;
};

var isPresentInCache = function isPresentInCache(cacheData, cacheObjectOrRef, fieldName) {
  var cacheObject = getCacheObject(cacheData, cacheObjectOrRef); // Null means that the cache object exists but contains no data.

  if (cacheObject === null) {
    return true;
  } // The cache object may have been evicted from the cache. So any of its children aren't in the
  // cache either.


  if (cacheObject === undefined) {
    return false;
  }

  return cacheObject[fieldName] !== undefined;
};

var findNextCacheObjectsOrRefs = function findNextCacheObjectsOrRefs(cacheData, cacheObjectsOrRefs, fieldName) {
  return cacheObjectsOrRefs.reduce(function (result, item) {
    var itemCacheObject = getCacheObject(cacheData, item);

    if (itemCacheObject === null) {
      return result;
    }

    var fieldData = itemCacheObject[fieldName];

    if (Array.isArray(fieldData)) {
      return [].concat(_toConsumableArray(result), _toConsumableArray(fieldData));
    }

    return [].concat(_toConsumableArray(result), [fieldData]);
  }, []);
};

var isKeyField = function isKeyField(cacheData, cacheObjectsOrRefs, fieldName, keyFields) {
  var cacheObject = cacheObjectsOrRefs.reduce(function (result, item) {
    return result || getCacheObject(cacheData, item);
  }, null); // The default key field is "id", but it can be altered for specific typenames.

  var keyFieldsForThisTypename = keyFields[cacheObject === null || cacheObject === void 0 ? void 0 : cacheObject.__typename] || ['id'];
  return keyFieldsForThisTypename.includes(fieldName);
};

var filterSubSelections = function filterSubSelections(selections, cacheData, cacheObjectsOrRefs, variables, keyFields) {
  // If there is no cache object or reference, there is no data in the cache for this field, so we
  // keep this part of the query.
  if (cacheObjectsOrRefs === undefined) {
    return selections;
  }

  var reducedSelections = selections.reduce(function (result, selection) {
    var fieldName = buildFieldName(selection, variables);

    if ( // Always keep any key fields, otherwise apollo can't merge the cache items after the
    // request is done.
    isKeyField(cacheData, cacheObjectsOrRefs, fieldName, keyFields) // Keep the entire selection if at least one of its items is not in the cache (it may
    // have been evicted at some point).
    || !cacheObjectsOrRefs.every(function (item) {
      return isPresentInCache(cacheData, item, fieldName);
    })) {
      return [].concat(_toConsumableArray(result), [selection]);
    } // The current field is not a leaf in the tree, so we may need to go deeper.


    if (selection.selectionSet) {
      // Gather all cache objects or refs of the next level in the tree. Ignore any null
      // values. By not only using a single object as a reference but rather as many like
      // objects as possible, we increase our chances of finding a useful reference for any
      // deeper-level fields.
      var nextCacheObjectsOrRefs = findNextCacheObjectsOrRefs(cacheData, cacheObjectsOrRefs, fieldName); // If we can't find any data for this field in the cache at all, we'll drop the entire
      // selection. This may also be the case if we have already requested this field before,
      // but it has returned empty arrays for every single item.

      if (nextCacheObjectsOrRefs.length === 0) {
        return result;
      } // If every single item is in the cache but contains a null value, we can drop the rest
      // of the selection because there will be no data on deeper levels.


      if (nextCacheObjectsOrRefs.every(function (item) {
        return item === null;
      })) {
        return result;
      }

      return handleSubSelections(result, selection, cacheData, nextCacheObjectsOrRefs, variables, keyFields);
    }

    return result;
  }, []); // If the reduced selection set is empty or only contains key fields, the cache already
  // contains all the data we need, so we can ignore this selection.

  if (reducedSelections.every(function (_ref2) {
    var name = _ref2.name;
    return isKeyField(cacheData, cacheObjectsOrRefs, name.value, keyFields);
  })) {
    return [];
  }

  return reducedSelections;
};

var handleSubSelections = function handleSubSelections(result, selection, cacheData, cacheObjectsOrRefs, variables, keyFields) {
  var subSelections = filterSubSelections(selection.selectionSet.selections, cacheData, cacheObjectsOrRefs, variables, keyFields);

  if (subSelections.length === 0) {
    return result;
  }

  return [].concat(_toConsumableArray(result), [_objectSpread(_objectSpread({}, selection), {}, {
    selectionSet: _objectSpread(_objectSpread({}, selection.selectionSet), {}, {
      selections: subSelections
    })
  })]);
};

var hasVariable = function hasVariable(selectionSet, variable) {
  return ((selectionSet === null || selectionSet === void 0 ? void 0 : selectionSet.selections) || []).some(function (selection) {
    var isVariableInArguments = selection.arguments.some(function (_ref3) {
      var _value$name;

      var value = _ref3.value;
      return (value === null || value === void 0 ? void 0 : (_value$name = value.name) === null || _value$name === void 0 ? void 0 : _value$name.value) === variable;
    });
    var isVariableInDirectives = selection.directives.some(function (directive) {
      return directive.arguments.some(function (_ref4) {
        var _value$name2;

        var value = _ref4.value;
        return (value === null || value === void 0 ? void 0 : (_value$name2 = value.name) === null || _value$name2 === void 0 ? void 0 : _value$name2.value) === variable;
      });
    });
    var isVariableInSelectionSet = hasVariable(selection.selectionSet, variable);
    return isVariableInArguments || isVariableInDirectives || isVariableInSelectionSet;
  });
};

var getKeyFields = function getKeyFields(cache) {
  var typePolicies = Object.entries(cache.config.typePolicies);
  return typePolicies.reduce(function (result, _ref5) {
    var _ref6 = _slicedToArray(_ref5, 2),
        typename = _ref6[0],
        keyFields = _ref6[1].keyFields;

    if (!keyFields) {
      return result;
    }

    return _objectSpread(_objectSpread({}, result), {}, _defineProperty({}, typename, keyFields));
  }, {});
};

var makeReducedQueryAst = function makeReducedQueryAst(cache, queryAst, variables) {
  var _definition$name;

  var cacheContents = cache.extract();
  var keyFields = getKeyFields(cache); // Recursively iterate through the entire graphql query tree, removing the fields for which we
  // already have data in the cache.

  var selections = queryAst.definitions[0].selectionSet.selections.reduce(function (result, selection) {
    var _cacheContents$ROOT_Q;

    var fieldName = buildFieldName(selection, variables);
    var cacheObjectsOrRefs = (_cacheContents$ROOT_Q = cacheContents.ROOT_QUERY) === null || _cacheContents$ROOT_Q === void 0 ? void 0 : _cacheContents$ROOT_Q[fieldName];

    if (cacheObjectsOrRefs === undefined) {
      // If the field cannot be found in the cache, keep the entire selection.
      return [].concat(_toConsumableArray(result), [selection]);
    }

    if (!Array.isArray(cacheObjectsOrRefs)) {
      cacheObjectsOrRefs = [cacheObjectsOrRefs];
    }

    return handleSubSelections(result, selection, cacheContents, cacheObjectsOrRefs, variables, keyFields);
  }, []); // Construct a new tree from the reduced selection set.

  var definition = queryAst.definitions[0];

  var selectionSet = _objectSpread(_objectSpread({}, definition.selectionSet), {}, {
    selections: selections
  });

  var reducedQueryAst = _objectSpread(_objectSpread({}, queryAst), {}, {
    definitions: [_objectSpread(_objectSpread({}, definition), {}, {
      name: {
        kind: 'Name',
        // Prefix the query name with something that clearly marks it as manipulated.
        value: "__REDUCED__".concat(((_definition$name = definition.name) === null || _definition$name === void 0 ? void 0 : _definition$name.value) || '')
      },
      selectionSet: selectionSet,
      // Remove variable definitions that are no longer referenced anywhere in the selection
      // set.
      variableDefinitions: definition.variableDefinitions.filter(function (_ref7) {
        var variable = _ref7.variable;
        return hasVariable(selectionSet, variable.name.value);
      })
    })]
  }); // If the reduced query happens to have no more selections because everything is already
  // available in the cache, return null so we can skip this query.


  if (reducedQueryAst.definitions[0].selectionSet.selections.length === 0) {
    return null;
  }

  return reducedQueryAst;
};

exports.makeReducedQueryAst = makeReducedQueryAst;