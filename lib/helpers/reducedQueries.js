"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.makeReducedQueryAst = void 0;

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _toConsumableArray2 = _interopRequireDefault(require("@babel/runtime/helpers/toConsumableArray"));

var _keyFields = require("./keyFields");

var _fieldNames = require("./fieldNames");

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { (0, _defineProperty2["default"])(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

// cacheObjectOrRef may contain either the actual cache object or a reference to it. In the latter
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
      return [].concat((0, _toConsumableArray2["default"])(result), (0, _toConsumableArray2["default"])(fieldData));
    }

    return [].concat((0, _toConsumableArray2["default"])(result), [fieldData]);
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
    if (selection.kind !== 'Field') {
      return [].concat((0, _toConsumableArray2["default"])(result), [selection]);
    }

    var fieldName = (0, _fieldNames.buildFieldName)(selection, variables);

    if ( // Always keep any key fields, otherwise apollo can't merge the cache items after the
    // request is done.
    isKeyField(cacheData, cacheObjectsOrRefs, fieldName, keyFields) // Keep the entire selection if at least one of its items is not in the cache (it may
    // have been evicted at some point).
    || !cacheObjectsOrRefs.every(function (item) {
      return isPresentInCache(cacheData, item, fieldName);
    })) {
      return [].concat((0, _toConsumableArray2["default"])(result), [selection]);
    } // Drop the selection if it is marked with the @client directive, since that means it's
    // local-only.


    if (selection.directives.some(function (directive) {
      return directive.name.value === 'client';
    })) {
      return result;
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

  var containsOnlyKeyFields = reducedSelections.every(function (_ref) {
    var name = _ref.name,
        kind = _ref.kind;
    return kind === 'Field' && isKeyField(cacheData, cacheObjectsOrRefs, name.value, keyFields);
  });

  if (containsOnlyKeyFields) {
    return [];
  }

  return reducedSelections;
};

var handleSubSelections = function handleSubSelections(result, selection, cacheData, cacheObjectsOrRefs, variables, keyFields) {
  var subSelections = filterSubSelections(selection.selectionSet.selections, cacheData, cacheObjectsOrRefs, variables, keyFields);

  if (subSelections.length === 0) {
    return result;
  }

  return [].concat((0, _toConsumableArray2["default"])(result), [_objectSpread(_objectSpread({}, selection), {}, {
    selectionSet: _objectSpread(_objectSpread({}, selection.selectionSet), {}, {
      selections: subSelections
    })
  })]);
};

var hasArgumentVariable = function hasArgumentVariable(args, variable) {
  return args.some(function (argument) {
    if (argument.kind === 'Variable') {
      return argument.name.value === variable;
    }

    if (argument.kind === 'Argument' || argument.kind === 'ObjectField') {
      return hasArgumentVariable([argument.value], variable);
    }

    if (argument.kind === 'ObjectValue') {
      return hasArgumentVariable(argument.fields, variable);
    }

    if (argument.kind === 'ListValue') {
      return hasArgumentVariable(argument.values, variable);
    }

    return argument.value === variable;
  });
};

var hasVariable = function hasVariable(selectionSet, variable) {
  return ((selectionSet === null || selectionSet === void 0 ? void 0 : selectionSet.selections) || []).some(function (selection) {
    if (selection.kind !== 'Field') {
      return true;
    }

    var isVariableInArguments = hasArgumentVariable(selection.arguments, variable);
    var isVariableInDirectives = selection.directives.some(function (directive) {
      return directive.arguments.some(function (_ref2) {
        var _value$name;

        var value = _ref2.value;
        return (value === null || value === void 0 ? void 0 : (_value$name = value.name) === null || _value$name === void 0 ? void 0 : _value$name.value) === variable;
      });
    });
    var isVariableInSelectionSet = hasVariable(selection.selectionSet, variable);
    return isVariableInArguments || isVariableInDirectives || isVariableInSelectionSet;
  });
};

var makeReducedQueryAst = function makeReducedQueryAst(cache, queryAst, variables) {
  var cacheContents = cache.extract();
  var keyFields = (0, _keyFields.getKeyFields)(cache);

  var reducedQueryAst = _objectSpread(_objectSpread({}, queryAst), {}, {
    definitions: queryAst.definitions.map(function (definition) {
      var _definition$name;

      if (definition.kind !== 'OperationDefinition') {
        return definition;
      } // Recursively iterate through the entire graphql query tree, removing the fields for which we
      // already have data in the cache.


      var selections = definition.selectionSet.selections.reduce(function (result, selection) {
        var _cacheContents$ROOT_Q;

        if (selection.kind !== 'Field') {
          return [].concat((0, _toConsumableArray2["default"])(result), [selection]);
        }

        var fieldName = (0, _fieldNames.buildFieldName)(selection, variables);
        var cacheObjectsOrRefs = (_cacheContents$ROOT_Q = cacheContents.ROOT_QUERY) === null || _cacheContents$ROOT_Q === void 0 ? void 0 : _cacheContents$ROOT_Q[fieldName];

        if (cacheObjectsOrRefs === undefined) {
          // If the field cannot be found in the cache, keep the entire selection.
          return [].concat((0, _toConsumableArray2["default"])(result), [selection]);
        }

        if (!selection.selectionSet) {
          // If the field is not an object or array and it's already in the cache, there are no sub selections to handle.
          return result;
        }

        if (!Array.isArray(cacheObjectsOrRefs)) {
          cacheObjectsOrRefs = [cacheObjectsOrRefs];
        }

        return handleSubSelections(result, selection, cacheContents, cacheObjectsOrRefs, variables, keyFields);
      }, []); // Construct a new tree from the reduced selection set.

      var selectionSet = _objectSpread(_objectSpread({}, definition.selectionSet), {}, {
        selections: selections
      });

      return _objectSpread(_objectSpread({}, definition), {}, {
        name: {
          kind: 'Name',
          // Prefix the query name with something that clearly marks it as manipulated.
          value: "__REDUCED__".concat(((_definition$name = definition.name) === null || _definition$name === void 0 ? void 0 : _definition$name.value) || '')
        },
        selectionSet: selectionSet,
        // Remove variable definitions that are no longer referenced anywhere in the selection
        // set.
        variableDefinitions: definition.variableDefinitions.filter(function (_ref3) {
          var variable = _ref3.variable;
          return hasVariable(selectionSet, variable.name.value);
        })
      });
    })
  }); // If the reduced query happens to have no more selections because everything is already
  // available in the cache, return null so we can skip this query.


  if (reducedQueryAst.definitions[0].selectionSet.selections.length === 0) {
    return null;
  }

  return reducedQueryAst;
};

exports.makeReducedQueryAst = makeReducedQueryAst;