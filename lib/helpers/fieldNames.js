"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.buildFieldName = exports.extractVariablesFromFieldName = void 0;

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

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

var buildFieldName = function buildFieldName(selection, variables) {
  var _selection$arguments;

  if (!((_selection$arguments = selection.arguments) !== null && _selection$arguments !== void 0 && _selection$arguments.length)) {
    return selection.name.value;
  }

  var args = selection.arguments.reduce(function (result, _ref) {
    var name = _ref.name,
        value = _ref.value;
    return _objectSpread(_objectSpread({}, result), {}, (0, _defineProperty2["default"])({}, name.value, value.value || (variables === null || variables === void 0 ? void 0 : variables[value.name.value])));
  }, {}); // The field names in apollo's in-memory-cache are built like this:
  //
  // someField
  // someField({"someParam":"someValue"})
  //
  // If there are multiple arguments, they are sorted alphabetically, which is why we use
  // json-stable-stringify here (which guarantees alphabetical order).

  return "".concat(selection.name.value, "(").concat((0, _jsonStableStringify["default"])(args), ")");
};

exports.buildFieldName = buildFieldName;