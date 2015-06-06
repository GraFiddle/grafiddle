(function() {

    function EditorController($scope, $state, $window, $timeout, CheckpointEndpoint, EditorService) {

        // share
        $scope.showSharePopup = false;
        $scope.share = share;
        $scope.sharePopup = sharePopup;
        $scope.onShareTextClick = onShareTextClick;

        // upload data
        $scope.showDataEditor = true;
        $scope.switchDataButtonTitle = 'Manual data entry';
        $scope.toggleDataEditor = toggleDataEditor;
        $scope.uploadFile = uploadFile;

        // save
        $scope.save = save;
        $scope.checkpoint = {};
        $scope.aceJsonConfig = EditorService.aceJsonConfig;

        activate();

        ////////////

        function activate() {

            if ($state.params.id) {
                loadCheckpoint();
            } else {
                loadDefaultData();
            }

            // start watcher
            EditorService.syncOptionsString($scope, $scope.checkpoint);
            EditorService.syncOptions($scope, $scope.checkpoint);
            EditorService.syncDataString($scope, $scope.checkpoint);
            EditorService.syncData($scope, $scope.checkpoint);
        }


        /*
         * SHARE
         */
        // Share the fiddle
        //
        function share(target) {
            fiddleURL = 'http://grafiddle.appspot.com/' + $state.params.id;
            if (target == 'FB') {
                $window.open('https://www.facebook.com/sharer/sharer.php?u=' + fiddleURL, '_blank');
            }
            if (target == 'Twitter') {
                $window.open('https://twitter.com/intent/tweet?text=Check%20out%20this%20sweet%20grafiddle%20&url=' + fiddleURL, '_blank');
            }
            if (target == 'E-Mail') {
                $window.location = 'mailto:a@b.cd?subject=Check%20out%20this%20awesome%20Grafiddle&body=' + fiddleURL;
            }
        }
        // Show the share sheet
        //
        function sharePopup() {
            $scope.showSharePopup = !$scope.showSharePopup;
            $scope.fiddleURL = 'http://grafiddle.appspot.com/' + $state.params.id;
            $scope.fiddleChartURL = 'http://grafiddle.appspot.com/' + $state.params.id + '.png';
            $scope.fiddleEmbedCode = '<iframe width="100%" height="300" src="//grafiddle.appspot.com/' + $state.params.id + '/embed" allowfullscreen="allowfullscreen" frameborder="0"></iframe>';
        }
        // Allow share text fields to autoselect on focus
        //
        function onShareTextClick($event) {
            $event.target.select();
        }


        /*
         * DATA
         */
        // Upload a file as data source
        //
        function uploadFile(file) {
            $scope.checkpoint.datasetString = file;
            $scope.toggleDataEditor();
        }

        // Toggle from data view
        //
        function toggleDataEditor() {
            $scope.showDataEditor = !$scope.showDataEditor;
            $scope.switchDataButtonTitle = $scope.showDataEditor ? 'Back to input dialog' : 'Manual data entry';
        }


        /*
         * CHECKPOINT
         */
        // Insert default data
        //
        function loadDefaultData() {
            var data = [
                {
                    "day": "2013-01-02",
                    "first": 12365.053,
                    "second": 1600,
                    "third": 1300,
                    "fourth": 1500,
                    "line": 6000.295202
                },
                {
                    "day": "2013-01-03",
                    "first": 1203.053,
                    "second": 16000,
                    "third": 1300,
                    "fourth": 1500,
                    "line": 13365.053
                },
                {
                    "day": "2013-01-04",
                    "first": 1235.053,
                    "second": 1600,
                    "third": 13000,
                    "fourth": 1500,
                    "line": 9365.053
                },
                {
                    "day": "2013-01-05",
                    "first": 1265.053,
                    "second": 1600,
                    "third": 1300,
                    "fourth": 15000,
                    "line": 14365.053
                }
            ];
            var options = {
                "data": data,
                "dimensions": {
                    first: {
                        "type": "bar",
                        "color": "green"
                    },
                    second: {
                        "type": "bar",
                        "color": "orange"
                    },
                    third: {
                        "type": "bar",
                        "color": "blue"
                    },
                    fourth: {
                        "type": "bar",
                        "color": "red"
                    },
                    line: {
                        "key": "line",
                        "type": "spline",
                        "color": "black"
                    }
                },
                "chart": {
                    "data": {
                        "selection": {
                            "enabled": true
                        }
                    },
                    zoom: {
                        enabled: true
                    }
                }
            };
            var checkpoint = {
                options: options
            };
            setCheckpoint(checkpoint);
            $timeout(saveAsImage, 0);
        }

        function loadCheckpoint() {
            CheckpointEndpoint
                .get({id: $state.params.id})
                .$promise
                .then(function(checkpoint) {
                    $scope.serverCheckpoint = checkpoint;
                    setCheckpoint(checkpoint);
                    $timeout(saveAsImage, 0);
                })
                .catch(function() {
                    $state.go('editor', {id: ''});
                });
        }

        function setCheckpoint(checkpoint) {
            $scope.checkpoint.dataString = '';
            $scope.checkpoint.optionsString = '';
            $scope.checkpoint.options = checkpoint.options;
        }

        // Save the current Version
        //
        function save() {
            CheckpointEndpoint.save({
                "base": $scope.serverCheckpoint && $scope.serverCheckpoint.id,
                "data": [], // is required by the server
                "options": $scope.checkpoint.options,
                "author": $scope.author,
                "title": $scope.title
            })
                .$promise
                .then(function(checkpoint) {
                    $state.go('editor', {id: checkpoint.id});
                })
                .catch(function(e) {
                    console.error('save failed', e);
                });
        }


        function saveAsImage() {
            // TODO fix me
            //canvg(document.getElementById('canvas'), d3.select(".angularchart").node().innerHTML);
            //$scope.asImage = document.getElementById('canvas').toDataURL();
            //$scope.metadata.og['og:image'] = $scope.asImage;
        }

    }

    angular
        .module('grafiddle')
        .controller('EditorController', EditorController);

})();
