"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.useGlobalContext = exports.setGlobalContextHook = void 0;

var useGlobalContextHook = function useGlobalContextHook() {
  return {};
};

var setGlobalContextHook = function setGlobalContextHook(hook) {
  useGlobalContextHook = hook;
};

exports.setGlobalContextHook = setGlobalContextHook;

var useGlobalContext = function useGlobalContext() {
  return useGlobalContextHook();
};

exports.useGlobalContext = useGlobalContext;