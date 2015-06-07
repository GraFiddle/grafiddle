(function() {

  'use strict';

  angular
    .module('grafiddle')
    .config(statesConfiguration);

  function statesConfiguration($stateProvider, $urlRouterProvider, $locationProvider) {
    $stateProvider
      .state('404', {
        views: {
          content: {
            templateUrl: 'components/common/404/404.html'
          }
        }
      })
      .state('embed', {
        url: '/:id/embed',
        views: {
          content: {
            templateUrl: 'components/embed/embed.html',
            controller: 'EmbedController'
          }
        }
      })
      .state('tree', {
        url: '/:id/tree',
        views: {
          content: {
            templateUrl: 'components/tree/tree.html',
            controller: 'TreeController'
          }
        }
      })
      .state('editor', {
        url: '/:id',
        views: {
          content: {
            templateUrl: 'components/editor/editor.html',
            controller: 'EditorController'
          }
        }
      });

    /* @ngInject */
    $urlRouterProvider.otherwise(function ($injector, $location) {
      // UserService & $state not available during .config(), inject them (manually) later

      // requesting unknown page unequal to '/'
      var path = $location.path();
      if (path !== '/') {
        $injector.get('$state').go('');
        return path; // this trick allows to show the error page on unknown address
      }

      return '/new';
    });

    $locationProvider
      .html5Mode(true)
      .hashPrefix('!');
  }

})();
