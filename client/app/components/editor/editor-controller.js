(function () {

    function EditorController($scope, $filter, CheckpointEndpoint) {

        $scope.showDataEditor = false;
        $scope.showOptionsUI  = false;
        $scope.switchDataButtonTitle    = 'Manual data entry';
        $scope.switchOptionsButtonTitle = 'Edit in GUI';
        $scope.toggleDataEditor = toggleDataEditor;
        $scope.toggleOptionsUI = toggleOptionsUI;

        $scope.save = save;
        $scope.uploadFile = uploadFile;

        $scope.checkpoint = {};
        $scope.aceJsonConfig = {
            mode: 'json',
            useWrapMode: false,
            onLoad: function (_editor) {
                _editor.setShowPrintMargin(false);
                _editor.$blockScrolling = Infinity;
            }
        };

        activate();

        ////////////

        function activate() {
            loadDefaultData();
            syncOptions();
            syncDataset();
            updateOnResize();
        }

        // Save the current verion
        //
        function save() {
            CheckpointEndpoint.save({
                "data": $scope.dataset,
                "options": $scope.options,
                "author": "Anonym"
            })
                .$promise
                .then(function (checkpoint) {
                    console.log('saved checkpoint: ', checkpoint);
                })
        }

        // Upload a file as data source
        //
        function uploadFile(file) {
            $scope.datasetString = file;
            $scope.toggleInputEditor();
        }

        // Toggle from data view
        //
        function toggleDataEditor() {
            $scope.showDataEditor = !$scope.showDataEditor;
            $scope.switchDataButtonTitle = $scope.showDataEditor ? 'Back to input dialog' : 'Manual data entry';
        }

        // Toggle from json-option view
        //
        function toggleOptionsUI() {
            $scope.showOptionsUI = !$scope.showOptionsUI;
            $scope.switchOptionsButtonTitle = $scope.showOptionsUI ? 'Edit as JSON' : 'Edit in GUI';
        }

        // Create the HTML UI representation of the options json
        //
        function updateOptionsUI(json) {
            $scope.optionsUI = "test";
        }

        // Insert default data
        //
        function loadDefaultData() {
            var dataset = [
                {
                    'day': '2013-01-02_00:00:00',
                    'sales': 3461.295202,
                    'income': 12365.053
                },
                {
                    'day': '2013-01-03_00:00:00',
                    'sales': 4461.295202,
                    'income': 13365.053
                },
                {
                    'day': '2013-01-04_00:00:00',
                    'sales': 4561.295202,
                    'income': 14365.053
                }
            ];
            var schema = {
                day: {
                    type: 'datetime',
                    format: '%Y-%m-%d_%H:%M:%S',
                    name: 'Date'
                }
            };
            var options = {
                rows: [{
                    key: 'income',
                    type: 'bar'
                }, {
                    key: 'sales'
                }],
                xAxis: {
                    key: 'day',
                    displayFormat: '%Y-%m-%d %H:%M:%S'
                }
            };

            $scope.checkpoint.datasetString = '';
            $scope.checkpoint.dataset = dataset;
            $scope.checkpoint.schemaString = '';
            $scope.checkpoint.schema = schema;
            $scope.checkpoint.optionsString = '';
            $scope.checkpoint.options = options;
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
            $scope.checkpoint.options.updated = new Date();
        }

        // Trigger new render on resize
        //
        function updateOnResize() {
            var myElement = document.getElementById('chartArea');
            addResizeListener(myElement, opdateOptions);

            $scope.$on("$destroy", function () {
                removeResizeListener(myElement, opdateOptions);
            });
        }

    }

    angular
        .module('grafiddle')
        .controller('EditorController', EditorController);

})();
