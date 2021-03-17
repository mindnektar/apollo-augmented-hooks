"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getVariablesWithPagination = exports.handleNextPage = void 0;

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

var handleNextPage = function handleNextPage(queryAst, cacheData, reducedResult, pagination) {
  return /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee() {
    var _data;

    var selections, paginatedField, data, result;
    return regeneratorRuntime.wrap(function _callee$(_context) {
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
            data = cacheData[paginatedField.name.value];
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