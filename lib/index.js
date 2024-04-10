"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "useQuery", {
  enumerable: true,
  get: function get() {
    return _useQuery["default"];
  }
});
Object.defineProperty(exports, "useLazyQuery", {
  enumerable: true,
  get: function get() {
    return _useLazyQuery["default"];
  }
});
Object.defineProperty(exports, "useSuspenseQuery", {
  enumerable: true,
  get: function get() {
    return _useSuspenseQuery["default"];
  }
});
Object.defineProperty(exports, "useMutation", {
  enumerable: true,
  get: function get() {
    return _useMutation["default"];
  }
});
Object.defineProperty(exports, "useSubscription", {
  enumerable: true,
  get: function get() {
    return _useSubscription["default"];
  }
});
Object.defineProperty(exports, "combineResults", {
  enumerable: true,
  get: function get() {
    return _combineResults["default"];
  }
});
Object.defineProperty(exports, "setGlobalContextHook", {
  enumerable: true,
  get: function get() {
    return _globalContextHook.setGlobalContextHook;
  }
});
Object.defineProperty(exports, "clearReducedQueryCache", {
  enumerable: true,
  get: function get() {
    return _reducedQueries.clearReducedQueryCache;
  }
});

var _useQuery = _interopRequireDefault(require("./useQuery"));

var _useLazyQuery = _interopRequireDefault(require("./useLazyQuery"));

var _useSuspenseQuery = _interopRequireDefault(require("./useSuspenseQuery"));

var _useMutation = _interopRequireDefault(require("./useMutation"));

var _useSubscription = _interopRequireDefault(require("./useSubscription"));

var _combineResults = _interopRequireDefault(require("./combineResults"));

var _globalContextHook = require("./globalContextHook");

var _reducedQueries = require("./helpers/reducedQueries");