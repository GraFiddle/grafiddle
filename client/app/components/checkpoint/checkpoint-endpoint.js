(function () {

    'use strict';

    function CheckpointEndpoint($resource, ENV) {
        return $resource(ENV.api + '/checkpoint/:id', {}, {
            save: {
                method: 'POST'
            },
            get: {
                method: 'GET'
            }
        });
    }

    angular
        .module('grafiddle')
        .factory('CheckpointEndpoint', CheckpointEndpoint);

})();
