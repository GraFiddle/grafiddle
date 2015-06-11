(function() {

  'use strict';

  angular
    .module('grafiddle')
    .factory('CheckpointEndpoint', CheckpointEndpoint);

  function CheckpointEndpoint($resource, ENV) {
    return $resource(ENV.api + 'checkpoint/:id', {
      id: '@id'
    }, {
      save: {
        method: 'POST'
      },
      get: {
        method: 'GET'
      }
    });
  }

})();
