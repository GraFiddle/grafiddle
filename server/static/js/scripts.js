(function () {

  'use strict';

  angular
    .module('grafiddle', [
      'grafiddle.config',
      'grafiddle.templates',
      'ngResource',
      'ngSanitize',
      'ngAnimate',
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

    function TreeController($scope, $state, CheckpointEndpoint, TreeEndpoint) {

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
                        convertTree(tree);
                    });
            });

        function convertTree(tree) {
            // TODO
        }

        function click(d) {
            console.log(d);
            $state.go('editor', {id: d.id});
        }


        var treeData = [
            {
                "name": "Top Level",
                "children": [
                    {
                        "name": "Level 2: A",
                        "author": "Peter",
                        "id": 1234,
                        "children": [
                            {
                                "name": "Son of A"
                            },
                            {
                                "name": "Daughter of A",
                                "id": 123
                            }
                        ]
                    },
                    {
                        "name": "Level 2: B"
                    },
                    {
                        "name": "Level 2: B"
                    },
                    {
                        "name": "Level 2: B"
                    },
                    {
                        "name": "Level 2: B"
                    },
                    {
                        "name": "Level 2: B"
                    }
                ]
            }
        ];

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
                    var text = d.name;
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
    TreeController.$inject = ["$scope", "$state", "CheckpointEndpoint", "TreeEndpoint"];

    angular
        .module('grafiddle')
        .controller('TreeController', TreeController);

})();
(function () {

    function EmbedController($scope, $filter, $location) {

        $scope.fiddleid = $location.path().substr(1).split('?', 1)[0];

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

    }
    EmbedController.$inject = ["$scope", "$filter", "$location"];

    angular
        .module('grafiddle')
        .controller('EmbedController', EmbedController);

})();

(function () {

    function EditorController($scope, $filter, $state, $window, $timeout, CheckpointEndpoint) {

        $scope.showDataEditor = false;
        $scope.showOptionsUI  = false;
        $scope.showSharePopup = false;
        $scope.switchDataButtonTitle    = 'Manual data entry';
        $scope.switchOptionsButtonTitle = 'Edit in GUI';
        $scope.toggleDataEditor = toggleDataEditor;
        $scope.toggleOptionsUI  = toggleOptionsUI;
        $scope.sharePopup       = sharePopup;
        $scope.onShareTextClick = onShareTextClick;

        $scope.share = share;
        $scope.save = save;
        $scope.uploadFile = uploadFile;

        $scope.checkpoint = {};
        $scope.aceJsonConfig = {
            mode: 'json',
            useWrapMode: false,
            onLoad: function (_editor) {
                _editor.setShowPrintMargin(false);
                _editor.$blockScrolling = Infinity;
                $scope.editors = _editor;
            }
        };

        activate();

        ////////////

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
            updateOnResize();
        }

        function saveAsImage() {
            canvg(document.getElementById('canvas'), d3.select(".angularchart").node().innerHTML);
            $scope.asImage = document.getElementById('canvas').toDataURL();
            $scope.metadata.og['og:image'] = $scope.asImage;
        }

        // Save the current Version
        //
        function save() {
            CheckpointEndpoint.save({
                "data": $scope.checkpoint.dataset,
                "options": $scope.checkpoint.options,
                "author": "Anonym"
            })
                .$promise
                .then(function (checkpoint) {
                    console.log('saved checkpoint: ', checkpoint);
                    $state.go('editor', {id: checkpoint.id});
                })
                .catch(function (e) {
                    console.error('save failed', e);
                })
        }

        // Share the fiddle
        //
        function share(target) {
            fiddleURL       = 'http://grafiddle.appspot.com/' + $state.params.id;
            if(target == 'FB') {
                $window.open('https://www.facebook.com/sharer/sharer.php?u=' + fiddleURL, '_blank');
            }
            if(target == 'Twitter') {
                $window.open('https://twitter.com/intent/tweet?text=Check%20out%20this%20sweet%20grafiddle%20&url=' + fiddleURL, '_blank');
            }
            if(target == 'E-Mail') {
                $window.location = 'mailto:a@b.cd?subject=Check%20out%20this%20awesome%20Grafiddle&body=' + fiddleURL;
            }
        }

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

        // Toggle from json-option view
        //
        function toggleOptionsUI() {
            $scope.showOptionsUI = !$scope.showOptionsUI;
            $scope.switchOptionsButtonTitle = $scope.showOptionsUI ? 'Edit as JSON' : 'Edit in GUI';
            $scope.editors.resize();
            $scope.editors.renderer.updateFull();
        }

        // Create the HTML UI representation of the options json
        //
        function updateOptionsUI(json) {
            console.log("update options ui");
        }

        // Show the share sheet
        //
        function sharePopup() {
            $scope.showSharePopup = !$scope.showSharePopup;
            $scope.fiddleURL       = 'http://grafiddle.appspot.com/' + $state.params.id;
            $scope.fiddleChartURL  = 'http://grafiddle.appspot.com/' + $state.params.id + '.png';
            $scope.fiddleEmbedCode = '<iframe width="100%" height="300" src="//grafiddle.appspot.com/embed/' + $state.params.id + '" allowfullscreen="allowfullscreen" frameborder="0"></iframe>';
        }

        // Allow share text fields to autoselect on focus
        //
        function onShareTextClick($event) {
            $event.target.select();
        };

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

        function setCheckpoint(checkpoint) {
            $scope.checkpoint.datasetString = '';
            $scope.checkpoint.dataset = checkpoint.data;
            $scope.checkpoint.schemaString = '';
            $scope.checkpoint.schema = {};
            $scope.checkpoint.optionsString = '';
            $scope.checkpoint.options = checkpoint.options;
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
            // Is called to often, not only on resize
            //$scope.checkpoint.options.updated = new Date();
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
    EditorController.$inject = ["$scope", "$filter", "$state", "$window", "$timeout", "CheckpointEndpoint"];

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
                url: '/embed',
                views: {
                    content: {
                        templateUrl: 'components/embed/embed.html',
                        controller: 'EmbedController'
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
                $injector.get('$state').go('404');
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
(function(){

    var attachEvent = document.attachEvent;
    var isIE = navigator.userAgent.match(/Trident/);
    var requestFrame = (function(){
        var raf = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame ||
            function(fn){ return window.setTimeout(fn, 20); };
        return function(fn){ return raf(fn); };
    })();

    var cancelFrame = (function(){
        var cancel = window.cancelAnimationFrame || window.mozCancelAnimationFrame || window.webkitCancelAnimationFrame ||
            window.clearTimeout;
        return function(id){ return cancel(id); };
    })();

    function resizeListener(e){
        var win = e.target || e.srcElement;
        if (win.__resizeRAF__) cancelFrame(win.__resizeRAF__);
        win.__resizeRAF__ = requestFrame(function(){
            var trigger = win.__resizeTrigger__;
            trigger.__resizeListeners__.forEach(function(fn){
                fn.call(trigger, e);
            });
        });
    }

    function objectLoad(e){
        this.contentDocument.defaultView.__resizeTrigger__ = this.__resizeElement__;
        this.contentDocument.defaultView.addEventListener('resize', resizeListener);
    }

    window.addResizeListener = function(element, fn){
        if (!element.__resizeListeners__) {
            element.__resizeListeners__ = [];
            if (attachEvent) {
                element.__resizeTrigger__ = element;
                element.attachEvent('onresize', resizeListener);
            }
            else {
                if (getComputedStyle(element).position == 'static') element.style.position = 'relative';
                var obj = element.__resizeTrigger__ = document.createElement('object');
                obj.setAttribute('style', 'display: block; position: absolute; top: 0; left: 0; height: 100%; width: 100%; overflow: hidden; pointer-events: none; z-index: -1;');
                obj.__resizeElement__ = element;
                obj.onload = objectLoad;
                obj.type = 'text/html';
                if (isIE) element.appendChild(obj);
                obj.data = 'about:blank';
                if (!isIE) element.appendChild(obj);
            }
        }
        element.__resizeListeners__.push(fn);
    };

    window.removeResizeListener = function(element, fn){
        element.__resizeListeners__.splice(element.__resizeListeners__.indexOf(fn), 1);
        if (!element.__resizeListeners__.length) {
            if (attachEvent) element.detachEvent('onresize', resizeListener);
            else {
                element.__resizeTrigger__.contentDocument.defaultView.removeEventListener('resize', resizeListener);
                element.__resizeTrigger__ = !element.removeChild(element.__resizeTrigger__);
            }
        }
    }
    
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

(function () {

    'use strict';

    function TreeEndpoint($resource, ENV) {
        return $resource(ENV.api + 'tree/:id', {
            id: '@id'
        }, {
            get: {
                method: 'GET'
            }
        });
    }
    TreeEndpoint.$inject = ["$resource", "ENV"];

    angular
        .module('grafiddle')
        .factory('TreeEndpoint', TreeEndpoint);

})();

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImNvbW1vbi9vbi1yZWFkLWZpbGUvb24tcmVhZC1maWxlLWRpcmVjdGl2ZS5qcyIsInRyZWUvdHJlZS1jb250cm9sbGVyLmpzIiwiZW1iZWQvZW1iZWQtY29udHJvbGxlci5qcyIsImVkaXRvci9lZGl0b3ItY29udHJvbGxlci5qcyIsImNvbW1vbi9zdGF0ZXMuY29uZmlnLmpzIiwiY29tbW9uL29ucmVzaXplLmpzIiwiY29tbW9uL2FwcC1jb250cm9sbGVyLmpzIiwiY2hlY2twb2ludC9jaGVja3BvaW50LWVuZHBvaW50LmpzIiwidHJlZS90cmVlLWVuZHBvaW50LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLENBQUMsWUFBWTs7RUFFWDs7RUFFQTtLQUNHLE9BQU8sYUFBYTtNQUNuQjtNQUNBO01BQ0E7TUFDQTtNQUNBO01BQ0E7TUFDQTtNQUNBO01BQ0E7Ozs7QUFJTjtBQ2xCQSxDQUFDLFlBQVk7O0lBRVQ7Ozs7Ozs7Ozs7Ozs7OztJQWVBLFNBQVMsV0FBVyxRQUFRO1FBQ3hCLE9BQU87WUFDSCxVQUFVO1lBQ1YsT0FBTztZQUNQLE1BQU0sU0FBUyxPQUFPLFNBQVMsT0FBTztnQkFDbEMsSUFBSSxLQUFLLE9BQU8sTUFBTTs7Z0JBRXRCLFFBQVEsR0FBRyxVQUFVLFNBQVMsZUFBZTtvQkFDekMsSUFBSSxTQUFTLElBQUk7O29CQUVqQixPQUFPLFNBQVMsU0FBUyxhQUFhO3dCQUNsQyxNQUFNLE9BQU8sV0FBVzs0QkFDcEIsR0FBRyxPQUFPLENBQUMsYUFBYSxZQUFZLE9BQU87Ozs7b0JBSW5ELE9BQU8sV0FBVyxDQUFDLGNBQWMsY0FBYyxjQUFjLFFBQVEsTUFBTTs7Ozs7OztJQU0zRjtTQUNLLE9BQU87U0FDUCxVQUFVLGNBQWM7OztBQUdqQztBQzVDQSxDQUFDLFlBQVk7O0lBRVQsU0FBUyxlQUFlLFFBQVEsUUFBUSxvQkFBb0IsY0FBYzs7UUFFdEUsT0FBTyxhQUFhO1lBQ2hCLElBQUksT0FBTyxPQUFPOzs7UUFHdEI7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SSxNQUFNLGtCQUFrQjtZQUN6QyxJQUFJO1dBQ0w7WUFDQyxNQUFNO2dCQUNGLFFBQVE7O1lBRVosS0FBSztnQkFDRCxRQUFROzs7Ozs7SUFLcEI7U0FDSyxPQUFPO1NBQ1AsUUFBUSxzQkFBc0I7OztBQUd2QztBQ3RCQSxDQUFDLFlBQVk7O0lBRVQ7O0lBRUEsU0FBUyxhQUFhLFdBQVcsS0FBSztRQUNsQyxPQUFPLFVBQVUsSUFBSSxNQUFNLFlBQVk7WUFDbkMsSUFBSTtXQUNMO1lBQ0MsS0FBSztnQkFDRCxRQUFROzs7Ozs7SUFLcEI7U0FDSyxPQUFPO1NBQ1AsUUFBUSxnQkFBZ0I7OztBQUdqQyIsImZpbGUiOiJzY3JpcHRzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uICgpIHtcblxuICAndXNlIHN0cmljdCc7XG5cbiAgYW5ndWxhclxuICAgIC5tb2R1bGUoJ2dyYWZpZGRsZScsIFtcbiAgICAgICdncmFmaWRkbGUuY29uZmlnJyxcbiAgICAgICdncmFmaWRkbGUudGVtcGxhdGVzJyxcbiAgICAgICduZ1Jlc291cmNlJyxcbiAgICAgICduZ1Nhbml0aXplJyxcbiAgICAgICduZ0FuaW1hdGUnLFxuICAgICAgJ3VpLnJvdXRlcicsXG4gICAgICAndWkubGF5b3V0JyxcbiAgICAgICd1aS5hY2UnLFxuICAgICAgJ2FuZ3VsYXJDaGFydCdcbiAgICBdKTtcblxufSkoKTtcbiIsIihmdW5jdGlvbiAoKSB7XG5cbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICAvKipcbiAgICAgKiBAbmdkb2MgZGlyZWN0aXZlXG4gICAgICogQG5hbWUgZ3JhZmlkZGxlLmRpcmVjdGl2ZTpvblJlYWRGaWxlXG4gICAgICogQHJlcXVpcmVzICRwYXJzZVxuICAgICAqIEByZXF1aXJlcyAkbG9nXG4gICAgICogQHJlc3RyaWN0IEFcbiAgICAgKlxuICAgICAqIEBkZXNjcmlwdGlvblxuICAgICAqIFRoZSBgb25SZWFkRmlsZWAgZGlyZWN0aXZlIG9wZW5zIHVwIGEgRmlsZVJlYWRlciBkaWFsb2cgdG8gdXBsb2FkIGZpbGVzIGZyb20gdGhlIGxvY2FsIGZpbGVzeXN0ZW0uXG4gICAgICpcbiAgICAgKiBAZWxlbWVudCBBTllcbiAgICAgKiBAbmdJbmplY3RcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBvblJlYWRGaWxlKCRwYXJzZSkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzdHJpY3Q6ICdBJyxcbiAgICAgICAgICAgIHNjb3BlOiBmYWxzZSxcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xuICAgICAgICAgICAgICAgIHZhciBmbiA9ICRwYXJzZShhdHRycy5vblJlYWRGaWxlKTtcblxuICAgICAgICAgICAgICAgIGVsZW1lbnQub24oJ2NoYW5nZScsIGZ1bmN0aW9uKG9uQ2hhbmdlRXZlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgcmVhZGVyLm9ubG9hZCA9IGZ1bmN0aW9uKG9uTG9hZEV2ZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzY29wZS4kYXBwbHkoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm4oc2NvcGUsIHskZmlsZUNvbnRlbnQ6b25Mb2FkRXZlbnQudGFyZ2V0LnJlc3VsdH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgICAgcmVhZGVyLnJlYWRBc1RleHQoKG9uQ2hhbmdlRXZlbnQuc3JjRWxlbWVudCB8fCBvbkNoYW5nZUV2ZW50LnRhcmdldCkuZmlsZXNbMF0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIGFuZ3VsYXJcbiAgICAgICAgLm1vZHVsZSgnZ3JhZmlkZGxlJylcbiAgICAgICAgLmRpcmVjdGl2ZSgnb25SZWFkRmlsZScsIG9uUmVhZEZpbGUpO1xuXG59KSgpO1xuIiwiKGZ1bmN0aW9uICgpIHtcblxuICAgIGZ1bmN0aW9uIFRyZWVDb250cm9sbGVyKCRzY29wZSwgJHN0YXRlLCBDaGVja3BvaW50RW5kcG9pbnQsIFRyZWVFbmRwb2ludCkge1xuXG4gICAgICAgICRzY29wZS5jaGVja3BvaW50ID0ge1xuICAgICAgICAgICAgaWQ6ICRzdGF0ZS5wYXJhbXMuaWRcbiAgICAgICAgfTtcblxuICAgICAgICBDaGVja3BvaW50RW5kcG9pbnRcbiAgICAgICAgICAgIC5nZXQoe2lkOiAkc3RhdGUucGFyYW1zLmlkfSlcbiAgICAgICAgICAgIC4kcHJvbWlzZVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oY2hlY2twb2ludCkge1xuICAgICAgICAgICAgICAgICRzY29wZS5jaGVja3BvaW50ID0gY2hlY2twb2ludDtcbiAgICAgICAgICAgICAgICBUcmVlRW5kcG9pbnRcbiAgICAgICAgICAgICAgICAgICAgLmdldCh7aWQ6IGNoZWNrcG9pbnQudHJlZX0pXG4gICAgICAgICAgICAgICAgICAgIC4kcHJvbWlzZVxuICAgICAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbih0cmVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb252ZXJ0VHJlZSh0cmVlKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICBmdW5jdGlvbiBjb252ZXJ0VHJlZSh0cmVlKSB7XG4gICAgICAgICAgICAvLyBUT0RPXG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBjbGljayhkKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhkKTtcbiAgICAgICAgICAgICRzdGF0ZS5nbygnZWRpdG9yJywge2lkOiBkLmlkfSk7XG4gICAgICAgIH1cblxuXG4gICAgICAgIHZhciB0cmVlRGF0YSA9IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJUb3AgTGV2ZWxcIixcbiAgICAgICAgICAgICAgICBcImNoaWxkcmVuXCI6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiTGV2ZWwgMjogQVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJhdXRob3JcIjogXCJQZXRlclwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJpZFwiOiAxMjM0LFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJjaGlsZHJlblwiOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJTb24gb2YgQVwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIkRhdWdodGVyIG9mIEFcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJpZFwiOiAxMjNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIkxldmVsIDI6IEJcIlxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJMZXZlbCAyOiBCXCJcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiTGV2ZWwgMjogQlwiXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIkxldmVsIDI6IEJcIlxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJMZXZlbCAyOiBCXCJcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgIH1cbiAgICAgICAgXTtcblxuICAgICAgICAvLyAqKioqKioqKioqKioqKiBHZW5lcmF0ZSB0aGUgdHJlZSBkaWFncmFtXHQgKioqKioqKioqKioqKioqKipcbiAgICAgICAgdmFyIG1hcmdpbiA9IHt0b3A6IDQwLCByaWdodDogMCwgYm90dG9tOiAyMCwgbGVmdDogMH0sXG4gICAgICAgICAgICB3aWR0aCA9IDkwMCAtIG1hcmdpbi5yaWdodCAtIG1hcmdpbi5sZWZ0LFxuICAgICAgICAgICAgaGVpZ2h0ID0gNzAwIC0gbWFyZ2luLnRvcCAtIG1hcmdpbi5ib3R0b207XG5cbiAgICAgICAgdmFyIGkgPSAwO1xuXG4gICAgICAgIHZhciB0cmVlID0gZDMubGF5b3V0LnRyZWUoKVxuICAgICAgICAgICAgLnNpemUoW2hlaWdodCwgd2lkdGhdKTtcblxuICAgICAgICB2YXIgZGlhZ29uYWwgPSBkMy5zdmcuZGlhZ29uYWwoKVxuICAgICAgICAgICAgLnByb2plY3Rpb24oZnVuY3Rpb24oZCkgeyByZXR1cm4gW2QueCwgZC55XTsgfSk7XG5cbiAgICAgICAgdmFyIHN2ZyA9IGQzLnNlbGVjdChcIiN0cmVlXCIpLmFwcGVuZChcInN2Z1wiKVxuICAgICAgICAgICAgLmF0dHIoXCJ3aWR0aFwiLCB3aWR0aCArIG1hcmdpbi5yaWdodCArIG1hcmdpbi5sZWZ0KVxuICAgICAgICAgICAgLmF0dHIoXCJoZWlnaHRcIiwgaGVpZ2h0ICsgbWFyZ2luLnRvcCArIG1hcmdpbi5ib3R0b20pXG4gICAgICAgICAgICAuYXBwZW5kKFwiZ1wiKVxuICAgICAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoXCIgKyBtYXJnaW4ubGVmdCArIFwiLFwiICsgbWFyZ2luLnRvcCArIFwiKVwiKTtcblxuICAgICAgICByb290ID0gdHJlZURhdGFbMF07XG5cbiAgICAgICAgdXBkYXRlKHJvb3QpO1xuXG4gICAgICAgIGZ1bmN0aW9uIHVwZGF0ZShzb3VyY2UpIHtcblxuICAgICAgICAgICAgLy8gQ29tcHV0ZSB0aGUgbmV3IHRyZWUgbGF5b3V0LlxuICAgICAgICAgICAgdmFyIG5vZGVzID0gdHJlZS5ub2Rlcyhyb290KS5yZXZlcnNlKCksXG4gICAgICAgICAgICAgICAgbGlua3MgPSB0cmVlLmxpbmtzKG5vZGVzKTtcblxuICAgICAgICAgICAgLy8gTm9ybWFsaXplIGZvciBmaXhlZC1kZXB0aC5cbiAgICAgICAgICAgIG5vZGVzLmZvckVhY2goZnVuY3Rpb24oZCkgeyBkLnkgPSBkLmRlcHRoICogMTAwOyB9KTtcblxuICAgICAgICAgICAgLy8gRGVjbGFyZSB0aGUgbm9kZXPigKZcbiAgICAgICAgICAgIHZhciBub2RlID0gc3ZnLnNlbGVjdEFsbChcImcubm9kZVwiKVxuICAgICAgICAgICAgICAgIC5kYXRhKG5vZGVzLCBmdW5jdGlvbihkKSB7IHJldHVybiBkLmlkIHx8IChkLmlkID0gKytpKTsgfSk7XG5cbiAgICAgICAgICAgIC8vIEVudGVyIHRoZSBub2Rlcy5cbiAgICAgICAgICAgIHZhciBub2RlRW50ZXIgPSBub2RlLmVudGVyKCkuYXBwZW5kKFwiZ1wiKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJub2RlXCIpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJ0cmFuc2xhdGUoXCIgKyBkLnggKyBcIixcIiArIGQueSArIFwiKVwiOyB9KVxuICAgICAgICAgICAgICAgIC5vbihcImNsaWNrXCIsIGNsaWNrKTs7XG5cbiAgICAgICAgICAgIG5vZGVFbnRlci5hcHBlbmQoXCJjaXJjbGVcIilcbiAgICAgICAgICAgICAgICAuYXR0cihcInJcIiwgMTApXG4gICAgICAgICAgICAgICAgLnN0eWxlKFwiZmlsbFwiLCBcIiNmZmZcIik7XG5cbiAgICAgICAgICAgIG5vZGVFbnRlci5hcHBlbmQoXCJ0ZXh0XCIpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJ5XCIsIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGQuY2hpbGRyZW4gfHwgZC5fY2hpbGRyZW4gPyAtMTggOiAxODsgfSlcbiAgICAgICAgICAgICAgICAuYXR0cihcImR5XCIsIFwiLjM1ZW1cIilcbiAgICAgICAgICAgICAgICAuYXR0cihcInRleHQtYW5jaG9yXCIsIFwibWlkZGxlXCIpXG4gICAgICAgICAgICAgICAgLnRleHQoZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgdGV4dCA9IGQubmFtZTtcbiAgICAgICAgICAgICAgICAgICAgLy8gKyAnIGJ5ICcgKyBkLmF1dGhvcjtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGQuaWQgPT0gJHNjb3BlLmNoZWNrcG9pbnQuaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRleHQgKz0gJyAoY3VycmVudCknO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0ZXh0O1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLnN0eWxlKFwiZmlsbC1vcGFjaXR5XCIsIDEpO1xuXG4gICAgICAgICAgICAvLyBEZWNsYXJlIHRoZSBsaW5rc+KAplxuICAgICAgICAgICAgdmFyIGxpbmsgPSBzdmcuc2VsZWN0QWxsKFwicGF0aC5saW5rXCIpXG4gICAgICAgICAgICAgICAgLmRhdGEobGlua3MsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQudGFyZ2V0LmlkOyB9KTtcblxuICAgICAgICAgICAgLy8gRW50ZXIgdGhlIGxpbmtzLlxuICAgICAgICAgICAgbGluay5lbnRlcigpLmluc2VydChcInBhdGhcIiwgXCJnXCIpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcImxpbmtcIilcbiAgICAgICAgICAgICAgICAuYXR0cihcImRcIiwgZGlhZ29uYWwpO1xuXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBhbmd1bGFyXG4gICAgICAgIC5tb2R1bGUoJ2dyYWZpZGRsZScpXG4gICAgICAgIC5jb250cm9sbGVyKCdUcmVlQ29udHJvbGxlcicsIFRyZWVDb250cm9sbGVyKTtcblxufSkoKTsiLCIoZnVuY3Rpb24gKCkge1xuXG4gICAgZnVuY3Rpb24gRW1iZWRDb250cm9sbGVyKCRzY29wZSwgJGZpbHRlciwgJGxvY2F0aW9uKSB7XG5cbiAgICAgICAgJHNjb3BlLmZpZGRsZWlkID0gJGxvY2F0aW9uLnBhdGgoKS5zdWJzdHIoMSkuc3BsaXQoJz8nLCAxKVswXTtcblxuICAgICAgICAkc2NvcGUuZW1iZWRWaWV3ID0gJ2NoYXJ0JztcbiAgICAgICAgdmFyIHJlcXVlc3RWaWV3ID0gJGxvY2F0aW9uLnNlYXJjaCgpLnZpZXc7XG4gICAgICAgIGlmKHJlcXVlc3RWaWV3KSB7XG4gICAgICAgICAgICAkc2NvcGUuZW1iZWRWaWV3ID0gcmVxdWVzdFZpZXc7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgICRzY29wZS5zZXRWaWV3ID0gZnVuY3Rpb24obmV3Vmlldykge1xuICAgICAgICAgICAgJHNjb3BlLmVtYmVkVmlldyA9IG5ld1ZpZXc7XG4gICAgICAgICAgICAkc2NvcGUub3B0aW9uc0VkaXRvci5yZXNpemUoKTtcbiAgICAgICAgICAgICRzY29wZS5kYXRhRWRpdG9yLnJlc2l6ZSgpO1xuICAgICAgICAgICAgJHNjb3BlLm9wdGlvbnNFZGl0b3IucmVuZGVyZXIudXBkYXRlRnVsbCgpO1xuICAgICAgICAgICAgJHNjb3BlLmRhdGFFZGl0b3IucmVuZGVyZXIudXBkYXRlRnVsbCgpO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5pc1ZpZXcgPSBmdW5jdGlvbih2aWV3KSB7XG4gICAgICAgICAgICByZXR1cm4gdmlldyA9PSAkc2NvcGUuZW1iZWRWaWV3O1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5kYXRhc2V0U3RyaW5nID0gJyc7XG4gICAgICAgICRzY29wZS5kYXRhc2V0ID0gW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICdkYXknOiAnMjAxMy0wMS0wMl8wMDowMDowMCcsXG4gICAgICAgICAgICAgICAgJ3NhbGVzJzogMzQ2MS4yOTUyMDIsXG4gICAgICAgICAgICAgICAgJ2luY29tZSc6IDEyMzY1LjA1M1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAnZGF5JzogJzIwMTMtMDEtMDNfMDA6MDA6MDAnLFxuICAgICAgICAgICAgICAgICdzYWxlcyc6IDQ0NjEuMjk1MjAyLFxuICAgICAgICAgICAgICAgICdpbmNvbWUnOiAxMzM2NS4wNTNcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgJ2RheSc6ICcyMDEzLTAxLTA0XzAwOjAwOjAwJyxcbiAgICAgICAgICAgICAgICAnc2FsZXMnOiA0NTYxLjI5NTIwMixcbiAgICAgICAgICAgICAgICAnaW5jb21lJzogMTQzNjUuMDUzXG4gICAgICAgICAgICB9XG4gICAgICAgIF07XG5cbiAgICAgICAgJHNjb3BlLnNjaGVtYSA9IHtcbiAgICAgICAgICAgIGRheToge1xuICAgICAgICAgICAgICAgIHR5cGU6ICdkYXRldGltZScsXG4gICAgICAgICAgICAgICAgZm9ybWF0OiAnJVktJW0tJWRfJUg6JU06JVMnLFxuICAgICAgICAgICAgICAgIG5hbWU6ICdEYXRlJ1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5vcHRpb25zU3RyaW5nID0gJyc7XG4gICAgICAgICRzY29wZS5vcHRpb25zID0ge1xuICAgICAgICAgICAgcm93czogW3tcbiAgICAgICAgICAgICAgICBrZXk6ICdpbmNvbWUnLFxuICAgICAgICAgICAgICAgIHR5cGU6ICdiYXInXG4gICAgICAgICAgICB9LCB7XG4gICAgICAgICAgICAgICAga2V5OiAnc2FsZXMnXG4gICAgICAgICAgICB9XSxcbiAgICAgICAgICAgIHhBeGlzOiB7XG4gICAgICAgICAgICAgICAga2V5OiAnZGF5JyxcbiAgICAgICAgICAgICAgICBkaXNwbGF5Rm9ybWF0OiAnJVktJW0tJWQgJUg6JU06JVMnXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gZGVmaW5lIGNvZGUgaGlnaGxpZ2h0aW5nXG4gICAgICAgICRzY29wZS5vcHRpb25zQWNlQ29uZmlnID0ge1xuICAgICAgICAgICAgbW9kZTogJ2pzb24nLFxuICAgICAgICAgICAgdXNlV3JhcE1vZGU6IGZhbHNlLFxuICAgICAgICAgICAgb25Mb2FkOiBmdW5jdGlvbihfZWRpdG9yKSB7XG4gICAgICAgICAgICAgICAgX2VkaXRvci5zZXRTaG93UHJpbnRNYXJnaW4oZmFsc2UpO1xuICAgICAgICAgICAgICAgICRzY29wZS5vcHRpb25zRWRpdG9yID0gX2VkaXRvcjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuZGF0YXNldEFjZUNvbmZpZyA9IHtcbiAgICAgICAgICAgIG1vZGU6ICdqc29uJyxcbiAgICAgICAgICAgIHVzZVdyYXBNb2RlOiBmYWxzZSxcbiAgICAgICAgICAgIG9uTG9hZDogZnVuY3Rpb24oX2VkaXRvcikge1xuICAgICAgICAgICAgICAgIF9lZGl0b3Iuc2V0U2hvd1ByaW50TWFyZ2luKGZhbHNlKTtcbiAgICAgICAgICAgICAgICAkc2NvcGUuZGF0YUVkaXRvciA9IF9lZGl0b3I7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cblxuICAgICAgICAkc2NvcGUuJHdhdGNoKCdvcHRpb25zJywgZnVuY3Rpb24oanNvbikge1xuICAgICAgICAgICAgJHNjb3BlLm9wdGlvbnNTdHJpbmcgPSAkZmlsdGVyKCdqc29uJykoanNvbik7XG4gICAgICAgIH0sIHRydWUpO1xuXG4gICAgICAgICRzY29wZS4kd2F0Y2goJ29wdGlvbnNTdHJpbmcnLCBmdW5jdGlvbihqc29uKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICRzY29wZS5vcHRpb25zID0gSlNPTi5wYXJzZShqc29uKTtcbiAgICAgICAgICAgICAgICAkc2NvcGUud2VsbEZvcm1lZE9wdGlvbnMgPSB0cnVlO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICRzY29wZS53ZWxsRm9ybWVkT3B0aW9ucyA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCB0cnVlKTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoKCdkYXRhc2V0JywgZnVuY3Rpb24oanNvbikge1xuICAgICAgICAgICAgJHNjb3BlLmRhdGFzZXRTdHJpbmcgPSAkZmlsdGVyKCdqc29uJykoanNvbik7XG4gICAgICAgIH0sIHRydWUpO1xuXG4gICAgICAgICRzY29wZS4kd2F0Y2goJ2RhdGFzZXRTdHJpbmcnLCBmdW5jdGlvbihqc29uKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICRzY29wZS5kYXRhc2V0ID0gSlNPTi5wYXJzZShqc29uKTtcbiAgICAgICAgICAgICAgICAkc2NvcGUud2VsbEZvcm1lZERhdGFzZXQgPSB0cnVlO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICRzY29wZS53ZWxsRm9ybWVkRGF0YXNldCA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCB0cnVlKTtcblxuICAgIH1cblxuICAgIGFuZ3VsYXJcbiAgICAgICAgLm1vZHVsZSgnZ3JhZmlkZGxlJylcbiAgICAgICAgLmNvbnRyb2xsZXIoJ0VtYmVkQ29udHJvbGxlcicsIEVtYmVkQ29udHJvbGxlcik7XG5cbn0pKCk7XG4iLCIoZnVuY3Rpb24gKCkge1xuXG4gICAgZnVuY3Rpb24gRWRpdG9yQ29udHJvbGxlcigkc2NvcGUsICRmaWx0ZXIsICRzdGF0ZSwgJHdpbmRvdywgJHRpbWVvdXQsIENoZWNrcG9pbnRFbmRwb2ludCkge1xuXG4gICAgICAgICRzY29wZS5zaG93RGF0YUVkaXRvciA9IGZhbHNlO1xuICAgICAgICAkc2NvcGUuc2hvd09wdGlvbnNVSSAgPSBmYWxzZTtcbiAgICAgICAgJHNjb3BlLnNob3dTaGFyZVBvcHVwID0gZmFsc2U7XG4gICAgICAgICRzY29wZS5zd2l0Y2hEYXRhQnV0dG9uVGl0bGUgICAgPSAnTWFudWFsIGRhdGEgZW50cnknO1xuICAgICAgICAkc2NvcGUuc3dpdGNoT3B0aW9uc0J1dHRvblRpdGxlID0gJ0VkaXQgaW4gR1VJJztcbiAgICAgICAgJHNjb3BlLnRvZ2dsZURhdGFFZGl0b3IgPSB0b2dnbGVEYXRhRWRpdG9yO1xuICAgICAgICAkc2NvcGUudG9nZ2xlT3B0aW9uc1VJICA9IHRvZ2dsZU9wdGlvbnNVSTtcbiAgICAgICAgJHNjb3BlLnNoYXJlUG9wdXAgICAgICAgPSBzaGFyZVBvcHVwO1xuICAgICAgICAkc2NvcGUub25TaGFyZVRleHRDbGljayA9IG9uU2hhcmVUZXh0Q2xpY2s7XG5cbiAgICAgICAgJHNjb3BlLnNoYXJlID0gc2hhcmU7XG4gICAgICAgICRzY29wZS5zYXZlID0gc2F2ZTtcbiAgICAgICAgJHNjb3BlLnVwbG9hZEZpbGUgPSB1cGxvYWRGaWxlO1xuXG4gICAgICAgICRzY29wZS5jaGVja3BvaW50ID0ge307XG4gICAgICAgICRzY29wZS5hY2VKc29uQ29uZmlnID0ge1xuICAgICAgICAgICAgbW9kZTogJ2pzb24nLFxuICAgICAgICAgICAgdXNlV3JhcE1vZGU6IGZhbHNlLFxuICAgICAgICAgICAgb25Mb2FkOiBmdW5jdGlvbiAoX2VkaXRvcikge1xuICAgICAgICAgICAgICAgIF9lZGl0b3Iuc2V0U2hvd1ByaW50TWFyZ2luKGZhbHNlKTtcbiAgICAgICAgICAgICAgICBfZWRpdG9yLiRibG9ja1Njcm9sbGluZyA9IEluZmluaXR5O1xuICAgICAgICAgICAgICAgICRzY29wZS5lZGl0b3JzID0gX2VkaXRvcjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBhY3RpdmF0ZSgpO1xuXG4gICAgICAgIC8vLy8vLy8vLy8vL1xuXG4gICAgICAgIGZ1bmN0aW9uIGFjdGl2YXRlKCkge1xuXG4gICAgICAgICAgICBpZiAoJHN0YXRlLnBhcmFtcy5pZCkge1xuICAgICAgICAgICAgICAgIENoZWNrcG9pbnRFbmRwb2ludFxuICAgICAgICAgICAgICAgICAgICAuZ2V0KHtpZDogJHN0YXRlLnBhcmFtcy5pZH0pXG4gICAgICAgICAgICAgICAgICAgIC4kcHJvbWlzZVxuICAgICAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbihjaGVja3BvaW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuc2VydmVyQ2hlY2twb2ludCA9IGNoZWNrcG9pbnQ7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZXRDaGVja3BvaW50KGNoZWNrcG9pbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgJHRpbWVvdXQoc2F2ZUFzSW1hZ2UsIDApO1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAuY2F0Y2goZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnZWRpdG9yJywge2lkOiAnJ30pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbG9hZERlZmF1bHREYXRhKCk7XG4gICAgICAgICAgICAgICAgJHRpbWVvdXQoc2F2ZUFzSW1hZ2UsIDApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3luY09wdGlvbnMoKTtcbiAgICAgICAgICAgIHN5bmNEYXRhc2V0KCk7XG4gICAgICAgICAgICB1cGRhdGVPblJlc2l6ZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gc2F2ZUFzSW1hZ2UoKSB7XG4gICAgICAgICAgICBjYW52Zyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2FudmFzJyksIGQzLnNlbGVjdChcIi5hbmd1bGFyY2hhcnRcIikubm9kZSgpLmlubmVySFRNTCk7XG4gICAgICAgICAgICAkc2NvcGUuYXNJbWFnZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjYW52YXMnKS50b0RhdGFVUkwoKTtcbiAgICAgICAgICAgICRzY29wZS5tZXRhZGF0YS5vZ1snb2c6aW1hZ2UnXSA9ICRzY29wZS5hc0ltYWdlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2F2ZSB0aGUgY3VycmVudCBWZXJzaW9uXG4gICAgICAgIC8vXG4gICAgICAgIGZ1bmN0aW9uIHNhdmUoKSB7XG4gICAgICAgICAgICBDaGVja3BvaW50RW5kcG9pbnQuc2F2ZSh7XG4gICAgICAgICAgICAgICAgXCJkYXRhXCI6ICRzY29wZS5jaGVja3BvaW50LmRhdGFzZXQsXG4gICAgICAgICAgICAgICAgXCJvcHRpb25zXCI6ICRzY29wZS5jaGVja3BvaW50Lm9wdGlvbnMsXG4gICAgICAgICAgICAgICAgXCJhdXRob3JcIjogXCJBbm9ueW1cIlxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAuJHByb21pc2VcbiAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbiAoY2hlY2twb2ludCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnc2F2ZWQgY2hlY2twb2ludDogJywgY2hlY2twb2ludCk7XG4gICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnZWRpdG9yJywge2lkOiBjaGVja3BvaW50LmlkfSk7XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAuY2F0Y2goZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignc2F2ZSBmYWlsZWQnLCBlKTtcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2hhcmUgdGhlIGZpZGRsZVxuICAgICAgICAvL1xuICAgICAgICBmdW5jdGlvbiBzaGFyZSh0YXJnZXQpIHtcbiAgICAgICAgICAgIGZpZGRsZVVSTCAgICAgICA9ICdodHRwOi8vZ3JhZmlkZGxlLmFwcHNwb3QuY29tLycgKyAkc3RhdGUucGFyYW1zLmlkO1xuICAgICAgICAgICAgaWYodGFyZ2V0ID09ICdGQicpIHtcbiAgICAgICAgICAgICAgICAkd2luZG93Lm9wZW4oJ2h0dHBzOi8vd3d3LmZhY2Vib29rLmNvbS9zaGFyZXIvc2hhcmVyLnBocD91PScgKyBmaWRkbGVVUkwsICdfYmxhbmsnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmKHRhcmdldCA9PSAnVHdpdHRlcicpIHtcbiAgICAgICAgICAgICAgICAkd2luZG93Lm9wZW4oJ2h0dHBzOi8vdHdpdHRlci5jb20vaW50ZW50L3R3ZWV0P3RleHQ9Q2hlY2slMjBvdXQlMjB0aGlzJTIwc3dlZXQlMjBncmFmaWRkbGUlMjAmdXJsPScgKyBmaWRkbGVVUkwsICdfYmxhbmsnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmKHRhcmdldCA9PSAnRS1NYWlsJykge1xuICAgICAgICAgICAgICAgICR3aW5kb3cubG9jYXRpb24gPSAnbWFpbHRvOmFAYi5jZD9zdWJqZWN0PUNoZWNrJTIwb3V0JTIwdGhpcyUyMGF3ZXNvbWUlMjBHcmFmaWRkbGUmYm9keT0nICsgZmlkZGxlVVJMO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBsb2FkIGEgZmlsZSBhcyBkYXRhIHNvdXJjZVxuICAgICAgICAvL1xuICAgICAgICBmdW5jdGlvbiB1cGxvYWRGaWxlKGZpbGUpIHtcbiAgICAgICAgICAgICRzY29wZS5jaGVja3BvaW50LmRhdGFzZXRTdHJpbmcgPSBmaWxlO1xuICAgICAgICAgICAgJHNjb3BlLnRvZ2dsZURhdGFFZGl0b3IoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRvZ2dsZSBmcm9tIGRhdGEgdmlld1xuICAgICAgICAvL1xuICAgICAgICBmdW5jdGlvbiB0b2dnbGVEYXRhRWRpdG9yKCkge1xuICAgICAgICAgICAgJHNjb3BlLnNob3dEYXRhRWRpdG9yID0gISRzY29wZS5zaG93RGF0YUVkaXRvcjtcbiAgICAgICAgICAgICRzY29wZS5zd2l0Y2hEYXRhQnV0dG9uVGl0bGUgPSAkc2NvcGUuc2hvd0RhdGFFZGl0b3IgPyAnQmFjayB0byBpbnB1dCBkaWFsb2cnIDogJ01hbnVhbCBkYXRhIGVudHJ5JztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRvZ2dsZSBmcm9tIGpzb24tb3B0aW9uIHZpZXdcbiAgICAgICAgLy9cbiAgICAgICAgZnVuY3Rpb24gdG9nZ2xlT3B0aW9uc1VJKCkge1xuICAgICAgICAgICAgJHNjb3BlLnNob3dPcHRpb25zVUkgPSAhJHNjb3BlLnNob3dPcHRpb25zVUk7XG4gICAgICAgICAgICAkc2NvcGUuc3dpdGNoT3B0aW9uc0J1dHRvblRpdGxlID0gJHNjb3BlLnNob3dPcHRpb25zVUkgPyAnRWRpdCBhcyBKU09OJyA6ICdFZGl0IGluIEdVSSc7XG4gICAgICAgICAgICAkc2NvcGUuZWRpdG9ycy5yZXNpemUoKTtcbiAgICAgICAgICAgICRzY29wZS5lZGl0b3JzLnJlbmRlcmVyLnVwZGF0ZUZ1bGwoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENyZWF0ZSB0aGUgSFRNTCBVSSByZXByZXNlbnRhdGlvbiBvZiB0aGUgb3B0aW9ucyBqc29uXG4gICAgICAgIC8vXG4gICAgICAgIGZ1bmN0aW9uIHVwZGF0ZU9wdGlvbnNVSShqc29uKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcInVwZGF0ZSBvcHRpb25zIHVpXCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2hvdyB0aGUgc2hhcmUgc2hlZXRcbiAgICAgICAgLy9cbiAgICAgICAgZnVuY3Rpb24gc2hhcmVQb3B1cCgpIHtcbiAgICAgICAgICAgICRzY29wZS5zaG93U2hhcmVQb3B1cCA9ICEkc2NvcGUuc2hvd1NoYXJlUG9wdXA7XG4gICAgICAgICAgICAkc2NvcGUuZmlkZGxlVVJMICAgICAgID0gJ2h0dHA6Ly9ncmFmaWRkbGUuYXBwc3BvdC5jb20vJyArICRzdGF0ZS5wYXJhbXMuaWQ7XG4gICAgICAgICAgICAkc2NvcGUuZmlkZGxlQ2hhcnRVUkwgID0gJ2h0dHA6Ly9ncmFmaWRkbGUuYXBwc3BvdC5jb20vJyArICRzdGF0ZS5wYXJhbXMuaWQgKyAnLnBuZyc7XG4gICAgICAgICAgICAkc2NvcGUuZmlkZGxlRW1iZWRDb2RlID0gJzxpZnJhbWUgd2lkdGg9XCIxMDAlXCIgaGVpZ2h0PVwiMzAwXCIgc3JjPVwiLy9ncmFmaWRkbGUuYXBwc3BvdC5jb20vZW1iZWQvJyArICRzdGF0ZS5wYXJhbXMuaWQgKyAnXCIgYWxsb3dmdWxsc2NyZWVuPVwiYWxsb3dmdWxsc2NyZWVuXCIgZnJhbWVib3JkZXI9XCIwXCI+PC9pZnJhbWU+JztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFsbG93IHNoYXJlIHRleHQgZmllbGRzIHRvIGF1dG9zZWxlY3Qgb24gZm9jdXNcbiAgICAgICAgLy9cbiAgICAgICAgZnVuY3Rpb24gb25TaGFyZVRleHRDbGljaygkZXZlbnQpIHtcbiAgICAgICAgICAgICRldmVudC50YXJnZXQuc2VsZWN0KCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gSW5zZXJ0IGRlZmF1bHQgZGF0YVxuICAgICAgICAvL1xuICAgICAgICBmdW5jdGlvbiBsb2FkRGVmYXVsdERhdGEoKSB7XG4gICAgICAgICAgICB2YXIgZGF0YXNldCA9IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICdkYXknOiAnMjAxMy0wMS0wMl8wMDowMDowMCcsXG4gICAgICAgICAgICAgICAgICAgICdzYWxlcyc6IDM0NjEuMjk1MjAyLFxuICAgICAgICAgICAgICAgICAgICAnaW5jb21lJzogMTIzNjUuMDUzXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICdkYXknOiAnMjAxMy0wMS0wM18wMDowMDowMCcsXG4gICAgICAgICAgICAgICAgICAgICdzYWxlcyc6IDQ0NjEuMjk1MjAyLFxuICAgICAgICAgICAgICAgICAgICAnaW5jb21lJzogMTMzNjUuMDUzXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICdkYXknOiAnMjAxMy0wMS0wNF8wMDowMDowMCcsXG4gICAgICAgICAgICAgICAgICAgICdzYWxlcyc6IDQ1NjEuMjk1MjAyLFxuICAgICAgICAgICAgICAgICAgICAnaW5jb21lJzogMTQzNjUuMDUzXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXTtcbiAgICAgICAgICAgIHZhciBzY2hlbWEgPSB7XG4gICAgICAgICAgICAgICAgZGF5OiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkYXRldGltZScsXG4gICAgICAgICAgICAgICAgICAgIGZvcm1hdDogJyVZLSVtLSVkXyVIOiVNOiVTJyxcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogJ0RhdGUnXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHZhciBvcHRpb25zID0ge1xuICAgICAgICAgICAgICAgIHJvd3M6IFt7XG4gICAgICAgICAgICAgICAgICAgIGtleTogJ2luY29tZScsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdiYXInXG4gICAgICAgICAgICAgICAgfSwge1xuICAgICAgICAgICAgICAgICAgICBrZXk6ICdzYWxlcydcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgICAgICAgICB4QXhpczoge1xuICAgICAgICAgICAgICAgICAgICBrZXk6ICdkYXknLFxuICAgICAgICAgICAgICAgICAgICBkaXNwbGF5Rm9ybWF0OiAnJVktJW0tJWQgJUg6JU06JVMnXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgJHNjb3BlLmNoZWNrcG9pbnQuZGF0YXNldFN0cmluZyA9ICcnO1xuICAgICAgICAgICAgJHNjb3BlLmNoZWNrcG9pbnQuZGF0YXNldCA9IGRhdGFzZXQ7XG4gICAgICAgICAgICAkc2NvcGUuY2hlY2twb2ludC5zY2hlbWFTdHJpbmcgPSAnJztcbiAgICAgICAgICAgICRzY29wZS5jaGVja3BvaW50LnNjaGVtYSA9IHNjaGVtYTtcbiAgICAgICAgICAgICRzY29wZS5jaGVja3BvaW50Lm9wdGlvbnNTdHJpbmcgPSAnJztcbiAgICAgICAgICAgICRzY29wZS5jaGVja3BvaW50Lm9wdGlvbnMgPSBvcHRpb25zO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gc2V0Q2hlY2twb2ludChjaGVja3BvaW50KSB7XG4gICAgICAgICAgICAkc2NvcGUuY2hlY2twb2ludC5kYXRhc2V0U3RyaW5nID0gJyc7XG4gICAgICAgICAgICAkc2NvcGUuY2hlY2twb2ludC5kYXRhc2V0ID0gY2hlY2twb2ludC5kYXRhO1xuICAgICAgICAgICAgJHNjb3BlLmNoZWNrcG9pbnQuc2NoZW1hU3RyaW5nID0gJyc7XG4gICAgICAgICAgICAkc2NvcGUuY2hlY2twb2ludC5zY2hlbWEgPSB7fTtcbiAgICAgICAgICAgICRzY29wZS5jaGVja3BvaW50Lm9wdGlvbnNTdHJpbmcgPSAnJztcbiAgICAgICAgICAgICRzY29wZS5jaGVja3BvaW50Lm9wdGlvbnMgPSBjaGVja3BvaW50Lm9wdGlvbnM7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTeW5jIE9iamVjdCBhbmQgU3RyaW5nIHJlcHJlc2VudGF0aW9uXG4gICAgICAgIC8vXG4gICAgICAgIGZ1bmN0aW9uIHN5bmNPcHRpb25zKCkge1xuICAgICAgICAgICAgJHNjb3BlLiR3YXRjaCgnY2hlY2twb2ludC5vcHRpb25zJywgZnVuY3Rpb24gKGpzb24pIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUuY2hlY2twb2ludC5vcHRpb25zU3RyaW5nID0gJGZpbHRlcignanNvbicpKGpzb24pO1xuICAgICAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgICAgICRzY29wZS4kd2F0Y2goJ2NoZWNrcG9pbnQub3B0aW9uc1N0cmluZycsIGZ1bmN0aW9uIChqc29uKSB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmNoZWNrcG9pbnQub3B0aW9ucyA9IEpTT04ucGFyc2UoanNvbik7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS53ZWxsRm9ybWVkT3B0aW9ucyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIHVwZGF0ZU9wdGlvbnNVSShqc29uKTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS53ZWxsRm9ybWVkT3B0aW9ucyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIHRydWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU3luYyBPYmplY3QgYW5kIFN0cmluZyByZXByZXNlbnRhdGlvblxuICAgICAgICAvL1xuICAgICAgICBmdW5jdGlvbiBzeW5jRGF0YXNldCgpIHtcbiAgICAgICAgICAgICRzY29wZS4kd2F0Y2goJ2NoZWNrcG9pbnQuZGF0YXNldCcsIGZ1bmN0aW9uIChqc29uKSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmNoZWNrcG9pbnQuZGF0YXNldFN0cmluZyA9ICRmaWx0ZXIoJ2pzb24nKShqc29uKTtcbiAgICAgICAgICAgIH0sIHRydWUpO1xuXG4gICAgICAgICAgICAkc2NvcGUuJHdhdGNoKCdjaGVja3BvaW50LmRhdGFzZXRTdHJpbmcnLCBmdW5jdGlvbiAoanNvbikge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5jaGVja3BvaW50LmRhdGFzZXQgPSBKU09OLnBhcnNlKGpzb24pO1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUud2VsbEZvcm1lZERhdGFzZXQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLndlbGxGb3JtZWREYXRhc2V0ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgdHJ1ZSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBZGQgdGltZXN0YW1wIHRvIG9wdGlvbnMgdG8gcmVkcmF3XG4gICAgICAgIC8vXG4gICAgICAgIGZ1bmN0aW9uIG9wZGF0ZU9wdGlvbnMoKSB7XG4gICAgICAgICAgICAvLyBJcyBjYWxsZWQgdG8gb2Z0ZW4sIG5vdCBvbmx5IG9uIHJlc2l6ZVxuICAgICAgICAgICAgLy8kc2NvcGUuY2hlY2twb2ludC5vcHRpb25zLnVwZGF0ZWQgPSBuZXcgRGF0ZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVHJpZ2dlciBuZXcgcmVuZGVyIG9uIHJlc2l6ZVxuICAgICAgICAvL1xuICAgICAgICBmdW5jdGlvbiB1cGRhdGVPblJlc2l6ZSgpIHtcbiAgICAgICAgICAgIHZhciBteUVsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2hhcnRBcmVhJyk7XG4gICAgICAgICAgICBhZGRSZXNpemVMaXN0ZW5lcihteUVsZW1lbnQsIG9wZGF0ZU9wdGlvbnMpO1xuXG4gICAgICAgICAgICAkc2NvcGUuJG9uKFwiJGRlc3Ryb3lcIiwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJlbW92ZVJlc2l6ZUxpc3RlbmVyKG15RWxlbWVudCwgb3BkYXRlT3B0aW9ucyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgfVxuXG4gICAgYW5ndWxhclxuICAgICAgICAubW9kdWxlKCdncmFmaWRkbGUnKVxuICAgICAgICAuY29udHJvbGxlcignRWRpdG9yQ29udHJvbGxlcicsIEVkaXRvckNvbnRyb2xsZXIpO1xuXG59KSgpO1xuIiwiKGZ1bmN0aW9uICgpIHtcblxuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGZ1bmN0aW9uIHN0YXRlc0NvbmZpZ3VyYXRpb24oJHN0YXRlUHJvdmlkZXIsICR1cmxSb3V0ZXJQcm92aWRlciwgJGxvY2F0aW9uUHJvdmlkZXIpIHtcblxuICAgICAgICAkc3RhdGVQcm92aWRlclxuICAgICAgICAgICAgLnN0YXRlKCc0MDQnLCB7XG4gICAgICAgICAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAgICAgICAgICAgY29udGVudDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdjb21wb25lbnRzL2NvbW1vbi80MDQvNDA0Lmh0bWwnXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLnN0YXRlKCdlbWJlZCcsIHtcbiAgICAgICAgICAgICAgICB1cmw6ICcvZW1iZWQnLFxuICAgICAgICAgICAgICAgIHZpZXdzOiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnY29tcG9uZW50cy9lbWJlZC9lbWJlZC5odG1sJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdFbWJlZENvbnRyb2xsZXInXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLnN0YXRlKCdlZGl0b3InLCB7XG4gICAgICAgICAgICAgICAgdXJsOiAnLzppZCcsXG4gICAgICAgICAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAgICAgICAgICAgY29udGVudDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdjb21wb25lbnRzL2VkaXRvci9lZGl0b3IuaHRtbCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250cm9sbGVyOiAnRWRpdG9yQ29udHJvbGxlcidcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIC8qIEBuZ0luamVjdCAqL1xuICAgICAgICAkdXJsUm91dGVyUHJvdmlkZXIub3RoZXJ3aXNlKGZ1bmN0aW9uICgkaW5qZWN0b3IsICRsb2NhdGlvbikge1xuICAgICAgICAgICAgLy8gVXNlclNlcnZpY2UgJiAkc3RhdGUgbm90IGF2YWlsYWJsZSBkdXJpbmcgLmNvbmZpZygpLCBpbmplY3QgdGhlbSAobWFudWFsbHkpIGxhdGVyXG5cbiAgICAgICAgICAgIC8vIHJlcXVlc3RpbmcgdW5rbm93biBwYWdlIHVuZXF1YWwgdG8gJy8nXG4gICAgICAgICAgICB2YXIgcGF0aCA9ICRsb2NhdGlvbi5wYXRoKCk7XG4gICAgICAgICAgICBpZiAocGF0aCAhPT0gJy8nKSB7XG4gICAgICAgICAgICAgICAgJGluamVjdG9yLmdldCgnJHN0YXRlJykuZ28oJzQwNCcpO1xuICAgICAgICAgICAgICAgIHJldHVybiBwYXRoOyAvLyB0aGlzIHRyaWNrIGFsbG93cyB0byBzaG93IHRoZSBlcnJvciBwYWdlIG9uIHVua25vd24gYWRkcmVzc1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gJy9uZXcnO1xuICAgICAgICB9KTtcblxuICAgICAgICAkbG9jYXRpb25Qcm92aWRlclxuICAgICAgICAgICAgLmh0bWw1TW9kZSh0cnVlKVxuICAgICAgICAgICAgLmhhc2hQcmVmaXgoJyEnKTtcbiAgICB9XG5cblxuICAgIGFuZ3VsYXJcbiAgICAgICAgLm1vZHVsZSgnZ3JhZmlkZGxlJylcbiAgICAgICAgLmNvbmZpZyhzdGF0ZXNDb25maWd1cmF0aW9uKTtcblxufSkoKTsiLCIoZnVuY3Rpb24oKXtcblxuICAgIHZhciBhdHRhY2hFdmVudCA9IGRvY3VtZW50LmF0dGFjaEV2ZW50O1xuICAgIHZhciBpc0lFID0gbmF2aWdhdG9yLnVzZXJBZ2VudC5tYXRjaCgvVHJpZGVudC8pO1xuICAgIHZhciByZXF1ZXN0RnJhbWUgPSAoZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIHJhZiA9IHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHwgd2luZG93Lm1velJlcXVlc3RBbmltYXRpb25GcmFtZSB8fCB3aW5kb3cud2Via2l0UmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG4gICAgICAgICAgICBmdW5jdGlvbihmbil7IHJldHVybiB3aW5kb3cuc2V0VGltZW91dChmbiwgMjApOyB9O1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24oZm4peyByZXR1cm4gcmFmKGZuKTsgfTtcbiAgICB9KSgpO1xuXG4gICAgdmFyIGNhbmNlbEZyYW1lID0gKGZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciBjYW5jZWwgPSB3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUgfHwgd2luZG93Lm1vekNhbmNlbEFuaW1hdGlvbkZyYW1lIHx8IHdpbmRvdy53ZWJraXRDYW5jZWxBbmltYXRpb25GcmFtZSB8fFxuICAgICAgICAgICAgd2luZG93LmNsZWFyVGltZW91dDtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKGlkKXsgcmV0dXJuIGNhbmNlbChpZCk7IH07XG4gICAgfSkoKTtcblxuICAgIGZ1bmN0aW9uIHJlc2l6ZUxpc3RlbmVyKGUpe1xuICAgICAgICB2YXIgd2luID0gZS50YXJnZXQgfHwgZS5zcmNFbGVtZW50O1xuICAgICAgICBpZiAod2luLl9fcmVzaXplUkFGX18pIGNhbmNlbEZyYW1lKHdpbi5fX3Jlc2l6ZVJBRl9fKTtcbiAgICAgICAgd2luLl9fcmVzaXplUkFGX18gPSByZXF1ZXN0RnJhbWUoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHZhciB0cmlnZ2VyID0gd2luLl9fcmVzaXplVHJpZ2dlcl9fO1xuICAgICAgICAgICAgdHJpZ2dlci5fX3Jlc2l6ZUxpc3RlbmVyc19fLmZvckVhY2goZnVuY3Rpb24oZm4pe1xuICAgICAgICAgICAgICAgIGZuLmNhbGwodHJpZ2dlciwgZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gb2JqZWN0TG9hZChlKXtcbiAgICAgICAgdGhpcy5jb250ZW50RG9jdW1lbnQuZGVmYXVsdFZpZXcuX19yZXNpemVUcmlnZ2VyX18gPSB0aGlzLl9fcmVzaXplRWxlbWVudF9fO1xuICAgICAgICB0aGlzLmNvbnRlbnREb2N1bWVudC5kZWZhdWx0Vmlldy5hZGRFdmVudExpc3RlbmVyKCdyZXNpemUnLCByZXNpemVMaXN0ZW5lcik7XG4gICAgfVxuXG4gICAgd2luZG93LmFkZFJlc2l6ZUxpc3RlbmVyID0gZnVuY3Rpb24oZWxlbWVudCwgZm4pe1xuICAgICAgICBpZiAoIWVsZW1lbnQuX19yZXNpemVMaXN0ZW5lcnNfXykge1xuICAgICAgICAgICAgZWxlbWVudC5fX3Jlc2l6ZUxpc3RlbmVyc19fID0gW107XG4gICAgICAgICAgICBpZiAoYXR0YWNoRXZlbnQpIHtcbiAgICAgICAgICAgICAgICBlbGVtZW50Ll9fcmVzaXplVHJpZ2dlcl9fID0gZWxlbWVudDtcbiAgICAgICAgICAgICAgICBlbGVtZW50LmF0dGFjaEV2ZW50KCdvbnJlc2l6ZScsIHJlc2l6ZUxpc3RlbmVyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChnZXRDb21wdXRlZFN0eWxlKGVsZW1lbnQpLnBvc2l0aW9uID09ICdzdGF0aWMnKSBlbGVtZW50LnN0eWxlLnBvc2l0aW9uID0gJ3JlbGF0aXZlJztcbiAgICAgICAgICAgICAgICB2YXIgb2JqID0gZWxlbWVudC5fX3Jlc2l6ZVRyaWdnZXJfXyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ29iamVjdCcpO1xuICAgICAgICAgICAgICAgIG9iai5zZXRBdHRyaWJ1dGUoJ3N0eWxlJywgJ2Rpc3BsYXk6IGJsb2NrOyBwb3NpdGlvbjogYWJzb2x1dGU7IHRvcDogMDsgbGVmdDogMDsgaGVpZ2h0OiAxMDAlOyB3aWR0aDogMTAwJTsgb3ZlcmZsb3c6IGhpZGRlbjsgcG9pbnRlci1ldmVudHM6IG5vbmU7IHotaW5kZXg6IC0xOycpO1xuICAgICAgICAgICAgICAgIG9iai5fX3Jlc2l6ZUVsZW1lbnRfXyA9IGVsZW1lbnQ7XG4gICAgICAgICAgICAgICAgb2JqLm9ubG9hZCA9IG9iamVjdExvYWQ7XG4gICAgICAgICAgICAgICAgb2JqLnR5cGUgPSAndGV4dC9odG1sJztcbiAgICAgICAgICAgICAgICBpZiAoaXNJRSkgZWxlbWVudC5hcHBlbmRDaGlsZChvYmopO1xuICAgICAgICAgICAgICAgIG9iai5kYXRhID0gJ2Fib3V0OmJsYW5rJztcbiAgICAgICAgICAgICAgICBpZiAoIWlzSUUpIGVsZW1lbnQuYXBwZW5kQ2hpbGQob2JqKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbGVtZW50Ll9fcmVzaXplTGlzdGVuZXJzX18ucHVzaChmbik7XG4gICAgfTtcblxuICAgIHdpbmRvdy5yZW1vdmVSZXNpemVMaXN0ZW5lciA9IGZ1bmN0aW9uKGVsZW1lbnQsIGZuKXtcbiAgICAgICAgZWxlbWVudC5fX3Jlc2l6ZUxpc3RlbmVyc19fLnNwbGljZShlbGVtZW50Ll9fcmVzaXplTGlzdGVuZXJzX18uaW5kZXhPZihmbiksIDEpO1xuICAgICAgICBpZiAoIWVsZW1lbnQuX19yZXNpemVMaXN0ZW5lcnNfXy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGlmIChhdHRhY2hFdmVudCkgZWxlbWVudC5kZXRhY2hFdmVudCgnb25yZXNpemUnLCByZXNpemVMaXN0ZW5lcik7XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBlbGVtZW50Ll9fcmVzaXplVHJpZ2dlcl9fLmNvbnRlbnREb2N1bWVudC5kZWZhdWx0Vmlldy5yZW1vdmVFdmVudExpc3RlbmVyKCdyZXNpemUnLCByZXNpemVMaXN0ZW5lcik7XG4gICAgICAgICAgICAgICAgZWxlbWVudC5fX3Jlc2l6ZVRyaWdnZXJfXyA9ICFlbGVtZW50LnJlbW92ZUNoaWxkKGVsZW1lbnQuX19yZXNpemVUcmlnZ2VyX18pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIFxufSkoKTsiLCIoZnVuY3Rpb24gKCkge1xuXG4gICAgZnVuY3Rpb24gQXBwQ29udHJvbGxlcigkc2NvcGUpIHtcblxuICAgICAgICAkc2NvcGUubWV0YWRhdGEgPSB7fTtcbiAgICAgICAgJHNjb3BlLm1ldGFkYXRhLnBhZ2VUaXRsZSA9ICdTaGFyZSB5b3VyIHZpc3VhbGl6YXRpb25zIG9uIGdyYWZpZGRsZSc7XG4gICAgICAgICRzY29wZS5tZXRhZGF0YS5vZyA9IHtcbiAgICAgICAgICAgICdvZzp0eXBlJzogJ2FydGljbGUnLFxuICAgICAgICAgICAgJ2FydGljbGU6c2VjdGlvbic6ICdTaGFyYWJsZSBkYXRhIHZpc3VhbGl6YXRpb24nLFxuICAgICAgICAgICAgJ29nOnRpdGxlJzogJ1NoYXJlIHlvdXIgdmlzdWFsaXphdGlvbnMgb24gZ3JhZmlkZGxlJyxcbiAgICAgICAgICAgICdvZzppbWFnZSc6ICcnLFxuICAgICAgICAgICAgJ29nOmRlc2NyaXB0aW9uJzogJ1NoYXJhYmxlIGRhdGEgdmlzdWFsaXphdGlvbidcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBhbmd1bGFyXG4gICAgICAgIC5tb2R1bGUoJ2dyYWZpZGRsZScpXG4gICAgICAgIC5jb250cm9sbGVyKCdBcHBDb250cm9sbGVyJywgQXBwQ29udHJvbGxlcik7XG5cbn0pKCk7XG4iLCIoZnVuY3Rpb24gKCkge1xuXG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgZnVuY3Rpb24gQ2hlY2twb2ludEVuZHBvaW50KCRyZXNvdXJjZSwgRU5WKSB7XG4gICAgICAgIHJldHVybiAkcmVzb3VyY2UoRU5WLmFwaSArICdjaGVja3BvaW50LzppZCcsIHtcbiAgICAgICAgICAgIGlkOiAnQGlkJ1xuICAgICAgICB9LCB7XG4gICAgICAgICAgICBzYXZlOiB7XG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZXQ6IHtcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdHRVQnXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGFuZ3VsYXJcbiAgICAgICAgLm1vZHVsZSgnZ3JhZmlkZGxlJylcbiAgICAgICAgLmZhY3RvcnkoJ0NoZWNrcG9pbnRFbmRwb2ludCcsIENoZWNrcG9pbnRFbmRwb2ludCk7XG5cbn0pKCk7XG4iLCIoZnVuY3Rpb24gKCkge1xuXG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgZnVuY3Rpb24gVHJlZUVuZHBvaW50KCRyZXNvdXJjZSwgRU5WKSB7XG4gICAgICAgIHJldHVybiAkcmVzb3VyY2UoRU5WLmFwaSArICd0cmVlLzppZCcsIHtcbiAgICAgICAgICAgIGlkOiAnQGlkJ1xuICAgICAgICB9LCB7XG4gICAgICAgICAgICBnZXQ6IHtcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdHRVQnXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGFuZ3VsYXJcbiAgICAgICAgLm1vZHVsZSgnZ3JhZmlkZGxlJylcbiAgICAgICAgLmZhY3RvcnkoJ1RyZWVFbmRwb2ludCcsIFRyZWVFbmRwb2ludCk7XG5cbn0pKCk7XG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=