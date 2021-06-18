"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _client = require("@apollo/client");

var _optimisticResponse = require("./helpers/optimisticResponse");

var _modifiers = require("./helpers/modifiers");

var _inFlightTracking = require("./helpers/inFlightTracking");

var _apolloClient = _interopRequireDefault(require("./apolloClient"));

var _globalContextHook = require("./globalContextHook");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

function _objectWithoutProperties(source, excluded) { if (source == null) return {}; var target = _objectWithoutPropertiesLoose(source, excluded); var key, i; if (Object.getOwnPropertySymbols) { var sourceSymbolKeys = Object.getOwnPropertySymbols(source); for (i = 0; i < sourceSymbolKeys.length; i++) { key = sourceSymbolKeys[i]; if (excluded.indexOf(key) >= 0) continue; if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue; target[key] = source[key]; } } return target; }

function _objectWithoutPropertiesLoose(source, excluded) { if (source == null) return {}; var target = {}; var sourceKeys = Object.keys(source); var key, i; for (i = 0; i < sourceKeys.length; i++) { key = sourceKeys[i]; if (excluded.indexOf(key) >= 0) continue; target[key] = source[key]; } return target; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _iterableToArrayLimit(arr, i) { if (typeof Symbol === "undefined" || !(Symbol.iterator in Object(arr))) return; var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

var _default = function _default(mutation) {
  var hookOptions = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var client = (0, _apolloClient["default"])();
  var mutationAst = typeof mutation === 'string' ? (0, _client.gql)(mutation) : mutation;
  var mutationName = mutationAst.definitions[0].selectionSet.selections[0].name.value;

  var _useMutation = (0, _client.useMutation)(mutationAst, _objectSpread(_objectSpread({}, hookOptions), {}, {
    client: client
  })),
      _useMutation2 = _slicedToArray(_useMutation, 1),
      mutate = _useMutation2[0];

  var args = mutationAst.definitions[0].selectionSet.selections[0].arguments;
  var globalContext = (0, _globalContextHook.useGlobalContext)();
  return function () {
    var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
        input = _ref.input,
        options = _objectWithoutProperties(_ref, ["input"]);

    return mutate(_objectSpread(_objectSpread({
      // Automatically prepend the argument name when there's only a single argument, which is
      // most of the time ($input or $id), reducing overhead.
      variables: args.length === 1 ? _defineProperty({}, args[0].name.value, input) : input
    }, options), {}, {
      context: _objectSpread(_objectSpread({}, globalContext), options.context),
      optimisticResponse: // Automatically prepend what is common across all optimistic responses, reducing
      // overhead.
      (0, _optimisticResponse.handleOptimisticResponse)(options.optimisticResponse, input, mutationName),
      update: function () {
        var _update = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee(cache, result) {
          var c;
          return regeneratorRuntime.wrap(function _callee$(_context) {
            while (1) {
              switch (_context.prev = _context.next) {
                case 0:
                  c = cache;

                  if (options.update) {
                    options.update(c, result);
                  } // Simplify cache updates after mutations.


                  (0, _modifiers.handleModifiers)(c, result.data[mutationName], options.modifiers); // If this is a server response (and not an optimistic response), wait until any queries
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
                  (0, _modifiers.handleModifiers)(c, result.data[mutationName], options.modifiers);

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