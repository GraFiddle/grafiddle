(function() {

  'use strict';

  angular
    .module('grafiddle')
    .controller('EmbedController', EmbedController);

  function EmbedController($scope, $state, CheckpointEndpoint, EditorService) {

    $scope.checkpoint = {};
    $scope.embedView = 'chart';
    $scope.aceJsonConfig = EditorService.aceJsonConfig;
    $scope.setView = setView;

    activate();

    ////////////

    function activate() {
      if ($state.params.id) {
        loadCheckpoint();
      } else {
        $state.go('editor', {id: ''});
      }

      if (['chart', 'data', 'options'].indexOf($state.params.view) !== -1) {
        $scope.embedView = $state.params.view;
      }

      // start watcher
      EditorService.syncOptionsString($scope, $scope.checkpoint);
      EditorService.syncOptions($scope, $scope.checkpoint);
      EditorService.syncDataString($scope, $scope.checkpoint);
      EditorService.syncData($scope, $scope.checkpoint);
    }

    function loadCheckpoint() {
      CheckpointEndpoint
        .get({id: $state.params.id})
        .$promise
        .then(function(checkpoint) {
          $scope.serverCheckpoint = checkpoint;
          EditorService.setCheckpoint($scope.checkpoint, checkpoint);
        })
        .catch(function() {
          $state.go('editor', {id: ''});
        });
    }

    function setView(newView) {
      $scope.embedView = newView;
    }

  }

})();
