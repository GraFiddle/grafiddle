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

    function TreeController($scope, $state) {

        $scope.checkpoint = {
            id: $state.params.id
        };
        console.log($scope.checkpoint);

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
                    console.log(d.id, $scope.checkpoint.id);
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
    TreeController.$inject = ["$scope", "$state"];

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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImNvbW1vbi9vbi1yZWFkLWZpbGUvb24tcmVhZC1maWxlLWRpcmVjdGl2ZS5qcyIsInRyZWUvdHJlZS1jb250cm9sbGVyLmpzIiwiZW1iZWQvZW1iZWQtY29udHJvbGxlci5qcyIsImVkaXRvci9lZGl0b3ItY29udHJvbGxlci5qcyIsImNvbW1vbi9zdGF0ZXMuY29uZmlnLmpzIiwiY29tbW9uL29ucmVzaXplLmpzIiwiY29tbW9uL2FwcC1jb250cm9sbGVyLmpzIiwiY2hlY2twb2ludC9jaGVja3BvaW50LWVuZHBvaW50LmpzIiwidHJlZS90cmVlLWVuZHBvaW50LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLENBQUMsWUFBWTs7RUFFWDs7RUFFQTtLQUNHLE9BQU8sYUFBYTtNQUNuQjtNQUNBO01BQ0E7TUFDQTtNQUNBO01BQ0E7TUFDQTtNQUNBO01BQ0E7Ozs7QUFJTjtBQ2xCQSxDQUFDLFlBQVk7O0lBRVQ7Ozs7Ozs7Ozs7Ozs7OztJQWVBLFNBQVMsV0FBVyxRQUFRO1FBQ3hCLE9BQU87WUFDSCxVQUFVO1lBQ1YsT0FBTztZQUNQLE1BQU0sU0FBUyxPQUFPLFNBQVMsT0FBTztnQkFDbEMsSUFBSSxLQUFLLE9BQU8sTUFBTTs7Z0JBRXRCLFFBQVEsR0FBRyxVQUFVLFNBQVMsZUFBZTtvQkFDekMsSUFBSSxTQUFTLElBQUk7O29CQUVqQixPQUFPLFNBQVMsU0FBUyxhQUFhO3dCQUNsQyxNQUFNLE9BQU8sV0FBVzs0QkFDcEIsR0FBRyxPQUFPLENBQUMsYUFBYSxZQUFZLE9BQU87Ozs7b0JBSW5ELE9BQU8sV0FBVyxDQUFDLGNBQWMsY0FBYyxjQUFjLFFBQVEsTUFBTTs7Ozs7OztJQU0zRjtTQUNLLE9BQU87U0FDUCxVQUFVLGNBQWM7OztBQUdqQztBQzVDQSxDQUFDLFlBQVk7O0lBRVQsU0FBUyxlQUFlLFFBQVEsUUFBUTs7UUFFcEMsT0FBTyxhQUFhO1lBQ2hCLElBQUksT0FBTyxPQUFPOztRQUV0QixRQUFRLElBQUksT0FB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QUs7Z0JBQ0QsUUFBUTs7Ozs7O0lBS3BCO1NBQ0ssT0FBTztTQUNQLFFBQVEsc0JBQXNCOzs7QUFHdkM7QUN0QkEsQ0FBQyxZQUFZOztJQUVUOztJQUVBLFNBQVMsYUFBYSxXQUFXLEtBQUs7UUFDbEMsT0FBTyxVQUFVLElBQUksTUFBTSxZQUFZO1lBQ25DLElBQUk7V0FDTDtZQUNDLEtBQUs7Z0JBQ0QsUUFBUTs7Ozs7O0lBS3BCO1NBQ0ssT0FBTztTQUNQLFFBQVEsZ0JBQWdCOzs7QUFHakMiLCJmaWxlIjoic2NyaXB0cy5qcyIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiAoKSB7XG5cbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIGFuZ3VsYXJcbiAgICAubW9kdWxlKCdncmFmaWRkbGUnLCBbXG4gICAgICAnZ3JhZmlkZGxlLmNvbmZpZycsXG4gICAgICAnZ3JhZmlkZGxlLnRlbXBsYXRlcycsXG4gICAgICAnbmdSZXNvdXJjZScsXG4gICAgICAnbmdTYW5pdGl6ZScsXG4gICAgICAnbmdBbmltYXRlJyxcbiAgICAgICd1aS5yb3V0ZXInLFxuICAgICAgJ3VpLmxheW91dCcsXG4gICAgICAndWkuYWNlJyxcbiAgICAgICdhbmd1bGFyQ2hhcnQnXG4gICAgXSk7XG5cbn0pKCk7XG4iLCIoZnVuY3Rpb24gKCkge1xuXG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgLyoqXG4gICAgICogQG5nZG9jIGRpcmVjdGl2ZVxuICAgICAqIEBuYW1lIGdyYWZpZGRsZS5kaXJlY3RpdmU6b25SZWFkRmlsZVxuICAgICAqIEByZXF1aXJlcyAkcGFyc2VcbiAgICAgKiBAcmVxdWlyZXMgJGxvZ1xuICAgICAqIEByZXN0cmljdCBBXG4gICAgICpcbiAgICAgKiBAZGVzY3JpcHRpb25cbiAgICAgKiBUaGUgYG9uUmVhZEZpbGVgIGRpcmVjdGl2ZSBvcGVucyB1cCBhIEZpbGVSZWFkZXIgZGlhbG9nIHRvIHVwbG9hZCBmaWxlcyBmcm9tIHRoZSBsb2NhbCBmaWxlc3lzdGVtLlxuICAgICAqXG4gICAgICogQGVsZW1lbnQgQU5ZXG4gICAgICogQG5nSW5qZWN0XG4gICAgICovXG4gICAgZnVuY3Rpb24gb25SZWFkRmlsZSgkcGFyc2UpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnQScsXG4gICAgICAgICAgICBzY29wZTogZmFsc2UsXG4gICAgICAgICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcbiAgICAgICAgICAgICAgICB2YXIgZm4gPSAkcGFyc2UoYXR0cnMub25SZWFkRmlsZSk7XG5cbiAgICAgICAgICAgICAgICBlbGVtZW50Lm9uKCdjaGFuZ2UnLCBmdW5jdGlvbihvbkNoYW5nZUV2ZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpO1xuXG4gICAgICAgICAgICAgICAgICAgIHJlYWRlci5vbmxvYWQgPSBmdW5jdGlvbihvbkxvYWRFdmVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUuJGFwcGx5KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZuKHNjb3BlLCB7JGZpbGVDb250ZW50Om9uTG9hZEV2ZW50LnRhcmdldC5yZXN1bHR9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgICAgIHJlYWRlci5yZWFkQXNUZXh0KChvbkNoYW5nZUV2ZW50LnNyY0VsZW1lbnQgfHwgb25DaGFuZ2VFdmVudC50YXJnZXQpLmZpbGVzWzBdKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBhbmd1bGFyXG4gICAgICAgIC5tb2R1bGUoJ2dyYWZpZGRsZScpXG4gICAgICAgIC5kaXJlY3RpdmUoJ29uUmVhZEZpbGUnLCBvblJlYWRGaWxlKTtcblxufSkoKTtcbiIsIihmdW5jdGlvbiAoKSB7XG5cbiAgICBmdW5jdGlvbiBUcmVlQ29udHJvbGxlcigkc2NvcGUsICRzdGF0ZSkge1xuXG4gICAgICAgICRzY29wZS5jaGVja3BvaW50ID0ge1xuICAgICAgICAgICAgaWQ6ICRzdGF0ZS5wYXJhbXMuaWRcbiAgICAgICAgfTtcbiAgICAgICAgY29uc29sZS5sb2coJHNjb3BlLmNoZWNrcG9pbnQpO1xuXG4gICAgICAgIGZ1bmN0aW9uIGNsaWNrKGQpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGQpO1xuICAgICAgICAgICAgJHN0YXRlLmdvKCdlZGl0b3InLCB7aWQ6IGQuaWR9KTtcbiAgICAgICAgfVxuXG5cbiAgICAgICAgdmFyIHRyZWVEYXRhID0gW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIlRvcCBMZXZlbFwiLFxuICAgICAgICAgICAgICAgIFwiY2hpbGRyZW5cIjogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJMZXZlbCAyOiBBXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcImF1dGhvclwiOiBcIlBldGVyXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcImlkXCI6IDEyMzQsXG4gICAgICAgICAgICAgICAgICAgICAgICBcImNoaWxkcmVuXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIlNvbiBvZiBBXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiRGF1Z2h0ZXIgb2YgQVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcImlkXCI6IDEyM1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiTGV2ZWwgMjogQlwiXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIkxldmVsIDI6IEJcIlxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJMZXZlbCAyOiBCXCJcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiTGV2ZWwgMjogQlwiXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIkxldmVsIDI6IEJcIlxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgfVxuICAgICAgICBdO1xuXG4gICAgICAgIC8vICoqKioqKioqKioqKioqIEdlbmVyYXRlIHRoZSB0cmVlIGRpYWdyYW1cdCAqKioqKioqKioqKioqKioqKlxuICAgICAgICB2YXIgbWFyZ2luID0ge3RvcDogNDAsIHJpZ2h0OiAwLCBib3R0b206IDIwLCBsZWZ0OiAwfSxcbiAgICAgICAgICAgIHdpZHRoID0gOTAwIC0gbWFyZ2luLnJpZ2h0IC0gbWFyZ2luLmxlZnQsXG4gICAgICAgICAgICBoZWlnaHQgPSA3MDAgLSBtYXJnaW4udG9wIC0gbWFyZ2luLmJvdHRvbTtcblxuICAgICAgICB2YXIgaSA9IDA7XG5cbiAgICAgICAgdmFyIHRyZWUgPSBkMy5sYXlvdXQudHJlZSgpXG4gICAgICAgICAgICAuc2l6ZShbaGVpZ2h0LCB3aWR0aF0pO1xuXG4gICAgICAgIHZhciBkaWFnb25hbCA9IGQzLnN2Zy5kaWFnb25hbCgpXG4gICAgICAgICAgICAucHJvamVjdGlvbihmdW5jdGlvbihkKSB7IHJldHVybiBbZC54LCBkLnldOyB9KTtcblxuICAgICAgICB2YXIgc3ZnID0gZDMuc2VsZWN0KFwiI3RyZWVcIikuYXBwZW5kKFwic3ZnXCIpXG4gICAgICAgICAgICAuYXR0cihcIndpZHRoXCIsIHdpZHRoICsgbWFyZ2luLnJpZ2h0ICsgbWFyZ2luLmxlZnQpXG4gICAgICAgICAgICAuYXR0cihcImhlaWdodFwiLCBoZWlnaHQgKyBtYXJnaW4udG9wICsgbWFyZ2luLmJvdHRvbSlcbiAgICAgICAgICAgIC5hcHBlbmQoXCJnXCIpXG4gICAgICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZShcIiArIG1hcmdpbi5sZWZ0ICsgXCIsXCIgKyBtYXJnaW4udG9wICsgXCIpXCIpO1xuXG4gICAgICAgIHJvb3QgPSB0cmVlRGF0YVswXTtcblxuICAgICAgICB1cGRhdGUocm9vdCk7XG5cbiAgICAgICAgZnVuY3Rpb24gdXBkYXRlKHNvdXJjZSkge1xuXG4gICAgICAgICAgICAvLyBDb21wdXRlIHRoZSBuZXcgdHJlZSBsYXlvdXQuXG4gICAgICAgICAgICB2YXIgbm9kZXMgPSB0cmVlLm5vZGVzKHJvb3QpLnJldmVyc2UoKSxcbiAgICAgICAgICAgICAgICBsaW5rcyA9IHRyZWUubGlua3Mobm9kZXMpO1xuXG4gICAgICAgICAgICAvLyBOb3JtYWxpemUgZm9yIGZpeGVkLWRlcHRoLlxuICAgICAgICAgICAgbm9kZXMuZm9yRWFjaChmdW5jdGlvbihkKSB7IGQueSA9IGQuZGVwdGggKiAxMDA7IH0pO1xuXG4gICAgICAgICAgICAvLyBEZWNsYXJlIHRoZSBub2Rlc+KAplxuICAgICAgICAgICAgdmFyIG5vZGUgPSBzdmcuc2VsZWN0QWxsKFwiZy5ub2RlXCIpXG4gICAgICAgICAgICAgICAgLmRhdGEobm9kZXMsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQuaWQgfHwgKGQuaWQgPSArK2kpOyB9KTtcblxuICAgICAgICAgICAgLy8gRW50ZXIgdGhlIG5vZGVzLlxuICAgICAgICAgICAgdmFyIG5vZGVFbnRlciA9IG5vZGUuZW50ZXIoKS5hcHBlbmQoXCJnXCIpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcIm5vZGVcIilcbiAgICAgICAgICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBcInRyYW5zbGF0ZShcIiArIGQueCArIFwiLFwiICsgZC55ICsgXCIpXCI7IH0pXG4gICAgICAgICAgICAgICAgLm9uKFwiY2xpY2tcIiwgY2xpY2spOztcblxuICAgICAgICAgICAgbm9kZUVudGVyLmFwcGVuZChcImNpcmNsZVwiKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwiclwiLCAxMClcbiAgICAgICAgICAgICAgICAuc3R5bGUoXCJmaWxsXCIsIFwiI2ZmZlwiKTtcblxuICAgICAgICAgICAgbm9kZUVudGVyLmFwcGVuZChcInRleHRcIilcbiAgICAgICAgICAgICAgICAuYXR0cihcInlcIiwgZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZC5jaGlsZHJlbiB8fCBkLl9jaGlsZHJlbiA/IC0xOCA6IDE4OyB9KVxuICAgICAgICAgICAgICAgIC5hdHRyKFwiZHlcIiwgXCIuMzVlbVwiKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwidGV4dC1hbmNob3JcIiwgXCJtaWRkbGVcIilcbiAgICAgICAgICAgICAgICAudGV4dChmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB0ZXh0ID0gZC5uYW1lO1xuICAgICAgICAgICAgICAgICAgICAvLyArICcgYnkgJyArIGQuYXV0aG9yO1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhkLmlkLCAkc2NvcGUuY2hlY2twb2ludC5pZCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChkLmlkID09ICRzY29wZS5jaGVja3BvaW50LmlkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXh0ICs9ICcgKGN1cnJlbnQpJztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGV4dDtcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC5zdHlsZShcImZpbGwtb3BhY2l0eVwiLCAxKTtcblxuICAgICAgICAgICAgLy8gRGVjbGFyZSB0aGUgbGlua3PigKZcbiAgICAgICAgICAgIHZhciBsaW5rID0gc3ZnLnNlbGVjdEFsbChcInBhdGgubGlua1wiKVxuICAgICAgICAgICAgICAgIC5kYXRhKGxpbmtzLCBmdW5jdGlvbihkKSB7IHJldHVybiBkLnRhcmdldC5pZDsgfSk7XG5cbiAgICAgICAgICAgIC8vIEVudGVyIHRoZSBsaW5rcy5cbiAgICAgICAgICAgIGxpbmsuZW50ZXIoKS5pbnNlcnQoXCJwYXRoXCIsIFwiZ1wiKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJsaW5rXCIpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJkXCIsIGRpYWdvbmFsKTtcblxuICAgICAgICB9XG4gICAgfVxuXG4gICAgYW5ndWxhclxuICAgICAgICAubW9kdWxlKCdncmFmaWRkbGUnKVxuICAgICAgICAuY29udHJvbGxlcignVHJlZUNvbnRyb2xsZXInLCBUcmVlQ29udHJvbGxlcik7XG5cbn0pKCk7IiwiKGZ1bmN0aW9uICgpIHtcblxuICAgIGZ1bmN0aW9uIEVtYmVkQ29udHJvbGxlcigkc2NvcGUsICRmaWx0ZXIsICRsb2NhdGlvbikge1xuXG4gICAgICAgICRzY29wZS5maWRkbGVpZCA9ICRsb2NhdGlvbi5wYXRoKCkuc3Vic3RyKDEpLnNwbGl0KCc/JywgMSlbMF07XG5cbiAgICAgICAgJHNjb3BlLmVtYmVkVmlldyA9ICdjaGFydCc7XG4gICAgICAgIHZhciByZXF1ZXN0VmlldyA9ICRsb2NhdGlvbi5zZWFyY2goKS52aWV3O1xuICAgICAgICBpZihyZXF1ZXN0Vmlldykge1xuICAgICAgICAgICAgJHNjb3BlLmVtYmVkVmlldyA9IHJlcXVlc3RWaWV3O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAkc2NvcGUuc2V0VmlldyA9IGZ1bmN0aW9uKG5ld1ZpZXcpIHtcbiAgICAgICAgICAgICRzY29wZS5lbWJlZFZpZXcgPSBuZXdWaWV3O1xuICAgICAgICAgICAgJHNjb3BlLm9wdGlvbnNFZGl0b3IucmVzaXplKCk7XG4gICAgICAgICAgICAkc2NvcGUuZGF0YUVkaXRvci5yZXNpemUoKTtcbiAgICAgICAgICAgICRzY29wZS5vcHRpb25zRWRpdG9yLnJlbmRlcmVyLnVwZGF0ZUZ1bGwoKTtcbiAgICAgICAgICAgICRzY29wZS5kYXRhRWRpdG9yLnJlbmRlcmVyLnVwZGF0ZUZ1bGwoKTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuaXNWaWV3ID0gZnVuY3Rpb24odmlldykge1xuICAgICAgICAgICAgcmV0dXJuIHZpZXcgPT0gJHNjb3BlLmVtYmVkVmlldztcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuZGF0YXNldFN0cmluZyA9ICcnO1xuICAgICAgICAkc2NvcGUuZGF0YXNldCA9IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAnZGF5JzogJzIwMTMtMDEtMDJfMDA6MDA6MDAnLFxuICAgICAgICAgICAgICAgICdzYWxlcyc6IDM0NjEuMjk1MjAyLFxuICAgICAgICAgICAgICAgICdpbmNvbWUnOiAxMjM2NS4wNTNcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgJ2RheSc6ICcyMDEzLTAxLTAzXzAwOjAwOjAwJyxcbiAgICAgICAgICAgICAgICAnc2FsZXMnOiA0NDYxLjI5NTIwMixcbiAgICAgICAgICAgICAgICAnaW5jb21lJzogMTMzNjUuMDUzXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICdkYXknOiAnMjAxMy0wMS0wNF8wMDowMDowMCcsXG4gICAgICAgICAgICAgICAgJ3NhbGVzJzogNDU2MS4yOTUyMDIsXG4gICAgICAgICAgICAgICAgJ2luY29tZSc6IDE0MzY1LjA1M1xuICAgICAgICAgICAgfVxuICAgICAgICBdO1xuXG4gICAgICAgICRzY29wZS5zY2hlbWEgPSB7XG4gICAgICAgICAgICBkYXk6IHtcbiAgICAgICAgICAgICAgICB0eXBlOiAnZGF0ZXRpbWUnLFxuICAgICAgICAgICAgICAgIGZvcm1hdDogJyVZLSVtLSVkXyVIOiVNOiVTJyxcbiAgICAgICAgICAgICAgICBuYW1lOiAnRGF0ZSdcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUub3B0aW9uc1N0cmluZyA9ICcnO1xuICAgICAgICAkc2NvcGUub3B0aW9ucyA9IHtcbiAgICAgICAgICAgIHJvd3M6IFt7XG4gICAgICAgICAgICAgICAga2V5OiAnaW5jb21lJyxcbiAgICAgICAgICAgICAgICB0eXBlOiAnYmFyJ1xuICAgICAgICAgICAgfSwge1xuICAgICAgICAgICAgICAgIGtleTogJ3NhbGVzJ1xuICAgICAgICAgICAgfV0sXG4gICAgICAgICAgICB4QXhpczoge1xuICAgICAgICAgICAgICAgIGtleTogJ2RheScsXG4gICAgICAgICAgICAgICAgZGlzcGxheUZvcm1hdDogJyVZLSVtLSVkICVIOiVNOiVTJ1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIGRlZmluZSBjb2RlIGhpZ2hsaWdodGluZ1xuICAgICAgICAkc2NvcGUub3B0aW9uc0FjZUNvbmZpZyA9IHtcbiAgICAgICAgICAgIG1vZGU6ICdqc29uJyxcbiAgICAgICAgICAgIHVzZVdyYXBNb2RlOiBmYWxzZSxcbiAgICAgICAgICAgIG9uTG9hZDogZnVuY3Rpb24oX2VkaXRvcikge1xuICAgICAgICAgICAgICAgIF9lZGl0b3Iuc2V0U2hvd1ByaW50TWFyZ2luKGZhbHNlKTtcbiAgICAgICAgICAgICAgICAkc2NvcGUub3B0aW9uc0VkaXRvciA9IF9lZGl0b3I7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLmRhdGFzZXRBY2VDb25maWcgPSB7XG4gICAgICAgICAgICBtb2RlOiAnanNvbicsXG4gICAgICAgICAgICB1c2VXcmFwTW9kZTogZmFsc2UsXG4gICAgICAgICAgICBvbkxvYWQ6IGZ1bmN0aW9uKF9lZGl0b3IpIHtcbiAgICAgICAgICAgICAgICBfZWRpdG9yLnNldFNob3dQcmludE1hcmdpbihmYWxzZSk7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmRhdGFFZGl0b3IgPSBfZWRpdG9yO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaCgnb3B0aW9ucycsIGZ1bmN0aW9uKGpzb24pIHtcbiAgICAgICAgICAgICRzY29wZS5vcHRpb25zU3RyaW5nID0gJGZpbHRlcignanNvbicpKGpzb24pO1xuICAgICAgICB9LCB0cnVlKTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoKCdvcHRpb25zU3RyaW5nJywgZnVuY3Rpb24oanNvbikge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAkc2NvcGUub3B0aW9ucyA9IEpTT04ucGFyc2UoanNvbik7XG4gICAgICAgICAgICAgICAgJHNjb3BlLndlbGxGb3JtZWRPcHRpb25zID0gdHJ1ZTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUud2VsbEZvcm1lZE9wdGlvbnMgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaCgnZGF0YXNldCcsIGZ1bmN0aW9uKGpzb24pIHtcbiAgICAgICAgICAgICRzY29wZS5kYXRhc2V0U3RyaW5nID0gJGZpbHRlcignanNvbicpKGpzb24pO1xuICAgICAgICB9LCB0cnVlKTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoKCdkYXRhc2V0U3RyaW5nJywgZnVuY3Rpb24oanNvbikge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAkc2NvcGUuZGF0YXNldCA9IEpTT04ucGFyc2UoanNvbik7XG4gICAgICAgICAgICAgICAgJHNjb3BlLndlbGxGb3JtZWREYXRhc2V0ID0gdHJ1ZTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUud2VsbEZvcm1lZERhdGFzZXQgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICB9XG5cbiAgICBhbmd1bGFyXG4gICAgICAgIC5tb2R1bGUoJ2dyYWZpZGRsZScpXG4gICAgICAgIC5jb250cm9sbGVyKCdFbWJlZENvbnRyb2xsZXInLCBFbWJlZENvbnRyb2xsZXIpO1xuXG59KSgpO1xuIiwiKGZ1bmN0aW9uICgpIHtcblxuICAgIGZ1bmN0aW9uIEVkaXRvckNvbnRyb2xsZXIoJHNjb3BlLCAkZmlsdGVyLCAkc3RhdGUsICR3aW5kb3csICR0aW1lb3V0LCBDaGVja3BvaW50RW5kcG9pbnQpIHtcblxuICAgICAgICAkc2NvcGUuc2hvd0RhdGFFZGl0b3IgPSBmYWxzZTtcbiAgICAgICAgJHNjb3BlLnNob3dPcHRpb25zVUkgID0gZmFsc2U7XG4gICAgICAgICRzY29wZS5zaG93U2hhcmVQb3B1cCA9IGZhbHNlO1xuICAgICAgICAkc2NvcGUuc3dpdGNoRGF0YUJ1dHRvblRpdGxlICAgID0gJ01hbnVhbCBkYXRhIGVudHJ5JztcbiAgICAgICAgJHNjb3BlLnN3aXRjaE9wdGlvbnNCdXR0b25UaXRsZSA9ICdFZGl0IGluIEdVSSc7XG4gICAgICAgICRzY29wZS50b2dnbGVEYXRhRWRpdG9yID0gdG9nZ2xlRGF0YUVkaXRvcjtcbiAgICAgICAgJHNjb3BlLnRvZ2dsZU9wdGlvbnNVSSAgPSB0b2dnbGVPcHRpb25zVUk7XG4gICAgICAgICRzY29wZS5zaGFyZVBvcHVwICAgICAgID0gc2hhcmVQb3B1cDtcbiAgICAgICAgJHNjb3BlLm9uU2hhcmVUZXh0Q2xpY2sgPSBvblNoYXJlVGV4dENsaWNrO1xuXG4gICAgICAgICRzY29wZS5zaGFyZSA9IHNoYXJlO1xuICAgICAgICAkc2NvcGUuc2F2ZSA9IHNhdmU7XG4gICAgICAgICRzY29wZS51cGxvYWRGaWxlID0gdXBsb2FkRmlsZTtcblxuICAgICAgICAkc2NvcGUuY2hlY2twb2ludCA9IHt9O1xuICAgICAgICAkc2NvcGUuYWNlSnNvbkNvbmZpZyA9IHtcbiAgICAgICAgICAgIG1vZGU6ICdqc29uJyxcbiAgICAgICAgICAgIHVzZVdyYXBNb2RlOiBmYWxzZSxcbiAgICAgICAgICAgIG9uTG9hZDogZnVuY3Rpb24gKF9lZGl0b3IpIHtcbiAgICAgICAgICAgICAgICBfZWRpdG9yLnNldFNob3dQcmludE1hcmdpbihmYWxzZSk7XG4gICAgICAgICAgICAgICAgX2VkaXRvci4kYmxvY2tTY3JvbGxpbmcgPSBJbmZpbml0eTtcbiAgICAgICAgICAgICAgICAkc2NvcGUuZWRpdG9ycyA9IF9lZGl0b3I7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgYWN0aXZhdGUoKTtcblxuICAgICAgICAvLy8vLy8vLy8vLy9cblxuICAgICAgICBmdW5jdGlvbiBhY3RpdmF0ZSgpIHtcblxuICAgICAgICAgICAgaWYgKCRzdGF0ZS5wYXJhbXMuaWQpIHtcbiAgICAgICAgICAgICAgICBDaGVja3BvaW50RW5kcG9pbnRcbiAgICAgICAgICAgICAgICAgICAgLmdldCh7aWQ6ICRzdGF0ZS5wYXJhbXMuaWR9KVxuICAgICAgICAgICAgICAgICAgICAuJHByb21pc2VcbiAgICAgICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oY2hlY2twb2ludCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnNlcnZlckNoZWNrcG9pbnQgPSBjaGVja3BvaW50O1xuICAgICAgICAgICAgICAgICAgICAgICAgc2V0Q2hlY2twb2ludChjaGVja3BvaW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICR0aW1lb3V0KHNhdmVBc0ltYWdlLCAwKTtcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ2VkaXRvcicsIHtpZDogJyd9KTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGxvYWREZWZhdWx0RGF0YSgpO1xuICAgICAgICAgICAgICAgICR0aW1lb3V0KHNhdmVBc0ltYWdlLCAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN5bmNPcHRpb25zKCk7XG4gICAgICAgICAgICBzeW5jRGF0YXNldCgpO1xuICAgICAgICAgICAgdXBkYXRlT25SZXNpemUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHNhdmVBc0ltYWdlKCkge1xuICAgICAgICAgICAgY2FudmcoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NhbnZhcycpLCBkMy5zZWxlY3QoXCIuYW5ndWxhcmNoYXJ0XCIpLm5vZGUoKS5pbm5lckhUTUwpO1xuICAgICAgICAgICAgJHNjb3BlLmFzSW1hZ2UgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2FudmFzJykudG9EYXRhVVJMKCk7XG4gICAgICAgICAgICAkc2NvcGUubWV0YWRhdGEub2dbJ29nOmltYWdlJ10gPSAkc2NvcGUuYXNJbWFnZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNhdmUgdGhlIGN1cnJlbnQgVmVyc2lvblxuICAgICAgICAvL1xuICAgICAgICBmdW5jdGlvbiBzYXZlKCkge1xuICAgICAgICAgICAgQ2hlY2twb2ludEVuZHBvaW50LnNhdmUoe1xuICAgICAgICAgICAgICAgIFwiZGF0YVwiOiAkc2NvcGUuY2hlY2twb2ludC5kYXRhc2V0LFxuICAgICAgICAgICAgICAgIFwib3B0aW9uc1wiOiAkc2NvcGUuY2hlY2twb2ludC5vcHRpb25zLFxuICAgICAgICAgICAgICAgIFwiYXV0aG9yXCI6IFwiQW5vbnltXCJcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLiRwcm9taXNlXG4gICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKGNoZWNrcG9pbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3NhdmVkIGNoZWNrcG9pbnQ6ICcsIGNoZWNrcG9pbnQpO1xuICAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ2VkaXRvcicsIHtpZDogY2hlY2twb2ludC5pZH0pO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ3NhdmUgZmFpbGVkJywgZSk7XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNoYXJlIHRoZSBmaWRkbGVcbiAgICAgICAgLy9cbiAgICAgICAgZnVuY3Rpb24gc2hhcmUodGFyZ2V0KSB7XG4gICAgICAgICAgICBmaWRkbGVVUkwgICAgICAgPSAnaHR0cDovL2dyYWZpZGRsZS5hcHBzcG90LmNvbS8nICsgJHN0YXRlLnBhcmFtcy5pZDtcbiAgICAgICAgICAgIGlmKHRhcmdldCA9PSAnRkInKSB7XG4gICAgICAgICAgICAgICAgJHdpbmRvdy5vcGVuKCdodHRwczovL3d3dy5mYWNlYm9vay5jb20vc2hhcmVyL3NoYXJlci5waHA/dT0nICsgZmlkZGxlVVJMLCAnX2JsYW5rJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZih0YXJnZXQgPT0gJ1R3aXR0ZXInKSB7XG4gICAgICAgICAgICAgICAgJHdpbmRvdy5vcGVuKCdodHRwczovL3R3aXR0ZXIuY29tL2ludGVudC90d2VldD90ZXh0PUNoZWNrJTIwb3V0JTIwdGhpcyUyMHN3ZWV0JTIwZ3JhZmlkZGxlJTIwJnVybD0nICsgZmlkZGxlVVJMLCAnX2JsYW5rJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZih0YXJnZXQgPT0gJ0UtTWFpbCcpIHtcbiAgICAgICAgICAgICAgICAkd2luZG93LmxvY2F0aW9uID0gJ21haWx0bzphQGIuY2Q/c3ViamVjdD1DaGVjayUyMG91dCUyMHRoaXMlMjBhd2Vzb21lJTIwR3JhZmlkZGxlJmJvZHk9JyArIGZpZGRsZVVSTDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwbG9hZCBhIGZpbGUgYXMgZGF0YSBzb3VyY2VcbiAgICAgICAgLy9cbiAgICAgICAgZnVuY3Rpb24gdXBsb2FkRmlsZShmaWxlKSB7XG4gICAgICAgICAgICAkc2NvcGUuY2hlY2twb2ludC5kYXRhc2V0U3RyaW5nID0gZmlsZTtcbiAgICAgICAgICAgICRzY29wZS50b2dnbGVEYXRhRWRpdG9yKCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBUb2dnbGUgZnJvbSBkYXRhIHZpZXdcbiAgICAgICAgLy9cbiAgICAgICAgZnVuY3Rpb24gdG9nZ2xlRGF0YUVkaXRvcigpIHtcbiAgICAgICAgICAgICRzY29wZS5zaG93RGF0YUVkaXRvciA9ICEkc2NvcGUuc2hvd0RhdGFFZGl0b3I7XG4gICAgICAgICAgICAkc2NvcGUuc3dpdGNoRGF0YUJ1dHRvblRpdGxlID0gJHNjb3BlLnNob3dEYXRhRWRpdG9yID8gJ0JhY2sgdG8gaW5wdXQgZGlhbG9nJyA6ICdNYW51YWwgZGF0YSBlbnRyeSc7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBUb2dnbGUgZnJvbSBqc29uLW9wdGlvbiB2aWV3XG4gICAgICAgIC8vXG4gICAgICAgIGZ1bmN0aW9uIHRvZ2dsZU9wdGlvbnNVSSgpIHtcbiAgICAgICAgICAgICRzY29wZS5zaG93T3B0aW9uc1VJID0gISRzY29wZS5zaG93T3B0aW9uc1VJO1xuICAgICAgICAgICAgJHNjb3BlLnN3aXRjaE9wdGlvbnNCdXR0b25UaXRsZSA9ICRzY29wZS5zaG93T3B0aW9uc1VJID8gJ0VkaXQgYXMgSlNPTicgOiAnRWRpdCBpbiBHVUknO1xuICAgICAgICAgICAgJHNjb3BlLmVkaXRvcnMucmVzaXplKCk7XG4gICAgICAgICAgICAkc2NvcGUuZWRpdG9ycy5yZW5kZXJlci51cGRhdGVGdWxsKCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDcmVhdGUgdGhlIEhUTUwgVUkgcmVwcmVzZW50YXRpb24gb2YgdGhlIG9wdGlvbnMganNvblxuICAgICAgICAvL1xuICAgICAgICBmdW5jdGlvbiB1cGRhdGVPcHRpb25zVUkoanNvbikge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJ1cGRhdGUgb3B0aW9ucyB1aVwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNob3cgdGhlIHNoYXJlIHNoZWV0XG4gICAgICAgIC8vXG4gICAgICAgIGZ1bmN0aW9uIHNoYXJlUG9wdXAoKSB7XG4gICAgICAgICAgICAkc2NvcGUuc2hvd1NoYXJlUG9wdXAgPSAhJHNjb3BlLnNob3dTaGFyZVBvcHVwO1xuICAgICAgICAgICAgJHNjb3BlLmZpZGRsZVVSTCAgICAgICA9ICdodHRwOi8vZ3JhZmlkZGxlLmFwcHNwb3QuY29tLycgKyAkc3RhdGUucGFyYW1zLmlkO1xuICAgICAgICAgICAgJHNjb3BlLmZpZGRsZUNoYXJ0VVJMICA9ICdodHRwOi8vZ3JhZmlkZGxlLmFwcHNwb3QuY29tLycgKyAkc3RhdGUucGFyYW1zLmlkICsgJy5wbmcnO1xuICAgICAgICAgICAgJHNjb3BlLmZpZGRsZUVtYmVkQ29kZSA9ICc8aWZyYW1lIHdpZHRoPVwiMTAwJVwiIGhlaWdodD1cIjMwMFwiIHNyYz1cIi8vZ3JhZmlkZGxlLmFwcHNwb3QuY29tL2VtYmVkLycgKyAkc3RhdGUucGFyYW1zLmlkICsgJ1wiIGFsbG93ZnVsbHNjcmVlbj1cImFsbG93ZnVsbHNjcmVlblwiIGZyYW1lYm9yZGVyPVwiMFwiPjwvaWZyYW1lPic7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBbGxvdyBzaGFyZSB0ZXh0IGZpZWxkcyB0byBhdXRvc2VsZWN0IG9uIGZvY3VzXG4gICAgICAgIC8vXG4gICAgICAgIGZ1bmN0aW9uIG9uU2hhcmVUZXh0Q2xpY2soJGV2ZW50KSB7XG4gICAgICAgICAgICAkZXZlbnQudGFyZ2V0LnNlbGVjdCgpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEluc2VydCBkZWZhdWx0IGRhdGFcbiAgICAgICAgLy9cbiAgICAgICAgZnVuY3Rpb24gbG9hZERlZmF1bHREYXRhKCkge1xuICAgICAgICAgICAgdmFyIGRhdGFzZXQgPSBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAnZGF5JzogJzIwMTMtMDEtMDJfMDA6MDA6MDAnLFxuICAgICAgICAgICAgICAgICAgICAnc2FsZXMnOiAzNDYxLjI5NTIwMixcbiAgICAgICAgICAgICAgICAgICAgJ2luY29tZSc6IDEyMzY1LjA1M1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAnZGF5JzogJzIwMTMtMDEtMDNfMDA6MDA6MDAnLFxuICAgICAgICAgICAgICAgICAgICAnc2FsZXMnOiA0NDYxLjI5NTIwMixcbiAgICAgICAgICAgICAgICAgICAgJ2luY29tZSc6IDEzMzY1LjA1M1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAnZGF5JzogJzIwMTMtMDEtMDRfMDA6MDA6MDAnLFxuICAgICAgICAgICAgICAgICAgICAnc2FsZXMnOiA0NTYxLjI5NTIwMixcbiAgICAgICAgICAgICAgICAgICAgJ2luY29tZSc6IDE0MzY1LjA1M1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF07XG4gICAgICAgICAgICB2YXIgc2NoZW1hID0ge1xuICAgICAgICAgICAgICAgIGRheToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGF0ZXRpbWUnLFxuICAgICAgICAgICAgICAgICAgICBmb3JtYXQ6ICclWS0lbS0lZF8lSDolTTolUycsXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6ICdEYXRlJ1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB2YXIgb3B0aW9ucyA9IHtcbiAgICAgICAgICAgICAgICByb3dzOiBbe1xuICAgICAgICAgICAgICAgICAgICBrZXk6ICdpbmNvbWUnLFxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnYmFyJ1xuICAgICAgICAgICAgICAgIH0sIHtcbiAgICAgICAgICAgICAgICAgICAga2V5OiAnc2FsZXMnXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICAgICAgICAgeEF4aXM6IHtcbiAgICAgICAgICAgICAgICAgICAga2V5OiAnZGF5JyxcbiAgICAgICAgICAgICAgICAgICAgZGlzcGxheUZvcm1hdDogJyVZLSVtLSVkICVIOiVNOiVTJ1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICRzY29wZS5jaGVja3BvaW50LmRhdGFzZXRTdHJpbmcgPSAnJztcbiAgICAgICAgICAgICRzY29wZS5jaGVja3BvaW50LmRhdGFzZXQgPSBkYXRhc2V0O1xuICAgICAgICAgICAgJHNjb3BlLmNoZWNrcG9pbnQuc2NoZW1hU3RyaW5nID0gJyc7XG4gICAgICAgICAgICAkc2NvcGUuY2hlY2twb2ludC5zY2hlbWEgPSBzY2hlbWE7XG4gICAgICAgICAgICAkc2NvcGUuY2hlY2twb2ludC5vcHRpb25zU3RyaW5nID0gJyc7XG4gICAgICAgICAgICAkc2NvcGUuY2hlY2twb2ludC5vcHRpb25zID0gb3B0aW9ucztcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHNldENoZWNrcG9pbnQoY2hlY2twb2ludCkge1xuICAgICAgICAgICAgJHNjb3BlLmNoZWNrcG9pbnQuZGF0YXNldFN0cmluZyA9ICcnO1xuICAgICAgICAgICAgJHNjb3BlLmNoZWNrcG9pbnQuZGF0YXNldCA9IGNoZWNrcG9pbnQuZGF0YTtcbiAgICAgICAgICAgICRzY29wZS5jaGVja3BvaW50LnNjaGVtYVN0cmluZyA9ICcnO1xuICAgICAgICAgICAgJHNjb3BlLmNoZWNrcG9pbnQuc2NoZW1hID0ge307XG4gICAgICAgICAgICAkc2NvcGUuY2hlY2twb2ludC5vcHRpb25zU3RyaW5nID0gJyc7XG4gICAgICAgICAgICAkc2NvcGUuY2hlY2twb2ludC5vcHRpb25zID0gY2hlY2twb2ludC5vcHRpb25zO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU3luYyBPYmplY3QgYW5kIFN0cmluZyByZXByZXNlbnRhdGlvblxuICAgICAgICAvL1xuICAgICAgICBmdW5jdGlvbiBzeW5jT3B0aW9ucygpIHtcbiAgICAgICAgICAgICRzY29wZS4kd2F0Y2goJ2NoZWNrcG9pbnQub3B0aW9ucycsIGZ1bmN0aW9uIChqc29uKSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmNoZWNrcG9pbnQub3B0aW9uc1N0cmluZyA9ICRmaWx0ZXIoJ2pzb24nKShqc29uKTtcbiAgICAgICAgICAgIH0sIHRydWUpO1xuXG4gICAgICAgICAgICAkc2NvcGUuJHdhdGNoKCdjaGVja3BvaW50Lm9wdGlvbnNTdHJpbmcnLCBmdW5jdGlvbiAoanNvbikge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5jaGVja3BvaW50Lm9wdGlvbnMgPSBKU09OLnBhcnNlKGpzb24pO1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUud2VsbEZvcm1lZE9wdGlvbnMgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB1cGRhdGVPcHRpb25zVUkoanNvbik7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUud2VsbEZvcm1lZE9wdGlvbnMgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCB0cnVlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFN5bmMgT2JqZWN0IGFuZCBTdHJpbmcgcmVwcmVzZW50YXRpb25cbiAgICAgICAgLy9cbiAgICAgICAgZnVuY3Rpb24gc3luY0RhdGFzZXQoKSB7XG4gICAgICAgICAgICAkc2NvcGUuJHdhdGNoKCdjaGVja3BvaW50LmRhdGFzZXQnLCBmdW5jdGlvbiAoanNvbikge1xuICAgICAgICAgICAgICAgICRzY29wZS5jaGVja3BvaW50LmRhdGFzZXRTdHJpbmcgPSAkZmlsdGVyKCdqc29uJykoanNvbik7XG4gICAgICAgICAgICB9LCB0cnVlKTtcblxuICAgICAgICAgICAgJHNjb3BlLiR3YXRjaCgnY2hlY2twb2ludC5kYXRhc2V0U3RyaW5nJywgZnVuY3Rpb24gKGpzb24pIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY2hlY2twb2ludC5kYXRhc2V0ID0gSlNPTi5wYXJzZShqc29uKTtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLndlbGxGb3JtZWREYXRhc2V0ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS53ZWxsRm9ybWVkRGF0YXNldCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIHRydWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQWRkIHRpbWVzdGFtcCB0byBvcHRpb25zIHRvIHJlZHJhd1xuICAgICAgICAvL1xuICAgICAgICBmdW5jdGlvbiBvcGRhdGVPcHRpb25zKCkge1xuICAgICAgICAgICAgLy8gSXMgY2FsbGVkIHRvIG9mdGVuLCBub3Qgb25seSBvbiByZXNpemVcbiAgICAgICAgICAgIC8vJHNjb3BlLmNoZWNrcG9pbnQub3B0aW9ucy51cGRhdGVkID0gbmV3IERhdGUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRyaWdnZXIgbmV3IHJlbmRlciBvbiByZXNpemVcbiAgICAgICAgLy9cbiAgICAgICAgZnVuY3Rpb24gdXBkYXRlT25SZXNpemUoKSB7XG4gICAgICAgICAgICB2YXIgbXlFbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NoYXJ0QXJlYScpO1xuICAgICAgICAgICAgYWRkUmVzaXplTGlzdGVuZXIobXlFbGVtZW50LCBvcGRhdGVPcHRpb25zKTtcblxuICAgICAgICAgICAgJHNjb3BlLiRvbihcIiRkZXN0cm95XCIsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZW1vdmVSZXNpemVMaXN0ZW5lcihteUVsZW1lbnQsIG9wZGF0ZU9wdGlvbnMpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgIH1cblxuICAgIGFuZ3VsYXJcbiAgICAgICAgLm1vZHVsZSgnZ3JhZmlkZGxlJylcbiAgICAgICAgLmNvbnRyb2xsZXIoJ0VkaXRvckNvbnRyb2xsZXInLCBFZGl0b3JDb250cm9sbGVyKTtcblxufSkoKTtcbiIsIihmdW5jdGlvbiAoKSB7XG5cbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBmdW5jdGlvbiBzdGF0ZXNDb25maWd1cmF0aW9uKCRzdGF0ZVByb3ZpZGVyLCAkdXJsUm91dGVyUHJvdmlkZXIsICRsb2NhdGlvblByb3ZpZGVyKSB7XG5cbiAgICAgICAgJHN0YXRlUHJvdmlkZXJcbiAgICAgICAgICAgIC5zdGF0ZSgnNDA0Jywge1xuICAgICAgICAgICAgICAgIHZpZXdzOiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnY29tcG9uZW50cy9jb21tb24vNDA0LzQwNC5odG1sJ1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5zdGF0ZSgnZW1iZWQnLCB7XG4gICAgICAgICAgICAgICAgdXJsOiAnL2VtYmVkJyxcbiAgICAgICAgICAgICAgICB2aWV3czoge1xuICAgICAgICAgICAgICAgICAgICBjb250ZW50OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ2NvbXBvbmVudHMvZW1iZWQvZW1iZWQuaHRtbCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250cm9sbGVyOiAnRW1iZWRDb250cm9sbGVyJ1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5zdGF0ZSgndHJlZScsIHtcbiAgICAgICAgICAgICAgICB1cmw6ICcvOmlkL3RyZWUnLFxuICAgICAgICAgICAgICAgIHZpZXdzOiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnY29tcG9uZW50cy90cmVlL3RyZWUuaHRtbCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250cm9sbGVyOiAnVHJlZUNvbnRyb2xsZXInXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLnN0YXRlKCdlZGl0b3InLCB7XG4gICAgICAgICAgICAgICAgdXJsOiAnLzppZCcsXG4gICAgICAgICAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAgICAgICAgICAgY29udGVudDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdjb21wb25lbnRzL2VkaXRvci9lZGl0b3IuaHRtbCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250cm9sbGVyOiAnRWRpdG9yQ29udHJvbGxlcidcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIC8qIEBuZ0luamVjdCAqL1xuICAgICAgICAkdXJsUm91dGVyUHJvdmlkZXIub3RoZXJ3aXNlKGZ1bmN0aW9uICgkaW5qZWN0b3IsICRsb2NhdGlvbikge1xuICAgICAgICAgICAgLy8gVXNlclNlcnZpY2UgJiAkc3RhdGUgbm90IGF2YWlsYWJsZSBkdXJpbmcgLmNvbmZpZygpLCBpbmplY3QgdGhlbSAobWFudWFsbHkpIGxhdGVyXG5cbiAgICAgICAgICAgIC8vIHJlcXVlc3RpbmcgdW5rbm93biBwYWdlIHVuZXF1YWwgdG8gJy8nXG4gICAgICAgICAgICB2YXIgcGF0aCA9ICRsb2NhdGlvbi5wYXRoKCk7XG4gICAgICAgICAgICBpZiAocGF0aCAhPT0gJy8nKSB7XG4gICAgICAgICAgICAgICAgJGluamVjdG9yLmdldCgnJHN0YXRlJykuZ28oJzQwNCcpO1xuICAgICAgICAgICAgICAgIHJldHVybiBwYXRoOyAvLyB0aGlzIHRyaWNrIGFsbG93cyB0byBzaG93IHRoZSBlcnJvciBwYWdlIG9uIHVua25vd24gYWRkcmVzc1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gJy9uZXcnO1xuICAgICAgICB9KTtcblxuICAgICAgICAkbG9jYXRpb25Qcm92aWRlclxuICAgICAgICAgICAgLmh0bWw1TW9kZSh0cnVlKVxuICAgICAgICAgICAgLmhhc2hQcmVmaXgoJyEnKTtcbiAgICB9XG5cblxuICAgIGFuZ3VsYXJcbiAgICAgICAgLm1vZHVsZSgnZ3JhZmlkZGxlJylcbiAgICAgICAgLmNvbmZpZyhzdGF0ZXNDb25maWd1cmF0aW9uKTtcblxufSkoKTsiLCIoZnVuY3Rpb24oKXtcblxuICAgIHZhciBhdHRhY2hFdmVudCA9IGRvY3VtZW50LmF0dGFjaEV2ZW50O1xuICAgIHZhciBpc0lFID0gbmF2aWdhdG9yLnVzZXJBZ2VudC5tYXRjaCgvVHJpZGVudC8pO1xuICAgIHZhciByZXF1ZXN0RnJhbWUgPSAoZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIHJhZiA9IHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHwgd2luZG93Lm1velJlcXVlc3RBbmltYXRpb25GcmFtZSB8fCB3aW5kb3cud2Via2l0UmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG4gICAgICAgICAgICBmdW5jdGlvbihmbil7IHJldHVybiB3aW5kb3cuc2V0VGltZW91dChmbiwgMjApOyB9O1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24oZm4peyByZXR1cm4gcmFmKGZuKTsgfTtcbiAgICB9KSgpO1xuXG4gICAgdmFyIGNhbmNlbEZyYW1lID0gKGZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciBjYW5jZWwgPSB3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUgfHwgd2luZG93Lm1vekNhbmNlbEFuaW1hdGlvbkZyYW1lIHx8IHdpbmRvdy53ZWJraXRDYW5jZWxBbmltYXRpb25GcmFtZSB8fFxuICAgICAgICAgICAgd2luZG93LmNsZWFyVGltZW91dDtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKGlkKXsgcmV0dXJuIGNhbmNlbChpZCk7IH07XG4gICAgfSkoKTtcblxuICAgIGZ1bmN0aW9uIHJlc2l6ZUxpc3RlbmVyKGUpe1xuICAgICAgICB2YXIgd2luID0gZS50YXJnZXQgfHwgZS5zcmNFbGVtZW50O1xuICAgICAgICBpZiAod2luLl9fcmVzaXplUkFGX18pIGNhbmNlbEZyYW1lKHdpbi5fX3Jlc2l6ZVJBRl9fKTtcbiAgICAgICAgd2luLl9fcmVzaXplUkFGX18gPSByZXF1ZXN0RnJhbWUoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHZhciB0cmlnZ2VyID0gd2luLl9fcmVzaXplVHJpZ2dlcl9fO1xuICAgICAgICAgICAgdHJpZ2dlci5fX3Jlc2l6ZUxpc3RlbmVyc19fLmZvckVhY2goZnVuY3Rpb24oZm4pe1xuICAgICAgICAgICAgICAgIGZuLmNhbGwodHJpZ2dlciwgZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gb2JqZWN0TG9hZChlKXtcbiAgICAgICAgdGhpcy5jb250ZW50RG9jdW1lbnQuZGVmYXVsdFZpZXcuX19yZXNpemVUcmlnZ2VyX18gPSB0aGlzLl9fcmVzaXplRWxlbWVudF9fO1xuICAgICAgICB0aGlzLmNvbnRlbnREb2N1bWVudC5kZWZhdWx0Vmlldy5hZGRFdmVudExpc3RlbmVyKCdyZXNpemUnLCByZXNpemVMaXN0ZW5lcik7XG4gICAgfVxuXG4gICAgd2luZG93LmFkZFJlc2l6ZUxpc3RlbmVyID0gZnVuY3Rpb24oZWxlbWVudCwgZm4pe1xuICAgICAgICBpZiAoIWVsZW1lbnQuX19yZXNpemVMaXN0ZW5lcnNfXykge1xuICAgICAgICAgICAgZWxlbWVudC5fX3Jlc2l6ZUxpc3RlbmVyc19fID0gW107XG4gICAgICAgICAgICBpZiAoYXR0YWNoRXZlbnQpIHtcbiAgICAgICAgICAgICAgICBlbGVtZW50Ll9fcmVzaXplVHJpZ2dlcl9fID0gZWxlbWVudDtcbiAgICAgICAgICAgICAgICBlbGVtZW50LmF0dGFjaEV2ZW50KCdvbnJlc2l6ZScsIHJlc2l6ZUxpc3RlbmVyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChnZXRDb21wdXRlZFN0eWxlKGVsZW1lbnQpLnBvc2l0aW9uID09ICdzdGF0aWMnKSBlbGVtZW50LnN0eWxlLnBvc2l0aW9uID0gJ3JlbGF0aXZlJztcbiAgICAgICAgICAgICAgICB2YXIgb2JqID0gZWxlbWVudC5fX3Jlc2l6ZVRyaWdnZXJfXyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ29iamVjdCcpO1xuICAgICAgICAgICAgICAgIG9iai5zZXRBdHRyaWJ1dGUoJ3N0eWxlJywgJ2Rpc3BsYXk6IGJsb2NrOyBwb3NpdGlvbjogYWJzb2x1dGU7IHRvcDogMDsgbGVmdDogMDsgaGVpZ2h0OiAxMDAlOyB3aWR0aDogMTAwJTsgb3ZlcmZsb3c6IGhpZGRlbjsgcG9pbnRlci1ldmVudHM6IG5vbmU7IHotaW5kZXg6IC0xOycpO1xuICAgICAgICAgICAgICAgIG9iai5fX3Jlc2l6ZUVsZW1lbnRfXyA9IGVsZW1lbnQ7XG4gICAgICAgICAgICAgICAgb2JqLm9ubG9hZCA9IG9iamVjdExvYWQ7XG4gICAgICAgICAgICAgICAgb2JqLnR5cGUgPSAndGV4dC9odG1sJztcbiAgICAgICAgICAgICAgICBpZiAoaXNJRSkgZWxlbWVudC5hcHBlbmRDaGlsZChvYmopO1xuICAgICAgICAgICAgICAgIG9iai5kYXRhID0gJ2Fib3V0OmJsYW5rJztcbiAgICAgICAgICAgICAgICBpZiAoIWlzSUUpIGVsZW1lbnQuYXBwZW5kQ2hpbGQob2JqKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbGVtZW50Ll9fcmVzaXplTGlzdGVuZXJzX18ucHVzaChmbik7XG4gICAgfTtcblxuICAgIHdpbmRvdy5yZW1vdmVSZXNpemVMaXN0ZW5lciA9IGZ1bmN0aW9uKGVsZW1lbnQsIGZuKXtcbiAgICAgICAgZWxlbWVudC5fX3Jlc2l6ZUxpc3RlbmVyc19fLnNwbGljZShlbGVtZW50Ll9fcmVzaXplTGlzdGVuZXJzX18uaW5kZXhPZihmbiksIDEpO1xuICAgICAgICBpZiAoIWVsZW1lbnQuX19yZXNpemVMaXN0ZW5lcnNfXy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGlmIChhdHRhY2hFdmVudCkgZWxlbWVudC5kZXRhY2hFdmVudCgnb25yZXNpemUnLCByZXNpemVMaXN0ZW5lcik7XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBlbGVtZW50Ll9fcmVzaXplVHJpZ2dlcl9fLmNvbnRlbnREb2N1bWVudC5kZWZhdWx0Vmlldy5yZW1vdmVFdmVudExpc3RlbmVyKCdyZXNpemUnLCByZXNpemVMaXN0ZW5lcik7XG4gICAgICAgICAgICAgICAgZWxlbWVudC5fX3Jlc2l6ZVRyaWdnZXJfXyA9ICFlbGVtZW50LnJlbW92ZUNoaWxkKGVsZW1lbnQuX19yZXNpemVUcmlnZ2VyX18pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIFxufSkoKTsiLCIoZnVuY3Rpb24gKCkge1xuXG4gICAgZnVuY3Rpb24gQXBwQ29udHJvbGxlcigkc2NvcGUpIHtcblxuICAgICAgICAkc2NvcGUubWV0YWRhdGEgPSB7fTtcbiAgICAgICAgJHNjb3BlLm1ldGFkYXRhLnBhZ2VUaXRsZSA9ICdTaGFyZSB5b3VyIHZpc3VhbGl6YXRpb25zIG9uIGdyYWZpZGRsZSc7XG4gICAgICAgICRzY29wZS5tZXRhZGF0YS5vZyA9IHtcbiAgICAgICAgICAgICdvZzp0eXBlJzogJ2FydGljbGUnLFxuICAgICAgICAgICAgJ2FydGljbGU6c2VjdGlvbic6ICdTaGFyYWJsZSBkYXRhIHZpc3VhbGl6YXRpb24nLFxuICAgICAgICAgICAgJ29nOnRpdGxlJzogJ1NoYXJlIHlvdXIgdmlzdWFsaXphdGlvbnMgb24gZ3JhZmlkZGxlJyxcbiAgICAgICAgICAgICdvZzppbWFnZSc6ICcnLFxuICAgICAgICAgICAgJ29nOmRlc2NyaXB0aW9uJzogJ1NoYXJhYmxlIGRhdGEgdmlzdWFsaXphdGlvbidcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBhbmd1bGFyXG4gICAgICAgIC5tb2R1bGUoJ2dyYWZpZGRsZScpXG4gICAgICAgIC5jb250cm9sbGVyKCdBcHBDb250cm9sbGVyJywgQXBwQ29udHJvbGxlcik7XG5cbn0pKCk7XG4iLCIoZnVuY3Rpb24gKCkge1xuXG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgZnVuY3Rpb24gQ2hlY2twb2ludEVuZHBvaW50KCRyZXNvdXJjZSwgRU5WKSB7XG4gICAgICAgIHJldHVybiAkcmVzb3VyY2UoRU5WLmFwaSArICdjaGVja3BvaW50LzppZCcsIHtcbiAgICAgICAgICAgIGlkOiAnQGlkJ1xuICAgICAgICB9LCB7XG4gICAgICAgICAgICBzYXZlOiB7XG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZXQ6IHtcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdHRVQnXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGFuZ3VsYXJcbiAgICAgICAgLm1vZHVsZSgnZ3JhZmlkZGxlJylcbiAgICAgICAgLmZhY3RvcnkoJ0NoZWNrcG9pbnRFbmRwb2ludCcsIENoZWNrcG9pbnRFbmRwb2ludCk7XG5cbn0pKCk7XG4iLCIoZnVuY3Rpb24gKCkge1xuXG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgZnVuY3Rpb24gVHJlZUVuZHBvaW50KCRyZXNvdXJjZSwgRU5WKSB7XG4gICAgICAgIHJldHVybiAkcmVzb3VyY2UoRU5WLmFwaSArICd0cmVlLzppZCcsIHtcbiAgICAgICAgICAgIGlkOiAnQGlkJ1xuICAgICAgICB9LCB7XG4gICAgICAgICAgICBnZXQ6IHtcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdHRVQnXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGFuZ3VsYXJcbiAgICAgICAgLm1vZHVsZSgnZ3JhZmlkZGxlJylcbiAgICAgICAgLmZhY3RvcnkoJ1RyZWVFbmRwb2ludCcsIFRyZWVFbmRwb2ludCk7XG5cbn0pKCk7XG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=