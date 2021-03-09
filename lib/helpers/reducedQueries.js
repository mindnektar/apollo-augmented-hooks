"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.makeReducedQueryAst = void 0;

var _jsonStableStringify = _interopRequireDefault(require("json-stable-stringify"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

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
// case, this function returns the actual cache object that is being referenced. If a fieldName is
// passed, the function will attempt to retrieve a cache object of the same typename where there is
// useful data for that fieldName, so we are able to dig deeper into the sub selections.


var getCacheObject = function getCacheObject(cacheData, cacheObjectOrRef, fieldName) {
  var ref = cacheObjectOrRef === null || cacheObjectOrRef === void 0 ? void 0 : cacheObjectOrRef.__ref;

  if (ref) {
    if (fieldName) {
      var _cacheData$ref;

      if (((_cacheData$ref = cacheData[ref]) === null || _cacheData$ref === void 0 ? void 0 : _cacheData$ref[fieldName]) !== null) {
        return cacheData[ref];
      }

      var typeName = ref.match(/^(.*):/)[1];
      return Object.values(cacheData).find(function (value) {
        return value.__typeName === typeName && value[fieldName] !== null;
      }) || cacheData[ref];
    }

    if (cacheData[ref] !== null) {
      return cacheData[ref];
    }
  }

  return cacheObjectOrRef;
};

var isPresentInCache = function isPresentInCache(cacheData, cacheObjectOrRef, fieldName) {
  var cacheObject = getCacheObject(cacheData, cacheObjectOrRef); // Null means that the cache object exists but contains no data (unlike undefined, which would
  // mean the cache object is missing).

  if (cacheObject === null) {
    return true;
  }

  return cacheObject[fieldName] !== undefined;
};

var filterSubSelections = function filterSubSelections(selections, cacheData, cacheObjectOrRef, variables) {
  // If there is no cache object or reference, there is no data in the cache for this field, so we
  // keep this part of the query.
  if (cacheObjectOrRef === undefined) {
    return selections;
  }

  var reducedSelections = selections.reduce(function (result, selection) {
    var fieldName = buildFieldName(selection, variables); // The current field is not a leaf in the tree, so we may need to go deeper.

    if (selection.selectionSet) {
      var cacheObject;

      if (Array.isArray(cacheObjectOrRef)) {
        var index = cacheObjectOrRef.findIndex(function (item) {
          var itemCacheObject = getCacheObject(cacheData, item);

          if (Array.isArray(itemCacheObject[fieldName])) {
            return itemCacheObject[fieldName].length > 0;
          }

          return itemCacheObject[fieldName] !== null;
        });
        cacheObject = getCacheObject(cacheData, cacheObjectOrRef[index]);
      } else {
        cacheObject = getCacheObject(cacheData, cacheObjectOrRef, fieldName);
      } // If we can't find any data for this field in the cache at all, we'll keep the entire
      // selection. This may also be the case if we have already requested this field before,
      // but it has returned null data or empty arrays for every single item.


      if (cacheObject === null || cacheObject === undefined) {
        return [].concat(_toConsumableArray(result), [selection]);
      }

      return handleSubSelections(result, selection, cacheData, cacheObject[fieldName], variables);
    } // Always keep the id field, otherwise apollo can't merge the cache items after the
    // request is done.


    if (fieldName === 'id') {
      return [].concat(_toConsumableArray(result), [selection]);
    }

    if (Array.isArray(cacheObjectOrRef)) {
      return cacheObjectOrRef.every(function (item) {
        return isPresentInCache(cacheData, item, fieldName);
      }) ? result : [].concat(_toConsumableArray(result), [selection]);
    }

    return isPresentInCache(cacheData, cacheObjectOrRef, fieldName) ? result : [].concat(_toConsumableArray(result), [selection]);
  }, []); // If the reduced selection set is empty or only contains the mandatory id, the cache already
  // contains all the data we need, so we can ignore this selection.

  if (reducedSelections.length <= 1 && (!reducedSelections[0] || reducedSelections[0].name.value === 'id')) {
    return [];
  }

  return reducedSelections;
};

var handleSubSelections = function handleSubSelections(result, selection, cacheData, cacheObjectOrRef, variables) {
  var subSelections = filterSubSelections(selection.selectionSet.selections, cacheData, cacheObjectOrRef, variables);

  if (subSelections.length === 0) {
    return result;
  }

  return [].concat(_toConsumableArray(result), [_objectSpread(_objectSpread({}, selection), {}, {
    selectionSet: _objectSpread(_objectSpread({}, selection.selectionSet), {}, {
      selections: subSelections
    })
  })]);
};

var makeReducedQueryAst = function makeReducedQueryAst(cache, queryAst, variables) {
  var _queryAst$definitions;

  var cacheContents = cache.extract(); // Recursively iterate through the entire graphql query tree, removing the fields for which we
  // already have data in the cache.

  var selections = queryAst.definitions[0].selectionSet.selections.reduce(function (result, selection) {
    var _cacheContents$ROOT_Q;

    var fieldName = buildFieldName(selection, variables);
    var cacheObjectOrRef = (_cacheContents$ROOT_Q = cacheContents.ROOT_QUERY) === null || _cacheContents$ROOT_Q === void 0 ? void 0 : _cacheContents$ROOT_Q[fieldName];

    if (cacheObjectOrRef === undefined) {
      // If the field cannot be found in the cache, keep the entire selection.
      return [].concat(_toConsumableArray(result), [selection]);
    }

    return handleSubSelections(result, selection, cacheContents, cacheObjectOrRef, variables);
  }, []); // Construct a new tree from the reduced selection set.

  var reducedQueryAst = _objectSpread(_objectSpread({}, queryAst), {}, {
    definitions: [_objectSpread(_objectSpread({}, queryAst.definitions[0]), {}, {
      name: {
        kind: 'Name',
        // Prefix the query name with something that clearly marks it as manipulated.
        value: "__REDUCED__".concat(((_queryAst$definitions = queryAst.definitions[0].name) === null || _queryAst$definitions === void 0 ? void 0 : _queryAst$definitions.value) || '')
      },
      selectionSet: _objectSpread(_objectSpread({}, queryAst.definitions[0].selectionSet), {}, {
        selections: selections
      })
    })]
  }); // If the reduced query happens to have no more selections because everything is already
  // available in the cache, simply return the original query. Apollo will fetch everything from
  // the cache by itself rather than make a request to the server.


  if (reducedQueryAst.definitions[0].selectionSet.selections.length === 0) {
    return queryAst;
  }

  return reducedQueryAst;
};

exports.makeReducedQueryAst = makeReducedQueryAst;