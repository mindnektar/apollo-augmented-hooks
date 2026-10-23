"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _client = require("@apollo/client");

var _modifiers = require("./helpers/modifiers");

var _lazyRefetch = require("./helpers/lazyRefetch");

var _reducedQueries = require("./helpers/reducedQueries");

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { (0, _defineProperty2["default"])(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

var _default = function _default(subscription) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var subscriptionAst = typeof subscription === 'string' ? (0, _client.gql)(subscription) : subscription;
  var subscriptionName = subscriptionAst.definitions[0].selectionSet.selections[0].name.value;
  return (0, _client.useSubscription)(subscriptionAst, _objectSpread(_objectSpread({}, options), {}, {
    onData: function onData(result) {
      // Simplify cache updates after subscription notifications.
      (0, _modifiers.handleModifiers)(result.client.cache, result.data.data[subscriptionName], options.modifiers);

      if (options.modifiers) {
        // Unlike after a mutation, apollo has already broadcast the notification by now, and would deliver the
        // modifiers' changes to each query on its own timer. Components could then render some of them without
        // the others, e.g. an item still referring to an entry that another query has already dropped.
        result.client.queryManager.broadcastQueries();
      }

      if (options.lazyRefetch) {
        // The evictions performed by the refetch handler change which data is missing from
        // the cache, so any memoized query reductions are no longer valid.
        (0, _reducedQueries.clearReducedQueryCache)();
        (0, _lazyRefetch.handleLazyRefetch)(result.client, options.lazyRefetch);
      }

      if (options.onData) {
        options.onData(result);
      }
    }
  }));
};

exports["default"] = _default;