"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

var _objectWithoutProperties2 = _interopRequireDefault(require("@babel/runtime/helpers/objectWithoutProperties"));

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _slicedToArray2 = _interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));

var _client = require("@apollo/client");

var _optimisticResponse = require("./helpers/optimisticResponse");

var _modifiers = require("./helpers/modifiers");

var _inflateCacheData = _interopRequireDefault(require("./helpers/inflateCacheData"));

var _inFlightTracking = require("./helpers/inFlightTracking");

var _apolloClient = _interopRequireDefault(require("./apolloClient"));

var _globalContextHook = require("./globalContextHook");

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { (0, _defineProperty2["default"])(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

var _default = function _default(mutation) {
  var hookOptions = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var client = (0, _apolloClient["default"])();
  var mutationAst = typeof mutation === 'string' ? (0, _client.gql)(mutation) : mutation;
  var mutationName = mutationAst.definitions[0].selectionSet.selections[0].name.value;

  var _useMutation = (0, _client.useMutation)(mutationAst, _objectSpread(_objectSpread({}, hookOptions), {}, {
    client: client
  })),
      _useMutation2 = (0, _slicedToArray2["default"])(_useMutation, 1),
      mutate = _useMutation2[0];

  var args = mutationAst.definitions[0].selectionSet.selections[0].arguments;
  var globalContext = (0, _globalContextHook.useGlobalContext)();
  return function () {
    var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
        input = _ref.input,
        options = (0, _objectWithoutProperties2["default"])(_ref, ["input"]);

    // Automatically prepend the argument name when there's only a single argument, which is
    // most of the time ($input or $id), reducing overhead.
    var variables = args.length === 1 ? (0, _defineProperty2["default"])({}, args[0].name.value, input) : input;
    return mutate(_objectSpread(_objectSpread({
      variables: variables
    }, options), {}, {
      context: _objectSpread(_objectSpread({}, globalContext), options.context),
      optimisticResponse: // Automatically prepend what is common across all optimistic responses, reducing
      // overhead.
      (0, _optimisticResponse.handleOptimisticResponse)(options.optimisticResponse, input, mutationName),
      update: function () {
        var _update = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee(cache, result) {
          var item;
          return _regenerator["default"].wrap(function _callee$(_context) {
            while (1) {
              switch (_context.prev = _context.next) {
                case 0:
                  if (options.update) {
                    options.update(cache, result);
                  }

                  item = options.inflateCacheData !== false ? (0, _inflateCacheData["default"])(cache, result.data[mutationName], mutationAst, variables) : result.data[mutationName]; // Simplify cache updates after mutations.

                  (0, _modifiers.handleModifiers)(cache, item, options.modifiers); // If this is a server response (and not an optimistic response), wait until any queries
                  // in flight are completed, to avoid the mutation result getting overwritten by
                  // potentially stale data. This is done in addition to the regular cache update above
                  // because apollo doesn't like asynchronous post-mutation updates and would restore the
                  // previous cache result otherwise.

                  if (!(!result.data.__optimistic && (0, _inFlightTracking.areRequestsInFlight)())) {
                    _context.next = 7;
                    break;
                  }

                  _context.next = 6;
                  return (0, _inFlightTracking.waitForRequestsInFlight)();

                case 6:
                  (0, _modifiers.handleModifiers)(cache, item, options.modifiers);

                case 7:
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
  };
};

exports["default"] = _default;