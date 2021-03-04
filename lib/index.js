"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _useQuery = _interopRequireDefault(require("./useQuery"));

var _useMutation = _interopRequireDefault(require("./useMutation"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _default = {
  useQuery: _useQuery["default"],
  useMutation: _useMutation["default"]
};
exports["default"] = _default;