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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImNvbW1vbi9vbi1yZWFkLWZpbGUvb24tcmVhZC1maWxlLWRpcmVjdGl2ZS5qcyIsInRyZWUvdHJlZS1lbmRwb2ludC5qcyIsInRyZWUvdHJlZS1jb250cm9sbGVyLmpzIiwiZW1iZWQvZW1iZWQtY29udHJvbGxlci5qcyIsImVkaXRvci9lZGl0b3ItY29udHJvbGxlci5qcyIsImNvbW1vbi9zdGF0ZXMuY29uZmlnLmpzIiwiY29tbW9uL29ucmVzaXplLmpzIiwiY29tbW9uL2FwcC1jb250cm9sbGVyLmpzIiwiY2hlY2twb2ludC9jaGVja3BvaW50LWVuZHBvaW50LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLENBQUMsWUFBWTs7RUFFWDs7RUFFQTtLQUNHLE9BQU8sYUFBYTtNQUNuQjtNQUNBO01BQ0E7TUFDQTtNQUNBO01BQ0E7TUFDQTtNQUNBO01BQ0E7Ozs7QUFJTjtBQ2xCQSxDQUFDLFlBQVk7O0lBRVQ7Ozs7Ozs7Ozs7Ozs7OztJQWVBLFNBQVMsV0FBVyxRQUFRO1FBQ3hCLE9BQU87WUFDSCxVQUFVO1lBQ1YsT0FBTztZQUNQLE1BQU0sU0FBUyxPQUFPLFNBQVMsT0FBTztnQkFDbEMsSUFBSSxLQUFLLE9BQU8sTUFBTTs7Z0JBRXRCLFFBQVEsR0FBRyxVQUFVLFNBQVMsZUFBZTtvQkFDekMsSUFBSSxTQUFTLElBQUk7O29CQUVqQixPQUFPLFNBQVMsU0FBUyxhQUFhO3dCQUNsQyxNQUFNLE9BQU8sV0FBVzs0QkFDcEIsR0FBRyxPQUFPLENBQUMsYUFBYSxZQUFZLE9BQU87Ozs7b0JBSW5ELE9BQU8sV0FBVyxDQUFDLGNBQWMsY0FBYyxjQUFjLFFBQVEsTUFBTTs7Ozs7OztJQU0zRjtTQUNLLE9BQU87U0FDUCxVQUFVLGNBQWM7OztBQUdqQztBQzVDQSxDQUFDLFlBQVk7O0lBRVQ7O0lBRUEsU0FBUyxhQUFhLFdBQVcsS0FBSztRQUNsQyxPQUFPLFVBQVUsSUFBSSxNQUFNLFlBQVk7WUFDbkMsSUFBSTtXQUNMO1lBQ0Ms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YyxRQUFROztRQUUzQixPQUFPLFdBQVc7UUFDbEIsT0FBTyxTQUFTLFlBQVk7UUFDNUIsT0FBTyxTQUFTLEtBQUs7WUFDakIsV0FBVztZQUNYLG1CQUFtQjtZQUNuQixZQUFZO1lBQ1osWUFBWTtZQUNaLGtCQUFrQjs7Ozs7SUFJMUI7U0FDSyxPQUFPO1NBQ1AsV0FBVyxpQkFBaUI7OztBQUdyQztBQ3BCQSxDQUFDLFlBQVk7O0lBRVQ7O0lBRUEsU0FBUyxtQkFBbUIsV0FBVyxLQUFLO1FBQ3hDLE9BQU8sVUFBVSxJQUFJLE1BQU0sa0JBQWtCO1lBQ3pDLElBQUk7V0FDTDtZQUNDLE1BQU07Z0JBQ0YsUUFBUTs7WUFFWixLQUFLO2dCQUNELFFBQVE7Ozs7OztJQUtwQjtTQUNLLE9BQU87U0FDUCxRQUFRLHNCQUFzQjs7O0FBR3ZDIiwiZmlsZSI6InNjcmlwdHMuanMiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gKCkge1xuXG4gICd1c2Ugc3RyaWN0JztcblxuICBhbmd1bGFyXG4gICAgLm1vZHVsZSgnZ3JhZmlkZGxlJywgW1xuICAgICAgJ2dyYWZpZGRsZS5jb25maWcnLFxuICAgICAgJ2dyYWZpZGRsZS50ZW1wbGF0ZXMnLFxuICAgICAgJ25nUmVzb3VyY2UnLFxuICAgICAgJ25nU2FuaXRpemUnLFxuICAgICAgJ25nQW5pbWF0ZScsXG4gICAgICAndWkucm91dGVyJyxcbiAgICAgICd1aS5sYXlvdXQnLFxuICAgICAgJ3VpLmFjZScsXG4gICAgICAnYW5ndWxhckNoYXJ0J1xuICAgIF0pO1xuXG59KSgpO1xuIiwiKGZ1bmN0aW9uICgpIHtcblxuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIC8qKlxuICAgICAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAgICAgKiBAbmFtZSBncmFmaWRkbGUuZGlyZWN0aXZlOm9uUmVhZEZpbGVcbiAgICAgKiBAcmVxdWlyZXMgJHBhcnNlXG4gICAgICogQHJlcXVpcmVzICRsb2dcbiAgICAgKiBAcmVzdHJpY3QgQVxuICAgICAqXG4gICAgICogQGRlc2NyaXB0aW9uXG4gICAgICogVGhlIGBvblJlYWRGaWxlYCBkaXJlY3RpdmUgb3BlbnMgdXAgYSBGaWxlUmVhZGVyIGRpYWxvZyB0byB1cGxvYWQgZmlsZXMgZnJvbSB0aGUgbG9jYWwgZmlsZXN5c3RlbS5cbiAgICAgKlxuICAgICAqIEBlbGVtZW50IEFOWVxuICAgICAqIEBuZ0luamVjdFxuICAgICAqL1xuICAgIGZ1bmN0aW9uIG9uUmVhZEZpbGUoJHBhcnNlKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByZXN0cmljdDogJ0EnLFxuICAgICAgICAgICAgc2NvcGU6IGZhbHNlLFxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XG4gICAgICAgICAgICAgICAgdmFyIGZuID0gJHBhcnNlKGF0dHJzLm9uUmVhZEZpbGUpO1xuXG4gICAgICAgICAgICAgICAgZWxlbWVudC5vbignY2hhbmdlJywgZnVuY3Rpb24ob25DaGFuZ2VFdmVudCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcblxuICAgICAgICAgICAgICAgICAgICByZWFkZXIub25sb2FkID0gZnVuY3Rpb24ob25Mb2FkRXZlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLiRhcHBseShmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmbihzY29wZSwgeyRmaWxlQ29udGVudDpvbkxvYWRFdmVudC50YXJnZXQucmVzdWx0fSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgICAgICByZWFkZXIucmVhZEFzVGV4dCgob25DaGFuZ2VFdmVudC5zcmNFbGVtZW50IHx8IG9uQ2hhbmdlRXZlbnQudGFyZ2V0KS5maWxlc1swXSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgYW5ndWxhclxuICAgICAgICAubW9kdWxlKCdncmFmaWRkbGUnKVxuICAgICAgICAuZGlyZWN0aXZlKCdvblJlYWRGaWxlJywgb25SZWFkRmlsZSk7XG5cbn0pKCk7XG4iLCIoZnVuY3Rpb24gKCkge1xuXG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgZnVuY3Rpb24gVHJlZUVuZHBvaW50KCRyZXNvdXJjZSwgRU5WKSB7XG4gICAgICAgIHJldHVybiAkcmVzb3VyY2UoRU5WLmFwaSArICd0cmVlLzppZCcsIHtcbiAgICAgICAgICAgIGlkOiAnQGlkJ1xuICAgICAgICB9LCB7XG4gICAgICAgICAgICBnZXQ6IHtcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdHRVQnXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGFuZ3VsYXJcbiAgICAgICAgLm1vZHVsZSgnZ3JhZmlkZGxlJylcbiAgICAgICAgLmZhY3RvcnkoJ1RyZWVFbmRwb2ludCcsIFRyZWVFbmRwb2ludCk7XG5cbn0pKCk7XG4iLCIoZnVuY3Rpb24gKCkge1xuXG4gICAgZnVuY3Rpb24gVHJlZUNvbnRyb2xsZXIoJHNjb3BlLCAkc3RhdGUsIENoZWNrcG9pbnRFbmRwb2ludCwgVHJlZUVuZHBvaW50KSB7XG5cbiAgICAgICAgJHNjb3BlLmNoZWNrcG9pbnQgPSB7XG4gICAgICAgICAgICBpZDogJHN0YXRlLnBhcmFtcy5pZFxuICAgICAgICB9O1xuXG4gICAgICAgIENoZWNrcG9pbnRFbmRwb2ludFxuICAgICAgICAgICAgLmdldCh7aWQ6ICRzdGF0ZS5wYXJhbXMuaWR9KVxuICAgICAgICAgICAgLiRwcm9taXNlXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbihjaGVja3BvaW50KSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmNoZWNrcG9pbnQgPSBjaGVja3BvaW50O1xuICAgICAgICAgICAgICAgIFRyZWVFbmRwb2ludFxuICAgICAgICAgICAgICAgICAgICAuZ2V0KHtpZDogY2hlY2twb2ludC50cmVlfSlcbiAgICAgICAgICAgICAgICAgICAgLiRwcm9taXNlXG4gICAgICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHRyZWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnZlcnRUcmVlKHRyZWUpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIGZ1bmN0aW9uIGNvbnZlcnRUcmVlKHRyZWUpIHtcbiAgICAgICAgICAgIC8vIFRPRE9cbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGNsaWNrKGQpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGQpO1xuICAgICAgICAgICAgJHN0YXRlLmdvKCdlZGl0b3InLCB7aWQ6IGQuaWR9KTtcbiAgICAgICAgfVxuXG5cbiAgICAgICAgdmFyIHRyZWVEYXRhID0gW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIlRvcCBMZXZlbFwiLFxuICAgICAgICAgICAgICAgIFwiY2hpbGRyZW5cIjogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJMZXZlbCAyOiBBXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcImF1dGhvclwiOiBcIlBldGVyXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcImlkXCI6IDEyMzQsXG4gICAgICAgICAgICAgICAgICAgICAgICBcImNoaWxkcmVuXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIlNvbiBvZiBBXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiRGF1Z2h0ZXIgb2YgQVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcImlkXCI6IDEyM1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiTGV2ZWwgMjogQlwiXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIkxldmVsIDI6IEJcIlxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJMZXZlbCAyOiBCXCJcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiTGV2ZWwgMjogQlwiXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIkxldmVsIDI6IEJcIlxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgfVxuICAgICAgICBdO1xuXG4gICAgICAgIC8vICoqKioqKioqKioqKioqIEdlbmVyYXRlIHRoZSB0cmVlIGRpYWdyYW1cdCAqKioqKioqKioqKioqKioqKlxuICAgICAgICB2YXIgbWFyZ2luID0ge3RvcDogNDAsIHJpZ2h0OiAwLCBib3R0b206IDIwLCBsZWZ0OiAwfSxcbiAgICAgICAgICAgIHdpZHRoID0gOTAwIC0gbWFyZ2luLnJpZ2h0IC0gbWFyZ2luLmxlZnQsXG4gICAgICAgICAgICBoZWlnaHQgPSA3MDAgLSBtYXJnaW4udG9wIC0gbWFyZ2luLmJvdHRvbTtcblxuICAgICAgICB2YXIgaSA9IDA7XG5cbiAgICAgICAgdmFyIHRyZWUgPSBkMy5sYXlvdXQudHJlZSgpXG4gICAgICAgICAgICAuc2l6ZShbaGVpZ2h0LCB3aWR0aF0pO1xuXG4gICAgICAgIHZhciBkaWFnb25hbCA9IGQzLnN2Zy5kaWFnb25hbCgpXG4gICAgICAgICAgICAucHJvamVjdGlvbihmdW5jdGlvbihkKSB7IHJldHVybiBbZC54LCBkLnldOyB9KTtcblxuICAgICAgICB2YXIgc3ZnID0gZDMuc2VsZWN0KFwiI3RyZWVcIikuYXBwZW5kKFwic3ZnXCIpXG4gICAgICAgICAgICAuYXR0cihcIndpZHRoXCIsIHdpZHRoICsgbWFyZ2luLnJpZ2h0ICsgbWFyZ2luLmxlZnQpXG4gICAgICAgICAgICAuYXR0cihcImhlaWdodFwiLCBoZWlnaHQgKyBtYXJnaW4udG9wICsgbWFyZ2luLmJvdHRvbSlcbiAgICAgICAgICAgIC5hcHBlbmQoXCJnXCIpXG4gICAgICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZShcIiArIG1hcmdpbi5sZWZ0ICsgXCIsXCIgKyBtYXJnaW4udG9wICsgXCIpXCIpO1xuXG4gICAgICAgIHJvb3QgPSB0cmVlRGF0YVswXTtcblxuICAgICAgICB1cGRhdGUocm9vdCk7XG5cbiAgICAgICAgZnVuY3Rpb24gdXBkYXRlKHNvdXJjZSkge1xuXG4gICAgICAgICAgICAvLyBDb21wdXRlIHRoZSBuZXcgdHJlZSBsYXlvdXQuXG4gICAgICAgICAgICB2YXIgbm9kZXMgPSB0cmVlLm5vZGVzKHJvb3QpLnJldmVyc2UoKSxcbiAgICAgICAgICAgICAgICBsaW5rcyA9IHRyZWUubGlua3Mobm9kZXMpO1xuXG4gICAgICAgICAgICAvLyBOb3JtYWxpemUgZm9yIGZpeGVkLWRlcHRoLlxuICAgICAgICAgICAgbm9kZXMuZm9yRWFjaChmdW5jdGlvbihkKSB7IGQueSA9IGQuZGVwdGggKiAxMDA7IH0pO1xuXG4gICAgICAgICAgICAvLyBEZWNsYXJlIHRoZSBub2Rlc+KAplxuICAgICAgICAgICAgdmFyIG5vZGUgPSBzdmcuc2VsZWN0QWxsKFwiZy5ub2RlXCIpXG4gICAgICAgICAgICAgICAgLmRhdGEobm9kZXMsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQuaWQgfHwgKGQuaWQgPSArK2kpOyB9KTtcblxuICAgICAgICAgICAgLy8gRW50ZXIgdGhlIG5vZGVzLlxuICAgICAgICAgICAgdmFyIG5vZGVFbnRlciA9IG5vZGUuZW50ZXIoKS5hcHBlbmQoXCJnXCIpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcIm5vZGVcIilcbiAgICAgICAgICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBcInRyYW5zbGF0ZShcIiArIGQueCArIFwiLFwiICsgZC55ICsgXCIpXCI7IH0pXG4gICAgICAgICAgICAgICAgLm9uKFwiY2xpY2tcIiwgY2xpY2spOztcblxuICAgICAgICAgICAgbm9kZUVudGVyLmFwcGVuZChcImNpcmNsZVwiKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwiclwiLCAxMClcbiAgICAgICAgICAgICAgICAuc3R5bGUoXCJmaWxsXCIsIFwiI2ZmZlwiKTtcblxuICAgICAgICAgICAgbm9kZUVudGVyLmFwcGVuZChcInRleHRcIilcbiAgICAgICAgICAgICAgICAuYXR0cihcInlcIiwgZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZC5jaGlsZHJlbiB8fCBkLl9jaGlsZHJlbiA/IC0xOCA6IDE4OyB9KVxuICAgICAgICAgICAgICAgIC5hdHRyKFwiZHlcIiwgXCIuMzVlbVwiKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwidGV4dC1hbmNob3JcIiwgXCJtaWRkbGVcIilcbiAgICAgICAgICAgICAgICAudGV4dChmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB0ZXh0ID0gZC5uYW1lO1xuICAgICAgICAgICAgICAgICAgICAvLyArICcgYnkgJyArIGQuYXV0aG9yO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZC5pZCA9PSAkc2NvcGUuY2hlY2twb2ludC5pZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGV4dCArPSAnIChjdXJyZW50KSc7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRleHQ7XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAuc3R5bGUoXCJmaWxsLW9wYWNpdHlcIiwgMSk7XG5cbiAgICAgICAgICAgIC8vIERlY2xhcmUgdGhlIGxpbmtz4oCmXG4gICAgICAgICAgICB2YXIgbGluayA9IHN2Zy5zZWxlY3RBbGwoXCJwYXRoLmxpbmtcIilcbiAgICAgICAgICAgICAgICAuZGF0YShsaW5rcywgZnVuY3Rpb24oZCkgeyByZXR1cm4gZC50YXJnZXQuaWQ7IH0pO1xuXG4gICAgICAgICAgICAvLyBFbnRlciB0aGUgbGlua3MuXG4gICAgICAgICAgICBsaW5rLmVudGVyKCkuaW5zZXJ0KFwicGF0aFwiLCBcImdcIilcbiAgICAgICAgICAgICAgICAuYXR0cihcImNsYXNzXCIsIFwibGlua1wiKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwiZFwiLCBkaWFnb25hbCk7XG5cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGFuZ3VsYXJcbiAgICAgICAgLm1vZHVsZSgnZ3JhZmlkZGxlJylcbiAgICAgICAgLmNvbnRyb2xsZXIoJ1RyZWVDb250cm9sbGVyJywgVHJlZUNvbnRyb2xsZXIpO1xuXG59KSgpOyIsIihmdW5jdGlvbiAoKSB7XG5cbiAgICBmdW5jdGlvbiBFbWJlZENvbnRyb2xsZXIoJHNjb3BlLCAkZmlsdGVyLCAkbG9jYXRpb24pIHtcblxuICAgICAgICAkc2NvcGUuZmlkZGxlaWQgPSAkbG9jYXRpb24ucGF0aCgpLnN1YnN0cigxKS5zcGxpdCgnPycsIDEpWzBdO1xuXG4gICAgICAgICRzY29wZS5lbWJlZFZpZXcgPSAnY2hhcnQnO1xuICAgICAgICB2YXIgcmVxdWVzdFZpZXcgPSAkbG9jYXRpb24uc2VhcmNoKCkudmlldztcbiAgICAgICAgaWYocmVxdWVzdFZpZXcpIHtcbiAgICAgICAgICAgICRzY29wZS5lbWJlZFZpZXcgPSByZXF1ZXN0VmlldztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgJHNjb3BlLnNldFZpZXcgPSBmdW5jdGlvbihuZXdWaWV3KSB7XG4gICAgICAgICAgICAkc2NvcGUuZW1iZWRWaWV3ID0gbmV3VmlldztcbiAgICAgICAgICAgICRzY29wZS5vcHRpb25zRWRpdG9yLnJlc2l6ZSgpO1xuICAgICAgICAgICAgJHNjb3BlLmRhdGFFZGl0b3IucmVzaXplKCk7XG4gICAgICAgICAgICAkc2NvcGUub3B0aW9uc0VkaXRvci5yZW5kZXJlci51cGRhdGVGdWxsKCk7XG4gICAgICAgICAgICAkc2NvcGUuZGF0YUVkaXRvci5yZW5kZXJlci51cGRhdGVGdWxsKCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLmlzVmlldyA9IGZ1bmN0aW9uKHZpZXcpIHtcbiAgICAgICAgICAgIHJldHVybiB2aWV3ID09ICRzY29wZS5lbWJlZFZpZXc7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLmRhdGFzZXRTdHJpbmcgPSAnJztcbiAgICAgICAgJHNjb3BlLmRhdGFzZXQgPSBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgJ2RheSc6ICcyMDEzLTAxLTAyXzAwOjAwOjAwJyxcbiAgICAgICAgICAgICAgICAnc2FsZXMnOiAzNDYxLjI5NTIwMixcbiAgICAgICAgICAgICAgICAnaW5jb21lJzogMTIzNjUuMDUzXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICdkYXknOiAnMjAxMy0wMS0wM18wMDowMDowMCcsXG4gICAgICAgICAgICAgICAgJ3NhbGVzJzogNDQ2MS4yOTUyMDIsXG4gICAgICAgICAgICAgICAgJ2luY29tZSc6IDEzMzY1LjA1M1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAnZGF5JzogJzIwMTMtMDEtMDRfMDA6MDA6MDAnLFxuICAgICAgICAgICAgICAgICdzYWxlcyc6IDQ1NjEuMjk1MjAyLFxuICAgICAgICAgICAgICAgICdpbmNvbWUnOiAxNDM2NS4wNTNcbiAgICAgICAgICAgIH1cbiAgICAgICAgXTtcblxuICAgICAgICAkc2NvcGUuc2NoZW1hID0ge1xuICAgICAgICAgICAgZGF5OiB7XG4gICAgICAgICAgICAgICAgdHlwZTogJ2RhdGV0aW1lJyxcbiAgICAgICAgICAgICAgICBmb3JtYXQ6ICclWS0lbS0lZF8lSDolTTolUycsXG4gICAgICAgICAgICAgICAgbmFtZTogJ0RhdGUnXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLm9wdGlvbnNTdHJpbmcgPSAnJztcbiAgICAgICAgJHNjb3BlLm9wdGlvbnMgPSB7XG4gICAgICAgICAgICByb3dzOiBbe1xuICAgICAgICAgICAgICAgIGtleTogJ2luY29tZScsXG4gICAgICAgICAgICAgICAgdHlwZTogJ2JhcidcbiAgICAgICAgICAgIH0sIHtcbiAgICAgICAgICAgICAgICBrZXk6ICdzYWxlcydcbiAgICAgICAgICAgIH1dLFxuICAgICAgICAgICAgeEF4aXM6IHtcbiAgICAgICAgICAgICAgICBrZXk6ICdkYXknLFxuICAgICAgICAgICAgICAgIGRpc3BsYXlGb3JtYXQ6ICclWS0lbS0lZCAlSDolTTolUydcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvLyBkZWZpbmUgY29kZSBoaWdobGlnaHRpbmdcbiAgICAgICAgJHNjb3BlLm9wdGlvbnNBY2VDb25maWcgPSB7XG4gICAgICAgICAgICBtb2RlOiAnanNvbicsXG4gICAgICAgICAgICB1c2VXcmFwTW9kZTogZmFsc2UsXG4gICAgICAgICAgICBvbkxvYWQ6IGZ1bmN0aW9uKF9lZGl0b3IpIHtcbiAgICAgICAgICAgICAgICBfZWRpdG9yLnNldFNob3dQcmludE1hcmdpbihmYWxzZSk7XG4gICAgICAgICAgICAgICAgJHNjb3BlLm9wdGlvbnNFZGl0b3IgPSBfZWRpdG9yO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5kYXRhc2V0QWNlQ29uZmlnID0ge1xuICAgICAgICAgICAgbW9kZTogJ2pzb24nLFxuICAgICAgICAgICAgdXNlV3JhcE1vZGU6IGZhbHNlLFxuICAgICAgICAgICAgb25Mb2FkOiBmdW5jdGlvbihfZWRpdG9yKSB7XG4gICAgICAgICAgICAgICAgX2VkaXRvci5zZXRTaG93UHJpbnRNYXJnaW4oZmFsc2UpO1xuICAgICAgICAgICAgICAgICRzY29wZS5kYXRhRWRpdG9yID0gX2VkaXRvcjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuXG4gICAgICAgICRzY29wZS4kd2F0Y2goJ29wdGlvbnMnLCBmdW5jdGlvbihqc29uKSB7XG4gICAgICAgICAgICAkc2NvcGUub3B0aW9uc1N0cmluZyA9ICRmaWx0ZXIoJ2pzb24nKShqc29uKTtcbiAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaCgnb3B0aW9uc1N0cmluZycsIGZ1bmN0aW9uKGpzb24pIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLm9wdGlvbnMgPSBKU09OLnBhcnNlKGpzb24pO1xuICAgICAgICAgICAgICAgICRzY29wZS53ZWxsRm9ybWVkT3B0aW9ucyA9IHRydWU7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLndlbGxGb3JtZWRPcHRpb25zID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIHRydWUpO1xuXG4gICAgICAgICRzY29wZS4kd2F0Y2goJ2RhdGFzZXQnLCBmdW5jdGlvbihqc29uKSB7XG4gICAgICAgICAgICAkc2NvcGUuZGF0YXNldFN0cmluZyA9ICRmaWx0ZXIoJ2pzb24nKShqc29uKTtcbiAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaCgnZGF0YXNldFN0cmluZycsIGZ1bmN0aW9uKGpzb24pIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmRhdGFzZXQgPSBKU09OLnBhcnNlKGpzb24pO1xuICAgICAgICAgICAgICAgICRzY29wZS53ZWxsRm9ybWVkRGF0YXNldCA9IHRydWU7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLndlbGxGb3JtZWREYXRhc2V0ID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIHRydWUpO1xuXG4gICAgfVxuXG4gICAgYW5ndWxhclxuICAgICAgICAubW9kdWxlKCdncmFmaWRkbGUnKVxuICAgICAgICAuY29udHJvbGxlcignRW1iZWRDb250cm9sbGVyJywgRW1iZWRDb250cm9sbGVyKTtcblxufSkoKTtcbiIsIihmdW5jdGlvbiAoKSB7XG5cbiAgICBmdW5jdGlvbiBFZGl0b3JDb250cm9sbGVyKCRzY29wZSwgJGZpbHRlciwgJHN0YXRlLCAkd2luZG93LCAkdGltZW91dCwgQ2hlY2twb2ludEVuZHBvaW50KSB7XG5cbiAgICAgICAgJHNjb3BlLnNob3dEYXRhRWRpdG9yID0gZmFsc2U7XG4gICAgICAgICRzY29wZS5zaG93T3B0aW9uc1VJICA9IGZhbHNlO1xuICAgICAgICAkc2NvcGUuc2hvd1NoYXJlUG9wdXAgPSBmYWxzZTtcbiAgICAgICAgJHNjb3BlLnN3aXRjaERhdGFCdXR0b25UaXRsZSAgICA9ICdNYW51YWwgZGF0YSBlbnRyeSc7XG4gICAgICAgICRzY29wZS5zd2l0Y2hPcHRpb25zQnV0dG9uVGl0bGUgPSAnRWRpdCBpbiBHVUknO1xuICAgICAgICAkc2NvcGUudG9nZ2xlRGF0YUVkaXRvciA9IHRvZ2dsZURhdGFFZGl0b3I7XG4gICAgICAgICRzY29wZS50b2dnbGVPcHRpb25zVUkgID0gdG9nZ2xlT3B0aW9uc1VJO1xuICAgICAgICAkc2NvcGUuc2hhcmVQb3B1cCAgICAgICA9IHNoYXJlUG9wdXA7XG4gICAgICAgICRzY29wZS5vblNoYXJlVGV4dENsaWNrID0gb25TaGFyZVRleHRDbGljaztcblxuICAgICAgICAkc2NvcGUuc2hhcmUgPSBzaGFyZTtcbiAgICAgICAgJHNjb3BlLnNhdmUgPSBzYXZlO1xuICAgICAgICAkc2NvcGUudXBsb2FkRmlsZSA9IHVwbG9hZEZpbGU7XG5cbiAgICAgICAgJHNjb3BlLmNoZWNrcG9pbnQgPSB7fTtcbiAgICAgICAgJHNjb3BlLmFjZUpzb25Db25maWcgPSB7XG4gICAgICAgICAgICBtb2RlOiAnanNvbicsXG4gICAgICAgICAgICB1c2VXcmFwTW9kZTogZmFsc2UsXG4gICAgICAgICAgICBvbkxvYWQ6IGZ1bmN0aW9uIChfZWRpdG9yKSB7XG4gICAgICAgICAgICAgICAgX2VkaXRvci5zZXRTaG93UHJpbnRNYXJnaW4oZmFsc2UpO1xuICAgICAgICAgICAgICAgIF9lZGl0b3IuJGJsb2NrU2Nyb2xsaW5nID0gSW5maW5pdHk7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmVkaXRvcnMgPSBfZWRpdG9yO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIGFjdGl2YXRlKCk7XG5cbiAgICAgICAgLy8vLy8vLy8vLy8vXG5cbiAgICAgICAgZnVuY3Rpb24gYWN0aXZhdGUoKSB7XG5cbiAgICAgICAgICAgIGlmICgkc3RhdGUucGFyYW1zLmlkKSB7XG4gICAgICAgICAgICAgICAgQ2hlY2twb2ludEVuZHBvaW50XG4gICAgICAgICAgICAgICAgICAgIC5nZXQoe2lkOiAkc3RhdGUucGFyYW1zLmlkfSlcbiAgICAgICAgICAgICAgICAgICAgLiRwcm9taXNlXG4gICAgICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKGNoZWNrcG9pbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5zZXJ2ZXJDaGVja3BvaW50ID0gY2hlY2twb2ludDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNldENoZWNrcG9pbnQoY2hlY2twb2ludCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAkdGltZW91dChzYXZlQXNJbWFnZSwgMCk7XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIC5jYXRjaChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICAgICAgJHN0YXRlLmdvKCdlZGl0b3InLCB7aWQ6ICcnfSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBsb2FkRGVmYXVsdERhdGEoKTtcbiAgICAgICAgICAgICAgICAkdGltZW91dChzYXZlQXNJbWFnZSwgMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzeW5jT3B0aW9ucygpO1xuICAgICAgICAgICAgc3luY0RhdGFzZXQoKTtcbiAgICAgICAgICAgIHVwZGF0ZU9uUmVzaXplKCk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBzYXZlQXNJbWFnZSgpIHtcbiAgICAgICAgICAgIGNhbnZnKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjYW52YXMnKSwgZDMuc2VsZWN0KFwiLmFuZ3VsYXJjaGFydFwiKS5ub2RlKCkuaW5uZXJIVE1MKTtcbiAgICAgICAgICAgICRzY29wZS5hc0ltYWdlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NhbnZhcycpLnRvRGF0YVVSTCgpO1xuICAgICAgICAgICAgJHNjb3BlLm1ldGFkYXRhLm9nWydvZzppbWFnZSddID0gJHNjb3BlLmFzSW1hZ2U7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTYXZlIHRoZSBjdXJyZW50IFZlcnNpb25cbiAgICAgICAgLy9cbiAgICAgICAgZnVuY3Rpb24gc2F2ZSgpIHtcbiAgICAgICAgICAgIENoZWNrcG9pbnRFbmRwb2ludC5zYXZlKHtcbiAgICAgICAgICAgICAgICBcImRhdGFcIjogJHNjb3BlLmNoZWNrcG9pbnQuZGF0YXNldCxcbiAgICAgICAgICAgICAgICBcIm9wdGlvbnNcIjogJHNjb3BlLmNoZWNrcG9pbnQub3B0aW9ucyxcbiAgICAgICAgICAgICAgICBcImF1dGhvclwiOiBcIkFub255bVwiXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC4kcHJvbWlzZVxuICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uIChjaGVja3BvaW50KSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzYXZlZCBjaGVja3BvaW50OiAnLCBjaGVja3BvaW50KTtcbiAgICAgICAgICAgICAgICAgICAgJHN0YXRlLmdvKCdlZGl0b3InLCB7aWQ6IGNoZWNrcG9pbnQuaWR9KTtcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC5jYXRjaChmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdzYXZlIGZhaWxlZCcsIGUpO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgIH1cblxuICAgICAgICAvLyBTaGFyZSB0aGUgZmlkZGxlXG4gICAgICAgIC8vXG4gICAgICAgIGZ1bmN0aW9uIHNoYXJlKHRhcmdldCkge1xuICAgICAgICAgICAgZmlkZGxlVVJMICAgICAgID0gJ2h0dHA6Ly9ncmFmaWRkbGUuYXBwc3BvdC5jb20vJyArICRzdGF0ZS5wYXJhbXMuaWQ7XG4gICAgICAgICAgICBpZih0YXJnZXQgPT0gJ0ZCJykge1xuICAgICAgICAgICAgICAgICR3aW5kb3cub3BlbignaHR0cHM6Ly93d3cuZmFjZWJvb2suY29tL3NoYXJlci9zaGFyZXIucGhwP3U9JyArIGZpZGRsZVVSTCwgJ19ibGFuaycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYodGFyZ2V0ID09ICdUd2l0dGVyJykge1xuICAgICAgICAgICAgICAgICR3aW5kb3cub3BlbignaHR0cHM6Ly90d2l0dGVyLmNvbS9pbnRlbnQvdHdlZXQ/dGV4dD1DaGVjayUyMG91dCUyMHRoaXMlMjBzd2VldCUyMGdyYWZpZGRsZSUyMCZ1cmw9JyArIGZpZGRsZVVSTCwgJ19ibGFuaycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYodGFyZ2V0ID09ICdFLU1haWwnKSB7XG4gICAgICAgICAgICAgICAgJHdpbmRvdy5sb2NhdGlvbiA9ICdtYWlsdG86YUBiLmNkP3N1YmplY3Q9Q2hlY2slMjBvdXQlMjB0aGlzJTIwYXdlc29tZSUyMEdyYWZpZGRsZSZib2R5PScgKyBmaWRkbGVVUkw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVcGxvYWQgYSBmaWxlIGFzIGRhdGEgc291cmNlXG4gICAgICAgIC8vXG4gICAgICAgIGZ1bmN0aW9uIHVwbG9hZEZpbGUoZmlsZSkge1xuICAgICAgICAgICAgJHNjb3BlLmNoZWNrcG9pbnQuZGF0YXNldFN0cmluZyA9IGZpbGU7XG4gICAgICAgICAgICAkc2NvcGUudG9nZ2xlRGF0YUVkaXRvcigpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVG9nZ2xlIGZyb20gZGF0YSB2aWV3XG4gICAgICAgIC8vXG4gICAgICAgIGZ1bmN0aW9uIHRvZ2dsZURhdGFFZGl0b3IoKSB7XG4gICAgICAgICAgICAkc2NvcGUuc2hvd0RhdGFFZGl0b3IgPSAhJHNjb3BlLnNob3dEYXRhRWRpdG9yO1xuICAgICAgICAgICAgJHNjb3BlLnN3aXRjaERhdGFCdXR0b25UaXRsZSA9ICRzY29wZS5zaG93RGF0YUVkaXRvciA/ICdCYWNrIHRvIGlucHV0IGRpYWxvZycgOiAnTWFudWFsIGRhdGEgZW50cnknO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVG9nZ2xlIGZyb20ganNvbi1vcHRpb24gdmlld1xuICAgICAgICAvL1xuICAgICAgICBmdW5jdGlvbiB0b2dnbGVPcHRpb25zVUkoKSB7XG4gICAgICAgICAgICAkc2NvcGUuc2hvd09wdGlvbnNVSSA9ICEkc2NvcGUuc2hvd09wdGlvbnNVSTtcbiAgICAgICAgICAgICRzY29wZS5zd2l0Y2hPcHRpb25zQnV0dG9uVGl0bGUgPSAkc2NvcGUuc2hvd09wdGlvbnNVSSA/ICdFZGl0IGFzIEpTT04nIDogJ0VkaXQgaW4gR1VJJztcbiAgICAgICAgICAgICRzY29wZS5lZGl0b3JzLnJlc2l6ZSgpO1xuICAgICAgICAgICAgJHNjb3BlLmVkaXRvcnMucmVuZGVyZXIudXBkYXRlRnVsbCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ3JlYXRlIHRoZSBIVE1MIFVJIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBvcHRpb25zIGpzb25cbiAgICAgICAgLy9cbiAgICAgICAgZnVuY3Rpb24gdXBkYXRlT3B0aW9uc1VJKGpzb24pIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwidXBkYXRlIG9wdGlvbnMgdWlcIik7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTaG93IHRoZSBzaGFyZSBzaGVldFxuICAgICAgICAvL1xuICAgICAgICBmdW5jdGlvbiBzaGFyZVBvcHVwKCkge1xuICAgICAgICAgICAgJHNjb3BlLnNob3dTaGFyZVBvcHVwID0gISRzY29wZS5zaG93U2hhcmVQb3B1cDtcbiAgICAgICAgICAgICRzY29wZS5maWRkbGVVUkwgICAgICAgPSAnaHR0cDovL2dyYWZpZGRsZS5hcHBzcG90LmNvbS8nICsgJHN0YXRlLnBhcmFtcy5pZDtcbiAgICAgICAgICAgICRzY29wZS5maWRkbGVDaGFydFVSTCAgPSAnaHR0cDovL2dyYWZpZGRsZS5hcHBzcG90LmNvbS8nICsgJHN0YXRlLnBhcmFtcy5pZCArICcucG5nJztcbiAgICAgICAgICAgICRzY29wZS5maWRkbGVFbWJlZENvZGUgPSAnPGlmcmFtZSB3aWR0aD1cIjEwMCVcIiBoZWlnaHQ9XCIzMDBcIiBzcmM9XCIvL2dyYWZpZGRsZS5hcHBzcG90LmNvbS9lbWJlZC8nICsgJHN0YXRlLnBhcmFtcy5pZCArICdcIiBhbGxvd2Z1bGxzY3JlZW49XCJhbGxvd2Z1bGxzY3JlZW5cIiBmcmFtZWJvcmRlcj1cIjBcIj48L2lmcmFtZT4nO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQWxsb3cgc2hhcmUgdGV4dCBmaWVsZHMgdG8gYXV0b3NlbGVjdCBvbiBmb2N1c1xuICAgICAgICAvL1xuICAgICAgICBmdW5jdGlvbiBvblNoYXJlVGV4dENsaWNrKCRldmVudCkge1xuICAgICAgICAgICAgJGV2ZW50LnRhcmdldC5zZWxlY3QoKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBJbnNlcnQgZGVmYXVsdCBkYXRhXG4gICAgICAgIC8vXG4gICAgICAgIGZ1bmN0aW9uIGxvYWREZWZhdWx0RGF0YSgpIHtcbiAgICAgICAgICAgIHZhciBkYXRhc2V0ID0gW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgJ2RheSc6ICcyMDEzLTAxLTAyXzAwOjAwOjAwJyxcbiAgICAgICAgICAgICAgICAgICAgJ3NhbGVzJzogMzQ2MS4yOTUyMDIsXG4gICAgICAgICAgICAgICAgICAgICdpbmNvbWUnOiAxMjM2NS4wNTNcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgJ2RheSc6ICcyMDEzLTAxLTAzXzAwOjAwOjAwJyxcbiAgICAgICAgICAgICAgICAgICAgJ3NhbGVzJzogNDQ2MS4yOTUyMDIsXG4gICAgICAgICAgICAgICAgICAgICdpbmNvbWUnOiAxMzM2NS4wNTNcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgJ2RheSc6ICcyMDEzLTAxLTA0XzAwOjAwOjAwJyxcbiAgICAgICAgICAgICAgICAgICAgJ3NhbGVzJzogNDU2MS4yOTUyMDIsXG4gICAgICAgICAgICAgICAgICAgICdpbmNvbWUnOiAxNDM2NS4wNTNcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdO1xuICAgICAgICAgICAgdmFyIHNjaGVtYSA9IHtcbiAgICAgICAgICAgICAgICBkYXk6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2RhdGV0aW1lJyxcbiAgICAgICAgICAgICAgICAgICAgZm9ybWF0OiAnJVktJW0tJWRfJUg6JU06JVMnLFxuICAgICAgICAgICAgICAgICAgICBuYW1lOiAnRGF0ZSdcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdmFyIG9wdGlvbnMgPSB7XG4gICAgICAgICAgICAgICAgcm93czogW3tcbiAgICAgICAgICAgICAgICAgICAga2V5OiAnaW5jb21lJyxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2JhcidcbiAgICAgICAgICAgICAgICB9LCB7XG4gICAgICAgICAgICAgICAgICAgIGtleTogJ3NhbGVzJ1xuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgICAgICAgIHhBeGlzOiB7XG4gICAgICAgICAgICAgICAgICAgIGtleTogJ2RheScsXG4gICAgICAgICAgICAgICAgICAgIGRpc3BsYXlGb3JtYXQ6ICclWS0lbS0lZCAlSDolTTolUydcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAkc2NvcGUuY2hlY2twb2ludC5kYXRhc2V0U3RyaW5nID0gJyc7XG4gICAgICAgICAgICAkc2NvcGUuY2hlY2twb2ludC5kYXRhc2V0ID0gZGF0YXNldDtcbiAgICAgICAgICAgICRzY29wZS5jaGVja3BvaW50LnNjaGVtYVN0cmluZyA9ICcnO1xuICAgICAgICAgICAgJHNjb3BlLmNoZWNrcG9pbnQuc2NoZW1hID0gc2NoZW1hO1xuICAgICAgICAgICAgJHNjb3BlLmNoZWNrcG9pbnQub3B0aW9uc1N0cmluZyA9ICcnO1xuICAgICAgICAgICAgJHNjb3BlLmNoZWNrcG9pbnQub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBzZXRDaGVja3BvaW50KGNoZWNrcG9pbnQpIHtcbiAgICAgICAgICAgICRzY29wZS5jaGVja3BvaW50LmRhdGFzZXRTdHJpbmcgPSAnJztcbiAgICAgICAgICAgICRzY29wZS5jaGVja3BvaW50LmRhdGFzZXQgPSBjaGVja3BvaW50LmRhdGE7XG4gICAgICAgICAgICAkc2NvcGUuY2hlY2twb2ludC5zY2hlbWFTdHJpbmcgPSAnJztcbiAgICAgICAgICAgICRzY29wZS5jaGVja3BvaW50LnNjaGVtYSA9IHt9O1xuICAgICAgICAgICAgJHNjb3BlLmNoZWNrcG9pbnQub3B0aW9uc1N0cmluZyA9ICcnO1xuICAgICAgICAgICAgJHNjb3BlLmNoZWNrcG9pbnQub3B0aW9ucyA9IGNoZWNrcG9pbnQub3B0aW9ucztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFN5bmMgT2JqZWN0IGFuZCBTdHJpbmcgcmVwcmVzZW50YXRpb25cbiAgICAgICAgLy9cbiAgICAgICAgZnVuY3Rpb24gc3luY09wdGlvbnMoKSB7XG4gICAgICAgICAgICAkc2NvcGUuJHdhdGNoKCdjaGVja3BvaW50Lm9wdGlvbnMnLCBmdW5jdGlvbiAoanNvbikge1xuICAgICAgICAgICAgICAgICRzY29wZS5jaGVja3BvaW50Lm9wdGlvbnNTdHJpbmcgPSAkZmlsdGVyKCdqc29uJykoanNvbik7XG4gICAgICAgICAgICB9LCB0cnVlKTtcblxuICAgICAgICAgICAgJHNjb3BlLiR3YXRjaCgnY2hlY2twb2ludC5vcHRpb25zU3RyaW5nJywgZnVuY3Rpb24gKGpzb24pIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY2hlY2twb2ludC5vcHRpb25zID0gSlNPTi5wYXJzZShqc29uKTtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLndlbGxGb3JtZWRPcHRpb25zID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgdXBkYXRlT3B0aW9uc1VJKGpzb24pO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLndlbGxGb3JtZWRPcHRpb25zID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgdHJ1ZSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTeW5jIE9iamVjdCBhbmQgU3RyaW5nIHJlcHJlc2VudGF0aW9uXG4gICAgICAgIC8vXG4gICAgICAgIGZ1bmN0aW9uIHN5bmNEYXRhc2V0KCkge1xuICAgICAgICAgICAgJHNjb3BlLiR3YXRjaCgnY2hlY2twb2ludC5kYXRhc2V0JywgZnVuY3Rpb24gKGpzb24pIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUuY2hlY2twb2ludC5kYXRhc2V0U3RyaW5nID0gJGZpbHRlcignanNvbicpKGpzb24pO1xuICAgICAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgICAgICRzY29wZS4kd2F0Y2goJ2NoZWNrcG9pbnQuZGF0YXNldFN0cmluZycsIGZ1bmN0aW9uIChqc29uKSB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmNoZWNrcG9pbnQuZGF0YXNldCA9IEpTT04ucGFyc2UoanNvbik7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS53ZWxsRm9ybWVkRGF0YXNldCA9IHRydWU7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUud2VsbEZvcm1lZERhdGFzZXQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCB0cnVlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFkZCB0aW1lc3RhbXAgdG8gb3B0aW9ucyB0byByZWRyYXdcbiAgICAgICAgLy9cbiAgICAgICAgZnVuY3Rpb24gb3BkYXRlT3B0aW9ucygpIHtcbiAgICAgICAgICAgIC8vIElzIGNhbGxlZCB0byBvZnRlbiwgbm90IG9ubHkgb24gcmVzaXplXG4gICAgICAgICAgICAvLyRzY29wZS5jaGVja3BvaW50Lm9wdGlvbnMudXBkYXRlZCA9IG5ldyBEYXRlKCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBUcmlnZ2VyIG5ldyByZW5kZXIgb24gcmVzaXplXG4gICAgICAgIC8vXG4gICAgICAgIGZ1bmN0aW9uIHVwZGF0ZU9uUmVzaXplKCkge1xuICAgICAgICAgICAgdmFyIG15RWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjaGFydEFyZWEnKTtcbiAgICAgICAgICAgIGFkZFJlc2l6ZUxpc3RlbmVyKG15RWxlbWVudCwgb3BkYXRlT3B0aW9ucyk7XG5cbiAgICAgICAgICAgICRzY29wZS4kb24oXCIkZGVzdHJveVwiLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmVtb3ZlUmVzaXplTGlzdGVuZXIobXlFbGVtZW50LCBvcGRhdGVPcHRpb25zKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICB9XG5cbiAgICBhbmd1bGFyXG4gICAgICAgIC5tb2R1bGUoJ2dyYWZpZGRsZScpXG4gICAgICAgIC5jb250cm9sbGVyKCdFZGl0b3JDb250cm9sbGVyJywgRWRpdG9yQ29udHJvbGxlcik7XG5cbn0pKCk7XG4iLCIoZnVuY3Rpb24gKCkge1xuXG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgZnVuY3Rpb24gc3RhdGVzQ29uZmlndXJhdGlvbigkc3RhdGVQcm92aWRlciwgJHVybFJvdXRlclByb3ZpZGVyLCAkbG9jYXRpb25Qcm92aWRlcikge1xuXG4gICAgICAgICRzdGF0ZVByb3ZpZGVyXG4gICAgICAgICAgICAuc3RhdGUoJzQwNCcsIHtcbiAgICAgICAgICAgICAgICB2aWV3czoge1xuICAgICAgICAgICAgICAgICAgICBjb250ZW50OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ2NvbXBvbmVudHMvY29tbW9uLzQwNC80MDQuaHRtbCdcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuc3RhdGUoJ2VtYmVkJywge1xuICAgICAgICAgICAgICAgIHVybDogJy9lbWJlZCcsXG4gICAgICAgICAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAgICAgICAgICAgY29udGVudDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdjb21wb25lbnRzL2VtYmVkL2VtYmVkLmh0bWwnLFxuICAgICAgICAgICAgICAgICAgICAgICAgY29udHJvbGxlcjogJ0VtYmVkQ29udHJvbGxlcidcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuc3RhdGUoJ3RyZWUnLCB7XG4gICAgICAgICAgICAgICAgdXJsOiAnLzppZC90cmVlJyxcbiAgICAgICAgICAgICAgICB2aWV3czoge1xuICAgICAgICAgICAgICAgICAgICBjb250ZW50OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ2NvbXBvbmVudHMvdHJlZS90cmVlLmh0bWwnLFxuICAgICAgICAgICAgICAgICAgICAgICAgY29udHJvbGxlcjogJ1RyZWVDb250cm9sbGVyJ1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5zdGF0ZSgnZWRpdG9yJywge1xuICAgICAgICAgICAgICAgIHVybDogJy86aWQnLFxuICAgICAgICAgICAgICAgIHZpZXdzOiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnY29tcG9uZW50cy9lZGl0b3IvZWRpdG9yLmh0bWwnLFxuICAgICAgICAgICAgICAgICAgICAgICAgY29udHJvbGxlcjogJ0VkaXRvckNvbnRyb2xsZXInXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAvKiBAbmdJbmplY3QgKi9cbiAgICAgICAgJHVybFJvdXRlclByb3ZpZGVyLm90aGVyd2lzZShmdW5jdGlvbiAoJGluamVjdG9yLCAkbG9jYXRpb24pIHtcbiAgICAgICAgICAgIC8vIFVzZXJTZXJ2aWNlICYgJHN0YXRlIG5vdCBhdmFpbGFibGUgZHVyaW5nIC5jb25maWcoKSwgaW5qZWN0IHRoZW0gKG1hbnVhbGx5KSBsYXRlclxuXG4gICAgICAgICAgICAvLyByZXF1ZXN0aW5nIHVua25vd24gcGFnZSB1bmVxdWFsIHRvICcvJ1xuICAgICAgICAgICAgdmFyIHBhdGggPSAkbG9jYXRpb24ucGF0aCgpO1xuICAgICAgICAgICAgaWYgKHBhdGggIT09ICcvJykge1xuICAgICAgICAgICAgICAgICRpbmplY3Rvci5nZXQoJyRzdGF0ZScpLmdvKCc0MDQnKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcGF0aDsgLy8gdGhpcyB0cmljayBhbGxvd3MgdG8gc2hvdyB0aGUgZXJyb3IgcGFnZSBvbiB1bmtub3duIGFkZHJlc3NcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuICcvbmV3JztcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJGxvY2F0aW9uUHJvdmlkZXJcbiAgICAgICAgICAgIC5odG1sNU1vZGUodHJ1ZSlcbiAgICAgICAgICAgIC5oYXNoUHJlZml4KCchJyk7XG4gICAgfVxuXG5cbiAgICBhbmd1bGFyXG4gICAgICAgIC5tb2R1bGUoJ2dyYWZpZGRsZScpXG4gICAgICAgIC5jb25maWcoc3RhdGVzQ29uZmlndXJhdGlvbik7XG5cbn0pKCk7IiwiKGZ1bmN0aW9uKCl7XG5cbiAgICB2YXIgYXR0YWNoRXZlbnQgPSBkb2N1bWVudC5hdHRhY2hFdmVudDtcbiAgICB2YXIgaXNJRSA9IG5hdmlnYXRvci51c2VyQWdlbnQubWF0Y2goL1RyaWRlbnQvKTtcbiAgICB2YXIgcmVxdWVzdEZyYW1lID0gKGZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciByYWYgPSB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8IHdpbmRvdy5tb3pSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHwgd2luZG93LndlYmtpdFJlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuICAgICAgICAgICAgZnVuY3Rpb24oZm4peyByZXR1cm4gd2luZG93LnNldFRpbWVvdXQoZm4sIDIwKTsgfTtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKGZuKXsgcmV0dXJuIHJhZihmbik7IH07XG4gICAgfSkoKTtcblxuICAgIHZhciBjYW5jZWxGcmFtZSA9IChmdW5jdGlvbigpe1xuICAgICAgICB2YXIgY2FuY2VsID0gd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lIHx8IHdpbmRvdy5tb3pDYW5jZWxBbmltYXRpb25GcmFtZSB8fCB3aW5kb3cud2Via2l0Q2FuY2VsQW5pbWF0aW9uRnJhbWUgfHxcbiAgICAgICAgICAgIHdpbmRvdy5jbGVhclRpbWVvdXQ7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbihpZCl7IHJldHVybiBjYW5jZWwoaWQpOyB9O1xuICAgIH0pKCk7XG5cbiAgICBmdW5jdGlvbiByZXNpemVMaXN0ZW5lcihlKXtcbiAgICAgICAgdmFyIHdpbiA9IGUudGFyZ2V0IHx8IGUuc3JjRWxlbWVudDtcbiAgICAgICAgaWYgKHdpbi5fX3Jlc2l6ZVJBRl9fKSBjYW5jZWxGcmFtZSh3aW4uX19yZXNpemVSQUZfXyk7XG4gICAgICAgIHdpbi5fX3Jlc2l6ZVJBRl9fID0gcmVxdWVzdEZyYW1lKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICB2YXIgdHJpZ2dlciA9IHdpbi5fX3Jlc2l6ZVRyaWdnZXJfXztcbiAgICAgICAgICAgIHRyaWdnZXIuX19yZXNpemVMaXN0ZW5lcnNfXy5mb3JFYWNoKGZ1bmN0aW9uKGZuKXtcbiAgICAgICAgICAgICAgICBmbi5jYWxsKHRyaWdnZXIsIGUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG9iamVjdExvYWQoZSl7XG4gICAgICAgIHRoaXMuY29udGVudERvY3VtZW50LmRlZmF1bHRWaWV3Ll9fcmVzaXplVHJpZ2dlcl9fID0gdGhpcy5fX3Jlc2l6ZUVsZW1lbnRfXztcbiAgICAgICAgdGhpcy5jb250ZW50RG9jdW1lbnQuZGVmYXVsdFZpZXcuYWRkRXZlbnRMaXN0ZW5lcigncmVzaXplJywgcmVzaXplTGlzdGVuZXIpO1xuICAgIH1cblxuICAgIHdpbmRvdy5hZGRSZXNpemVMaXN0ZW5lciA9IGZ1bmN0aW9uKGVsZW1lbnQsIGZuKXtcbiAgICAgICAgaWYgKCFlbGVtZW50Ll9fcmVzaXplTGlzdGVuZXJzX18pIHtcbiAgICAgICAgICAgIGVsZW1lbnQuX19yZXNpemVMaXN0ZW5lcnNfXyA9IFtdO1xuICAgICAgICAgICAgaWYgKGF0dGFjaEV2ZW50KSB7XG4gICAgICAgICAgICAgICAgZWxlbWVudC5fX3Jlc2l6ZVRyaWdnZXJfXyA9IGVsZW1lbnQ7XG4gICAgICAgICAgICAgICAgZWxlbWVudC5hdHRhY2hFdmVudCgnb25yZXNpemUnLCByZXNpemVMaXN0ZW5lcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoZ2V0Q29tcHV0ZWRTdHlsZShlbGVtZW50KS5wb3NpdGlvbiA9PSAnc3RhdGljJykgZWxlbWVudC5zdHlsZS5wb3NpdGlvbiA9ICdyZWxhdGl2ZSc7XG4gICAgICAgICAgICAgICAgdmFyIG9iaiA9IGVsZW1lbnQuX19yZXNpemVUcmlnZ2VyX18gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdvYmplY3QnKTtcbiAgICAgICAgICAgICAgICBvYmouc2V0QXR0cmlidXRlKCdzdHlsZScsICdkaXNwbGF5OiBibG9jazsgcG9zaXRpb246IGFic29sdXRlOyB0b3A6IDA7IGxlZnQ6IDA7IGhlaWdodDogMTAwJTsgd2lkdGg6IDEwMCU7IG92ZXJmbG93OiBoaWRkZW47IHBvaW50ZXItZXZlbnRzOiBub25lOyB6LWluZGV4OiAtMTsnKTtcbiAgICAgICAgICAgICAgICBvYmouX19yZXNpemVFbGVtZW50X18gPSBlbGVtZW50O1xuICAgICAgICAgICAgICAgIG9iai5vbmxvYWQgPSBvYmplY3RMb2FkO1xuICAgICAgICAgICAgICAgIG9iai50eXBlID0gJ3RleHQvaHRtbCc7XG4gICAgICAgICAgICAgICAgaWYgKGlzSUUpIGVsZW1lbnQuYXBwZW5kQ2hpbGQob2JqKTtcbiAgICAgICAgICAgICAgICBvYmouZGF0YSA9ICdhYm91dDpibGFuayc7XG4gICAgICAgICAgICAgICAgaWYgKCFpc0lFKSBlbGVtZW50LmFwcGVuZENoaWxkKG9iaik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxlbWVudC5fX3Jlc2l6ZUxpc3RlbmVyc19fLnB1c2goZm4pO1xuICAgIH07XG5cbiAgICB3aW5kb3cucmVtb3ZlUmVzaXplTGlzdGVuZXIgPSBmdW5jdGlvbihlbGVtZW50LCBmbil7XG4gICAgICAgIGVsZW1lbnQuX19yZXNpemVMaXN0ZW5lcnNfXy5zcGxpY2UoZWxlbWVudC5fX3Jlc2l6ZUxpc3RlbmVyc19fLmluZGV4T2YoZm4pLCAxKTtcbiAgICAgICAgaWYgKCFlbGVtZW50Ll9fcmVzaXplTGlzdGVuZXJzX18ubGVuZ3RoKSB7XG4gICAgICAgICAgICBpZiAoYXR0YWNoRXZlbnQpIGVsZW1lbnQuZGV0YWNoRXZlbnQoJ29ucmVzaXplJywgcmVzaXplTGlzdGVuZXIpO1xuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgZWxlbWVudC5fX3Jlc2l6ZVRyaWdnZXJfXy5jb250ZW50RG9jdW1lbnQuZGVmYXVsdFZpZXcucmVtb3ZlRXZlbnRMaXN0ZW5lcigncmVzaXplJywgcmVzaXplTGlzdGVuZXIpO1xuICAgICAgICAgICAgICAgIGVsZW1lbnQuX19yZXNpemVUcmlnZ2VyX18gPSAhZWxlbWVudC5yZW1vdmVDaGlsZChlbGVtZW50Ll9fcmVzaXplVHJpZ2dlcl9fKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBcbn0pKCk7IiwiKGZ1bmN0aW9uICgpIHtcblxuICAgIGZ1bmN0aW9uIEFwcENvbnRyb2xsZXIoJHNjb3BlKSB7XG5cbiAgICAgICAgJHNjb3BlLm1ldGFkYXRhID0ge307XG4gICAgICAgICRzY29wZS5tZXRhZGF0YS5wYWdlVGl0bGUgPSAnU2hhcmUgeW91ciB2aXN1YWxpemF0aW9ucyBvbiBncmFmaWRkbGUnO1xuICAgICAgICAkc2NvcGUubWV0YWRhdGEub2cgPSB7XG4gICAgICAgICAgICAnb2c6dHlwZSc6ICdhcnRpY2xlJyxcbiAgICAgICAgICAgICdhcnRpY2xlOnNlY3Rpb24nOiAnU2hhcmFibGUgZGF0YSB2aXN1YWxpemF0aW9uJyxcbiAgICAgICAgICAgICdvZzp0aXRsZSc6ICdTaGFyZSB5b3VyIHZpc3VhbGl6YXRpb25zIG9uIGdyYWZpZGRsZScsXG4gICAgICAgICAgICAnb2c6aW1hZ2UnOiAnJyxcbiAgICAgICAgICAgICdvZzpkZXNjcmlwdGlvbic6ICdTaGFyYWJsZSBkYXRhIHZpc3VhbGl6YXRpb24nXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgYW5ndWxhclxuICAgICAgICAubW9kdWxlKCdncmFmaWRkbGUnKVxuICAgICAgICAuY29udHJvbGxlcignQXBwQ29udHJvbGxlcicsIEFwcENvbnRyb2xsZXIpO1xuXG59KSgpO1xuIiwiKGZ1bmN0aW9uICgpIHtcblxuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGZ1bmN0aW9uIENoZWNrcG9pbnRFbmRwb2ludCgkcmVzb3VyY2UsIEVOVikge1xuICAgICAgICByZXR1cm4gJHJlc291cmNlKEVOVi5hcGkgKyAnY2hlY2twb2ludC86aWQnLCB7XG4gICAgICAgICAgICBpZDogJ0BpZCdcbiAgICAgICAgfSwge1xuICAgICAgICAgICAgc2F2ZToge1xuICAgICAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZ2V0OiB7XG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnR0VUJ1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBhbmd1bGFyXG4gICAgICAgIC5tb2R1bGUoJ2dyYWZpZGRsZScpXG4gICAgICAgIC5mYWN0b3J5KCdDaGVja3BvaW50RW5kcG9pbnQnLCBDaGVja3BvaW50RW5kcG9pbnQpO1xuXG59KSgpO1xuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9