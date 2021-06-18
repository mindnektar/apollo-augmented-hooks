"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _client = require("@apollo/client");

var _apolloClient = _interopRequireDefault(require("./apolloClient"));

var _modifiers = require("./helpers/modifiers");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var _default = function _default(subscription) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var client = (0, _apolloClient["default"])();
  var subscriptionAst = typeof subscription === 'string' ? (0, _client.gql)(subscription) : subscription;
  var subscriptionName = subscriptionAst.definitions[0].selectionSet.selections[0].name.value;
  return (0, _client.useSubscription)(subscriptionAst, _objectSpread(_objectSpread({}, options), {}, {
    client: client,
    onSubscriptionData: function onSubscriptionData(result) {
      // Simplify cache updates after subscription notifications.
      (0, _modifiers.handleModifiers)(client.cache, result.subscriptionData.data[subscriptionName], options.modifiers);

      if (options.onSubscriptionData) {
        options.onSubscriptionData(result);
      }
    }
  }));
};

exports["default"] = _default;