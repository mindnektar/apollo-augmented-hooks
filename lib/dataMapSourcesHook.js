"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.useDataMapSources = exports.setDataMapSourcesHook = void 0;

var useDataMapSourcesHook = function useDataMapSourcesHook() {
  return {};
};

var setDataMapSourcesHook = function setDataMapSourcesHook(hook) {
  useDataMapSourcesHook = hook;
};

exports.setDataMapSourcesHook = setDataMapSourcesHook;

var useDataMapSources = function useDataMapSources() {
  return useDataMapSourcesHook();
};

exports.useDataMapSources = useDataMapSources;