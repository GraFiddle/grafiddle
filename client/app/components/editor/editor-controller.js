(function () {

    function EditorController($scope, $filter) {

        $scope.dataset = [
            {
                'day': '2013-01-02_00:00:00',
                'sales': 13461.295202,
                'income': 12365.053
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
            }
        };

        $scope.$watch('options', function(json) {
            $scope.optionsString = $filter('json')(json);
        }, true);

        $scope.$watch('optionsString', function(json) {
            try {
                $scope.options = JSON.parse(json);
                $scope.wellFormed = true;
            } catch (e) {
                $scope.wellFormed = false;
            }
        }, true);

    }

    angular
        .module('grafiddle')
        .controller('EditorController', EditorController);

})();
