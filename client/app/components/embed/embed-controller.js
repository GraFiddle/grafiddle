(function () {

    function EmbedController($scope, $state, $filter, $location, $timeout, CheckpointEndpoint) {

        $scope.checkpoint = {};

        activate();

        //

        function activate() {

            if ($state.params.id) {
                CheckpointEndpoint
                    .get({id: $state.params.id})
                    .$promise
                    .then(function(checkpoint) {
                        $scope.serverCheckpoint = checkpoint;
                        setCheckpoint(checkpoint);
                        $timeout(saveAsImage, 0);
                    })
                    .catch(function(){
                        $state.go('editor', {id: ''});
                    });
            } else {
                loadDefaultData();
                $timeout(saveAsImage, 0);
            }
            syncOptions();
            syncDataset();
        }

        function saveAsImage() {
            //canvg(document.getElementById('canvas'), d3.select(".angularchart").node().innerHTML);
            //$scope.asImage = document.getElementById('canvas').toDataURL();
            //$scope.metadata.og['og:image'] = $scope.asImage;
        }

        function setCheckpoint(checkpoint) {
            $scope.checkpoint.datasetString = '';
            $scope.checkpoint.dataset = checkpoint.data;
            $scope.checkpoint.schemaString = '';
            $scope.checkpoint.schema = {};
            $scope.checkpoint.optionsString = '';
            $scope.checkpoint.options = checkpoint.options;
            $scope.title = checkpoint.title;
            $scope.author = checkpoint.author;
        }

        // Sync Object and String representation
        //
        function syncOptions() {
            $scope.$watch('checkpoint.options', function (json) {
                $scope.checkpoint.optionsString = $filter('json')(json);
            }, true);

            $scope.$watch('checkpoint.optionsString', function (json) {
                try {
                    $scope.checkpoint.options = JSON.parse(json);
                    $scope.wellFormedOptions = true;
                    updateOptionsUI(json);
                } catch (e) {
                    $scope.wellFormedOptions = false;
                }
            }, true);
        }

        // Sync Object and String representation
        //
        function syncDataset() {
            $scope.$watch('checkpoint.dataset', function (json) {
                $scope.checkpoint.datasetString = $filter('json')(json);
                opdateOptions();
            }, true);

            $scope.$watch('checkpoint.datasetString', function (json) {
                try {
                    $scope.checkpoint.dataset = JSON.parse(json);
                    $scope.wellFormedDataset = true;
                } catch (e) {
                    $scope.wellFormedDataset = false;
                }
            }, true);
        }

        // Add timestamp to options to redraw
        //
        function opdateOptions() {
            // Is called to often, not only on resize
            if ($scope.checkpoint && $scope.checkpoint.options) {
                $scope.checkpoint.options.updated = new Date();
            }
        }


        $scope.embedView = 'chart';
        var requestView = $location.search().view;
        if(requestView) {
            $scope.embedView = requestView;
        }
        
        $scope.setView = function(newView) {
            $scope.embedView = newView;
            $scope.optionsEditor.resize();
            $scope.dataEditor.resize();
            $scope.optionsEditor.renderer.updateFull();
            $scope.dataEditor.renderer.updateFull();
        };

        $scope.isView = function(view) {
            return view == $scope.embedView;
        };

        //$scope.datasetString = '';
        //$scope.dataset = [
        //    {
        //        'day': '2013-01-02_00:00:00',
        //        'sales': 3461.295202,
        //        'income': 12365.053
        //    },
        //    {
        //        'day': '2013-01-03_00:00:00',
        //        'sales': 4461.295202,
        //        'income': 13365.053
        //    },
        //    {
        //        'day': '2013-01-04_00:00:00',
        //        'sales': 4561.295202,
        //        'income': 14365.053
        //    }
        //];
        //
        //$scope.schema = {
        //    day: {
        //        type: 'datetime',
        //        format: '%Y-%m-%d_%H:%M:%S',
        //        name: 'Date'
        //    }
        //};
        //
        //$scope.optionsString = '';
        //$scope.options = {
        //    rows: [{
        //        key: 'income',
        //        type: 'bar'
        //    }, {
        //        key: 'sales'
        //    }],
        //    xAxis: {
        //        key: 'day',
        //        displayFormat: '%Y-%m-%d %H:%M:%S'
        //    }
        //};

        // define code highlighting
        $scope.optionsAceConfig = {
            mode: 'json',
            useWrapMode: false,
            onLoad: function(_editor) {
                _editor.setShowPrintMargin(false);
                $scope.optionsEditor = _editor;
            }
        };

        $scope.datasetAceConfig = {
            mode: 'json',
            useWrapMode: false,
            onLoad: function(_editor) {
                _editor.setShowPrintMargin(false);
                $scope.dataEditor = _editor;
            }
        };


        //$scope.$watch('options', function(json) {
        //    $scope.optionsString = $filter('json')(json);
        //}, true);
        //
        //$scope.$watch('optionsString', function(json) {
        //    try {
        //        $scope.options = JSON.parse(json);
        //        $scope.wellFormedOptions = true;
        //    } catch (e) {
        //        $scope.wellFormedOptions = false;
        //    }
        //}, true);
        //
        //$scope.$watch('dataset', function(json) {
        //    $scope.datasetString = $filter('json')(json);
        //}, true);
        //
        //$scope.$watch('datasetString', function(json) {
        //    try {
        //        $scope.dataset = JSON.parse(json);
        //        $scope.wellFormedDataset = true;
        //    } catch (e) {
        //        $scope.wellFormedDataset = false;
        //    }
        //}, true);

    }

    angular
        .module('grafiddle')
        .controller('EmbedController', EmbedController);

})();
