"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "useQuery", {
  enumerable: true,
  get: function get() {
    return _useQuery["default"];
  }
});
Object.defineProperty(exports, "useMutation", {
  enumerable: true,
  get: function get() {
    return _useMutation["default"];
  }
});
Object.defineProperty(exports, "initAugmentedHooks", {
  enumerable: true,
  get: function get() {
    return _apolloClient["default"];
  }
});

var _useQuery = _interopRequireDefault(require("./useQuery"));

var _useMutation = _interopRequireDefault(require("./useMutation"));

var _apolloClient = _interopRequireDefault(require("./apolloClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }