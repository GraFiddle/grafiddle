(function () {

  'use strict';

  angular
    .module('grafiddle', [
      'grafiddle.config',
      'grafiddle.templates',
      'ngResource',
      'ngSanitize',
      'ui.router',
      'ui.layout',
      'ui.ace',
      'angularChart'
    ]);

})();
