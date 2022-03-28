"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _client = require("@apollo/client");

var _default = function _default(query) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var queryAst = typeof query === 'string' ? (0, _client.gql)(query) : query;
  return (0, _client.useLazyQuery)(queryAst, options);
};

exports["default"] = _default;