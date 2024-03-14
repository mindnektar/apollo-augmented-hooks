"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _slicedToArray2 = _interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));

var _react = require("react");

var _default = function _default() {
  // Store an arbitrary value to help trigger rerenders - date works fine
  var _useState = (0, _react.useState)(new Date()),
      _useState2 = (0, _slicedToArray2["default"])(_useState, 2),
      date = _useState2[0],
      setDate = _useState2[1];

  return [function () {
    setDate(new Date());
  }, date];
};

exports["default"] = _default;