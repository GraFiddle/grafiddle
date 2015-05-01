(function () {

    'use strict';

    function TreeEndpoint($resource, ENV) {
        return $resource(ENV.api + 'tree/:id', {
            id: '@id'
        }, {
            get: {
                method: 'GET'
            }
        });
    }

    angular
        .module('grafiddle')
        .factory('TreeEndpoint', TreeEndpoint);

})();
