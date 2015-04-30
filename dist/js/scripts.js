(function () {

  'use strict';

  angular
    .module('grafiddle', [
      'grafiddle.config',
      'grafiddle.templates',
      'ngResource',
      'ngSanitize',
      'ngAnimate',
      'ui.router',
      'angularChart'
    ]);

})();

(function () {

    function EditorController($scope, $rootScope) {

    }
    EditorController.$inject = ["$scope", "$rootScope"];

    angular
        .module('grafiddle')
        .controller('EditorController', EditorController);

})();

(function () {

    'use strict';

    function statesConfiguration($stateProvider, $urlRouterProvider, $locationProvider) {

        $stateProvider
            .state('404', {
                views: {
                    content: {
                        templateUrl: 'components/common/404/404.html'
                    }
                }
            })
            .state('editor', {
                url: '/new',
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
                $injector.get('$state').go('404');
                return path; // this trick allows to show the error page on unknown address
            }

            return '/new';
        });

        $locationProvider
            .html5Mode(true)
            .hashPrefix('!');
    }
    statesConfiguration.$inject = ["$stateProvider", "$urlRouterProvider", "$locationProvider"];


    angular
        .module('grafiddle')
        .config(statesConfiguration);

})();

(function () {

    function AppController($scope, $rootScope) {

    }
    AppController.$inject = ["$scope", "$rootScope"];

    angular
        .module('grafiddle')
        .controller('AppController', AppController);

})();

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImVkaXRvci9lZGl0b3ItY29udHJvbGxlci5qcyIsImNvbW1vbi9zdGF0ZXMuY29uZmlnLmpzIiwiY29tbW9uL2FwcC1jb250cm9sbGVyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLENBQUMsWUFBWTs7RUFFWDs7RUFFQTtLQUNHLE9BQU8sYUFBYTtNQUNuQjtNQUNBO01BQ0E7TUFDQTtNQUNBO01BQ0E7TUFDQTs7OztBQUlOO0FDaEJBLENBQUMsWUFBWTs7SUFFVCxTQUFTLGlCQUFpQixRQUFRLFlBQVk7Ozs7O0lBSTlDO1NBQ0ssT0FBTztTQUNQLFdBQVcsb0JBQW9COzs7QUFHeEM7QUNYQSxDQUFDLFlBQVk7O0lBRVQ7O0lBRUEsU0FBUyxvQkFBb0IsZ0JBQWdCLG9CQUFvQixtQkFBbUI7O1FBRWhGO2FBQ0ssTUFBTSxPQUFPO2dCQUNWLE9BQU87b0JBQ0gsU0FBUzt3QkFDTCxhQUFhOzs7O2FBSXhCLE1BQU0sVUFBVTtnQkFDYixLQUFLO2dCQUNMLE9BQU87b0JBQ0gsU0FBUzt3QkFDTCxhQUFhO3dCQUNiLFlBQVk7Ozs7OztRQU01QixtQkFBbUIsVUFBVSxVQUFVLFdBQVcsV0FBVzs7OztZQUl6RCxJQUFJLE9BQU8sVUFBVTtZQUNyQixJQUFJLFNBQVMsS0FBSztnQkFDZCxVQUFVLElBQUksVUFBVSxHQUFHO2dCQUMzQixPQUFPOzs7WUFHWCxPQUFPOzs7UUFHWDthQUNLLFVBQVU7YUFDVixXQUFXOzs7OztJQUlwQjtTQUNLLE9BQU87U0FDUCxPQUFPOzs7QUFHaEI7QUNqREEsQ0FBQyxZQUFZOztJQUVULFNBQVMsY0FBYyxRQUFRLFlBQVk7Ozs7O0lBSTNDO1NBQ0ssT0FBTztTQUNQLFdBQVcsaUJBQWlCOzs7QUFHckMiLCJmaWxlIjoic2NyaXB0cy5qcyIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiAoKSB7XG5cbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIGFuZ3VsYXJcbiAgICAubW9kdWxlKCdncmFmaWRkbGUnLCBbXG4gICAgICAnZ3JhZmlkZGxlLmNvbmZpZycsXG4gICAgICAnZ3JhZmlkZGxlLnRlbXBsYXRlcycsXG4gICAgICAnbmdSZXNvdXJjZScsXG4gICAgICAnbmdTYW5pdGl6ZScsXG4gICAgICAnbmdBbmltYXRlJyxcbiAgICAgICd1aS5yb3V0ZXInLFxuICAgICAgJ2FuZ3VsYXJDaGFydCdcbiAgICBdKTtcblxufSkoKTtcbiIsIihmdW5jdGlvbiAoKSB7XG5cbiAgICBmdW5jdGlvbiBFZGl0b3JDb250cm9sbGVyKCRzY29wZSwgJHJvb3RTY29wZSkge1xuXG4gICAgfVxuXG4gICAgYW5ndWxhclxuICAgICAgICAubW9kdWxlKCdncmFmaWRkbGUnKVxuICAgICAgICAuY29udHJvbGxlcignRWRpdG9yQ29udHJvbGxlcicsIEVkaXRvckNvbnRyb2xsZXIpO1xuXG59KSgpO1xuIiwiKGZ1bmN0aW9uICgpIHtcblxuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGZ1bmN0aW9uIHN0YXRlc0NvbmZpZ3VyYXRpb24oJHN0YXRlUHJvdmlkZXIsICR1cmxSb3V0ZXJQcm92aWRlciwgJGxvY2F0aW9uUHJvdmlkZXIpIHtcblxuICAgICAgICAkc3RhdGVQcm92aWRlclxuICAgICAgICAgICAgLnN0YXRlKCc0MDQnLCB7XG4gICAgICAgICAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAgICAgICAgICAgY29udGVudDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdjb21wb25lbnRzL2NvbW1vbi80MDQvNDA0Lmh0bWwnXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLnN0YXRlKCdlZGl0b3InLCB7XG4gICAgICAgICAgICAgICAgdXJsOiAnL25ldycsXG4gICAgICAgICAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAgICAgICAgICAgY29udGVudDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdjb21wb25lbnRzL2VkaXRvci9lZGl0b3IuaHRtbCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250cm9sbGVyOiAnRWRpdG9yQ29udHJvbGxlcidcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIC8qIEBuZ0luamVjdCAqL1xuICAgICAgICAkdXJsUm91dGVyUHJvdmlkZXIub3RoZXJ3aXNlKGZ1bmN0aW9uICgkaW5qZWN0b3IsICRsb2NhdGlvbikge1xuICAgICAgICAgICAgLy8gVXNlclNlcnZpY2UgJiAkc3RhdGUgbm90IGF2YWlsYWJsZSBkdXJpbmcgLmNvbmZpZygpLCBpbmplY3QgdGhlbSAobWFudWFsbHkpIGxhdGVyXG5cbiAgICAgICAgICAgIC8vIHJlcXVlc3RpbmcgdW5rbm93biBwYWdlIHVuZXF1YWwgdG8gJy8nXG4gICAgICAgICAgICB2YXIgcGF0aCA9ICRsb2NhdGlvbi5wYXRoKCk7XG4gICAgICAgICAgICBpZiAocGF0aCAhPT0gJy8nKSB7XG4gICAgICAgICAgICAgICAgJGluamVjdG9yLmdldCgnJHN0YXRlJykuZ28oJzQwNCcpO1xuICAgICAgICAgICAgICAgIHJldHVybiBwYXRoOyAvLyB0aGlzIHRyaWNrIGFsbG93cyB0byBzaG93IHRoZSBlcnJvciBwYWdlIG9uIHVua25vd24gYWRkcmVzc1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gJy9uZXcnO1xuICAgICAgICB9KTtcblxuICAgICAgICAkbG9jYXRpb25Qcm92aWRlclxuICAgICAgICAgICAgLmh0bWw1TW9kZSh0cnVlKVxuICAgICAgICAgICAgLmhhc2hQcmVmaXgoJyEnKTtcbiAgICB9XG5cblxuICAgIGFuZ3VsYXJcbiAgICAgICAgLm1vZHVsZSgnZ3JhZmlkZGxlJylcbiAgICAgICAgLmNvbmZpZyhzdGF0ZXNDb25maWd1cmF0aW9uKTtcblxufSkoKTtcbiIsIihmdW5jdGlvbiAoKSB7XG5cbiAgICBmdW5jdGlvbiBBcHBDb250cm9sbGVyKCRzY29wZSwgJHJvb3RTY29wZSkge1xuXG4gICAgfVxuXG4gICAgYW5ndWxhclxuICAgICAgICAubW9kdWxlKCdncmFmaWRkbGUnKVxuICAgICAgICAuY29udHJvbGxlcignQXBwQ29udHJvbGxlcicsIEFwcENvbnRyb2xsZXIpO1xuXG59KSgpO1xuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9