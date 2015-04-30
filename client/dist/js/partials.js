(function(module) {
try {
  module = angular.module('grafiddle.templates');
} catch (e) {
  module = angular.module('grafiddle.templates', []);
}
module.run(['$templateCache', function($templateCache) {
  $templateCache.put('components/editor/editor.html',
    'Hello World');
}]);
})();
