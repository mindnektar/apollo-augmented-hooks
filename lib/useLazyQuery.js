"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _client = require("@apollo/client");

var _apolloClient = _interopRequireDefault(require("./apolloClient"));

var _globalContextHook = require("./globalContextHook");

var _modifiers = require("./helpers/modifiers");

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { (0, _defineProperty2["default"])(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

var _default = function _default(query) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var client = (0, _apolloClient["default"])();
  var globalContext = (0, _globalContextHook.useGlobalContext)();
  var queryAst = typeof query === 'string' ? (0, _client.gql)(query) : query;
  return (0, _client.useLazyQuery)(queryAst, _objectSpread(_objectSpread({}, options), {}, {
    client: client,
    context: _objectSpread(_objectSpread({}, globalContext), options.context),
    onCompleted: function onCompleted(data) {
      if (options.onCompleted) {
        options.onCompleted(data);
      } // Simplify cache updates after lazy query executions.


      (0, _modifiers.handleModifiers)(client.cache, data, options.modifiers);
    }
  }));
};

exports["default"] = _default;