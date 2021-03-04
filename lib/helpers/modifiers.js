"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.handleModifiers = void 0;

// Apollo offers no streamlined way to extract the query variables for the cache object we are
// modifying, so this helper has to exist.
var getVariables = function getVariables(details) {
  var _details$storeFieldNa;

  var variableString = (_details$storeFieldNa = details.storeFieldName.match(/\((.*)\)/)) === null || _details$storeFieldNa === void 0 ? void 0 : _details$storeFieldNa[1];
  return variableString ? JSON.parse(variableString) : null;
}; // A helper that adds/removes a cache object to/from an array, depending on whether the handler
// returns true or false. Reduces overhead.


var handleIncludeIf = function handleIncludeIf(cache, item) {
  return function (handler) {
    return function (previous, details) {
      var next = previous.filter(function (ref) {
        return details.readField('id', ref) !== item.id;
      });
      var variables = getVariables(details);
      var include = typeof handler === 'function' ? handler({
        item: item,
        variables: variables
      }) : handler;

      if (include) {
        next.push(details.toReference(item));
      }

      return next;
    };
  };
};

var handleModifiers = function handleModifiers(cache, item, modifiers) {
  if (!modifiers) {
    return;
  }

  var params = {
    item: item,
    includeIf: handleIncludeIf(cache, item),
    getVariables: getVariables
  };
  modifiers(params).forEach(function (_ref) {
    var cacheObject = _ref.cacheObject,
        fields = _ref.fields,
        evict = _ref.evict;

    if (evict) {
      // Remove the specified cache object from the cache and remove all references to it
      // from any other cache objects.
      cache.evict({
        id: cache.identify(cacheObject)
      });
      cache.gc();
    } else {
      try {
        cache.modify({
          id: cacheObject ? cache.identify(cacheObject) : 'ROOT_QUERY',
          fields: fields
        });
      } catch (error) {
        /* eslint-disable-next-line no-console */
        console.error(error);
        throw error;
      }
    }
  });
};

exports.handleModifiers = handleModifiers;