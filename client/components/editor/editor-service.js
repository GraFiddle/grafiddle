(function() {

  'use strict';

  function EditorService($filter) {
    var aceJsonConfig = {
      mode: 'json',
      useWrapMode: false,
      onLoad: function (_editor) {
        _editor.setShowPrintMargin(false);
        _editor.$blockScrolling = Infinity;
        _editor.renderer.setShowGutter(false);
      }
    };

    return {
      aceJsonConfig: aceJsonConfig,
      syncOptionsString: syncOptionsString,
      syncOptions: syncOptions,
      syncDataString: syncDataString,
      syncData: syncData,
      setCheckpoint: setCheckpoint
    };

    /////////

    function syncOptionsString(scope, checkpoint) {
      scope.$watch(function () {
        var compare = {};
        if (checkpoint.options) {
          compare = {
            dimensions: checkpoint.options.dimensions,
            chart: checkpoint.options.chart,
            state: checkpoint.options.state
          };
        }
        return compare;
      }, function (newOptions) {
        if (!newOptions) {
          return;
        }
        var optionsToParse = {
          dimensions: newOptions.dimensions,
          chart: newOptions.chart,
          state: newOptions.state
        };
        checkpoint.optionsString = $filter('json')(optionsToParse);
        checkpoint.optionsStringInvalid = false;
      }, true);
    }

    function syncOptions(scope, checkpoint) {
      scope.$watch(function () {
        return checkpoint.optionsString;
      }, function (newString) {
        try {
          var options = JSON.parse(newString);
          checkpoint.options.dimensions = options.dimensions;
          checkpoint.options.chart = options.chart;
          checkpoint.options.state = options.state;
          checkpoint.optionsStringInvalid = false;
        } catch (e) {
          checkpoint.optionsStringInvalid = true;
        }
      });
    }

    function syncDataString(scope, checkpoint) {
      scope.$watch(function () {
        return checkpoint.options ? checkpoint.options.data : {};
      }, function (newData) {
        if (!newData) {
          return;
        }
        checkpoint.dataString = $filter('json')(newData);
        checkpoint.dataStringInvalid = false;
      }, true);
    }

    function syncData(scope, checkpoint) {
      scope.$watch(function () {
        return checkpoint.dataString;
      }, function (newString) {
        try {
          checkpoint.options.data = JSON.parse(newString);
          checkpoint.dataStringInvalid = false;
        } catch (e) {
          checkpoint.dataStringInvalid = true;
        }
      });
    }

    function setCheckpoint(oldCheckpoint, newCheckpoint) {
      oldCheckpoint.dataString = '';
      oldCheckpoint.optionsString = '';
      oldCheckpoint.options = newCheckpoint.options;
    }

  }

  angular
    .module('grafiddle')
    .service('EditorService', EditorService);

})();
