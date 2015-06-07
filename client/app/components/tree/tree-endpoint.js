(function() {

  'use strict';

  angular
    .module('grafiddle')
    .factory('TreeEndpoint', TreeEndpoint);

  function TreeEndpoint($resource, ENV) {
    return $resource(ENV.api + 'tree/:id', {
      id: '@id'
    }, {
      get: {
        method: 'GET',
        isArray: true
      }
    });
  }

})();
