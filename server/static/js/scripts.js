(function () {

  'use strict';

  angular
    .module('grafiddle', [
      'grafiddle.config',
      'grafiddle.templates',
      'ngResource',
      'ngSanitize',
      'ui.router',
      'ui.ace',
      'angularChart'
    ]);

})();

(function () {

    'use strict';

    /**
     * @ngdoc directive
     * @name grafiddle.directive:onReadFile
     * @requires $parse
     * @requires $log
     * @restrict A
     *
     * @description
     * The `onReadFile` directive opens up a FileReader dialog to upload files from the local filesystem.
     *
     * @element ANY
     * @ngInject
     */
    function onReadFile($parse) {
        return {
            restrict: 'A',
            scope: false,
            link: function(scope, element, attrs) {
                var fn = $parse(attrs.onReadFile);

                element.on('change', function(onChangeEvent) {
                    var reader = new FileReader();

                    reader.onload = function(onLoadEvent) {
                        scope.$apply(function() {
                            fn(scope, {$fileContent:onLoadEvent.target.result});
                        });
                    };

                    reader.readAsText((onChangeEvent.srcElement || onChangeEvent.target).files[0]);
                });
            }
        };
    }
    onReadFile.$inject = ["$parse"];

    angular
        .module('grafiddle')
        .directive('onReadFile', onReadFile);

})();

(function () {

    'use strict';

    function TreeEndpoint($resource, ENV) {
        return $resource(ENV.api + 'tree/:id', {
            id: '@id'
        }, {
            get: {
                method: 'GET',
                isArray: true
            }
        });
    }
    TreeEndpoint.$inject = ["$resource", "ENV"];

    angular
        .module('grafiddle')
        .factory('TreeEndpoint', TreeEndpoint);

})();

(function () {

    function TreeController($scope, $state, CheckpointEndpoint, TreeEndpoint) {
        var treeData = [];
        $scope.checkpoint = {
            id: $state.params.id
        };

        CheckpointEndpoint
            .get({id: $state.params.id})
            .$promise
            .then(function(checkpoint) {
                $scope.checkpoint = checkpoint;
                TreeEndpoint
                    .get({id: checkpoint.tree})
                    .$promise
                    .then(function(tree) {
                        treeData = convertTree(tree);
                        draw();
                    });
            });

        function convertTree(tree) {
            // find base
            var base = {};
            angular.forEach(tree, function(node) {
                if (node.base === null) {
                    base = node;
                }
            });

            var treeData = [];
            treeData.push(base);
            addChildren(base, tree);

            return treeData
        }

        function addChildren(base, tree) {
            base.children = [];
            angular.forEach(tree, function(node) {
                if (node.base === base.id) {
                    base.children.push(node);
                    addChildren(node, tree);
                }
            })
        }

        function click(d) {
            console.log(d);
            $state.go('editor', {id: d.id});
        }

        function draw() {

            // ************** Generate the tree diagram	 *****************
            var margin = {top: 40, right: 0, bottom: 20, left: 0},
                width = 900 - margin.right - margin.left,
                height = 700 - margin.top - margin.bottom;

            var i = 0;

            var tree = d3.layout.tree()
                .size([height, width]);

            var diagonal = d3.svg.diagonal()
                .projection(function(d) { return [d.x, d.y]; });

            var svg = d3.select("#tree").append("svg")
                .attr("width", width + margin.right + margin.left)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            root = treeData[0];

            update(root);

            function update(source) {

                // Compute the new tree layout.
                var nodes = tree.nodes(root).reverse(),
                    links = tree.links(nodes);

                // Normalize for fixed-depth.
                nodes.forEach(function(d) { d.y = d.depth * 100; });

                // Declare the nodes…
                var node = svg.selectAll("g.node")
                    .data(nodes, function(d) { return d.id || (d.id = ++i); });

                // Enter the nodes.
                var nodeEnter = node.enter().append("g")
                    .attr("class", "node")
                    .attr("transform", function(d) {
                        return "translate(" + d.x + "," + d.y + ")"; })
                    .on("click", click);;

                nodeEnter.append("circle")
                    .attr("r", 10)
                    .style("fill", "#fff");

                nodeEnter.append("text")
                    .attr("y", function(d) {
                        return d.children || d._children ? -18 : 18; })
                    .attr("dy", ".35em")
                    .attr("text-anchor", "middle")
                    .text(function(d) {
                        var text = d.title;
                        // + ' by ' + d.author;
                        if (d.id == $scope.checkpoint.id) {
                            text += ' (current)';
                        }
                        return text;
                    })
                    .style("fill-opacity", 1);

                // Declare the links…
                var link = svg.selectAll("path.link")
                    .data(links, function(d) { return d.target.id; });

                // Enter the links.
                link.enter().insert("path", "g")
                    .attr("class", "link")
                    .attr("d", diagonal);
            }
        }
    }
    TreeController.$inject = ["$scope", "$state", "CheckpointEndpoint", "TreeEndpoint"];

    angular
        .module('grafiddle')
        .controller('TreeController', TreeController);

})();
(function () {

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
    EmbedController.$inject = ["$scope", "$state", "CheckpointEndpoint", "EditorService"];

    angular
        .module('grafiddle')
        .controller('EmbedController', EmbedController);

})();

(function() {

    'use strict';

    function EditorService($filter) {
        var aceJsonConfig = {
            mode: 'json',
            useWrapMode: false,
            onLoad: function(_editor) {
                _editor.setShowPrintMargin(false);
                _editor.$blockScrolling = Infinity;
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
            scope.$watch(function() {
                var compare = {};
                if (checkpoint.options) {
                    compare = {
                        dimensions: checkpoint.options.dimensions,
                        chart: checkpoint.options.chart,
                        state: checkpoint.options.state
                    };
                }
                return compare;
            }, function(newOptions) {
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
            scope.$watch(function() {
                return checkpoint.optionsString;
            }, function(newString) {
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
            scope.$watch(function() {
                return checkpoint.options ? checkpoint.options.data : {};
            }, function(newData) {
                if (!newData) {
                    return;
                }
                checkpoint.dataString = $filter('json')(newData);
                checkpoint.dataStringInvalid = false;
            }, true);
        }

        function syncData(scope, checkpoint) {
            scope.$watch(function() {
                return checkpoint.dataString;
            }, function(newString) {
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
    EditorService.$inject = ["$filter"];

    angular
        .module('grafiddle')
        .service('EditorService', EditorService);

})();

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
                        "type": "bar"
                    },
                    second: {
                        "type": "bar"
                    },
                    third: {
                        "type": "bar"
                    },
                    fourth: {
                        "type": "bar"
                    },
                    line: {
                        "key": "line",
                        "type": "spline"
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
                    },
                    color: {
                        pattern: ['#FEC444', '#FA2070', '#3DCA6A', '#1CACDE', '#666666']
                    }
                }
            };
            var checkpoint = {
                options: options
            };
            EditorService.setCheckpoint($scope.checkpoint, checkpoint);
            $timeout(saveAsImage, 0);
        }

        function loadCheckpoint() {
            CheckpointEndpoint
                .get({id: $state.params.id})
                .$promise
                .then(function(checkpoint) {
                    $scope.serverCheckpoint = checkpoint;
                    EditorService.setCheckpoint($scope.checkpoint, checkpoint);
                    $timeout(saveAsImage, 0);
                })
                .catch(function() {
                    $state.go('editor', {id: ''});
                });
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
    EditorController.$inject = ["$scope", "$state", "$window", "$timeout", "CheckpointEndpoint", "EditorService"];

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
    statesConfiguration.$inject = ["$stateProvider", "$urlRouterProvider", "$locationProvider"];


    angular
        .module('grafiddle')
        .config(statesConfiguration);

})();
(function () {

    function AppController($scope) {

        $scope.metadata = {};
        $scope.metadata.pageTitle = 'Share your visualizations on grafiddle';
        $scope.metadata.og = {
            'og:type': 'article',
            'article:section': 'Sharable data visualization',
            'og:title': 'Share your visualizations on grafiddle',
            'og:image': '',
            'og:description': 'Sharable data visualization'
        };
    }
    AppController.$inject = ["$scope"];

    angular
        .module('grafiddle')
        .controller('AppController', AppController);

})();

(function () {

    'use strict';

    function CheckpointEndpoint($resource, ENV) {
        return $resource(ENV.api + 'checkpoint/:id', {
            id: '@id'
        }, {
            save: {
                method: 'POST'
            },
            get: {
                method: 'GET'
            }
        });
    }
    CheckpointEndpoint.$inject = ["$resource", "ENV"];

    angular
        .module('grafiddle')
        .factory('CheckpointEndpoint', CheckpointEndpoint);

})();

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImNvbW1vbi9vbi1yZWFkLWZpbGUvb24tcmVhZC1maWxlLWRpcmVjdGl2ZS5qcyIsInRyZWUvdHJlZS1lbmRwb2ludC5qcyIsInRyZWUvdHJlZS1jb250cm9sbGVyLmpzIiwiZW1iZWQvZW1iZWQtY29udHJvbGxlci5qcyIsImVkaXRvci9lZGl0b3Itc2VydmljZS5qcyIsImVkaXRvci9lZGl0b3ItY29udHJvbGxlci5qcyIsImNvbW1vbi9zdGF0ZXMuY29uZmlnLmpzIiwiY29tbW9uL2FwcC1jb250cm9sbGVyLmpzIiwiY2hlY2twb2ludC9jaGVja3BvaW50LWVuZHBvaW50LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLENBQUMsWUFBWTs7RUFFWDs7RUFFQTtLQUNHLE9BQU8sYUFBYTtNQUNuQjtNQUNBO01BQ0E7TUFDQTtNQUNBO01BQ0E7TUFDQTs7OztBQUlOO0FDaEJBLENBQUMsWUFBWTs7SUFFVDs7Ozs7Ozs7Ozs7Ozs7O0lBZUEsU0FBUyxXQUFXLFFBQVE7UUFDeEIsT0FBTztZQUNILFVBQVU7WUFDVixPQUFPO1lBQ1AsTUFBTSxTQUFTLE9BQU8sU0FBUyxPQUFPO2dCQUNsQyxJQUFJLEtBQUssT0FBTyxNQUFNOztnQkFFdEIsUUFBUSxHQUFHLFVBQVUsU0FBUyxlQUFlO29CQUN6QyxJQUFJLFNBQVMsSUFBSTs7b0JBRWpCLE9BQU8sU0FBUyxTQUFTLGFBQWE7d0JBQ2xDLE1BQU0sT0FBTyxXQUFXOzRCQUNwQixHQUFHLE9BQU8sQ0FBQyxhQUFhLFlBQVksT0FBTzs7OztvQkFJbkQsT0FBTyxXQUFXLENBQUMsY0FBYyxjQUFjLGNBQWMsUUFBUSxNQUFNOzs7Ozs7O0lBTTNGO1NBQ0ssT0FBTztTQUNQLFVBQVUsY0FBYzs7O0FBR2pDO0FDNUNBLENBQUMsWUFBWTs7SUFFVDs7SUFFQSxTQUFTLGFBQWEsV0FBVyxLQUFLO1FBQ2xDLE9BQU8sVUFBVSxJQUFJLE1BQU0sWUFBWTtZQUNuQyxJQUFJO1dBQ0w7WUFDQyxLQUFL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Iiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uICgpIHtcblxuICAndXNlIHN0cmljdCc7XG5cbiAgYW5ndWxhclxuICAgIC5tb2R1bGUoJ2dyYWZpZGRsZScsIFtcbiAgICAgICdncmFmaWRkbGUuY29uZmlnJyxcbiAgICAgICdncmFmaWRkbGUudGVtcGxhdGVzJyxcbiAgICAgICduZ1Jlc291cmNlJyxcbiAgICAgICduZ1Nhbml0aXplJyxcbiAgICAgICd1aS5yb3V0ZXInLFxuICAgICAgJ3VpLmFjZScsXG4gICAgICAnYW5ndWxhckNoYXJ0J1xuICAgIF0pO1xuXG59KSgpO1xuIiwiKGZ1bmN0aW9uICgpIHtcblxuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIC8qKlxuICAgICAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAgICAgKiBAbmFtZSBncmFmaWRkbGUuZGlyZWN0aXZlOm9uUmVhZEZpbGVcbiAgICAgKiBAcmVxdWlyZXMgJHBhcnNlXG4gICAgICogQHJlcXVpcmVzICRsb2dcbiAgICAgKiBAcmVzdHJpY3QgQVxuICAgICAqXG4gICAgICogQGRlc2NyaXB0aW9uXG4gICAgICogVGhlIGBvblJlYWRGaWxlYCBkaXJlY3RpdmUgb3BlbnMgdXAgYSBGaWxlUmVhZGVyIGRpYWxvZyB0byB1cGxvYWQgZmlsZXMgZnJvbSB0aGUgbG9jYWwgZmlsZXN5c3RlbS5cbiAgICAgKlxuICAgICAqIEBlbGVtZW50IEFOWVxuICAgICAqIEBuZ0luamVjdFxuICAgICAqL1xuICAgIGZ1bmN0aW9uIG9uUmVhZEZpbGUoJHBhcnNlKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByZXN0cmljdDogJ0EnLFxuICAgICAgICAgICAgc2NvcGU6IGZhbHNlLFxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XG4gICAgICAgICAgICAgICAgdmFyIGZuID0gJHBhcnNlKGF0dHJzLm9uUmVhZEZpbGUpO1xuXG4gICAgICAgICAgICAgICAgZWxlbWVudC5vbignY2hhbmdlJywgZnVuY3Rpb24ob25DaGFuZ2VFdmVudCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcblxuICAgICAgICAgICAgICAgICAgICByZWFkZXIub25sb2FkID0gZnVuY3Rpb24ob25Mb2FkRXZlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLiRhcHBseShmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmbihzY29wZSwgeyRmaWxlQ29udGVudDpvbkxvYWRFdmVudC50YXJnZXQucmVzdWx0fSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgICAgICByZWFkZXIucmVhZEFzVGV4dCgob25DaGFuZ2VFdmVudC5zcmNFbGVtZW50IHx8IG9uQ2hhbmdlRXZlbnQudGFyZ2V0KS5maWxlc1swXSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgYW5ndWxhclxuICAgICAgICAubW9kdWxlKCdncmFmaWRkbGUnKVxuICAgICAgICAuZGlyZWN0aXZlKCdvblJlYWRGaWxlJywgb25SZWFkRmlsZSk7XG5cbn0pKCk7XG4iLCIoZnVuY3Rpb24gKCkge1xuXG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgZnVuY3Rpb24gVHJlZUVuZHBvaW50KCRyZXNvdXJjZSwgRU5WKSB7XG4gICAgICAgIHJldHVybiAkcmVzb3VyY2UoRU5WLmFwaSArICd0cmVlLzppZCcsIHtcbiAgICAgICAgICAgIGlkOiAnQGlkJ1xuICAgICAgICB9LCB7XG4gICAgICAgICAgICBnZXQ6IHtcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgICAgIGlzQXJyYXk6IHRydWVcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgYW5ndWxhclxuICAgICAgICAubW9kdWxlKCdncmFmaWRkbGUnKVxuICAgICAgICAuZmFjdG9yeSgnVHJlZUVuZHBvaW50JywgVHJlZUVuZHBvaW50KTtcblxufSkoKTtcbiIsIihmdW5jdGlvbiAoKSB7XG5cbiAgICBmdW5jdGlvbiBUcmVlQ29udHJvbGxlcigkc2NvcGUsICRzdGF0ZSwgQ2hlY2twb2ludEVuZHBvaW50LCBUcmVlRW5kcG9pbnQpIHtcbiAgICAgICAgdmFyIHRyZWVEYXRhID0gW107XG4gICAgICAgICRzY29wZS5jaGVja3BvaW50ID0ge1xuICAgICAgICAgICAgaWQ6ICRzdGF0ZS5wYXJhbXMuaWRcbiAgICAgICAgfTtcblxuICAgICAgICBDaGVja3BvaW50RW5kcG9pbnRcbiAgICAgICAgICAgIC5nZXQoe2lkOiAkc3RhdGUucGFyYW1zLmlkfSlcbiAgICAgICAgICAgIC4kcHJvbWlzZVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oY2hlY2twb2ludCkge1xuICAgICAgICAgICAgICAgICRzY29wZS5jaGVja3BvaW50ID0gY2hlY2twb2ludDtcbiAgICAgICAgICAgICAgICBUcmVlRW5kcG9pbnRcbiAgICAgICAgICAgICAgICAgICAgLmdldCh7aWQ6IGNoZWNrcG9pbnQudHJlZX0pXG4gICAgICAgICAgICAgICAgICAgIC4kcHJvbWlzZVxuICAgICAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbih0cmVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0cmVlRGF0YSA9IGNvbnZlcnRUcmVlKHRyZWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZHJhdygpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIGZ1bmN0aW9uIGNvbnZlcnRUcmVlKHRyZWUpIHtcbiAgICAgICAgICAgIC8vIGZpbmQgYmFzZVxuICAgICAgICAgICAgdmFyIGJhc2UgPSB7fTtcbiAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaCh0cmVlLCBmdW5jdGlvbihub2RlKSB7XG4gICAgICAgICAgICAgICAgaWYgKG5vZGUuYmFzZSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICBiYXNlID0gbm9kZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgdmFyIHRyZWVEYXRhID0gW107XG4gICAgICAgICAgICB0cmVlRGF0YS5wdXNoKGJhc2UpO1xuICAgICAgICAgICAgYWRkQ2hpbGRyZW4oYmFzZSwgdHJlZSk7XG5cbiAgICAgICAgICAgIHJldHVybiB0cmVlRGF0YVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gYWRkQ2hpbGRyZW4oYmFzZSwgdHJlZSkge1xuICAgICAgICAgICAgYmFzZS5jaGlsZHJlbiA9IFtdO1xuICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKHRyZWUsIGZ1bmN0aW9uKG5vZGUpIHtcbiAgICAgICAgICAgICAgICBpZiAobm9kZS5iYXNlID09PSBiYXNlLmlkKSB7XG4gICAgICAgICAgICAgICAgICAgIGJhc2UuY2hpbGRyZW4ucHVzaChub2RlKTtcbiAgICAgICAgICAgICAgICAgICAgYWRkQ2hpbGRyZW4obm9kZSwgdHJlZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGNsaWNrKGQpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGQpO1xuICAgICAgICAgICAgJHN0YXRlLmdvKCdlZGl0b3InLCB7aWQ6IGQuaWR9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGRyYXcoKSB7XG5cbiAgICAgICAgICAgIC8vICoqKioqKioqKioqKioqIEdlbmVyYXRlIHRoZSB0cmVlIGRpYWdyYW1cdCAqKioqKioqKioqKioqKioqKlxuICAgICAgICAgICAgdmFyIG1hcmdpbiA9IHt0b3A6IDQwLCByaWdodDogMCwgYm90dG9tOiAyMCwgbGVmdDogMH0sXG4gICAgICAgICAgICAgICAgd2lkdGggPSA5MDAgLSBtYXJnaW4ucmlnaHQgLSBtYXJnaW4ubGVmdCxcbiAgICAgICAgICAgICAgICBoZWlnaHQgPSA3MDAgLSBtYXJnaW4udG9wIC0gbWFyZ2luLmJvdHRvbTtcblxuICAgICAgICAgICAgdmFyIGkgPSAwO1xuXG4gICAgICAgICAgICB2YXIgdHJlZSA9IGQzLmxheW91dC50cmVlKClcbiAgICAgICAgICAgICAgICAuc2l6ZShbaGVpZ2h0LCB3aWR0aF0pO1xuXG4gICAgICAgICAgICB2YXIgZGlhZ29uYWwgPSBkMy5zdmcuZGlhZ29uYWwoKVxuICAgICAgICAgICAgICAgIC5wcm9qZWN0aW9uKGZ1bmN0aW9uKGQpIHsgcmV0dXJuIFtkLngsIGQueV07IH0pO1xuXG4gICAgICAgICAgICB2YXIgc3ZnID0gZDMuc2VsZWN0KFwiI3RyZWVcIikuYXBwZW5kKFwic3ZnXCIpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJ3aWR0aFwiLCB3aWR0aCArIG1hcmdpbi5yaWdodCArIG1hcmdpbi5sZWZ0KVxuICAgICAgICAgICAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIGhlaWdodCArIG1hcmdpbi50b3AgKyBtYXJnaW4uYm90dG9tKVxuICAgICAgICAgICAgICAgIC5hcHBlbmQoXCJnXCIpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoXCIgKyBtYXJnaW4ubGVmdCArIFwiLFwiICsgbWFyZ2luLnRvcCArIFwiKVwiKTtcblxuICAgICAgICAgICAgcm9vdCA9IHRyZWVEYXRhWzBdO1xuXG4gICAgICAgICAgICB1cGRhdGUocm9vdCk7XG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIHVwZGF0ZShzb3VyY2UpIHtcblxuICAgICAgICAgICAgICAgIC8vIENvbXB1dGUgdGhlIG5ldyB0cmVlIGxheW91dC5cbiAgICAgICAgICAgICAgICB2YXIgbm9kZXMgPSB0cmVlLm5vZGVzKHJvb3QpLnJldmVyc2UoKSxcbiAgICAgICAgICAgICAgICAgICAgbGlua3MgPSB0cmVlLmxpbmtzKG5vZGVzKTtcblxuICAgICAgICAgICAgICAgIC8vIE5vcm1hbGl6ZSBmb3IgZml4ZWQtZGVwdGguXG4gICAgICAgICAgICAgICAgbm9kZXMuZm9yRWFjaChmdW5jdGlvbihkKSB7IGQueSA9IGQuZGVwdGggKiAxMDA7IH0pO1xuXG4gICAgICAgICAgICAgICAgLy8gRGVjbGFyZSB0aGUgbm9kZXPigKZcbiAgICAgICAgICAgICAgICB2YXIgbm9kZSA9IHN2Zy5zZWxlY3RBbGwoXCJnLm5vZGVcIilcbiAgICAgICAgICAgICAgICAgICAgLmRhdGEobm9kZXMsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQuaWQgfHwgKGQuaWQgPSArK2kpOyB9KTtcblxuICAgICAgICAgICAgICAgIC8vIEVudGVyIHRoZSBub2Rlcy5cbiAgICAgICAgICAgICAgICB2YXIgbm9kZUVudGVyID0gbm9kZS5lbnRlcigpLmFwcGVuZChcImdcIilcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcIm5vZGVcIilcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwidHJhbnNsYXRlKFwiICsgZC54ICsgXCIsXCIgKyBkLnkgKyBcIilcIjsgfSlcbiAgICAgICAgICAgICAgICAgICAgLm9uKFwiY2xpY2tcIiwgY2xpY2spOztcblxuICAgICAgICAgICAgICAgIG5vZGVFbnRlci5hcHBlbmQoXCJjaXJjbGVcIilcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoXCJyXCIsIDEwKVxuICAgICAgICAgICAgICAgICAgICAuc3R5bGUoXCJmaWxsXCIsIFwiI2ZmZlwiKTtcblxuICAgICAgICAgICAgICAgIG5vZGVFbnRlci5hcHBlbmQoXCJ0ZXh0XCIpXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKFwieVwiLCBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZC5jaGlsZHJlbiB8fCBkLl9jaGlsZHJlbiA/IC0xOCA6IDE4OyB9KVxuICAgICAgICAgICAgICAgICAgICAuYXR0cihcImR5XCIsIFwiLjM1ZW1cIilcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoXCJ0ZXh0LWFuY2hvclwiLCBcIm1pZGRsZVwiKVxuICAgICAgICAgICAgICAgICAgICAudGV4dChmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgdGV4dCA9IGQudGl0bGU7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyArICcgYnkgJyArIGQuYXV0aG9yO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGQuaWQgPT0gJHNjb3BlLmNoZWNrcG9pbnQuaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZXh0ICs9ICcgKGN1cnJlbnQpJztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0ZXh0O1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAuc3R5bGUoXCJmaWxsLW9wYWNpdHlcIiwgMSk7XG5cbiAgICAgICAgICAgICAgICAvLyBEZWNsYXJlIHRoZSBsaW5rc+KAplxuICAgICAgICAgICAgICAgIHZhciBsaW5rID0gc3ZnLnNlbGVjdEFsbChcInBhdGgubGlua1wiKVxuICAgICAgICAgICAgICAgICAgICAuZGF0YShsaW5rcywgZnVuY3Rpb24oZCkgeyByZXR1cm4gZC50YXJnZXQuaWQ7IH0pO1xuXG4gICAgICAgICAgICAgICAgLy8gRW50ZXIgdGhlIGxpbmtzLlxuICAgICAgICAgICAgICAgIGxpbmsuZW50ZXIoKS5pbnNlcnQoXCJwYXRoXCIsIFwiZ1wiKVxuICAgICAgICAgICAgICAgICAgICAuYXR0cihcImNsYXNzXCIsIFwibGlua1wiKVxuICAgICAgICAgICAgICAgICAgICAuYXR0cihcImRcIiwgZGlhZ29uYWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgYW5ndWxhclxuICAgICAgICAubW9kdWxlKCdncmFmaWRkbGUnKVxuICAgICAgICAuY29udHJvbGxlcignVHJlZUNvbnRyb2xsZXInLCBUcmVlQ29udHJvbGxlcik7XG5cbn0pKCk7IiwiKGZ1bmN0aW9uICgpIHtcblxuICAgIGZ1bmN0aW9uIEVtYmVkQ29udHJvbGxlcigkc2NvcGUsICRzdGF0ZSwgQ2hlY2twb2ludEVuZHBvaW50LCBFZGl0b3JTZXJ2aWNlKSB7XG5cbiAgICAgICAgJHNjb3BlLmNoZWNrcG9pbnQgPSB7fTtcbiAgICAgICAgJHNjb3BlLmVtYmVkVmlldyA9ICdjaGFydCc7XG4gICAgICAgICRzY29wZS5hY2VKc29uQ29uZmlnID0gRWRpdG9yU2VydmljZS5hY2VKc29uQ29uZmlnO1xuICAgICAgICAkc2NvcGUuc2V0VmlldyA9IHNldFZpZXc7XG5cbiAgICAgICAgYWN0aXZhdGUoKTtcblxuICAgICAgICAvLy8vLy8vLy8vLy9cblxuICAgICAgICBmdW5jdGlvbiBhY3RpdmF0ZSgpIHtcbiAgICAgICAgICAgIGlmICgkc3RhdGUucGFyYW1zLmlkKSB7XG4gICAgICAgICAgICAgICAgbG9hZENoZWNrcG9pbnQoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJHN0YXRlLmdvKCdlZGl0b3InLCB7aWQ6ICcnfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChbJ2NoYXJ0JywgJ2RhdGEnLCAnb3B0aW9ucyddLmluZGV4T2YoJHN0YXRlLnBhcmFtcy52aWV3KSAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUuZW1iZWRWaWV3ID0gJHN0YXRlLnBhcmFtcy52aWV3O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBzdGFydCB3YXRjaGVyXG4gICAgICAgICAgICBFZGl0b3JTZXJ2aWNlLnN5bmNPcHRpb25zU3RyaW5nKCRzY29wZSwgJHNjb3BlLmNoZWNrcG9pbnQpO1xuICAgICAgICAgICAgRWRpdG9yU2VydmljZS5zeW5jT3B0aW9ucygkc2NvcGUsICRzY29wZS5jaGVja3BvaW50KTtcbiAgICAgICAgICAgIEVkaXRvclNlcnZpY2Uuc3luY0RhdGFTdHJpbmcoJHNjb3BlLCAkc2NvcGUuY2hlY2twb2ludCk7XG4gICAgICAgICAgICBFZGl0b3JTZXJ2aWNlLnN5bmNEYXRhKCRzY29wZSwgJHNjb3BlLmNoZWNrcG9pbnQpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gbG9hZENoZWNrcG9pbnQoKSB7XG4gICAgICAgICAgICBDaGVja3BvaW50RW5kcG9pbnRcbiAgICAgICAgICAgICAgICAuZ2V0KHtpZDogJHN0YXRlLnBhcmFtcy5pZH0pXG4gICAgICAgICAgICAgICAgLiRwcm9taXNlXG4gICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oY2hlY2twb2ludCkge1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuc2VydmVyQ2hlY2twb2ludCA9IGNoZWNrcG9pbnQ7XG4gICAgICAgICAgICAgICAgICAgIEVkaXRvclNlcnZpY2Uuc2V0Q2hlY2twb2ludCgkc2NvcGUuY2hlY2twb2ludCwgY2hlY2twb2ludCk7XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAuY2F0Y2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnZWRpdG9yJywge2lkOiAnJ30pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBmdW5jdGlvbiBzZXRWaWV3KG5ld1ZpZXcpIHtcbiAgICAgICAgICAgICRzY29wZS5lbWJlZFZpZXcgPSBuZXdWaWV3O1xuICAgICAgICB9XG5cbiAgICB9XG5cbiAgICBhbmd1bGFyXG4gICAgICAgIC5tb2R1bGUoJ2dyYWZpZGRsZScpXG4gICAgICAgIC5jb250cm9sbGVyKCdFbWJlZENvbnRyb2xsZXInLCBFbWJlZENvbnRyb2xsZXIpO1xuXG59KSgpO1xuIiwiKGZ1bmN0aW9uKCkge1xuXG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgZnVuY3Rpb24gRWRpdG9yU2VydmljZSgkZmlsdGVyKSB7XG4gICAgICAgIHZhciBhY2VKc29uQ29uZmlnID0ge1xuICAgICAgICAgICAgbW9kZTogJ2pzb24nLFxuICAgICAgICAgICAgdXNlV3JhcE1vZGU6IGZhbHNlLFxuICAgICAgICAgICAgb25Mb2FkOiBmdW5jdGlvbihfZWRpdG9yKSB7XG4gICAgICAgICAgICAgICAgX2VkaXRvci5zZXRTaG93UHJpbnRNYXJnaW4oZmFsc2UpO1xuICAgICAgICAgICAgICAgIF9lZGl0b3IuJGJsb2NrU2Nyb2xsaW5nID0gSW5maW5pdHk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGFjZUpzb25Db25maWc6IGFjZUpzb25Db25maWcsXG4gICAgICAgICAgICBzeW5jT3B0aW9uc1N0cmluZzogc3luY09wdGlvbnNTdHJpbmcsXG4gICAgICAgICAgICBzeW5jT3B0aW9uczogc3luY09wdGlvbnMsXG4gICAgICAgICAgICBzeW5jRGF0YVN0cmluZzogc3luY0RhdGFTdHJpbmcsXG4gICAgICAgICAgICBzeW5jRGF0YTogc3luY0RhdGEsXG4gICAgICAgICAgICBzZXRDaGVja3BvaW50OiBzZXRDaGVja3BvaW50XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8vLy8vLy8vXG5cbiAgICAgICAgZnVuY3Rpb24gc3luY09wdGlvbnNTdHJpbmcoc2NvcGUsIGNoZWNrcG9pbnQpIHtcbiAgICAgICAgICAgIHNjb3BlLiR3YXRjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICB2YXIgY29tcGFyZSA9IHt9O1xuICAgICAgICAgICAgICAgIGlmIChjaGVja3BvaW50Lm9wdGlvbnMpIHtcbiAgICAgICAgICAgICAgICAgICAgY29tcGFyZSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRpbWVuc2lvbnM6IGNoZWNrcG9pbnQub3B0aW9ucy5kaW1lbnNpb25zLFxuICAgICAgICAgICAgICAgICAgICAgICAgY2hhcnQ6IGNoZWNrcG9pbnQub3B0aW9ucy5jaGFydCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRlOiBjaGVja3BvaW50Lm9wdGlvbnMuc3RhdGVcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNvbXBhcmU7XG4gICAgICAgICAgICB9LCBmdW5jdGlvbihuZXdPcHRpb25zKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFuZXdPcHRpb25zKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIG9wdGlvbnNUb1BhcnNlID0ge1xuICAgICAgICAgICAgICAgICAgICBkaW1lbnNpb25zOiBuZXdPcHRpb25zLmRpbWVuc2lvbnMsXG4gICAgICAgICAgICAgICAgICAgIGNoYXJ0OiBuZXdPcHRpb25zLmNoYXJ0LFxuICAgICAgICAgICAgICAgICAgICBzdGF0ZTogbmV3T3B0aW9ucy5zdGF0ZVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgY2hlY2twb2ludC5vcHRpb25zU3RyaW5nID0gJGZpbHRlcignanNvbicpKG9wdGlvbnNUb1BhcnNlKTtcbiAgICAgICAgICAgICAgICBjaGVja3BvaW50Lm9wdGlvbnNTdHJpbmdJbnZhbGlkID0gZmFsc2U7XG4gICAgICAgICAgICB9LCB0cnVlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHN5bmNPcHRpb25zKHNjb3BlLCBjaGVja3BvaW50KSB7XG4gICAgICAgICAgICBzY29wZS4kd2F0Y2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNoZWNrcG9pbnQub3B0aW9uc1N0cmluZztcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uKG5ld1N0cmluZykge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBvcHRpb25zID0gSlNPTi5wYXJzZShuZXdTdHJpbmcpO1xuICAgICAgICAgICAgICAgICAgICBjaGVja3BvaW50Lm9wdGlvbnMuZGltZW5zaW9ucyA9IG9wdGlvbnMuZGltZW5zaW9ucztcbiAgICAgICAgICAgICAgICAgICAgY2hlY2twb2ludC5vcHRpb25zLmNoYXJ0ID0gb3B0aW9ucy5jaGFydDtcbiAgICAgICAgICAgICAgICAgICAgY2hlY2twb2ludC5vcHRpb25zLnN0YXRlID0gb3B0aW9ucy5zdGF0ZTtcbiAgICAgICAgICAgICAgICAgICAgY2hlY2twb2ludC5vcHRpb25zU3RyaW5nSW52YWxpZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgY2hlY2twb2ludC5vcHRpb25zU3RyaW5nSW52YWxpZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBzeW5jRGF0YVN0cmluZyhzY29wZSwgY2hlY2twb2ludCkge1xuICAgICAgICAgICAgc2NvcGUuJHdhdGNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBjaGVja3BvaW50Lm9wdGlvbnMgPyBjaGVja3BvaW50Lm9wdGlvbnMuZGF0YSA6IHt9O1xuICAgICAgICAgICAgfSwgZnVuY3Rpb24obmV3RGF0YSkge1xuICAgICAgICAgICAgICAgIGlmICghbmV3RGF0YSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNoZWNrcG9pbnQuZGF0YVN0cmluZyA9ICRmaWx0ZXIoJ2pzb24nKShuZXdEYXRhKTtcbiAgICAgICAgICAgICAgICBjaGVja3BvaW50LmRhdGFTdHJpbmdJbnZhbGlkID0gZmFsc2U7XG4gICAgICAgICAgICB9LCB0cnVlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHN5bmNEYXRhKHNjb3BlLCBjaGVja3BvaW50KSB7XG4gICAgICAgICAgICBzY29wZS4kd2F0Y2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNoZWNrcG9pbnQuZGF0YVN0cmluZztcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uKG5ld1N0cmluZykge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGNoZWNrcG9pbnQub3B0aW9ucy5kYXRhID0gSlNPTi5wYXJzZShuZXdTdHJpbmcpO1xuICAgICAgICAgICAgICAgICAgICBjaGVja3BvaW50LmRhdGFTdHJpbmdJbnZhbGlkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICBjaGVja3BvaW50LmRhdGFTdHJpbmdJbnZhbGlkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHNldENoZWNrcG9pbnQob2xkQ2hlY2twb2ludCwgbmV3Q2hlY2twb2ludCkge1xuICAgICAgICAgICAgb2xkQ2hlY2twb2ludC5kYXRhU3RyaW5nID0gJyc7XG4gICAgICAgICAgICBvbGRDaGVja3BvaW50Lm9wdGlvbnNTdHJpbmcgPSAnJztcbiAgICAgICAgICAgIG9sZENoZWNrcG9pbnQub3B0aW9ucyA9IG5ld0NoZWNrcG9pbnQub3B0aW9ucztcbiAgICAgICAgfVxuXG4gICAgfVxuXG4gICAgYW5ndWxhclxuICAgICAgICAubW9kdWxlKCdncmFmaWRkbGUnKVxuICAgICAgICAuc2VydmljZSgnRWRpdG9yU2VydmljZScsIEVkaXRvclNlcnZpY2UpO1xuXG59KSgpO1xuIiwiKGZ1bmN0aW9uKCkge1xuXG4gICAgZnVuY3Rpb24gRWRpdG9yQ29udHJvbGxlcigkc2NvcGUsICRzdGF0ZSwgJHdpbmRvdywgJHRpbWVvdXQsIENoZWNrcG9pbnRFbmRwb2ludCwgRWRpdG9yU2VydmljZSkge1xuXG4gICAgICAgIC8vIHNoYXJlXG4gICAgICAgICRzY29wZS5zaG93U2hhcmVQb3B1cCA9IGZhbHNlO1xuICAgICAgICAkc2NvcGUuc2hhcmUgPSBzaGFyZTtcbiAgICAgICAgJHNjb3BlLnNoYXJlUG9wdXAgPSBzaGFyZVBvcHVwO1xuICAgICAgICAkc2NvcGUub25TaGFyZVRleHRDbGljayA9IG9uU2hhcmVUZXh0Q2xpY2s7XG5cbiAgICAgICAgLy8gdXBsb2FkIGRhdGFcbiAgICAgICAgJHNjb3BlLnNob3dEYXRhRWRpdG9yID0gdHJ1ZTtcbiAgICAgICAgJHNjb3BlLnN3aXRjaERhdGFCdXR0b25UaXRsZSA9ICdNYW51YWwgZGF0YSBlbnRyeSc7XG4gICAgICAgICRzY29wZS50b2dnbGVEYXRhRWRpdG9yID0gdG9nZ2xlRGF0YUVkaXRvcjtcbiAgICAgICAgJHNjb3BlLnVwbG9hZEZpbGUgPSB1cGxvYWRGaWxlO1xuXG4gICAgICAgIC8vIHNhdmVcbiAgICAgICAgJHNjb3BlLnNhdmUgPSBzYXZlO1xuICAgICAgICAkc2NvcGUuY2hlY2twb2ludCA9IHt9O1xuICAgICAgICAkc2NvcGUuYWNlSnNvbkNvbmZpZyA9IEVkaXRvclNlcnZpY2UuYWNlSnNvbkNvbmZpZztcblxuICAgICAgICBhY3RpdmF0ZSgpO1xuXG4gICAgICAgIC8vLy8vLy8vLy8vL1xuXG4gICAgICAgIGZ1bmN0aW9uIGFjdGl2YXRlKCkge1xuXG4gICAgICAgICAgICBpZiAoJHN0YXRlLnBhcmFtcy5pZCkge1xuICAgICAgICAgICAgICAgIGxvYWRDaGVja3BvaW50KCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGxvYWREZWZhdWx0RGF0YSgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBzdGFydCB3YXRjaGVyXG4gICAgICAgICAgICBFZGl0b3JTZXJ2aWNlLnN5bmNPcHRpb25zU3RyaW5nKCRzY29wZSwgJHNjb3BlLmNoZWNrcG9pbnQpO1xuICAgICAgICAgICAgRWRpdG9yU2VydmljZS5zeW5jT3B0aW9ucygkc2NvcGUsICRzY29wZS5jaGVja3BvaW50KTtcbiAgICAgICAgICAgIEVkaXRvclNlcnZpY2Uuc3luY0RhdGFTdHJpbmcoJHNjb3BlLCAkc2NvcGUuY2hlY2twb2ludCk7XG4gICAgICAgICAgICBFZGl0b3JTZXJ2aWNlLnN5bmNEYXRhKCRzY29wZSwgJHNjb3BlLmNoZWNrcG9pbnQpO1xuICAgICAgICB9XG5cblxuICAgICAgICAvKlxuICAgICAgICAgKiBTSEFSRVxuICAgICAgICAgKi9cbiAgICAgICAgLy8gU2hhcmUgdGhlIGZpZGRsZVxuICAgICAgICAvL1xuICAgICAgICBmdW5jdGlvbiBzaGFyZSh0YXJnZXQpIHtcbiAgICAgICAgICAgIGZpZGRsZVVSTCA9ICdodHRwOi8vZ3JhZmlkZGxlLmFwcHNwb3QuY29tLycgKyAkc3RhdGUucGFyYW1zLmlkO1xuICAgICAgICAgICAgaWYgKHRhcmdldCA9PSAnRkInKSB7XG4gICAgICAgICAgICAgICAgJHdpbmRvdy5vcGVuKCdodHRwczovL3d3dy5mYWNlYm9vay5jb20vc2hhcmVyL3NoYXJlci5waHA/dT0nICsgZmlkZGxlVVJMLCAnX2JsYW5rJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodGFyZ2V0ID09ICdUd2l0dGVyJykge1xuICAgICAgICAgICAgICAgICR3aW5kb3cub3BlbignaHR0cHM6Ly90d2l0dGVyLmNvbS9pbnRlbnQvdHdlZXQ/dGV4dD1DaGVjayUyMG91dCUyMHRoaXMlMjBzd2VldCUyMGdyYWZpZGRsZSUyMCZ1cmw9JyArIGZpZGRsZVVSTCwgJ19ibGFuaycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRhcmdldCA9PSAnRS1NYWlsJykge1xuICAgICAgICAgICAgICAgICR3aW5kb3cubG9jYXRpb24gPSAnbWFpbHRvOmFAYi5jZD9zdWJqZWN0PUNoZWNrJTIwb3V0JTIwdGhpcyUyMGF3ZXNvbWUlMjBHcmFmaWRkbGUmYm9keT0nICsgZmlkZGxlVVJMO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIFNob3cgdGhlIHNoYXJlIHNoZWV0XG4gICAgICAgIC8vXG4gICAgICAgIGZ1bmN0aW9uIHNoYXJlUG9wdXAoKSB7XG4gICAgICAgICAgICAkc2NvcGUuc2hvd1NoYXJlUG9wdXAgPSAhJHNjb3BlLnNob3dTaGFyZVBvcHVwO1xuICAgICAgICAgICAgJHNjb3BlLmZpZGRsZVVSTCA9ICdodHRwOi8vZ3JhZmlkZGxlLmFwcHNwb3QuY29tLycgKyAkc3RhdGUucGFyYW1zLmlkO1xuICAgICAgICAgICAgJHNjb3BlLmZpZGRsZUNoYXJ0VVJMID0gJ2h0dHA6Ly9ncmFmaWRkbGUuYXBwc3BvdC5jb20vJyArICRzdGF0ZS5wYXJhbXMuaWQgKyAnLnBuZyc7XG4gICAgICAgICAgICAkc2NvcGUuZmlkZGxlRW1iZWRDb2RlID0gJzxpZnJhbWUgd2lkdGg9XCIxMDAlXCIgaGVpZ2h0PVwiMzAwXCIgc3JjPVwiLy9ncmFmaWRkbGUuYXBwc3BvdC5jb20vJyArICRzdGF0ZS5wYXJhbXMuaWQgKyAnL2VtYmVkXCIgYWxsb3dmdWxsc2NyZWVuPVwiYWxsb3dmdWxsc2NyZWVuXCIgZnJhbWVib3JkZXI9XCIwXCI+PC9pZnJhbWU+JztcbiAgICAgICAgfVxuICAgICAgICAvLyBBbGxvdyBzaGFyZSB0ZXh0IGZpZWxkcyB0byBhdXRvc2VsZWN0IG9uIGZvY3VzXG4gICAgICAgIC8vXG4gICAgICAgIGZ1bmN0aW9uIG9uU2hhcmVUZXh0Q2xpY2soJGV2ZW50KSB7XG4gICAgICAgICAgICAkZXZlbnQudGFyZ2V0LnNlbGVjdCgpO1xuICAgICAgICB9XG5cblxuICAgICAgICAvKlxuICAgICAgICAgKiBEQVRBXG4gICAgICAgICAqL1xuICAgICAgICAvLyBVcGxvYWQgYSBmaWxlIGFzIGRhdGEgc291cmNlXG4gICAgICAgIC8vXG4gICAgICAgIGZ1bmN0aW9uIHVwbG9hZEZpbGUoZmlsZSkge1xuICAgICAgICAgICAgJHNjb3BlLmNoZWNrcG9pbnQuZGF0YXNldFN0cmluZyA9IGZpbGU7XG4gICAgICAgICAgICAkc2NvcGUudG9nZ2xlRGF0YUVkaXRvcigpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVG9nZ2xlIGZyb20gZGF0YSB2aWV3XG4gICAgICAgIC8vXG4gICAgICAgIGZ1bmN0aW9uIHRvZ2dsZURhdGFFZGl0b3IoKSB7XG4gICAgICAgICAgICAkc2NvcGUuc2hvd0RhdGFFZGl0b3IgPSAhJHNjb3BlLnNob3dEYXRhRWRpdG9yO1xuICAgICAgICAgICAgJHNjb3BlLnN3aXRjaERhdGFCdXR0b25UaXRsZSA9ICRzY29wZS5zaG93RGF0YUVkaXRvciA/ICdCYWNrIHRvIGlucHV0IGRpYWxvZycgOiAnTWFudWFsIGRhdGEgZW50cnknO1xuICAgICAgICB9XG5cblxuICAgICAgICAvKlxuICAgICAgICAgKiBDSEVDS1BPSU5UXG4gICAgICAgICAqL1xuICAgICAgICAvLyBJbnNlcnQgZGVmYXVsdCBkYXRhXG4gICAgICAgIC8vXG4gICAgICAgIGZ1bmN0aW9uIGxvYWREZWZhdWx0RGF0YSgpIHtcbiAgICAgICAgICAgIHZhciBkYXRhID0gW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgXCJkYXlcIjogXCIyMDEzLTAxLTAyXCIsXG4gICAgICAgICAgICAgICAgICAgIFwiZmlyc3RcIjogMTIzNjUuMDUzLFxuICAgICAgICAgICAgICAgICAgICBcInNlY29uZFwiOiAxNjAwLFxuICAgICAgICAgICAgICAgICAgICBcInRoaXJkXCI6IDEzMDAsXG4gICAgICAgICAgICAgICAgICAgIFwiZm91cnRoXCI6IDE1MDAsXG4gICAgICAgICAgICAgICAgICAgIFwibGluZVwiOiA2MDAwLjI5NTIwMlxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBcImRheVwiOiBcIjIwMTMtMDEtMDNcIixcbiAgICAgICAgICAgICAgICAgICAgXCJmaXJzdFwiOiAxMjAzLjA1MyxcbiAgICAgICAgICAgICAgICAgICAgXCJzZWNvbmRcIjogMTYwMDAsXG4gICAgICAgICAgICAgICAgICAgIFwidGhpcmRcIjogMTMwMCxcbiAgICAgICAgICAgICAgICAgICAgXCJmb3VydGhcIjogMTUwMCxcbiAgICAgICAgICAgICAgICAgICAgXCJsaW5lXCI6IDEzMzY1LjA1M1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBcImRheVwiOiBcIjIwMTMtMDEtMDRcIixcbiAgICAgICAgICAgICAgICAgICAgXCJmaXJzdFwiOiAxMjM1LjA1MyxcbiAgICAgICAgICAgICAgICAgICAgXCJzZWNvbmRcIjogMTYwMCxcbiAgICAgICAgICAgICAgICAgICAgXCJ0aGlyZFwiOiAxMzAwMCxcbiAgICAgICAgICAgICAgICAgICAgXCJmb3VydGhcIjogMTUwMCxcbiAgICAgICAgICAgICAgICAgICAgXCJsaW5lXCI6IDkzNjUuMDUzXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIFwiZGF5XCI6IFwiMjAxMy0wMS0wNVwiLFxuICAgICAgICAgICAgICAgICAgICBcImZpcnN0XCI6IDEyNjUuMDUzLFxuICAgICAgICAgICAgICAgICAgICBcInNlY29uZFwiOiAxNjAwLFxuICAgICAgICAgICAgICAgICAgICBcInRoaXJkXCI6IDEzMDAsXG4gICAgICAgICAgICAgICAgICAgIFwiZm91cnRoXCI6IDE1MDAwLFxuICAgICAgICAgICAgICAgICAgICBcImxpbmVcIjogMTQzNjUuMDUzXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXTtcbiAgICAgICAgICAgIHZhciBvcHRpb25zID0ge1xuICAgICAgICAgICAgICAgIFwiZGF0YVwiOiBkYXRhLFxuICAgICAgICAgICAgICAgIFwiZGltZW5zaW9uc1wiOiB7XG4gICAgICAgICAgICAgICAgICAgIGZpcnN0OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJiYXJcIlxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBzZWNvbmQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImJhclwiXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHRoaXJkOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJiYXJcIlxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBmb3VydGg6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImJhclwiXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGxpbmU6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwia2V5XCI6IFwibGluZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwic3BsaW5lXCJcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXCJjaGFydFwiOiB7XG4gICAgICAgICAgICAgICAgICAgIFwiZGF0YVwiOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBcInNlbGVjdGlvblwiOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJlbmFibGVkXCI6IHRydWVcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgem9vbToge1xuICAgICAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBjb2xvcjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgcGF0dGVybjogWycjRkVDNDQ0JywgJyNGQTIwNzAnLCAnIzNEQ0E2QScsICcjMUNBQ0RFJywgJyM2NjY2NjYnXVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHZhciBjaGVja3BvaW50ID0ge1xuICAgICAgICAgICAgICAgIG9wdGlvbnM6IG9wdGlvbnNcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBFZGl0b3JTZXJ2aWNlLnNldENoZWNrcG9pbnQoJHNjb3BlLmNoZWNrcG9pbnQsIGNoZWNrcG9pbnQpO1xuICAgICAgICAgICAgJHRpbWVvdXQoc2F2ZUFzSW1hZ2UsIDApO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gbG9hZENoZWNrcG9pbnQoKSB7XG4gICAgICAgICAgICBDaGVja3BvaW50RW5kcG9pbnRcbiAgICAgICAgICAgICAgICAuZ2V0KHtpZDogJHN0YXRlLnBhcmFtcy5pZH0pXG4gICAgICAgICAgICAgICAgLiRwcm9taXNlXG4gICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oY2hlY2twb2ludCkge1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuc2VydmVyQ2hlY2twb2ludCA9IGNoZWNrcG9pbnQ7XG4gICAgICAgICAgICAgICAgICAgIEVkaXRvclNlcnZpY2Uuc2V0Q2hlY2twb2ludCgkc2NvcGUuY2hlY2twb2ludCwgY2hlY2twb2ludCk7XG4gICAgICAgICAgICAgICAgICAgICR0aW1lb3V0KHNhdmVBc0ltYWdlLCAwKTtcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC5jYXRjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgJHN0YXRlLmdvKCdlZGl0b3InLCB7aWQ6ICcnfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuXG5cbiAgICAgICAgLy8gU2F2ZSB0aGUgY3VycmVudCBWZXJzaW9uXG4gICAgICAgIC8vXG4gICAgICAgIGZ1bmN0aW9uIHNhdmUoKSB7XG4gICAgICAgICAgICBDaGVja3BvaW50RW5kcG9pbnQuc2F2ZSh7XG4gICAgICAgICAgICAgICAgXCJiYXNlXCI6ICRzY29wZS5zZXJ2ZXJDaGVja3BvaW50ICYmICRzY29wZS5zZXJ2ZXJDaGVja3BvaW50LmlkLFxuICAgICAgICAgICAgICAgIFwiZGF0YVwiOiBbXSwgLy8gaXMgcmVxdWlyZWQgYnkgdGhlIHNlcnZlclxuICAgICAgICAgICAgICAgIFwib3B0aW9uc1wiOiAkc2NvcGUuY2hlY2twb2ludC5vcHRpb25zLFxuICAgICAgICAgICAgICAgIFwiYXV0aG9yXCI6ICRzY29wZS5hdXRob3IsXG4gICAgICAgICAgICAgICAgXCJ0aXRsZVwiOiAkc2NvcGUudGl0bGVcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLiRwcm9taXNlXG4gICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oY2hlY2twb2ludCkge1xuICAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ2VkaXRvcicsIHtpZDogY2hlY2twb2ludC5pZH0pO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignc2F2ZSBmYWlsZWQnLCBlKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG5cbiAgICAgICAgZnVuY3Rpb24gc2F2ZUFzSW1hZ2UoKSB7XG4gICAgICAgICAgICAvLyBUT0RPIGZpeCBtZVxuICAgICAgICAgICAgLy9jYW52Zyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2FudmFzJyksIGQzLnNlbGVjdChcIi5hbmd1bGFyY2hhcnRcIikubm9kZSgpLmlubmVySFRNTCk7XG4gICAgICAgICAgICAvLyRzY29wZS5hc0ltYWdlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NhbnZhcycpLnRvRGF0YVVSTCgpO1xuICAgICAgICAgICAgLy8kc2NvcGUubWV0YWRhdGEub2dbJ29nOmltYWdlJ10gPSAkc2NvcGUuYXNJbWFnZTtcbiAgICAgICAgfVxuXG4gICAgfVxuXG4gICAgYW5ndWxhclxuICAgICAgICAubW9kdWxlKCdncmFmaWRkbGUnKVxuICAgICAgICAuY29udHJvbGxlcignRWRpdG9yQ29udHJvbGxlcicsIEVkaXRvckNvbnRyb2xsZXIpO1xuXG59KSgpO1xuIiwiKGZ1bmN0aW9uICgpIHtcblxuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGZ1bmN0aW9uIHN0YXRlc0NvbmZpZ3VyYXRpb24oJHN0YXRlUHJvdmlkZXIsICR1cmxSb3V0ZXJQcm92aWRlciwgJGxvY2F0aW9uUHJvdmlkZXIpIHtcblxuICAgICAgICAkc3RhdGVQcm92aWRlclxuICAgICAgICAgICAgLnN0YXRlKCc0MDQnLCB7XG4gICAgICAgICAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAgICAgICAgICAgY29udGVudDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdjb21wb25lbnRzL2NvbW1vbi80MDQvNDA0Lmh0bWwnXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLnN0YXRlKCdlbWJlZCcsIHtcbiAgICAgICAgICAgICAgICB1cmw6ICcvOmlkL2VtYmVkJyxcbiAgICAgICAgICAgICAgICB2aWV3czoge1xuICAgICAgICAgICAgICAgICAgICBjb250ZW50OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ2NvbXBvbmVudHMvZW1iZWQvZW1iZWQuaHRtbCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250cm9sbGVyOiAnRW1iZWRDb250cm9sbGVyJ1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5zdGF0ZSgndHJlZScsIHtcbiAgICAgICAgICAgICAgICB1cmw6ICcvOmlkL3RyZWUnLFxuICAgICAgICAgICAgICAgIHZpZXdzOiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnY29tcG9uZW50cy90cmVlL3RyZWUuaHRtbCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250cm9sbGVyOiAnVHJlZUNvbnRyb2xsZXInXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLnN0YXRlKCdlZGl0b3InLCB7XG4gICAgICAgICAgICAgICAgdXJsOiAnLzppZCcsXG4gICAgICAgICAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAgICAgICAgICAgY29udGVudDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdjb21wb25lbnRzL2VkaXRvci9lZGl0b3IuaHRtbCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250cm9sbGVyOiAnRWRpdG9yQ29udHJvbGxlcidcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIC8qIEBuZ0luamVjdCAqL1xuICAgICAgICAkdXJsUm91dGVyUHJvdmlkZXIub3RoZXJ3aXNlKGZ1bmN0aW9uICgkaW5qZWN0b3IsICRsb2NhdGlvbikge1xuICAgICAgICAgICAgLy8gVXNlclNlcnZpY2UgJiAkc3RhdGUgbm90IGF2YWlsYWJsZSBkdXJpbmcgLmNvbmZpZygpLCBpbmplY3QgdGhlbSAobWFudWFsbHkpIGxhdGVyXG5cbiAgICAgICAgICAgIC8vIHJlcXVlc3RpbmcgdW5rbm93biBwYWdlIHVuZXF1YWwgdG8gJy8nXG4gICAgICAgICAgICB2YXIgcGF0aCA9ICRsb2NhdGlvbi5wYXRoKCk7XG4gICAgICAgICAgICBpZiAocGF0aCAhPT0gJy8nKSB7XG4gICAgICAgICAgICAgICAgJGluamVjdG9yLmdldCgnJHN0YXRlJykuZ28oJycpO1xuICAgICAgICAgICAgICAgIHJldHVybiBwYXRoOyAvLyB0aGlzIHRyaWNrIGFsbG93cyB0byBzaG93IHRoZSBlcnJvciBwYWdlIG9uIHVua25vd24gYWRkcmVzc1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gJy9uZXcnO1xuICAgICAgICB9KTtcblxuICAgICAgICAkbG9jYXRpb25Qcm92aWRlclxuICAgICAgICAgICAgLmh0bWw1TW9kZSh0cnVlKVxuICAgICAgICAgICAgLmhhc2hQcmVmaXgoJyEnKTtcbiAgICB9XG5cblxuICAgIGFuZ3VsYXJcbiAgICAgICAgLm1vZHVsZSgnZ3JhZmlkZGxlJylcbiAgICAgICAgLmNvbmZpZyhzdGF0ZXNDb25maWd1cmF0aW9uKTtcblxufSkoKTsiLCIoZnVuY3Rpb24gKCkge1xuXG4gICAgZnVuY3Rpb24gQXBwQ29udHJvbGxlcigkc2NvcGUpIHtcblxuICAgICAgICAkc2NvcGUubWV0YWRhdGEgPSB7fTtcbiAgICAgICAgJHNjb3BlLm1ldGFkYXRhLnBhZ2VUaXRsZSA9ICdTaGFyZSB5b3VyIHZpc3VhbGl6YXRpb25zIG9uIGdyYWZpZGRsZSc7XG4gICAgICAgICRzY29wZS5tZXRhZGF0YS5vZyA9IHtcbiAgICAgICAgICAgICdvZzp0eXBlJzogJ2FydGljbGUnLFxuICAgICAgICAgICAgJ2FydGljbGU6c2VjdGlvbic6ICdTaGFyYWJsZSBkYXRhIHZpc3VhbGl6YXRpb24nLFxuICAgICAgICAgICAgJ29nOnRpdGxlJzogJ1NoYXJlIHlvdXIgdmlzdWFsaXphdGlvbnMgb24gZ3JhZmlkZGxlJyxcbiAgICAgICAgICAgICdvZzppbWFnZSc6ICcnLFxuICAgICAgICAgICAgJ29nOmRlc2NyaXB0aW9uJzogJ1NoYXJhYmxlIGRhdGEgdmlzdWFsaXphdGlvbidcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBhbmd1bGFyXG4gICAgICAgIC5tb2R1bGUoJ2dyYWZpZGRsZScpXG4gICAgICAgIC5jb250cm9sbGVyKCdBcHBDb250cm9sbGVyJywgQXBwQ29udHJvbGxlcik7XG5cbn0pKCk7XG4iLCIoZnVuY3Rpb24gKCkge1xuXG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgZnVuY3Rpb24gQ2hlY2twb2ludEVuZHBvaW50KCRyZXNvdXJjZSwgRU5WKSB7XG4gICAgICAgIHJldHVybiAkcmVzb3VyY2UoRU5WLmFwaSArICdjaGVja3BvaW50LzppZCcsIHtcbiAgICAgICAgICAgIGlkOiAnQGlkJ1xuICAgICAgICB9LCB7XG4gICAgICAgICAgICBzYXZlOiB7XG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZXQ6IHtcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdHRVQnXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGFuZ3VsYXJcbiAgICAgICAgLm1vZHVsZSgnZ3JhZmlkZGxlJylcbiAgICAgICAgLmZhY3RvcnkoJ0NoZWNrcG9pbnRFbmRwb2ludCcsIENoZWNrcG9pbnRFbmRwb2ludCk7XG5cbn0pKCk7XG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=