"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var clientInstance;

var _default = function _default(client) {
  if (client) {
    clientInstance = client;
  }

  return clientInstance;
};

exports["default"] = _default;