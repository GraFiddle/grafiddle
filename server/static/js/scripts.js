(function () {

  'use strict';

  angular
    .module('grafiddle', [
      'grafiddle.config',
      'grafiddle.templates',
      'ngResource',
      'ngSanitize',
      'ui.router',
      'ui.layout',
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImNvbW1vbi9vbi1yZWFkLWZpbGUvb24tcmVhZC1maWxlLWRpcmVjdGl2ZS5qcyIsInRyZWUvdHJlZS1lbmRwb2ludC5qcyIsInRyZWUvdHJlZS1jb250cm9sbGVyLmpzIiwiZW1iZWQvZW1iZWQtY29udHJvbGxlci5qcyIsImVkaXRvci9lZGl0b3Itc2VydmljZS5qcyIsImVkaXRvci9lZGl0b3ItY29udHJvbGxlci5qcyIsImNvbW1vbi9zdGF0ZXMuY29uZmlnLmpzIiwiY29tbW9uL2FwcC1jb250cm9sbGVyLmpzIiwiY2hlY2twb2ludC9jaGVja3BvaW50LWVuZHBvaW50LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLENBQUMsWUFBWTs7RUFFWDs7RUFFQTtLQUNHLE9BQU8sYUFBYTtNQUNuQjtNQUNBO01BQ0E7TUFDQTtNQUNBO01BQ0E7TUFDQTtNQUNBOzs7O0FBSU47QUNqQkEsQ0FBQyxZQUFZOztJQUVUOzs7Ozs7Ozs7Ozs7Ozs7SUFlQSxTQUFTLFdBQVcsUUFBUTtRQUN4QixPQUFPO1lBQ0gsVUFBVTtZQUNWLE9BQU87WUFDUCxNQUFNLFNBQVMsT0FBTyxTQUFTLE9BQU87Z0JBQ2xDLElBQUksS0FBSyxPQUFPLE1BQU07O2dCQUV0QixRQUFRLEdBQUcsVUFBVSxTQUFTLGVBQWU7b0JBQ3pDLElBQUksU0FBUyxJQUFJOztvQkFFakIsT0FBTyxTQUFTLFNBQVMsYUFBYTt3QkFDbEMsTUFBTSxPQUFPLFdBQVc7NEJBQ3BCLEdBQUcsT0FBTyxDQUFDLGFBQWEsWUFBWSxPQUFPOzs7O29CQUluRCxPQUFPLFdBQVcsQ0FBQyxjQUFjLGNBQWMsY0FBYyxRQUFRLE1BQU07Ozs7Ozs7SUFNM0Y7U0FDSyxPQUFPO1NBQ1AsVUFBVSxjQUFjOzs7QUFHakM7QUM1Q0EsQ0FBQyxZQUFZOztJQUVUOztJQUVBLFNBQVMsYUFBYSxXQUFXLEtBQUs7UUFDbEMsT0FBTyxVQUFVLElBQUksTUFBTSxZQUFZO1lBQ25DLElBQUk7V0FDTDtZQUND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OiJzY3JpcHRzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uICgpIHtcblxuICAndXNlIHN0cmljdCc7XG5cbiAgYW5ndWxhclxuICAgIC5tb2R1bGUoJ2dyYWZpZGRsZScsIFtcbiAgICAgICdncmFmaWRkbGUuY29uZmlnJyxcbiAgICAgICdncmFmaWRkbGUudGVtcGxhdGVzJyxcbiAgICAgICduZ1Jlc291cmNlJyxcbiAgICAgICduZ1Nhbml0aXplJyxcbiAgICAgICd1aS5yb3V0ZXInLFxuICAgICAgJ3VpLmxheW91dCcsXG4gICAgICAndWkuYWNlJyxcbiAgICAgICdhbmd1bGFyQ2hhcnQnXG4gICAgXSk7XG5cbn0pKCk7XG4iLCIoZnVuY3Rpb24gKCkge1xuXG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgLyoqXG4gICAgICogQG5nZG9jIGRpcmVjdGl2ZVxuICAgICAqIEBuYW1lIGdyYWZpZGRsZS5kaXJlY3RpdmU6b25SZWFkRmlsZVxuICAgICAqIEByZXF1aXJlcyAkcGFyc2VcbiAgICAgKiBAcmVxdWlyZXMgJGxvZ1xuICAgICAqIEByZXN0cmljdCBBXG4gICAgICpcbiAgICAgKiBAZGVzY3JpcHRpb25cbiAgICAgKiBUaGUgYG9uUmVhZEZpbGVgIGRpcmVjdGl2ZSBvcGVucyB1cCBhIEZpbGVSZWFkZXIgZGlhbG9nIHRvIHVwbG9hZCBmaWxlcyBmcm9tIHRoZSBsb2NhbCBmaWxlc3lzdGVtLlxuICAgICAqXG4gICAgICogQGVsZW1lbnQgQU5ZXG4gICAgICogQG5nSW5qZWN0XG4gICAgICovXG4gICAgZnVuY3Rpb24gb25SZWFkRmlsZSgkcGFyc2UpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnQScsXG4gICAgICAgICAgICBzY29wZTogZmFsc2UsXG4gICAgICAgICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcbiAgICAgICAgICAgICAgICB2YXIgZm4gPSAkcGFyc2UoYXR0cnMub25SZWFkRmlsZSk7XG5cbiAgICAgICAgICAgICAgICBlbGVtZW50Lm9uKCdjaGFuZ2UnLCBmdW5jdGlvbihvbkNoYW5nZUV2ZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpO1xuXG4gICAgICAgICAgICAgICAgICAgIHJlYWRlci5vbmxvYWQgPSBmdW5jdGlvbihvbkxvYWRFdmVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUuJGFwcGx5KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZuKHNjb3BlLCB7JGZpbGVDb250ZW50Om9uTG9hZEV2ZW50LnRhcmdldC5yZXN1bHR9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgICAgIHJlYWRlci5yZWFkQXNUZXh0KChvbkNoYW5nZUV2ZW50LnNyY0VsZW1lbnQgfHwgb25DaGFuZ2VFdmVudC50YXJnZXQpLmZpbGVzWzBdKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBhbmd1bGFyXG4gICAgICAgIC5tb2R1bGUoJ2dyYWZpZGRsZScpXG4gICAgICAgIC5kaXJlY3RpdmUoJ29uUmVhZEZpbGUnLCBvblJlYWRGaWxlKTtcblxufSkoKTtcbiIsIihmdW5jdGlvbiAoKSB7XG5cbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBmdW5jdGlvbiBUcmVlRW5kcG9pbnQoJHJlc291cmNlLCBFTlYpIHtcbiAgICAgICAgcmV0dXJuICRyZXNvdXJjZShFTlYuYXBpICsgJ3RyZWUvOmlkJywge1xuICAgICAgICAgICAgaWQ6ICdAaWQnXG4gICAgICAgIH0sIHtcbiAgICAgICAgICAgIGdldDoge1xuICAgICAgICAgICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgICAgICAgICAgaXNBcnJheTogdHJ1ZVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBhbmd1bGFyXG4gICAgICAgIC5tb2R1bGUoJ2dyYWZpZGRsZScpXG4gICAgICAgIC5mYWN0b3J5KCdUcmVlRW5kcG9pbnQnLCBUcmVlRW5kcG9pbnQpO1xuXG59KSgpO1xuIiwiKGZ1bmN0aW9uICgpIHtcblxuICAgIGZ1bmN0aW9uIFRyZWVDb250cm9sbGVyKCRzY29wZSwgJHN0YXRlLCBDaGVja3BvaW50RW5kcG9pbnQsIFRyZWVFbmRwb2ludCkge1xuICAgICAgICB2YXIgdHJlZURhdGEgPSBbXTtcbiAgICAgICAgJHNjb3BlLmNoZWNrcG9pbnQgPSB7XG4gICAgICAgICAgICBpZDogJHN0YXRlLnBhcmFtcy5pZFxuICAgICAgICB9O1xuXG4gICAgICAgIENoZWNrcG9pbnRFbmRwb2ludFxuICAgICAgICAgICAgLmdldCh7aWQ6ICRzdGF0ZS5wYXJhbXMuaWR9KVxuICAgICAgICAgICAgLiRwcm9taXNlXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbihjaGVja3BvaW50KSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmNoZWNrcG9pbnQgPSBjaGVja3BvaW50O1xuICAgICAgICAgICAgICAgIFRyZWVFbmRwb2ludFxuICAgICAgICAgICAgICAgICAgICAuZ2V0KHtpZDogY2hlY2twb2ludC50cmVlfSlcbiAgICAgICAgICAgICAgICAgICAgLiRwcm9taXNlXG4gICAgICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHRyZWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyZWVEYXRhID0gY29udmVydFRyZWUodHJlZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBkcmF3KCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgZnVuY3Rpb24gY29udmVydFRyZWUodHJlZSkge1xuICAgICAgICAgICAgLy8gZmluZCBiYXNlXG4gICAgICAgICAgICB2YXIgYmFzZSA9IHt9O1xuICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKHRyZWUsIGZ1bmN0aW9uKG5vZGUpIHtcbiAgICAgICAgICAgICAgICBpZiAobm9kZS5iYXNlID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIGJhc2UgPSBub2RlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICB2YXIgdHJlZURhdGEgPSBbXTtcbiAgICAgICAgICAgIHRyZWVEYXRhLnB1c2goYmFzZSk7XG4gICAgICAgICAgICBhZGRDaGlsZHJlbihiYXNlLCB0cmVlKTtcblxuICAgICAgICAgICAgcmV0dXJuIHRyZWVEYXRhXG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBhZGRDaGlsZHJlbihiYXNlLCB0cmVlKSB7XG4gICAgICAgICAgICBiYXNlLmNoaWxkcmVuID0gW107XG4gICAgICAgICAgICBhbmd1bGFyLmZvckVhY2godHJlZSwgZnVuY3Rpb24obm9kZSkge1xuICAgICAgICAgICAgICAgIGlmIChub2RlLmJhc2UgPT09IGJhc2UuaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgYmFzZS5jaGlsZHJlbi5wdXNoKG5vZGUpO1xuICAgICAgICAgICAgICAgICAgICBhZGRDaGlsZHJlbihub2RlLCB0cmVlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gY2xpY2soZCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coZCk7XG4gICAgICAgICAgICAkc3RhdGUuZ28oJ2VkaXRvcicsIHtpZDogZC5pZH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZHJhdygpIHtcblxuICAgICAgICAgICAgLy8gKioqKioqKioqKioqKiogR2VuZXJhdGUgdGhlIHRyZWUgZGlhZ3JhbVx0ICoqKioqKioqKioqKioqKioqXG4gICAgICAgICAgICB2YXIgbWFyZ2luID0ge3RvcDogNDAsIHJpZ2h0OiAwLCBib3R0b206IDIwLCBsZWZ0OiAwfSxcbiAgICAgICAgICAgICAgICB3aWR0aCA9IDkwMCAtIG1hcmdpbi5yaWdodCAtIG1hcmdpbi5sZWZ0LFxuICAgICAgICAgICAgICAgIGhlaWdodCA9IDcwMCAtIG1hcmdpbi50b3AgLSBtYXJnaW4uYm90dG9tO1xuXG4gICAgICAgICAgICB2YXIgaSA9IDA7XG5cbiAgICAgICAgICAgIHZhciB0cmVlID0gZDMubGF5b3V0LnRyZWUoKVxuICAgICAgICAgICAgICAgIC5zaXplKFtoZWlnaHQsIHdpZHRoXSk7XG5cbiAgICAgICAgICAgIHZhciBkaWFnb25hbCA9IGQzLnN2Zy5kaWFnb25hbCgpXG4gICAgICAgICAgICAgICAgLnByb2plY3Rpb24oZnVuY3Rpb24oZCkgeyByZXR1cm4gW2QueCwgZC55XTsgfSk7XG5cbiAgICAgICAgICAgIHZhciBzdmcgPSBkMy5zZWxlY3QoXCIjdHJlZVwiKS5hcHBlbmQoXCJzdmdcIilcbiAgICAgICAgICAgICAgICAuYXR0cihcIndpZHRoXCIsIHdpZHRoICsgbWFyZ2luLnJpZ2h0ICsgbWFyZ2luLmxlZnQpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJoZWlnaHRcIiwgaGVpZ2h0ICsgbWFyZ2luLnRvcCArIG1hcmdpbi5ib3R0b20pXG4gICAgICAgICAgICAgICAgLmFwcGVuZChcImdcIilcbiAgICAgICAgICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZShcIiArIG1hcmdpbi5sZWZ0ICsgXCIsXCIgKyBtYXJnaW4udG9wICsgXCIpXCIpO1xuXG4gICAgICAgICAgICByb290ID0gdHJlZURhdGFbMF07XG5cbiAgICAgICAgICAgIHVwZGF0ZShyb290KTtcblxuICAgICAgICAgICAgZnVuY3Rpb24gdXBkYXRlKHNvdXJjZSkge1xuXG4gICAgICAgICAgICAgICAgLy8gQ29tcHV0ZSB0aGUgbmV3IHRyZWUgbGF5b3V0LlxuICAgICAgICAgICAgICAgIHZhciBub2RlcyA9IHRyZWUubm9kZXMocm9vdCkucmV2ZXJzZSgpLFxuICAgICAgICAgICAgICAgICAgICBsaW5rcyA9IHRyZWUubGlua3Mobm9kZXMpO1xuXG4gICAgICAgICAgICAgICAgLy8gTm9ybWFsaXplIGZvciBmaXhlZC1kZXB0aC5cbiAgICAgICAgICAgICAgICBub2Rlcy5mb3JFYWNoKGZ1bmN0aW9uKGQpIHsgZC55ID0gZC5kZXB0aCAqIDEwMDsgfSk7XG5cbiAgICAgICAgICAgICAgICAvLyBEZWNsYXJlIHRoZSBub2Rlc+KAplxuICAgICAgICAgICAgICAgIHZhciBub2RlID0gc3ZnLnNlbGVjdEFsbChcImcubm9kZVwiKVxuICAgICAgICAgICAgICAgICAgICAuZGF0YShub2RlcywgZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5pZCB8fCAoZC5pZCA9ICsraSk7IH0pO1xuXG4gICAgICAgICAgICAgICAgLy8gRW50ZXIgdGhlIG5vZGVzLlxuICAgICAgICAgICAgICAgIHZhciBub2RlRW50ZXIgPSBub2RlLmVudGVyKCkuYXBwZW5kKFwiZ1wiKVxuICAgICAgICAgICAgICAgICAgICAuYXR0cihcImNsYXNzXCIsIFwibm9kZVwiKVxuICAgICAgICAgICAgICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJ0cmFuc2xhdGUoXCIgKyBkLnggKyBcIixcIiArIGQueSArIFwiKVwiOyB9KVxuICAgICAgICAgICAgICAgICAgICAub24oXCJjbGlja1wiLCBjbGljayk7O1xuXG4gICAgICAgICAgICAgICAgbm9kZUVudGVyLmFwcGVuZChcImNpcmNsZVwiKVxuICAgICAgICAgICAgICAgICAgICAuYXR0cihcInJcIiwgMTApXG4gICAgICAgICAgICAgICAgICAgIC5zdHlsZShcImZpbGxcIiwgXCIjZmZmXCIpO1xuXG4gICAgICAgICAgICAgICAgbm9kZUVudGVyLmFwcGVuZChcInRleHRcIilcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoXCJ5XCIsIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBkLmNoaWxkcmVuIHx8IGQuX2NoaWxkcmVuID8gLTE4IDogMTg7IH0pXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKFwiZHlcIiwgXCIuMzVlbVwiKVxuICAgICAgICAgICAgICAgICAgICAuYXR0cihcInRleHQtYW5jaG9yXCIsIFwibWlkZGxlXCIpXG4gICAgICAgICAgICAgICAgICAgIC50ZXh0KGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB0ZXh0ID0gZC50aXRsZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vICsgJyBieSAnICsgZC5hdXRob3I7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZC5pZCA9PSAkc2NvcGUuY2hlY2twb2ludC5pZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRleHQgKz0gJyAoY3VycmVudCknO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRleHQ7XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIC5zdHlsZShcImZpbGwtb3BhY2l0eVwiLCAxKTtcblxuICAgICAgICAgICAgICAgIC8vIERlY2xhcmUgdGhlIGxpbmtz4oCmXG4gICAgICAgICAgICAgICAgdmFyIGxpbmsgPSBzdmcuc2VsZWN0QWxsKFwicGF0aC5saW5rXCIpXG4gICAgICAgICAgICAgICAgICAgIC5kYXRhKGxpbmtzLCBmdW5jdGlvbihkKSB7IHJldHVybiBkLnRhcmdldC5pZDsgfSk7XG5cbiAgICAgICAgICAgICAgICAvLyBFbnRlciB0aGUgbGlua3MuXG4gICAgICAgICAgICAgICAgbGluay5lbnRlcigpLmluc2VydChcInBhdGhcIiwgXCJnXCIpXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJsaW5rXCIpXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKFwiZFwiLCBkaWFnb25hbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBhbmd1bGFyXG4gICAgICAgIC5tb2R1bGUoJ2dyYWZpZGRsZScpXG4gICAgICAgIC5jb250cm9sbGVyKCdUcmVlQ29udHJvbGxlcicsIFRyZWVDb250cm9sbGVyKTtcblxufSkoKTsiLCIoZnVuY3Rpb24gKCkge1xuXG4gICAgZnVuY3Rpb24gRW1iZWRDb250cm9sbGVyKCRzY29wZSwgJHN0YXRlLCBDaGVja3BvaW50RW5kcG9pbnQsIEVkaXRvclNlcnZpY2UpIHtcblxuICAgICAgICAkc2NvcGUuY2hlY2twb2ludCA9IHt9O1xuICAgICAgICAkc2NvcGUuZW1iZWRWaWV3ID0gJ2NoYXJ0JztcbiAgICAgICAgJHNjb3BlLmFjZUpzb25Db25maWcgPSBFZGl0b3JTZXJ2aWNlLmFjZUpzb25Db25maWc7XG4gICAgICAgICRzY29wZS5zZXRWaWV3ID0gc2V0VmlldztcblxuICAgICAgICBhY3RpdmF0ZSgpO1xuXG4gICAgICAgIC8vLy8vLy8vLy8vL1xuXG4gICAgICAgIGZ1bmN0aW9uIGFjdGl2YXRlKCkge1xuICAgICAgICAgICAgaWYgKCRzdGF0ZS5wYXJhbXMuaWQpIHtcbiAgICAgICAgICAgICAgICBsb2FkQ2hlY2twb2ludCgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ2VkaXRvcicsIHtpZDogJyd9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKFsnY2hhcnQnLCAnZGF0YScsICdvcHRpb25zJ10uaW5kZXhPZigkc3RhdGUucGFyYW1zLnZpZXcpICE9PSAtMSkge1xuICAgICAgICAgICAgICAgICRzY29wZS5lbWJlZFZpZXcgPSAkc3RhdGUucGFyYW1zLnZpZXc7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIHN0YXJ0IHdhdGNoZXJcbiAgICAgICAgICAgIEVkaXRvclNlcnZpY2Uuc3luY09wdGlvbnNTdHJpbmcoJHNjb3BlLCAkc2NvcGUuY2hlY2twb2ludCk7XG4gICAgICAgICAgICBFZGl0b3JTZXJ2aWNlLnN5bmNPcHRpb25zKCRzY29wZSwgJHNjb3BlLmNoZWNrcG9pbnQpO1xuICAgICAgICAgICAgRWRpdG9yU2VydmljZS5zeW5jRGF0YVN0cmluZygkc2NvcGUsICRzY29wZS5jaGVja3BvaW50KTtcbiAgICAgICAgICAgIEVkaXRvclNlcnZpY2Uuc3luY0RhdGEoJHNjb3BlLCAkc2NvcGUuY2hlY2twb2ludCk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBsb2FkQ2hlY2twb2ludCgpIHtcbiAgICAgICAgICAgIENoZWNrcG9pbnRFbmRwb2ludFxuICAgICAgICAgICAgICAgIC5nZXQoe2lkOiAkc3RhdGUucGFyYW1zLmlkfSlcbiAgICAgICAgICAgICAgICAuJHByb21pc2VcbiAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbihjaGVja3BvaW50KSB7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5zZXJ2ZXJDaGVja3BvaW50ID0gY2hlY2twb2ludDtcbiAgICAgICAgICAgICAgICAgICAgRWRpdG9yU2VydmljZS5zZXRDaGVja3BvaW50KCRzY29wZS5jaGVja3BvaW50LCBjaGVja3BvaW50KTtcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC5jYXRjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgJHN0YXRlLmdvKCdlZGl0b3InLCB7aWQ6ICcnfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGZ1bmN0aW9uIHNldFZpZXcobmV3Vmlldykge1xuICAgICAgICAgICAgJHNjb3BlLmVtYmVkVmlldyA9IG5ld1ZpZXc7XG4gICAgICAgIH1cblxuICAgIH1cblxuICAgIGFuZ3VsYXJcbiAgICAgICAgLm1vZHVsZSgnZ3JhZmlkZGxlJylcbiAgICAgICAgLmNvbnRyb2xsZXIoJ0VtYmVkQ29udHJvbGxlcicsIEVtYmVkQ29udHJvbGxlcik7XG5cbn0pKCk7XG4iLCIoZnVuY3Rpb24oKSB7XG5cbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBmdW5jdGlvbiBFZGl0b3JTZXJ2aWNlKCRmaWx0ZXIpIHtcbiAgICAgICAgdmFyIGFjZUpzb25Db25maWcgPSB7XG4gICAgICAgICAgICBtb2RlOiAnanNvbicsXG4gICAgICAgICAgICB1c2VXcmFwTW9kZTogZmFsc2UsXG4gICAgICAgICAgICBvbkxvYWQ6IGZ1bmN0aW9uKF9lZGl0b3IpIHtcbiAgICAgICAgICAgICAgICBfZWRpdG9yLnNldFNob3dQcmludE1hcmdpbihmYWxzZSk7XG4gICAgICAgICAgICAgICAgX2VkaXRvci4kYmxvY2tTY3JvbGxpbmcgPSBJbmZpbml0eTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgYWNlSnNvbkNvbmZpZzogYWNlSnNvbkNvbmZpZyxcbiAgICAgICAgICAgIHN5bmNPcHRpb25zU3RyaW5nOiBzeW5jT3B0aW9uc1N0cmluZyxcbiAgICAgICAgICAgIHN5bmNPcHRpb25zOiBzeW5jT3B0aW9ucyxcbiAgICAgICAgICAgIHN5bmNEYXRhU3RyaW5nOiBzeW5jRGF0YVN0cmluZyxcbiAgICAgICAgICAgIHN5bmNEYXRhOiBzeW5jRGF0YSxcbiAgICAgICAgICAgIHNldENoZWNrcG9pbnQ6IHNldENoZWNrcG9pbnRcbiAgICAgICAgfTtcblxuICAgICAgICAvLy8vLy8vLy9cblxuICAgICAgICBmdW5jdGlvbiBzeW5jT3B0aW9uc1N0cmluZyhzY29wZSwgY2hlY2twb2ludCkge1xuICAgICAgICAgICAgc2NvcGUuJHdhdGNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHZhciBjb21wYXJlID0ge307XG4gICAgICAgICAgICAgICAgaWYgKGNoZWNrcG9pbnQub3B0aW9ucykge1xuICAgICAgICAgICAgICAgICAgICBjb21wYXJlID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGltZW5zaW9uczogY2hlY2twb2ludC5vcHRpb25zLmRpbWVuc2lvbnMsXG4gICAgICAgICAgICAgICAgICAgICAgICBjaGFydDogY2hlY2twb2ludC5vcHRpb25zLmNoYXJ0LFxuICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGU6IGNoZWNrcG9pbnQub3B0aW9ucy5zdGF0ZVxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gY29tcGFyZTtcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uKG5ld09wdGlvbnMpIHtcbiAgICAgICAgICAgICAgICBpZiAoIW5ld09wdGlvbnMpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgb3B0aW9uc1RvUGFyc2UgPSB7XG4gICAgICAgICAgICAgICAgICAgIGRpbWVuc2lvbnM6IG5ld09wdGlvbnMuZGltZW5zaW9ucyxcbiAgICAgICAgICAgICAgICAgICAgY2hhcnQ6IG5ld09wdGlvbnMuY2hhcnQsXG4gICAgICAgICAgICAgICAgICAgIHN0YXRlOiBuZXdPcHRpb25zLnN0YXRlXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBjaGVja3BvaW50Lm9wdGlvbnNTdHJpbmcgPSAkZmlsdGVyKCdqc29uJykob3B0aW9uc1RvUGFyc2UpO1xuICAgICAgICAgICAgICAgIGNoZWNrcG9pbnQub3B0aW9uc1N0cmluZ0ludmFsaWQgPSBmYWxzZTtcbiAgICAgICAgICAgIH0sIHRydWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gc3luY09wdGlvbnMoc2NvcGUsIGNoZWNrcG9pbnQpIHtcbiAgICAgICAgICAgIHNjb3BlLiR3YXRjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2hlY2twb2ludC5vcHRpb25zU3RyaW5nO1xuICAgICAgICAgICAgfSwgZnVuY3Rpb24obmV3U3RyaW5nKSB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG9wdGlvbnMgPSBKU09OLnBhcnNlKG5ld1N0cmluZyk7XG4gICAgICAgICAgICAgICAgICAgIGNoZWNrcG9pbnQub3B0aW9ucy5kaW1lbnNpb25zID0gb3B0aW9ucy5kaW1lbnNpb25zO1xuICAgICAgICAgICAgICAgICAgICBjaGVja3BvaW50Lm9wdGlvbnMuY2hhcnQgPSBvcHRpb25zLmNoYXJ0O1xuICAgICAgICAgICAgICAgICAgICBjaGVja3BvaW50Lm9wdGlvbnMuc3RhdGUgPSBvcHRpb25zLnN0YXRlO1xuICAgICAgICAgICAgICAgICAgICBjaGVja3BvaW50Lm9wdGlvbnNTdHJpbmdJbnZhbGlkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICBjaGVja3BvaW50Lm9wdGlvbnNTdHJpbmdJbnZhbGlkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHN5bmNEYXRhU3RyaW5nKHNjb3BlLCBjaGVja3BvaW50KSB7XG4gICAgICAgICAgICBzY29wZS4kd2F0Y2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNoZWNrcG9pbnQub3B0aW9ucyA/IGNoZWNrcG9pbnQub3B0aW9ucy5kYXRhIDoge307XG4gICAgICAgICAgICB9LCBmdW5jdGlvbihuZXdEYXRhKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFuZXdEYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2hlY2twb2ludC5kYXRhU3RyaW5nID0gJGZpbHRlcignanNvbicpKG5ld0RhdGEpO1xuICAgICAgICAgICAgICAgIGNoZWNrcG9pbnQuZGF0YVN0cmluZ0ludmFsaWQgPSBmYWxzZTtcbiAgICAgICAgICAgIH0sIHRydWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gc3luY0RhdGEoc2NvcGUsIGNoZWNrcG9pbnQpIHtcbiAgICAgICAgICAgIHNjb3BlLiR3YXRjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2hlY2twb2ludC5kYXRhU3RyaW5nO1xuICAgICAgICAgICAgfSwgZnVuY3Rpb24obmV3U3RyaW5nKSB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgY2hlY2twb2ludC5vcHRpb25zLmRhdGEgPSBKU09OLnBhcnNlKG5ld1N0cmluZyk7XG4gICAgICAgICAgICAgICAgICAgIGNoZWNrcG9pbnQuZGF0YVN0cmluZ0ludmFsaWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNoZWNrcG9pbnQuZGF0YVN0cmluZ0ludmFsaWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gc2V0Q2hlY2twb2ludChvbGRDaGVja3BvaW50LCBuZXdDaGVja3BvaW50KSB7XG4gICAgICAgICAgICBvbGRDaGVja3BvaW50LmRhdGFTdHJpbmcgPSAnJztcbiAgICAgICAgICAgIG9sZENoZWNrcG9pbnQub3B0aW9uc1N0cmluZyA9ICcnO1xuICAgICAgICAgICAgb2xkQ2hlY2twb2ludC5vcHRpb25zID0gbmV3Q2hlY2twb2ludC5vcHRpb25zO1xuICAgICAgICB9XG5cbiAgICB9XG5cbiAgICBhbmd1bGFyXG4gICAgICAgIC5tb2R1bGUoJ2dyYWZpZGRsZScpXG4gICAgICAgIC5zZXJ2aWNlKCdFZGl0b3JTZXJ2aWNlJywgRWRpdG9yU2VydmljZSk7XG5cbn0pKCk7XG4iLCIoZnVuY3Rpb24oKSB7XG5cbiAgICBmdW5jdGlvbiBFZGl0b3JDb250cm9sbGVyKCRzY29wZSwgJHN0YXRlLCAkd2luZG93LCAkdGltZW91dCwgQ2hlY2twb2ludEVuZHBvaW50LCBFZGl0b3JTZXJ2aWNlKSB7XG5cbiAgICAgICAgLy8gc2hhcmVcbiAgICAgICAgJHNjb3BlLnNob3dTaGFyZVBvcHVwID0gZmFsc2U7XG4gICAgICAgICRzY29wZS5zaGFyZSA9IHNoYXJlO1xuICAgICAgICAkc2NvcGUuc2hhcmVQb3B1cCA9IHNoYXJlUG9wdXA7XG4gICAgICAgICRzY29wZS5vblNoYXJlVGV4dENsaWNrID0gb25TaGFyZVRleHRDbGljaztcblxuICAgICAgICAvLyB1cGxvYWQgZGF0YVxuICAgICAgICAkc2NvcGUuc2hvd0RhdGFFZGl0b3IgPSB0cnVlO1xuICAgICAgICAkc2NvcGUuc3dpdGNoRGF0YUJ1dHRvblRpdGxlID0gJ01hbnVhbCBkYXRhIGVudHJ5JztcbiAgICAgICAgJHNjb3BlLnRvZ2dsZURhdGFFZGl0b3IgPSB0b2dnbGVEYXRhRWRpdG9yO1xuICAgICAgICAkc2NvcGUudXBsb2FkRmlsZSA9IHVwbG9hZEZpbGU7XG5cbiAgICAgICAgLy8gc2F2ZVxuICAgICAgICAkc2NvcGUuc2F2ZSA9IHNhdmU7XG4gICAgICAgICRzY29wZS5jaGVja3BvaW50ID0ge307XG4gICAgICAgICRzY29wZS5hY2VKc29uQ29uZmlnID0gRWRpdG9yU2VydmljZS5hY2VKc29uQ29uZmlnO1xuXG4gICAgICAgIGFjdGl2YXRlKCk7XG5cbiAgICAgICAgLy8vLy8vLy8vLy8vXG5cbiAgICAgICAgZnVuY3Rpb24gYWN0aXZhdGUoKSB7XG5cbiAgICAgICAgICAgIGlmICgkc3RhdGUucGFyYW1zLmlkKSB7XG4gICAgICAgICAgICAgICAgbG9hZENoZWNrcG9pbnQoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbG9hZERlZmF1bHREYXRhKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIHN0YXJ0IHdhdGNoZXJcbiAgICAgICAgICAgIEVkaXRvclNlcnZpY2Uuc3luY09wdGlvbnNTdHJpbmcoJHNjb3BlLCAkc2NvcGUuY2hlY2twb2ludCk7XG4gICAgICAgICAgICBFZGl0b3JTZXJ2aWNlLnN5bmNPcHRpb25zKCRzY29wZSwgJHNjb3BlLmNoZWNrcG9pbnQpO1xuICAgICAgICAgICAgRWRpdG9yU2VydmljZS5zeW5jRGF0YVN0cmluZygkc2NvcGUsICRzY29wZS5jaGVja3BvaW50KTtcbiAgICAgICAgICAgIEVkaXRvclNlcnZpY2Uuc3luY0RhdGEoJHNjb3BlLCAkc2NvcGUuY2hlY2twb2ludCk7XG4gICAgICAgIH1cblxuXG4gICAgICAgIC8qXG4gICAgICAgICAqIFNIQVJFXG4gICAgICAgICAqL1xuICAgICAgICAvLyBTaGFyZSB0aGUgZmlkZGxlXG4gICAgICAgIC8vXG4gICAgICAgIGZ1bmN0aW9uIHNoYXJlKHRhcmdldCkge1xuICAgICAgICAgICAgZmlkZGxlVVJMID0gJ2h0dHA6Ly9ncmFmaWRkbGUuYXBwc3BvdC5jb20vJyArICRzdGF0ZS5wYXJhbXMuaWQ7XG4gICAgICAgICAgICBpZiAodGFyZ2V0ID09ICdGQicpIHtcbiAgICAgICAgICAgICAgICAkd2luZG93Lm9wZW4oJ2h0dHBzOi8vd3d3LmZhY2Vib29rLmNvbS9zaGFyZXIvc2hhcmVyLnBocD91PScgKyBmaWRkbGVVUkwsICdfYmxhbmsnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0YXJnZXQgPT0gJ1R3aXR0ZXInKSB7XG4gICAgICAgICAgICAgICAgJHdpbmRvdy5vcGVuKCdodHRwczovL3R3aXR0ZXIuY29tL2ludGVudC90d2VldD90ZXh0PUNoZWNrJTIwb3V0JTIwdGhpcyUyMHN3ZWV0JTIwZ3JhZmlkZGxlJTIwJnVybD0nICsgZmlkZGxlVVJMLCAnX2JsYW5rJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodGFyZ2V0ID09ICdFLU1haWwnKSB7XG4gICAgICAgICAgICAgICAgJHdpbmRvdy5sb2NhdGlvbiA9ICdtYWlsdG86YUBiLmNkP3N1YmplY3Q9Q2hlY2slMjBvdXQlMjB0aGlzJTIwYXdlc29tZSUyMEdyYWZpZGRsZSZib2R5PScgKyBmaWRkbGVVUkw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gU2hvdyB0aGUgc2hhcmUgc2hlZXRcbiAgICAgICAgLy9cbiAgICAgICAgZnVuY3Rpb24gc2hhcmVQb3B1cCgpIHtcbiAgICAgICAgICAgICRzY29wZS5zaG93U2hhcmVQb3B1cCA9ICEkc2NvcGUuc2hvd1NoYXJlUG9wdXA7XG4gICAgICAgICAgICAkc2NvcGUuZmlkZGxlVVJMID0gJ2h0dHA6Ly9ncmFmaWRkbGUuYXBwc3BvdC5jb20vJyArICRzdGF0ZS5wYXJhbXMuaWQ7XG4gICAgICAgICAgICAkc2NvcGUuZmlkZGxlQ2hhcnRVUkwgPSAnaHR0cDovL2dyYWZpZGRsZS5hcHBzcG90LmNvbS8nICsgJHN0YXRlLnBhcmFtcy5pZCArICcucG5nJztcbiAgICAgICAgICAgICRzY29wZS5maWRkbGVFbWJlZENvZGUgPSAnPGlmcmFtZSB3aWR0aD1cIjEwMCVcIiBoZWlnaHQ9XCIzMDBcIiBzcmM9XCIvL2dyYWZpZGRsZS5hcHBzcG90LmNvbS8nICsgJHN0YXRlLnBhcmFtcy5pZCArICcvZW1iZWRcIiBhbGxvd2Z1bGxzY3JlZW49XCJhbGxvd2Z1bGxzY3JlZW5cIiBmcmFtZWJvcmRlcj1cIjBcIj48L2lmcmFtZT4nO1xuICAgICAgICB9XG4gICAgICAgIC8vIEFsbG93IHNoYXJlIHRleHQgZmllbGRzIHRvIGF1dG9zZWxlY3Qgb24gZm9jdXNcbiAgICAgICAgLy9cbiAgICAgICAgZnVuY3Rpb24gb25TaGFyZVRleHRDbGljaygkZXZlbnQpIHtcbiAgICAgICAgICAgICRldmVudC50YXJnZXQuc2VsZWN0KCk7XG4gICAgICAgIH1cblxuXG4gICAgICAgIC8qXG4gICAgICAgICAqIERBVEFcbiAgICAgICAgICovXG4gICAgICAgIC8vIFVwbG9hZCBhIGZpbGUgYXMgZGF0YSBzb3VyY2VcbiAgICAgICAgLy9cbiAgICAgICAgZnVuY3Rpb24gdXBsb2FkRmlsZShmaWxlKSB7XG4gICAgICAgICAgICAkc2NvcGUuY2hlY2twb2ludC5kYXRhc2V0U3RyaW5nID0gZmlsZTtcbiAgICAgICAgICAgICRzY29wZS50b2dnbGVEYXRhRWRpdG9yKCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBUb2dnbGUgZnJvbSBkYXRhIHZpZXdcbiAgICAgICAgLy9cbiAgICAgICAgZnVuY3Rpb24gdG9nZ2xlRGF0YUVkaXRvcigpIHtcbiAgICAgICAgICAgICRzY29wZS5zaG93RGF0YUVkaXRvciA9ICEkc2NvcGUuc2hvd0RhdGFFZGl0b3I7XG4gICAgICAgICAgICAkc2NvcGUuc3dpdGNoRGF0YUJ1dHRvblRpdGxlID0gJHNjb3BlLnNob3dEYXRhRWRpdG9yID8gJ0JhY2sgdG8gaW5wdXQgZGlhbG9nJyA6ICdNYW51YWwgZGF0YSBlbnRyeSc7XG4gICAgICAgIH1cblxuXG4gICAgICAgIC8qXG4gICAgICAgICAqIENIRUNLUE9JTlRcbiAgICAgICAgICovXG4gICAgICAgIC8vIEluc2VydCBkZWZhdWx0IGRhdGFcbiAgICAgICAgLy9cbiAgICAgICAgZnVuY3Rpb24gbG9hZERlZmF1bHREYXRhKCkge1xuICAgICAgICAgICAgdmFyIGRhdGEgPSBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBcImRheVwiOiBcIjIwMTMtMDEtMDJcIixcbiAgICAgICAgICAgICAgICAgICAgXCJmaXJzdFwiOiAxMjM2NS4wNTMsXG4gICAgICAgICAgICAgICAgICAgIFwic2Vjb25kXCI6IDE2MDAsXG4gICAgICAgICAgICAgICAgICAgIFwidGhpcmRcIjogMTMwMCxcbiAgICAgICAgICAgICAgICAgICAgXCJmb3VydGhcIjogMTUwMCxcbiAgICAgICAgICAgICAgICAgICAgXCJsaW5lXCI6IDYwMDAuMjk1MjAyXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIFwiZGF5XCI6IFwiMjAxMy0wMS0wM1wiLFxuICAgICAgICAgICAgICAgICAgICBcImZpcnN0XCI6IDEyMDMuMDUzLFxuICAgICAgICAgICAgICAgICAgICBcInNlY29uZFwiOiAxNjAwMCxcbiAgICAgICAgICAgICAgICAgICAgXCJ0aGlyZFwiOiAxMzAwLFxuICAgICAgICAgICAgICAgICAgICBcImZvdXJ0aFwiOiAxNTAwLFxuICAgICAgICAgICAgICAgICAgICBcImxpbmVcIjogMTMzNjUuMDUzXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIFwiZGF5XCI6IFwiMjAxMy0wMS0wNFwiLFxuICAgICAgICAgICAgICAgICAgICBcImZpcnN0XCI6IDEyMzUuMDUzLFxuICAgICAgICAgICAgICAgICAgICBcInNlY29uZFwiOiAxNjAwLFxuICAgICAgICAgICAgICAgICAgICBcInRoaXJkXCI6IDEzMDAwLFxuICAgICAgICAgICAgICAgICAgICBcImZvdXJ0aFwiOiAxNTAwLFxuICAgICAgICAgICAgICAgICAgICBcImxpbmVcIjogOTM2NS4wNTNcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgXCJkYXlcIjogXCIyMDEzLTAxLTA1XCIsXG4gICAgICAgICAgICAgICAgICAgIFwiZmlyc3RcIjogMTI2NS4wNTMsXG4gICAgICAgICAgICAgICAgICAgIFwic2Vjb25kXCI6IDE2MDAsXG4gICAgICAgICAgICAgICAgICAgIFwidGhpcmRcIjogMTMwMCxcbiAgICAgICAgICAgICAgICAgICAgXCJmb3VydGhcIjogMTUwMDAsXG4gICAgICAgICAgICAgICAgICAgIFwibGluZVwiOiAxNDM2NS4wNTNcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdO1xuICAgICAgICAgICAgdmFyIG9wdGlvbnMgPSB7XG4gICAgICAgICAgICAgICAgXCJkYXRhXCI6IGRhdGEsXG4gICAgICAgICAgICAgICAgXCJkaW1lbnNpb25zXCI6IHtcbiAgICAgICAgICAgICAgICAgICAgZmlyc3Q6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImJhclwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJjb2xvclwiOiBcImdyZWVuXCJcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgc2Vjb25kOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJiYXJcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiY29sb3JcIjogXCJvcmFuZ2VcIlxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB0aGlyZDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiYmFyXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcImNvbG9yXCI6IFwiYmx1ZVwiXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGZvdXJ0aDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiYmFyXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcImNvbG9yXCI6IFwicmVkXCJcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgbGluZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJrZXlcIjogXCJsaW5lXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJzcGxpbmVcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiY29sb3JcIjogXCJibGFja1wiXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIFwiY2hhcnRcIjoge1xuICAgICAgICAgICAgICAgICAgICBcImRhdGFcIjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJzZWxlY3Rpb25cIjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiZW5hYmxlZFwiOiB0cnVlXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHpvb206IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IHRydWVcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB2YXIgY2hlY2twb2ludCA9IHtcbiAgICAgICAgICAgICAgICBvcHRpb25zOiBvcHRpb25zXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgRWRpdG9yU2VydmljZS5zZXRDaGVja3BvaW50KCRzY29wZS5jaGVja3BvaW50LCBjaGVja3BvaW50KTtcbiAgICAgICAgICAgICR0aW1lb3V0KHNhdmVBc0ltYWdlLCAwKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGxvYWRDaGVja3BvaW50KCkge1xuICAgICAgICAgICAgQ2hlY2twb2ludEVuZHBvaW50XG4gICAgICAgICAgICAgICAgLmdldCh7aWQ6ICRzdGF0ZS5wYXJhbXMuaWR9KVxuICAgICAgICAgICAgICAgIC4kcHJvbWlzZVxuICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKGNoZWNrcG9pbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnNlcnZlckNoZWNrcG9pbnQgPSBjaGVja3BvaW50O1xuICAgICAgICAgICAgICAgICAgICBFZGl0b3JTZXJ2aWNlLnNldENoZWNrcG9pbnQoJHNjb3BlLmNoZWNrcG9pbnQsIGNoZWNrcG9pbnQpO1xuICAgICAgICAgICAgICAgICAgICAkdGltZW91dChzYXZlQXNJbWFnZSwgMCk7XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAuY2F0Y2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnZWRpdG9yJywge2lkOiAnJ30pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cblxuXG4gICAgICAgIC8vIFNhdmUgdGhlIGN1cnJlbnQgVmVyc2lvblxuICAgICAgICAvL1xuICAgICAgICBmdW5jdGlvbiBzYXZlKCkge1xuICAgICAgICAgICAgQ2hlY2twb2ludEVuZHBvaW50LnNhdmUoe1xuICAgICAgICAgICAgICAgIFwiYmFzZVwiOiAkc2NvcGUuc2VydmVyQ2hlY2twb2ludCAmJiAkc2NvcGUuc2VydmVyQ2hlY2twb2ludC5pZCxcbiAgICAgICAgICAgICAgICBcImRhdGFcIjogW10sIC8vIGlzIHJlcXVpcmVkIGJ5IHRoZSBzZXJ2ZXJcbiAgICAgICAgICAgICAgICBcIm9wdGlvbnNcIjogJHNjb3BlLmNoZWNrcG9pbnQub3B0aW9ucyxcbiAgICAgICAgICAgICAgICBcImF1dGhvclwiOiAkc2NvcGUuYXV0aG9yLFxuICAgICAgICAgICAgICAgIFwidGl0bGVcIjogJHNjb3BlLnRpdGxlXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC4kcHJvbWlzZVxuICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKGNoZWNrcG9pbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgJHN0YXRlLmdvKCdlZGl0b3InLCB7aWQ6IGNoZWNrcG9pbnQuaWR9KTtcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC5jYXRjaChmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ3NhdmUgZmFpbGVkJywgZSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuXG4gICAgICAgIGZ1bmN0aW9uIHNhdmVBc0ltYWdlKCkge1xuICAgICAgICAgICAgLy8gVE9ETyBmaXggbWVcbiAgICAgICAgICAgIC8vY2FudmcoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NhbnZhcycpLCBkMy5zZWxlY3QoXCIuYW5ndWxhcmNoYXJ0XCIpLm5vZGUoKS5pbm5lckhUTUwpO1xuICAgICAgICAgICAgLy8kc2NvcGUuYXNJbWFnZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjYW52YXMnKS50b0RhdGFVUkwoKTtcbiAgICAgICAgICAgIC8vJHNjb3BlLm1ldGFkYXRhLm9nWydvZzppbWFnZSddID0gJHNjb3BlLmFzSW1hZ2U7XG4gICAgICAgIH1cblxuICAgIH1cblxuICAgIGFuZ3VsYXJcbiAgICAgICAgLm1vZHVsZSgnZ3JhZmlkZGxlJylcbiAgICAgICAgLmNvbnRyb2xsZXIoJ0VkaXRvckNvbnRyb2xsZXInLCBFZGl0b3JDb250cm9sbGVyKTtcblxufSkoKTtcbiIsIihmdW5jdGlvbiAoKSB7XG5cbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBmdW5jdGlvbiBzdGF0ZXNDb25maWd1cmF0aW9uKCRzdGF0ZVByb3ZpZGVyLCAkdXJsUm91dGVyUHJvdmlkZXIsICRsb2NhdGlvblByb3ZpZGVyKSB7XG5cbiAgICAgICAgJHN0YXRlUHJvdmlkZXJcbiAgICAgICAgICAgIC5zdGF0ZSgnNDA0Jywge1xuICAgICAgICAgICAgICAgIHZpZXdzOiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnY29tcG9uZW50cy9jb21tb24vNDA0LzQwNC5odG1sJ1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5zdGF0ZSgnZW1iZWQnLCB7XG4gICAgICAgICAgICAgICAgdXJsOiAnLzppZC9lbWJlZCcsXG4gICAgICAgICAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAgICAgICAgICAgY29udGVudDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdjb21wb25lbnRzL2VtYmVkL2VtYmVkLmh0bWwnLFxuICAgICAgICAgICAgICAgICAgICAgICAgY29udHJvbGxlcjogJ0VtYmVkQ29udHJvbGxlcidcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuc3RhdGUoJ3RyZWUnLCB7XG4gICAgICAgICAgICAgICAgdXJsOiAnLzppZC90cmVlJyxcbiAgICAgICAgICAgICAgICB2aWV3czoge1xuICAgICAgICAgICAgICAgICAgICBjb250ZW50OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ2NvbXBvbmVudHMvdHJlZS90cmVlLmh0bWwnLFxuICAgICAgICAgICAgICAgICAgICAgICAgY29udHJvbGxlcjogJ1RyZWVDb250cm9sbGVyJ1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5zdGF0ZSgnZWRpdG9yJywge1xuICAgICAgICAgICAgICAgIHVybDogJy86aWQnLFxuICAgICAgICAgICAgICAgIHZpZXdzOiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnY29tcG9uZW50cy9lZGl0b3IvZWRpdG9yLmh0bWwnLFxuICAgICAgICAgICAgICAgICAgICAgICAgY29udHJvbGxlcjogJ0VkaXRvckNvbnRyb2xsZXInXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAvKiBAbmdJbmplY3QgKi9cbiAgICAgICAgJHVybFJvdXRlclByb3ZpZGVyLm90aGVyd2lzZShmdW5jdGlvbiAoJGluamVjdG9yLCAkbG9jYXRpb24pIHtcbiAgICAgICAgICAgIC8vIFVzZXJTZXJ2aWNlICYgJHN0YXRlIG5vdCBhdmFpbGFibGUgZHVyaW5nIC5jb25maWcoKSwgaW5qZWN0IHRoZW0gKG1hbnVhbGx5KSBsYXRlclxuXG4gICAgICAgICAgICAvLyByZXF1ZXN0aW5nIHVua25vd24gcGFnZSB1bmVxdWFsIHRvICcvJ1xuICAgICAgICAgICAgdmFyIHBhdGggPSAkbG9jYXRpb24ucGF0aCgpO1xuICAgICAgICAgICAgaWYgKHBhdGggIT09ICcvJykge1xuICAgICAgICAgICAgICAgICRpbmplY3Rvci5nZXQoJyRzdGF0ZScpLmdvKCcnKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcGF0aDsgLy8gdGhpcyB0cmljayBhbGxvd3MgdG8gc2hvdyB0aGUgZXJyb3IgcGFnZSBvbiB1bmtub3duIGFkZHJlc3NcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuICcvbmV3JztcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJGxvY2F0aW9uUHJvdmlkZXJcbiAgICAgICAgICAgIC5odG1sNU1vZGUodHJ1ZSlcbiAgICAgICAgICAgIC5oYXNoUHJlZml4KCchJyk7XG4gICAgfVxuXG5cbiAgICBhbmd1bGFyXG4gICAgICAgIC5tb2R1bGUoJ2dyYWZpZGRsZScpXG4gICAgICAgIC5jb25maWcoc3RhdGVzQ29uZmlndXJhdGlvbik7XG5cbn0pKCk7IiwiKGZ1bmN0aW9uICgpIHtcblxuICAgIGZ1bmN0aW9uIEFwcENvbnRyb2xsZXIoJHNjb3BlKSB7XG5cbiAgICAgICAgJHNjb3BlLm1ldGFkYXRhID0ge307XG4gICAgICAgICRzY29wZS5tZXRhZGF0YS5wYWdlVGl0bGUgPSAnU2hhcmUgeW91ciB2aXN1YWxpemF0aW9ucyBvbiBncmFmaWRkbGUnO1xuICAgICAgICAkc2NvcGUubWV0YWRhdGEub2cgPSB7XG4gICAgICAgICAgICAnb2c6dHlwZSc6ICdhcnRpY2xlJyxcbiAgICAgICAgICAgICdhcnRpY2xlOnNlY3Rpb24nOiAnU2hhcmFibGUgZGF0YSB2aXN1YWxpemF0aW9uJyxcbiAgICAgICAgICAgICdvZzp0aXRsZSc6ICdTaGFyZSB5b3VyIHZpc3VhbGl6YXRpb25zIG9uIGdyYWZpZGRsZScsXG4gICAgICAgICAgICAnb2c6aW1hZ2UnOiAnJyxcbiAgICAgICAgICAgICdvZzpkZXNjcmlwdGlvbic6ICdTaGFyYWJsZSBkYXRhIHZpc3VhbGl6YXRpb24nXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgYW5ndWxhclxuICAgICAgICAubW9kdWxlKCdncmFmaWRkbGUnKVxuICAgICAgICAuY29udHJvbGxlcignQXBwQ29udHJvbGxlcicsIEFwcENvbnRyb2xsZXIpO1xuXG59KSgpO1xuIiwiKGZ1bmN0aW9uICgpIHtcblxuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGZ1bmN0aW9uIENoZWNrcG9pbnRFbmRwb2ludCgkcmVzb3VyY2UsIEVOVikge1xuICAgICAgICByZXR1cm4gJHJlc291cmNlKEVOVi5hcGkgKyAnY2hlY2twb2ludC86aWQnLCB7XG4gICAgICAgICAgICBpZDogJ0BpZCdcbiAgICAgICAgfSwge1xuICAgICAgICAgICAgc2F2ZToge1xuICAgICAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZ2V0OiB7XG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnR0VUJ1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBhbmd1bGFyXG4gICAgICAgIC5tb2R1bGUoJ2dyYWZpZGRsZScpXG4gICAgICAgIC5mYWN0b3J5KCdDaGVja3BvaW50RW5kcG9pbnQnLCBDaGVja3BvaW50RW5kcG9pbnQpO1xuXG59KSgpO1xuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9