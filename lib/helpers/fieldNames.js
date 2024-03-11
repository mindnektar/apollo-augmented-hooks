"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.buildFieldNames = exports.extractVariablesFromFieldName = void 0;

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _typeof2 = _interopRequireDefault(require("@babel/runtime/helpers/typeof"));

var _jsonStableStringify = _interopRequireDefault(require("json-stable-stringify"));

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { (0, _defineProperty2["default"])(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

// Apollo offers no streamlined way to extract the query variables for the cache object we are
// modifying, so this helper has to exist.
var extractVariablesFromFieldName = function extractVariablesFromFieldName(fieldName) {
  var _fieldName$match, _fieldName$match2;

  var variableString = ((_fieldName$match = fieldName.match(/\((.+)\)/)) === null || _fieldName$match === void 0 ? void 0 : _fieldName$match[1]) || ((_fieldName$match2 = fieldName.match(/:(.+)/)) === null || _fieldName$match2 === void 0 ? void 0 : _fieldName$match2[1]);
  return variableString ? JSON.parse(variableString) : null;
};

exports.extractVariablesFromFieldName = extractVariablesFromFieldName;

var parseVariableValue = function parseVariableValue(value, variables) {
  // Handle both inline and external variables
  if ((0, _typeof2["default"])(value) !== 'object') {
    return value; // this may happen with values within a list
  }

  var realValue = value.value || (variables === null || variables === void 0 ? void 0 : variables[value.name.value]);
  return value.kind === 'IntValue' ? parseInt(realValue, 10) : realValue;
};

var mapArrayArgs = function mapArrayArgs(args, variables) {
  return args.map(function (item) {
    if (item.kind === 'ObjectValue') {
      return reduceArgs(item.fields, variables);
    }

    if (item.kind === 'ListValue') {
      return mapArrayArgs(item.values, variables);
    }

    return parseVariableValue(item, variables);
  });
};

var reduceArgs = function reduceArgs(args, variables) {
  return args.reduce(function (result, _ref) {
    var name = _ref.name,
        value = _ref.value;
    var next;

    if (value.kind === 'ObjectValue') {
      next = reduceArgs(value.fields, variables);
    } else if (value.kind === 'ListValue') {
      next = mapArrayArgs(value.values);
    } else {
      next = parseVariableValue(value, variables);
    }

    return _objectSpread(_objectSpread({}, result), {}, (0, _defineProperty2["default"])({}, name.value, next));
  }, {});
};

var buildFieldNames = function buildFieldNames(selection, variables) {
  var _selection$arguments;

  if (!((_selection$arguments = selection.arguments) !== null && _selection$arguments !== void 0 && _selection$arguments.length)) {
    return [selection.name.value];
  }

  var args = reduceArgs(selection.arguments, variables); // The field names in apollo's in-memory-cache are built like this:
  //
  // someField
  // someField({"someParam":"someValue"})
  // someField:{"someParam":"someValue"}
  //
  // There are two possible formats for field names containing variables. It is unclear
  // when which one is used, so we have to account for both.
  //
  // If there are multiple arguments, they are sorted alphabetically, which is why we use
  // json-stable-stringify here (which guarantees alphabetical order).

  var argsString = (0, _jsonStableStringify["default"])(args);
  return ["".concat(selection.name.value, "(").concat(argsString, ")"), "".concat(selection.name.value, ":").concat(argsString)];
};

exports.buildFieldNames = buildFieldNames;