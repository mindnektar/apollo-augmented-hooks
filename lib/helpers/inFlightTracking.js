"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.waitForRequestsInFlight = exports.areRequestsInFlight = exports.deregisterRequest = exports.registerRequest = void 0;
var requestsInFlight = {};

var registerRequest = function registerRequest(query) {
  if (requestsInFlight[query]) {
    return;
  }

  var promiseResolve;
  requestsInFlight[query] = {
    promise: new Promise(function (resolve) {
      promiseResolve = resolve;
    }),
    resolve: promiseResolve
  };
};

exports.registerRequest = registerRequest;

var deregisterRequest = function deregisterRequest(query) {
  if (!requestsInFlight[query]) {
    return;
  }

  requestsInFlight[query].resolve();
  delete requestsInFlight[query];
};

exports.deregisterRequest = deregisterRequest;

var areRequestsInFlight = function areRequestsInFlight() {
  return Object.keys(requestsInFlight).length > 0;
};

exports.areRequestsInFlight = areRequestsInFlight;

var waitForRequestsInFlight = function waitForRequestsInFlight() {
  return Promise.all(Object.values(requestsInFlight).map(function (_ref) {
    var promise = _ref.promise;
    return promise;
  }));
};

exports.waitForRequestsInFlight = waitForRequestsInFlight;