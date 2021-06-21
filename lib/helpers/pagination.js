"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getVariablesWithPagination = exports.handleNextPage = void 0;

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _toConsumableArray2 = _interopRequireDefault(require("@babel/runtime/helpers/toConsumableArray"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { (0, _defineProperty2["default"])(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

var handleNextPage = function handleNextPage(queryAst, cacheDataRef, reducedResult, pagination) {
  return /*#__PURE__*/(0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee() {
    var _data;

    var selections, paginatedField, data, result;
    return _regenerator["default"].wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            selections = queryAst.definitions[0].selectionSet.selections;
            paginatedField = selections.find(function (selection) {
              return selection.arguments.some(function (_ref2) {
                var name = _ref2.name;
                return name.value === 'pagination';
              });
            });

            if (paginatedField) {
              _context.next = 4;
              break;
            }

            throw new Error('Cannot call `nextPage` when there is no field with a pagination parameter.');

          case 4:
            data = (0, _toConsumableArray2["default"])(cacheDataRef.current[paginatedField.name.value]).sort(function (a, b) {
              return pagination.direction === 'desc' ? b[pagination.orderBy].localeCompare(a[pagination.orderBy]) : a[pagination.orderBy].localeCompare(b[pagination.orderBy]);
            });
            _context.next = 7;
            return reducedResult.fetchMore({
              variables: {
                pagination: _objectSpread(_objectSpread({}, pagination), {}, {
                  cursor: (_data = data[data.length - 1]) === null || _data === void 0 ? void 0 : _data[pagination.orderBy]
                })
              }
            });

          case 7:
            result = _context.sent;

            if (!(result.data[paginatedField.name.value].length === 0)) {
              _context.next = 10;
              break;
            }

            return _context.abrupt("return", null);

          case 10:
            return _context.abrupt("return", result);

          case 11:
          case "end":
            return _context.stop();
        }
      }
    }, _callee);
  }));
};

exports.handleNextPage = handleNextPage;

var getVariablesWithPagination = function getVariablesWithPagination(options) {
  if (!options.variables) {
    if (!options.pagination) {
      return undefined;
    }

    return {
      pagination: options.pagination
    };
  }

  if (!options.pagination) {
    return options.variables;
  }

  return _objectSpread(_objectSpread({}, options.variables), {}, {
    pagination: options.pagination
  });
};

exports.getVariablesWithPagination = getVariablesWithPagination;