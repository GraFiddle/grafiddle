(function () {

    function EditorController($scope, $filter) {

        $scope.dataEditorHidden = true;
        $scope.dataInputHidden = false;
        $scope.SwitchButtonTitle = 'Manual data entry';

        $scope.toggleInputEditor = function() {
            $scope.dataEditorHidden = !$scope.dataEditorHidden;
            $scope.dataInputHidden = !$scope.dataInputHidden;
            if ($scope.SwitchButtonTitle == 'Manual data entry') {
                $scope.SwitchButtonTitle = 'back to input dialog';
            }
            else {
                $scope.SwitchButtonTitle = 'Manual data entry';
            }
        };


        $scope.datasetString = '';
        $scope.dataset = [
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

        $scope.schema = {
            day: {
                type: 'datetime',
                format: '%Y-%m-%d_%H:%M:%S',
                name: 'Date'
            }
        };

        $scope.optionsString = '';
        $scope.options = {
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

        // define code highlighting
        $scope.optionsAceConfig = {
            mode: 'json',
            useWrapMode: false,
            onLoad: function(_editor) {
                _editor.setShowPrintMargin(false);
                _editor.$blockScrolling = Infinity;
            }
        };

        $scope.datasetAceConfig = {
            mode: 'json',
            useWrapMode: false,
            onLoad: function(_editor) {
                _editor.setShowPrintMargin(false);
                _editor.$blockScrolling = Infinity;
            }
        };


        $scope.$watch('options', function(json) {
            $scope.optionsString = $filter('json')(json);
        }, true);

        $scope.$watch('optionsString', function(json) {
            try {
                $scope.options = JSON.parse(json);
                $scope.wellFormedOptions = true;
            } catch (e) {
                $scope.wellFormedOptions = false;
            }
        }, true);

        $scope.$watch('dataset', function(json) {
            $scope.datasetString = $filter('json')(json);
        }, true);

        $scope.$watch('datasetString', function(json) {
            try {
                $scope.dataset = JSON.parse(json);
                $scope.wellFormedDataset = true;
            } catch (e) {
                $scope.wellFormedDataset = false;
            }
        }, true);


        var myElement = document.getElementById('chartArea'),
            myResizeFn = function(){
                $scope.options.updated = new Date();
            };
        addResizeListener(myElement, myResizeFn);

        $scope.$on("$destroy", function() {
            removeResizeListener(myElement, myResizeFn);
        });

    }

    angular
        .module('grafiddle')
        .controller('EditorController', EditorController);

})();
