"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _toConsumableArray2 = _interopRequireDefault(require("@babel/runtime/helpers/toConsumableArray"));

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _objectWithoutProperties2 = _interopRequireDefault(require("@babel/runtime/helpers/objectWithoutProperties"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

var _toArray2 = _interopRequireDefault(require("@babel/runtime/helpers/toArray"));

var _client = require("@apollo/client");

var _optimisticResponse = require("./helpers/optimisticResponse");

var _modifiers = require("./helpers/modifiers");

var _reducedQueries = require("./helpers/reducedQueries");

var _inFlightTracking = require("./helpers/inFlightTracking");

var _globalContextHook = require("./globalContextHook");

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { (0, _defineProperty2["default"])(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

var _default = function _default(mutation) {
  var hookOptions = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var client = (0, _client.useApolloClient)();
  var mutationAst = typeof mutation === 'string' ? (0, _client.gql)(mutation) : mutation;
  var mutationName = mutationAst.definitions[0].selectionSet.selections[0].name.value;

  var _useMutation = (0, _client.useMutation)(mutationAst, hookOptions),
      _useMutation2 = (0, _toArray2["default"])(_useMutation),
      mutate = _useMutation2[0],
      mutationResult = _useMutation2.slice(1);

  var args = mutationAst.definitions[0].selectionSet.selections[0].arguments;
  var globalContext = (0, _globalContextHook.useGlobalContext)();

  var augmentedMutate = /*#__PURE__*/function () {
    var _ref = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee2() {
      var _ref2,
          input,
          options,
          variables,
          response,
          _args2 = arguments;

      return _regenerator["default"].wrap(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              _ref2 = _args2.length > 0 && _args2[0] !== undefined ? _args2[0] : {}, input = _ref2.input, options = (0, _objectWithoutProperties2["default"])(_ref2, ["input"]);
              // Automatically prepend the argument name when there's only a single argument, which is
              // most of the time ($input or $id), reducing overhead.
              variables = args.length === 1 ? (0, _defineProperty2["default"])({}, args[0].name.value, input) : input;
              _context2.next = 4;
              return mutate(_objectSpread(_objectSpread({
                variables: variables
              }, options), {}, {
                context: _objectSpread(_objectSpread({}, globalContext), options.context),
                optimisticResponse: // Automatically prepend what is common across all optimistic responses, reducing
                // overhead.
                (0, _optimisticResponse.handleOptimisticResponse)(options.optimisticResponse, input, mutationName),
                update: function () {
                  var _update = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee(cache, result) {
                    return _regenerator["default"].wrap(function _callee$(_context) {
                      while (1) {
                        switch (_context.prev = _context.next) {
                          case 0:
                            if (options.update) {
                              options.update(cache, result);
                            } // Simplify cache updates after mutations.


                            (0, _modifiers.handleModifiers)(cache, result.data[mutationName], options.modifiers); // If this is a server response (and not an optimistic response), wait until any queries
                            // in flight are completed, to avoid the mutation result getting overwritten by
                            // potentially stale data. This is done in addition to the regular cache update above
                            // because apollo doesn't like asynchronous post-mutation updates and would restore the
                            // previous cache result otherwise.

                            if (!(!result.data.__optimistic && (0, _inFlightTracking.areRequestsInFlight)())) {
                              _context.next = 6;
                              break;
                            }

                            _context.next = 5;
                            return (0, _inFlightTracking.waitForRequestsInFlight)();

                          case 5:
                            (0, _modifiers.handleModifiers)(cache, result.data[mutationName], options.modifiers);

                          case 6:
                          case "end":
                            return _context.stop();
                        }
                      }
                    }, _callee);
                  }));

                  function update(_x, _x2) {
                    return _update.apply(this, arguments);
                  }

                  return update;
                }()
              }));

            case 4:
              response = _context2.sent;

              if (options.lazyRefetch) {
                (0, _reducedQueries.clearReducedQueryCache)(); // Make sure that only queries that are currently active are refetched immediately.

                client.getObservableQueries().forEach(function (query) {
                  var result = query.getCurrentResult().data;

                  if (options.lazyRefetch.some(function (fieldName) {
                    return result[fieldName];
                  }) && query.observers.size > 0 && query.options.fetchPolicy !== 'cache-only') {
                    if (query.queryName.startsWith('__REDUCED__')) {
                      query.tearDownQuery();
                    } else {
                      query.refetch();
                    }
                  }
                }); // Queries that are not currently active should be refetched only once they become active again.

                client.cache.modify({
                  fields: options.lazyRefetch.reduce(function (result, fieldName) {
                    return _objectSpread(_objectSpread({}, result), {}, (0, _defineProperty2["default"])({}, fieldName, function (_ref4) {
                      var INVALIDATE = _ref4.INVALIDATE;
                      return INVALIDATE;
                    }));
                  }, {}),
                  broadcast: false
                });
              }

              return _context2.abrupt("return", response);

            case 7:
            case "end":
              return _context2.stop();
          }
        }
      }, _callee2);
    }));

    return function augmentedMutate() {
      return _ref.apply(this, arguments);
    };
  }();

  return [augmentedMutate].concat((0, _toConsumableArray2["default"])(mutationResult));
};

exports["default"] = _default;