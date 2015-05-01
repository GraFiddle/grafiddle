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
        $scope.addOption = addOption;
        $scope.title = '';

        $scope.share = share;
        $scope.save = save;
        $scope.uploadFile = uploadFile;

        $scope.optionsUIrowTypeOptions = [
            { label: 'line', value: 1 },
            { label: 'spline', value: 2 },
            { label: 'bar', value: 3 },
            { label: 'scatter', value: 4 },
            { label: 'area', value: 5 },
            { label: 'area-spline', value: 6 },
            { label: 'step', value: 7 },
            { label: 'area-step', value: 8 },
            { label: 'step', value: 9 }
        ];

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
            //updateOnResize();
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
                "author": "Anonym",
                "base": $scope.serverCheckpoint.id,
                "title": $scope.title
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
        function addOption(option) {
            if(option == 'row')
            {
                $scope.checkpoint.options.rows = $scope.checkpoint.options.rows.concat([{key : "new row"}])
            }
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

        function setCheckpoint(checkpoint) {
            $scope.checkpoint.datasetString = '';
            $scope.checkpoint.dataset = checkpoint.data;
            $scope.checkpoint.schemaString = '';
            $scope.checkpoint.schema = {};
            $scope.checkpoint.optionsString = '';
            $scope.checkpoint.options = checkpoint.options;
            $scope.title = checkpoint.title;
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImNvbW1vbi9vbi1yZWFkLWZpbGUvb24tcmVhZC1maWxlLWRpcmVjdGl2ZS5qcyIsInRyZWUvdHJlZS1lbmRwb2ludC5qcyIsInRyZWUvdHJlZS1jb250cm9sbGVyLmpzIiwiZW1iZWQvZW1iZWQtY29udHJvbGxlci5qcyIsImVkaXRvci9lZGl0b3ItY29udHJvbGxlci5qcyIsImNvbW1vbi9zdGF0ZXMuY29uZmlnLmpzIiwiY29tbW9uL29ucmVzaXplLmpzIiwiY29tbW9uL2FwcC1jb250cm9sbGVyLmpzIiwiY2hlY2twb2ludC9jaGVja3BvaW50LWVuZHBvaW50LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLENBQUMsWUFBWTs7RUFFWDs7RUFFQTtLQUNHLE9BQU8sYUFBYTtNQUNuQjtNQUNBO01BQ0E7TUFDQTtNQUNBO01BQ0E7TUFDQTtNQUNBO01BQ0E7Ozs7QUFJTjtBQ2xCQSxDQUFDLFlBQVk7O0lBRVQ7Ozs7Ozs7Ozs7Ozs7OztJQWVBLFNBQVMsV0FBVyxRQUFRO1FBQ3hCLE9BQU87WUFDSCxVQUFVO1lBQ1YsT0FBTztZQUNQLE1BQU0sU0FBUyxPQUFPLFNBQVMsT0FBTztnQkFDbEMsSUFBSSxLQUFLLE9BQU8sTUFBTTs7Z0JBRXRCLFFBQVEsR0FBRyxVQUFVLFNBQVMsZUFBZTtvQkFDekMsSUFBSSxTQUFTLElBQUk7O29CQUVqQixPQUFPLFNBQVMsU0FBUyxhQUFhO3dCQUNsQyxNQUFNLE9BQU8sV0FBVzs0QkFDcEIsR0FBRyxPQUFPLENBQUMsYUFBYSxZQUFZLE9BQU87Ozs7b0JBSW5ELE9BQU8sV0FBVyxDQUFDLGNBQWMsY0FBYyxjQUFjLFFBQVEsTUFBTTs7Ozs7OztJQU0zRjtTQUNLLE9BQU87U0FDUCxVQUFVLGNBQWM7OztBQUdqQztBQzVDQSxDQUFDLFlBQVk7O0lBRVQ7O0lBRUEsU0FBUyxhQUFhLFdBQVcsS0FBSztRQUNsQyxPQUFPLFVBQVUsSUFBSSxNQUFNLFlBQVk7WUFDbkMsSUFBSTtXQUNMO1lBQ0Ms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QWtCO1lBQ3pDLElBQUk7V0FDTDtZQUNDLE1BQU07Z0JBQ0YsUUFBUTs7WUFFWixLQUFLO2dCQUNELFFBQVE7Ozs7OztJQUtwQjtTQUNLLE9BQU87U0FDUCxRQUFRLHNCQUFzQjs7O0FBR3ZDIiwiZmlsZSI6InNjcmlwdHMuanMiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gKCkge1xuXG4gICd1c2Ugc3RyaWN0JztcblxuICBhbmd1bGFyXG4gICAgLm1vZHVsZSgnZ3JhZmlkZGxlJywgW1xuICAgICAgJ2dyYWZpZGRsZS5jb25maWcnLFxuICAgICAgJ2dyYWZpZGRsZS50ZW1wbGF0ZXMnLFxuICAgICAgJ25nUmVzb3VyY2UnLFxuICAgICAgJ25nU2FuaXRpemUnLFxuICAgICAgJ25nQW5pbWF0ZScsXG4gICAgICAndWkucm91dGVyJyxcbiAgICAgICd1aS5sYXlvdXQnLFxuICAgICAgJ3VpLmFjZScsXG4gICAgICAnYW5ndWxhckNoYXJ0J1xuICAgIF0pO1xuXG59KSgpO1xuIiwiKGZ1bmN0aW9uICgpIHtcblxuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIC8qKlxuICAgICAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAgICAgKiBAbmFtZSBncmFmaWRkbGUuZGlyZWN0aXZlOm9uUmVhZEZpbGVcbiAgICAgKiBAcmVxdWlyZXMgJHBhcnNlXG4gICAgICogQHJlcXVpcmVzICRsb2dcbiAgICAgKiBAcmVzdHJpY3QgQVxuICAgICAqXG4gICAgICogQGRlc2NyaXB0aW9uXG4gICAgICogVGhlIGBvblJlYWRGaWxlYCBkaXJlY3RpdmUgb3BlbnMgdXAgYSBGaWxlUmVhZGVyIGRpYWxvZyB0byB1cGxvYWQgZmlsZXMgZnJvbSB0aGUgbG9jYWwgZmlsZXN5c3RlbS5cbiAgICAgKlxuICAgICAqIEBlbGVtZW50IEFOWVxuICAgICAqIEBuZ0luamVjdFxuICAgICAqL1xuICAgIGZ1bmN0aW9uIG9uUmVhZEZpbGUoJHBhcnNlKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByZXN0cmljdDogJ0EnLFxuICAgICAgICAgICAgc2NvcGU6IGZhbHNlLFxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XG4gICAgICAgICAgICAgICAgdmFyIGZuID0gJHBhcnNlKGF0dHJzLm9uUmVhZEZpbGUpO1xuXG4gICAgICAgICAgICAgICAgZWxlbWVudC5vbignY2hhbmdlJywgZnVuY3Rpb24ob25DaGFuZ2VFdmVudCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcblxuICAgICAgICAgICAgICAgICAgICByZWFkZXIub25sb2FkID0gZnVuY3Rpb24ob25Mb2FkRXZlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLiRhcHBseShmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmbihzY29wZSwgeyRmaWxlQ29udGVudDpvbkxvYWRFdmVudC50YXJnZXQucmVzdWx0fSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgICAgICByZWFkZXIucmVhZEFzVGV4dCgob25DaGFuZ2VFdmVudC5zcmNFbGVtZW50IHx8IG9uQ2hhbmdlRXZlbnQudGFyZ2V0KS5maWxlc1swXSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgYW5ndWxhclxuICAgICAgICAubW9kdWxlKCdncmFmaWRkbGUnKVxuICAgICAgICAuZGlyZWN0aXZlKCdvblJlYWRGaWxlJywgb25SZWFkRmlsZSk7XG5cbn0pKCk7XG4iLCIoZnVuY3Rpb24gKCkge1xuXG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgZnVuY3Rpb24gVHJlZUVuZHBvaW50KCRyZXNvdXJjZSwgRU5WKSB7XG4gICAgICAgIHJldHVybiAkcmVzb3VyY2UoRU5WLmFwaSArICd0cmVlLzppZCcsIHtcbiAgICAgICAgICAgIGlkOiAnQGlkJ1xuICAgICAgICB9LCB7XG4gICAgICAgICAgICBnZXQ6IHtcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgICAgIGlzQXJyYXk6IHRydWVcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgYW5ndWxhclxuICAgICAgICAubW9kdWxlKCdncmFmaWRkbGUnKVxuICAgICAgICAuZmFjdG9yeSgnVHJlZUVuZHBvaW50JywgVHJlZUVuZHBvaW50KTtcblxufSkoKTtcbiIsIihmdW5jdGlvbiAoKSB7XG5cbiAgICBmdW5jdGlvbiBUcmVlQ29udHJvbGxlcigkc2NvcGUsICRzdGF0ZSwgQ2hlY2twb2ludEVuZHBvaW50LCBUcmVlRW5kcG9pbnQpIHtcbiAgICAgICAgdmFyIHRyZWVEYXRhID0gW107XG4gICAgICAgICRzY29wZS5jaGVja3BvaW50ID0ge1xuICAgICAgICAgICAgaWQ6ICRzdGF0ZS5wYXJhbXMuaWRcbiAgICAgICAgfTtcblxuICAgICAgICBDaGVja3BvaW50RW5kcG9pbnRcbiAgICAgICAgICAgIC5nZXQoe2lkOiAkc3RhdGUucGFyYW1zLmlkfSlcbiAgICAgICAgICAgIC4kcHJvbWlzZVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oY2hlY2twb2ludCkge1xuICAgICAgICAgICAgICAgICRzY29wZS5jaGVja3BvaW50ID0gY2hlY2twb2ludDtcbiAgICAgICAgICAgICAgICBUcmVlRW5kcG9pbnRcbiAgICAgICAgICAgICAgICAgICAgLmdldCh7aWQ6IGNoZWNrcG9pbnQudHJlZX0pXG4gICAgICAgICAgICAgICAgICAgIC4kcHJvbWlzZVxuICAgICAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbih0cmVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0cmVlRGF0YSA9IGNvbnZlcnRUcmVlKHRyZWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZHJhdygpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIGZ1bmN0aW9uIGNvbnZlcnRUcmVlKHRyZWUpIHtcbiAgICAgICAgICAgIC8vIGZpbmQgYmFzZVxuICAgICAgICAgICAgdmFyIGJhc2UgPSB7fTtcbiAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaCh0cmVlLCBmdW5jdGlvbihub2RlKSB7XG4gICAgICAgICAgICAgICAgaWYgKG5vZGUuYmFzZSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICBiYXNlID0gbm9kZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgdmFyIHRyZWVEYXRhID0gW107XG4gICAgICAgICAgICB0cmVlRGF0YS5wdXNoKGJhc2UpO1xuICAgICAgICAgICAgYWRkQ2hpbGRyZW4oYmFzZSwgdHJlZSk7XG5cbiAgICAgICAgICAgIHJldHVybiB0cmVlRGF0YVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gYWRkQ2hpbGRyZW4oYmFzZSwgdHJlZSkge1xuICAgICAgICAgICAgYmFzZS5jaGlsZHJlbiA9IFtdO1xuICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKHRyZWUsIGZ1bmN0aW9uKG5vZGUpIHtcbiAgICAgICAgICAgICAgICBpZiAobm9kZS5iYXNlID09PSBiYXNlLmlkKSB7XG4gICAgICAgICAgICAgICAgICAgIGJhc2UuY2hpbGRyZW4ucHVzaChub2RlKTtcbiAgICAgICAgICAgICAgICAgICAgYWRkQ2hpbGRyZW4obm9kZSwgdHJlZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGNsaWNrKGQpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGQpO1xuICAgICAgICAgICAgJHN0YXRlLmdvKCdlZGl0b3InLCB7aWQ6IGQuaWR9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGRyYXcoKSB7XG5cbiAgICAgICAgICAgIC8vICoqKioqKioqKioqKioqIEdlbmVyYXRlIHRoZSB0cmVlIGRpYWdyYW1cdCAqKioqKioqKioqKioqKioqKlxuICAgICAgICAgICAgdmFyIG1hcmdpbiA9IHt0b3A6IDQwLCByaWdodDogMCwgYm90dG9tOiAyMCwgbGVmdDogMH0sXG4gICAgICAgICAgICAgICAgd2lkdGggPSA5MDAgLSBtYXJnaW4ucmlnaHQgLSBtYXJnaW4ubGVmdCxcbiAgICAgICAgICAgICAgICBoZWlnaHQgPSA3MDAgLSBtYXJnaW4udG9wIC0gbWFyZ2luLmJvdHRvbTtcblxuICAgICAgICAgICAgdmFyIGkgPSAwO1xuXG4gICAgICAgICAgICB2YXIgdHJlZSA9IGQzLmxheW91dC50cmVlKClcbiAgICAgICAgICAgICAgICAuc2l6ZShbaGVpZ2h0LCB3aWR0aF0pO1xuXG4gICAgICAgICAgICB2YXIgZGlhZ29uYWwgPSBkMy5zdmcuZGlhZ29uYWwoKVxuICAgICAgICAgICAgICAgIC5wcm9qZWN0aW9uKGZ1bmN0aW9uKGQpIHsgcmV0dXJuIFtkLngsIGQueV07IH0pO1xuXG4gICAgICAgICAgICB2YXIgc3ZnID0gZDMuc2VsZWN0KFwiI3RyZWVcIikuYXBwZW5kKFwic3ZnXCIpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJ3aWR0aFwiLCB3aWR0aCArIG1hcmdpbi5yaWdodCArIG1hcmdpbi5sZWZ0KVxuICAgICAgICAgICAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIGhlaWdodCArIG1hcmdpbi50b3AgKyBtYXJnaW4uYm90dG9tKVxuICAgICAgICAgICAgICAgIC5hcHBlbmQoXCJnXCIpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoXCIgKyBtYXJnaW4ubGVmdCArIFwiLFwiICsgbWFyZ2luLnRvcCArIFwiKVwiKTtcblxuICAgICAgICAgICAgcm9vdCA9IHRyZWVEYXRhWzBdO1xuXG4gICAgICAgICAgICB1cGRhdGUocm9vdCk7XG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIHVwZGF0ZShzb3VyY2UpIHtcblxuICAgICAgICAgICAgICAgIC8vIENvbXB1dGUgdGhlIG5ldyB0cmVlIGxheW91dC5cbiAgICAgICAgICAgICAgICB2YXIgbm9kZXMgPSB0cmVlLm5vZGVzKHJvb3QpLnJldmVyc2UoKSxcbiAgICAgICAgICAgICAgICAgICAgbGlua3MgPSB0cmVlLmxpbmtzKG5vZGVzKTtcblxuICAgICAgICAgICAgICAgIC8vIE5vcm1hbGl6ZSBmb3IgZml4ZWQtZGVwdGguXG4gICAgICAgICAgICAgICAgbm9kZXMuZm9yRWFjaChmdW5jdGlvbihkKSB7IGQueSA9IGQuZGVwdGggKiAxMDA7IH0pO1xuXG4gICAgICAgICAgICAgICAgLy8gRGVjbGFyZSB0aGUgbm9kZXPigKZcbiAgICAgICAgICAgICAgICB2YXIgbm9kZSA9IHN2Zy5zZWxlY3RBbGwoXCJnLm5vZGVcIilcbiAgICAgICAgICAgICAgICAgICAgLmRhdGEobm9kZXMsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQuaWQgfHwgKGQuaWQgPSArK2kpOyB9KTtcblxuICAgICAgICAgICAgICAgIC8vIEVudGVyIHRoZSBub2Rlcy5cbiAgICAgICAgICAgICAgICB2YXIgbm9kZUVudGVyID0gbm9kZS5lbnRlcigpLmFwcGVuZChcImdcIilcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcIm5vZGVcIilcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwidHJhbnNsYXRlKFwiICsgZC54ICsgXCIsXCIgKyBkLnkgKyBcIilcIjsgfSlcbiAgICAgICAgICAgICAgICAgICAgLm9uKFwiY2xpY2tcIiwgY2xpY2spOztcblxuICAgICAgICAgICAgICAgIG5vZGVFbnRlci5hcHBlbmQoXCJjaXJjbGVcIilcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoXCJyXCIsIDEwKVxuICAgICAgICAgICAgICAgICAgICAuc3R5bGUoXCJmaWxsXCIsIFwiI2ZmZlwiKTtcblxuICAgICAgICAgICAgICAgIG5vZGVFbnRlci5hcHBlbmQoXCJ0ZXh0XCIpXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKFwieVwiLCBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZC5jaGlsZHJlbiB8fCBkLl9jaGlsZHJlbiA/IC0xOCA6IDE4OyB9KVxuICAgICAgICAgICAgICAgICAgICAuYXR0cihcImR5XCIsIFwiLjM1ZW1cIilcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoXCJ0ZXh0LWFuY2hvclwiLCBcIm1pZGRsZVwiKVxuICAgICAgICAgICAgICAgICAgICAudGV4dChmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgdGV4dCA9IGQudGl0bGU7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyArICcgYnkgJyArIGQuYXV0aG9yO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGQuaWQgPT0gJHNjb3BlLmNoZWNrcG9pbnQuaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZXh0ICs9ICcgKGN1cnJlbnQpJztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0ZXh0O1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAuc3R5bGUoXCJmaWxsLW9wYWNpdHlcIiwgMSk7XG5cbiAgICAgICAgICAgICAgICAvLyBEZWNsYXJlIHRoZSBsaW5rc+KAplxuICAgICAgICAgICAgICAgIHZhciBsaW5rID0gc3ZnLnNlbGVjdEFsbChcInBhdGgubGlua1wiKVxuICAgICAgICAgICAgICAgICAgICAuZGF0YShsaW5rcywgZnVuY3Rpb24oZCkgeyByZXR1cm4gZC50YXJnZXQuaWQ7IH0pO1xuXG4gICAgICAgICAgICAgICAgLy8gRW50ZXIgdGhlIGxpbmtzLlxuICAgICAgICAgICAgICAgIGxpbmsuZW50ZXIoKS5pbnNlcnQoXCJwYXRoXCIsIFwiZ1wiKVxuICAgICAgICAgICAgICAgICAgICAuYXR0cihcImNsYXNzXCIsIFwibGlua1wiKVxuICAgICAgICAgICAgICAgICAgICAuYXR0cihcImRcIiwgZGlhZ29uYWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgYW5ndWxhclxuICAgICAgICAubW9kdWxlKCdncmFmaWRkbGUnKVxuICAgICAgICAuY29udHJvbGxlcignVHJlZUNvbnRyb2xsZXInLCBUcmVlQ29udHJvbGxlcik7XG5cbn0pKCk7IiwiKGZ1bmN0aW9uICgpIHtcblxuICAgIGZ1bmN0aW9uIEVtYmVkQ29udHJvbGxlcigkc2NvcGUsICRmaWx0ZXIsICRsb2NhdGlvbikge1xuXG4gICAgICAgICRzY29wZS5maWRkbGVpZCA9ICRsb2NhdGlvbi5wYXRoKCkuc3Vic3RyKDEpLnNwbGl0KCc/JywgMSlbMF07XG5cbiAgICAgICAgJHNjb3BlLmVtYmVkVmlldyA9ICdjaGFydCc7XG4gICAgICAgIHZhciByZXF1ZXN0VmlldyA9ICRsb2NhdGlvbi5zZWFyY2goKS52aWV3O1xuICAgICAgICBpZihyZXF1ZXN0Vmlldykge1xuICAgICAgICAgICAgJHNjb3BlLmVtYmVkVmlldyA9IHJlcXVlc3RWaWV3O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAkc2NvcGUuc2V0VmlldyA9IGZ1bmN0aW9uKG5ld1ZpZXcpIHtcbiAgICAgICAgICAgICRzY29wZS5lbWJlZFZpZXcgPSBuZXdWaWV3O1xuICAgICAgICAgICAgJHNjb3BlLm9wdGlvbnNFZGl0b3IucmVzaXplKCk7XG4gICAgICAgICAgICAkc2NvcGUuZGF0YUVkaXRvci5yZXNpemUoKTtcbiAgICAgICAgICAgICRzY29wZS5vcHRpb25zRWRpdG9yLnJlbmRlcmVyLnVwZGF0ZUZ1bGwoKTtcbiAgICAgICAgICAgICRzY29wZS5kYXRhRWRpdG9yLnJlbmRlcmVyLnVwZGF0ZUZ1bGwoKTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuaXNWaWV3ID0gZnVuY3Rpb24odmlldykge1xuICAgICAgICAgICAgcmV0dXJuIHZpZXcgPT0gJHNjb3BlLmVtYmVkVmlldztcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuZGF0YXNldFN0cmluZyA9ICcnO1xuICAgICAgICAkc2NvcGUuZGF0YXNldCA9IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAnZGF5JzogJzIwMTMtMDEtMDJfMDA6MDA6MDAnLFxuICAgICAgICAgICAgICAgICdzYWxlcyc6IDM0NjEuMjk1MjAyLFxuICAgICAgICAgICAgICAgICdpbmNvbWUnOiAxMjM2NS4wNTNcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgJ2RheSc6ICcyMDEzLTAxLTAzXzAwOjAwOjAwJyxcbiAgICAgICAgICAgICAgICAnc2FsZXMnOiA0NDYxLjI5NTIwMixcbiAgICAgICAgICAgICAgICAnaW5jb21lJzogMTMzNjUuMDUzXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICdkYXknOiAnMjAxMy0wMS0wNF8wMDowMDowMCcsXG4gICAgICAgICAgICAgICAgJ3NhbGVzJzogNDU2MS4yOTUyMDIsXG4gICAgICAgICAgICAgICAgJ2luY29tZSc6IDE0MzY1LjA1M1xuICAgICAgICAgICAgfVxuICAgICAgICBdO1xuXG4gICAgICAgICRzY29wZS5zY2hlbWEgPSB7XG4gICAgICAgICAgICBkYXk6IHtcbiAgICAgICAgICAgICAgICB0eXBlOiAnZGF0ZXRpbWUnLFxuICAgICAgICAgICAgICAgIGZvcm1hdDogJyVZLSVtLSVkXyVIOiVNOiVTJyxcbiAgICAgICAgICAgICAgICBuYW1lOiAnRGF0ZSdcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUub3B0aW9uc1N0cmluZyA9ICcnO1xuICAgICAgICAkc2NvcGUub3B0aW9ucyA9IHtcbiAgICAgICAgICAgIHJvd3M6IFt7XG4gICAgICAgICAgICAgICAga2V5OiAnaW5jb21lJyxcbiAgICAgICAgICAgICAgICB0eXBlOiAnYmFyJ1xuICAgICAgICAgICAgfSwge1xuICAgICAgICAgICAgICAgIGtleTogJ3NhbGVzJ1xuICAgICAgICAgICAgfV0sXG4gICAgICAgICAgICB4QXhpczoge1xuICAgICAgICAgICAgICAgIGtleTogJ2RheScsXG4gICAgICAgICAgICAgICAgZGlzcGxheUZvcm1hdDogJyVZLSVtLSVkICVIOiVNOiVTJ1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIGRlZmluZSBjb2RlIGhpZ2hsaWdodGluZ1xuICAgICAgICAkc2NvcGUub3B0aW9uc0FjZUNvbmZpZyA9IHtcbiAgICAgICAgICAgIG1vZGU6ICdqc29uJyxcbiAgICAgICAgICAgIHVzZVdyYXBNb2RlOiBmYWxzZSxcbiAgICAgICAgICAgIG9uTG9hZDogZnVuY3Rpb24oX2VkaXRvcikge1xuICAgICAgICAgICAgICAgIF9lZGl0b3Iuc2V0U2hvd1ByaW50TWFyZ2luKGZhbHNlKTtcbiAgICAgICAgICAgICAgICAkc2NvcGUub3B0aW9uc0VkaXRvciA9IF9lZGl0b3I7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLmRhdGFzZXRBY2VDb25maWcgPSB7XG4gICAgICAgICAgICBtb2RlOiAnanNvbicsXG4gICAgICAgICAgICB1c2VXcmFwTW9kZTogZmFsc2UsXG4gICAgICAgICAgICBvbkxvYWQ6IGZ1bmN0aW9uKF9lZGl0b3IpIHtcbiAgICAgICAgICAgICAgICBfZWRpdG9yLnNldFNob3dQcmludE1hcmdpbihmYWxzZSk7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmRhdGFFZGl0b3IgPSBfZWRpdG9yO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaCgnb3B0aW9ucycsIGZ1bmN0aW9uKGpzb24pIHtcbiAgICAgICAgICAgICRzY29wZS5vcHRpb25zU3RyaW5nID0gJGZpbHRlcignanNvbicpKGpzb24pO1xuICAgICAgICB9LCB0cnVlKTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoKCdvcHRpb25zU3RyaW5nJywgZnVuY3Rpb24oanNvbikge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAkc2NvcGUub3B0aW9ucyA9IEpTT04ucGFyc2UoanNvbik7XG4gICAgICAgICAgICAgICAgJHNjb3BlLndlbGxGb3JtZWRPcHRpb25zID0gdHJ1ZTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUud2VsbEZvcm1lZE9wdGlvbnMgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaCgnZGF0YXNldCcsIGZ1bmN0aW9uKGpzb24pIHtcbiAgICAgICAgICAgICRzY29wZS5kYXRhc2V0U3RyaW5nID0gJGZpbHRlcignanNvbicpKGpzb24pO1xuICAgICAgICB9LCB0cnVlKTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoKCdkYXRhc2V0U3RyaW5nJywgZnVuY3Rpb24oanNvbikge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAkc2NvcGUuZGF0YXNldCA9IEpTT04ucGFyc2UoanNvbik7XG4gICAgICAgICAgICAgICAgJHNjb3BlLndlbGxGb3JtZWREYXRhc2V0ID0gdHJ1ZTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUud2VsbEZvcm1lZERhdGFzZXQgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICB9XG5cbiAgICBhbmd1bGFyXG4gICAgICAgIC5tb2R1bGUoJ2dyYWZpZGRsZScpXG4gICAgICAgIC5jb250cm9sbGVyKCdFbWJlZENvbnRyb2xsZXInLCBFbWJlZENvbnRyb2xsZXIpO1xuXG59KSgpO1xuIiwiKGZ1bmN0aW9uICgpIHtcblxuICAgIGZ1bmN0aW9uIEVkaXRvckNvbnRyb2xsZXIoJHNjb3BlLCAkZmlsdGVyLCAkc3RhdGUsICR3aW5kb3csICR0aW1lb3V0LCBDaGVja3BvaW50RW5kcG9pbnQpIHtcblxuICAgICAgICAkc2NvcGUuc2hvd0RhdGFFZGl0b3IgPSBmYWxzZTtcbiAgICAgICAgJHNjb3BlLnNob3dPcHRpb25zVUkgID0gZmFsc2U7XG4gICAgICAgICRzY29wZS5zaG93U2hhcmVQb3B1cCA9IGZhbHNlO1xuICAgICAgICAkc2NvcGUuc3dpdGNoRGF0YUJ1dHRvblRpdGxlICAgID0gJ01hbnVhbCBkYXRhIGVudHJ5JztcbiAgICAgICAgJHNjb3BlLnN3aXRjaE9wdGlvbnNCdXR0b25UaXRsZSA9ICdFZGl0IGluIEdVSSc7XG4gICAgICAgICRzY29wZS50b2dnbGVEYXRhRWRpdG9yID0gdG9nZ2xlRGF0YUVkaXRvcjtcbiAgICAgICAgJHNjb3BlLnRvZ2dsZU9wdGlvbnNVSSAgPSB0b2dnbGVPcHRpb25zVUk7XG4gICAgICAgICRzY29wZS5zaGFyZVBvcHVwICAgICAgID0gc2hhcmVQb3B1cDtcbiAgICAgICAgJHNjb3BlLm9uU2hhcmVUZXh0Q2xpY2sgPSBvblNoYXJlVGV4dENsaWNrO1xuICAgICAgICAkc2NvcGUuYWRkT3B0aW9uID0gYWRkT3B0aW9uO1xuICAgICAgICAkc2NvcGUudGl0bGUgPSAnJztcblxuICAgICAgICAkc2NvcGUuc2hhcmUgPSBzaGFyZTtcbiAgICAgICAgJHNjb3BlLnNhdmUgPSBzYXZlO1xuICAgICAgICAkc2NvcGUudXBsb2FkRmlsZSA9IHVwbG9hZEZpbGU7XG5cbiAgICAgICAgJHNjb3BlLm9wdGlvbnNVSXJvd1R5cGVPcHRpb25zID0gW1xuICAgICAgICAgICAgeyBsYWJlbDogJ2xpbmUnLCB2YWx1ZTogMSB9LFxuICAgICAgICAgICAgeyBsYWJlbDogJ3NwbGluZScsIHZhbHVlOiAyIH0sXG4gICAgICAgICAgICB7IGxhYmVsOiAnYmFyJywgdmFsdWU6IDMgfSxcbiAgICAgICAgICAgIHsgbGFiZWw6ICdzY2F0dGVyJywgdmFsdWU6IDQgfSxcbiAgICAgICAgICAgIHsgbGFiZWw6ICdhcmVhJywgdmFsdWU6IDUgfSxcbiAgICAgICAgICAgIHsgbGFiZWw6ICdhcmVhLXNwbGluZScsIHZhbHVlOiA2IH0sXG4gICAgICAgICAgICB7IGxhYmVsOiAnc3RlcCcsIHZhbHVlOiA3IH0sXG4gICAgICAgICAgICB7IGxhYmVsOiAnYXJlYS1zdGVwJywgdmFsdWU6IDggfSxcbiAgICAgICAgICAgIHsgbGFiZWw6ICdzdGVwJywgdmFsdWU6IDkgfVxuICAgICAgICBdO1xuXG4gICAgICAgICRzY29wZS5jaGVja3BvaW50ID0ge307XG4gICAgICAgICRzY29wZS5hY2VKc29uQ29uZmlnID0ge1xuICAgICAgICAgICAgbW9kZTogJ2pzb24nLFxuICAgICAgICAgICAgdXNlV3JhcE1vZGU6IGZhbHNlLFxuICAgICAgICAgICAgb25Mb2FkOiBmdW5jdGlvbiAoX2VkaXRvcikge1xuICAgICAgICAgICAgICAgIF9lZGl0b3Iuc2V0U2hvd1ByaW50TWFyZ2luKGZhbHNlKTtcbiAgICAgICAgICAgICAgICBfZWRpdG9yLiRibG9ja1Njcm9sbGluZyA9IEluZmluaXR5O1xuICAgICAgICAgICAgICAgICRzY29wZS5lZGl0b3JzID0gX2VkaXRvcjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBhY3RpdmF0ZSgpO1xuXG4gICAgICAgIC8vLy8vLy8vLy8vL1xuXG4gICAgICAgIGZ1bmN0aW9uIGFjdGl2YXRlKCkge1xuXG4gICAgICAgICAgICBpZiAoJHN0YXRlLnBhcmFtcy5pZCkge1xuICAgICAgICAgICAgICAgIENoZWNrcG9pbnRFbmRwb2ludFxuICAgICAgICAgICAgICAgICAgICAuZ2V0KHtpZDogJHN0YXRlLnBhcmFtcy5pZH0pXG4gICAgICAgICAgICAgICAgICAgIC4kcHJvbWlzZVxuICAgICAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbihjaGVja3BvaW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuc2VydmVyQ2hlY2twb2ludCA9IGNoZWNrcG9pbnQ7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZXRDaGVja3BvaW50KGNoZWNrcG9pbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgJHRpbWVvdXQoc2F2ZUFzSW1hZ2UsIDApO1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAuY2F0Y2goZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnZWRpdG9yJywge2lkOiAnJ30pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbG9hZERlZmF1bHREYXRhKCk7XG4gICAgICAgICAgICAgICAgJHRpbWVvdXQoc2F2ZUFzSW1hZ2UsIDApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3luY09wdGlvbnMoKTtcbiAgICAgICAgICAgIHN5bmNEYXRhc2V0KCk7XG4gICAgICAgICAgICAvL3VwZGF0ZU9uUmVzaXplKCk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBzYXZlQXNJbWFnZSgpIHtcbiAgICAgICAgICAgIGNhbnZnKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjYW52YXMnKSwgZDMuc2VsZWN0KFwiLmFuZ3VsYXJjaGFydFwiKS5ub2RlKCkuaW5uZXJIVE1MKTtcbiAgICAgICAgICAgICRzY29wZS5hc0ltYWdlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NhbnZhcycpLnRvRGF0YVVSTCgpO1xuICAgICAgICAgICAgJHNjb3BlLm1ldGFkYXRhLm9nWydvZzppbWFnZSddID0gJHNjb3BlLmFzSW1hZ2U7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTYXZlIHRoZSBjdXJyZW50IFZlcnNpb25cbiAgICAgICAgLy9cbiAgICAgICAgZnVuY3Rpb24gc2F2ZSgpIHtcbiAgICAgICAgICAgIENoZWNrcG9pbnRFbmRwb2ludC5zYXZlKHtcbiAgICAgICAgICAgICAgICBcImRhdGFcIjogJHNjb3BlLmNoZWNrcG9pbnQuZGF0YXNldCxcbiAgICAgICAgICAgICAgICBcIm9wdGlvbnNcIjogJHNjb3BlLmNoZWNrcG9pbnQub3B0aW9ucyxcbiAgICAgICAgICAgICAgICBcImF1dGhvclwiOiBcIkFub255bVwiLFxuICAgICAgICAgICAgICAgIFwiYmFzZVwiOiAkc2NvcGUuc2VydmVyQ2hlY2twb2ludC5pZCxcbiAgICAgICAgICAgICAgICBcInRpdGxlXCI6ICRzY29wZS50aXRsZVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAuJHByb21pc2VcbiAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbiAoY2hlY2twb2ludCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnc2F2ZWQgY2hlY2twb2ludDogJywgY2hlY2twb2ludCk7XG4gICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnZWRpdG9yJywge2lkOiBjaGVja3BvaW50LmlkfSk7XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAuY2F0Y2goZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignc2F2ZSBmYWlsZWQnLCBlKTtcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2hhcmUgdGhlIGZpZGRsZVxuICAgICAgICAvL1xuICAgICAgICBmdW5jdGlvbiBzaGFyZSh0YXJnZXQpIHtcbiAgICAgICAgICAgIGZpZGRsZVVSTCAgICAgICA9ICdodHRwOi8vZ3JhZmlkZGxlLmFwcHNwb3QuY29tLycgKyAkc3RhdGUucGFyYW1zLmlkO1xuICAgICAgICAgICAgaWYodGFyZ2V0ID09ICdGQicpIHtcbiAgICAgICAgICAgICAgICAkd2luZG93Lm9wZW4oJ2h0dHBzOi8vd3d3LmZhY2Vib29rLmNvbS9zaGFyZXIvc2hhcmVyLnBocD91PScgKyBmaWRkbGVVUkwsICdfYmxhbmsnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmKHRhcmdldCA9PSAnVHdpdHRlcicpIHtcbiAgICAgICAgICAgICAgICAkd2luZG93Lm9wZW4oJ2h0dHBzOi8vdHdpdHRlci5jb20vaW50ZW50L3R3ZWV0P3RleHQ9Q2hlY2slMjBvdXQlMjB0aGlzJTIwc3dlZXQlMjBncmFmaWRkbGUlMjAmdXJsPScgKyBmaWRkbGVVUkwsICdfYmxhbmsnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmKHRhcmdldCA9PSAnRS1NYWlsJykge1xuICAgICAgICAgICAgICAgICR3aW5kb3cubG9jYXRpb24gPSAnbWFpbHRvOmFAYi5jZD9zdWJqZWN0PUNoZWNrJTIwb3V0JTIwdGhpcyUyMGF3ZXNvbWUlMjBHcmFmaWRkbGUmYm9keT0nICsgZmlkZGxlVVJMO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBsb2FkIGEgZmlsZSBhcyBkYXRhIHNvdXJjZVxuICAgICAgICAvL1xuICAgICAgICBmdW5jdGlvbiB1cGxvYWRGaWxlKGZpbGUpIHtcbiAgICAgICAgICAgICRzY29wZS5jaGVja3BvaW50LmRhdGFzZXRTdHJpbmcgPSBmaWxlO1xuICAgICAgICAgICAgJHNjb3BlLnRvZ2dsZURhdGFFZGl0b3IoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRvZ2dsZSBmcm9tIGRhdGEgdmlld1xuICAgICAgICAvL1xuICAgICAgICBmdW5jdGlvbiB0b2dnbGVEYXRhRWRpdG9yKCkge1xuICAgICAgICAgICAgJHNjb3BlLnNob3dEYXRhRWRpdG9yID0gISRzY29wZS5zaG93RGF0YUVkaXRvcjtcbiAgICAgICAgICAgICRzY29wZS5zd2l0Y2hEYXRhQnV0dG9uVGl0bGUgPSAkc2NvcGUuc2hvd0RhdGFFZGl0b3IgPyAnQmFjayB0byBpbnB1dCBkaWFsb2cnIDogJ01hbnVhbCBkYXRhIGVudHJ5JztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRvZ2dsZSBmcm9tIGpzb24tb3B0aW9uIHZpZXdcbiAgICAgICAgLy9cbiAgICAgICAgZnVuY3Rpb24gdG9nZ2xlT3B0aW9uc1VJKCkge1xuICAgICAgICAgICAgJHNjb3BlLnNob3dPcHRpb25zVUkgPSAhJHNjb3BlLnNob3dPcHRpb25zVUk7XG4gICAgICAgICAgICAkc2NvcGUuc3dpdGNoT3B0aW9uc0J1dHRvblRpdGxlID0gJHNjb3BlLnNob3dPcHRpb25zVUkgPyAnRWRpdCBhcyBKU09OJyA6ICdFZGl0IGluIEdVSSc7XG4gICAgICAgICAgICAkc2NvcGUuZWRpdG9ycy5yZXNpemUoKTtcbiAgICAgICAgICAgICRzY29wZS5lZGl0b3JzLnJlbmRlcmVyLnVwZGF0ZUZ1bGwoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENyZWF0ZSB0aGUgSFRNTCBVSSByZXByZXNlbnRhdGlvbiBvZiB0aGUgb3B0aW9ucyBqc29uXG4gICAgICAgIC8vXG4gICAgICAgIGZ1bmN0aW9uIHVwZGF0ZU9wdGlvbnNVSShqc29uKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcInVwZGF0ZSBvcHRpb25zIHVpXCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2hvdyB0aGUgc2hhcmUgc2hlZXRcbiAgICAgICAgLy9cbiAgICAgICAgZnVuY3Rpb24gc2hhcmVQb3B1cCgpIHtcbiAgICAgICAgICAgICRzY29wZS5zaG93U2hhcmVQb3B1cCA9ICEkc2NvcGUuc2hvd1NoYXJlUG9wdXA7XG4gICAgICAgICAgICAkc2NvcGUuZmlkZGxlVVJMICAgICAgID0gJ2h0dHA6Ly9ncmFmaWRkbGUuYXBwc3BvdC5jb20vJyArICRzdGF0ZS5wYXJhbXMuaWQ7XG4gICAgICAgICAgICAkc2NvcGUuZmlkZGxlQ2hhcnRVUkwgID0gJ2h0dHA6Ly9ncmFmaWRkbGUuYXBwc3BvdC5jb20vJyArICRzdGF0ZS5wYXJhbXMuaWQgKyAnLnBuZyc7XG4gICAgICAgICAgICAkc2NvcGUuZmlkZGxlRW1iZWRDb2RlID0gJzxpZnJhbWUgd2lkdGg9XCIxMDAlXCIgaGVpZ2h0PVwiMzAwXCIgc3JjPVwiLy9ncmFmaWRkbGUuYXBwc3BvdC5jb20vZW1iZWQvJyArICRzdGF0ZS5wYXJhbXMuaWQgKyAnXCIgYWxsb3dmdWxsc2NyZWVuPVwiYWxsb3dmdWxsc2NyZWVuXCIgZnJhbWVib3JkZXI9XCIwXCI+PC9pZnJhbWU+JztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFsbG93IHNoYXJlIHRleHQgZmllbGRzIHRvIGF1dG9zZWxlY3Qgb24gZm9jdXNcbiAgICAgICAgLy9cbiAgICAgICAgZnVuY3Rpb24gb25TaGFyZVRleHRDbGljaygkZXZlbnQpIHtcbiAgICAgICAgICAgICRldmVudC50YXJnZXQuc2VsZWN0KCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgXG4gICAgICAgIC8vIEluc2VydCBkZWZhdWx0IGRhdGFcbiAgICAgICAgLy9cbiAgICAgICAgZnVuY3Rpb24gYWRkT3B0aW9uKG9wdGlvbikge1xuICAgICAgICAgICAgaWYob3B0aW9uID09ICdyb3cnKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICRzY29wZS5jaGVja3BvaW50Lm9wdGlvbnMucm93cyA9ICRzY29wZS5jaGVja3BvaW50Lm9wdGlvbnMucm93cy5jb25jYXQoW3trZXkgOiBcIm5ldyByb3dcIn1dKVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cblxuICAgICAgICAvLyBJbnNlcnQgZGVmYXVsdCBkYXRhXG4gICAgICAgIC8vXG4gICAgICAgIGZ1bmN0aW9uIGxvYWREZWZhdWx0RGF0YSgpIHtcbiAgICAgICAgICAgIHZhciBkYXRhc2V0ID0gW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgJ2RheSc6ICcyMDEzLTAxLTAyXzAwOjAwOjAwJyxcbiAgICAgICAgICAgICAgICAgICAgJ3NhbGVzJzogMzQ2MS4yOTUyMDIsXG4gICAgICAgICAgICAgICAgICAgICdpbmNvbWUnOiAxMjM2NS4wNTNcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgJ2RheSc6ICcyMDEzLTAxLTAzXzAwOjAwOjAwJyxcbiAgICAgICAgICAgICAgICAgICAgJ3NhbGVzJzogNDQ2MS4yOTUyMDIsXG4gICAgICAgICAgICAgICAgICAgICdpbmNvbWUnOiAxMzM2NS4wNTNcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgJ2RheSc6ICcyMDEzLTAxLTA0XzAwOjAwOjAwJyxcbiAgICAgICAgICAgICAgICAgICAgJ3NhbGVzJzogNDU2MS4yOTUyMDIsXG4gICAgICAgICAgICAgICAgICAgICdpbmNvbWUnOiAxNDM2NS4wNTNcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdO1xuICAgICAgICAgICAgdmFyIHNjaGVtYSA9IHtcbiAgICAgICAgICAgICAgICBkYXk6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2RhdGV0aW1lJyxcbiAgICAgICAgICAgICAgICAgICAgZm9ybWF0OiAnJVktJW0tJWRfJUg6JU06JVMnLFxuICAgICAgICAgICAgICAgICAgICBuYW1lOiAnRGF0ZSdcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdmFyIG9wdGlvbnMgPSB7XG4gICAgICAgICAgICAgICAgcm93czogW3tcbiAgICAgICAgICAgICAgICAgICAga2V5OiAnaW5jb21lJyxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2JhcidcbiAgICAgICAgICAgICAgICB9LCB7XG4gICAgICAgICAgICAgICAgICAgIGtleTogJ3NhbGVzJ1xuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgICAgICAgIHhBeGlzOiB7XG4gICAgICAgICAgICAgICAgICAgIGtleTogJ2RheScsXG4gICAgICAgICAgICAgICAgICAgIGRpc3BsYXlGb3JtYXQ6ICclWS0lbS0lZCAlSDolTTolUydcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAkc2NvcGUuY2hlY2twb2ludC5kYXRhc2V0U3RyaW5nID0gJyc7XG4gICAgICAgICAgICAkc2NvcGUuY2hlY2twb2ludC5kYXRhc2V0ID0gZGF0YXNldDtcbiAgICAgICAgICAgICRzY29wZS5jaGVja3BvaW50LnNjaGVtYVN0cmluZyA9ICcnO1xuICAgICAgICAgICAgJHNjb3BlLmNoZWNrcG9pbnQuc2NoZW1hID0gc2NoZW1hO1xuICAgICAgICAgICAgJHNjb3BlLmNoZWNrcG9pbnQub3B0aW9uc1N0cmluZyA9ICcnO1xuICAgICAgICAgICAgJHNjb3BlLmNoZWNrcG9pbnQub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBzZXRDaGVja3BvaW50KGNoZWNrcG9pbnQpIHtcbiAgICAgICAgICAgICRzY29wZS5jaGVja3BvaW50LmRhdGFzZXRTdHJpbmcgPSAnJztcbiAgICAgICAgICAgICRzY29wZS5jaGVja3BvaW50LmRhdGFzZXQgPSBjaGVja3BvaW50LmRhdGE7XG4gICAgICAgICAgICAkc2NvcGUuY2hlY2twb2ludC5zY2hlbWFTdHJpbmcgPSAnJztcbiAgICAgICAgICAgICRzY29wZS5jaGVja3BvaW50LnNjaGVtYSA9IHt9O1xuICAgICAgICAgICAgJHNjb3BlLmNoZWNrcG9pbnQub3B0aW9uc1N0cmluZyA9ICcnO1xuICAgICAgICAgICAgJHNjb3BlLmNoZWNrcG9pbnQub3B0aW9ucyA9IGNoZWNrcG9pbnQub3B0aW9ucztcbiAgICAgICAgICAgICRzY29wZS50aXRsZSA9IGNoZWNrcG9pbnQudGl0bGU7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTeW5jIE9iamVjdCBhbmQgU3RyaW5nIHJlcHJlc2VudGF0aW9uXG4gICAgICAgIC8vXG4gICAgICAgIGZ1bmN0aW9uIHN5bmNPcHRpb25zKCkge1xuICAgICAgICAgICAgJHNjb3BlLiR3YXRjaCgnY2hlY2twb2ludC5vcHRpb25zJywgZnVuY3Rpb24gKGpzb24pIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUuY2hlY2twb2ludC5vcHRpb25zU3RyaW5nID0gJGZpbHRlcignanNvbicpKGpzb24pO1xuICAgICAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgICAgICRzY29wZS4kd2F0Y2goJ2NoZWNrcG9pbnQub3B0aW9uc1N0cmluZycsIGZ1bmN0aW9uIChqc29uKSB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmNoZWNrcG9pbnQub3B0aW9ucyA9IEpTT04ucGFyc2UoanNvbik7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS53ZWxsRm9ybWVkT3B0aW9ucyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIHVwZGF0ZU9wdGlvbnNVSShqc29uKTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS53ZWxsRm9ybWVkT3B0aW9ucyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIHRydWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU3luYyBPYmplY3QgYW5kIFN0cmluZyByZXByZXNlbnRhdGlvblxuICAgICAgICAvL1xuICAgICAgICBmdW5jdGlvbiBzeW5jRGF0YXNldCgpIHtcbiAgICAgICAgICAgICRzY29wZS4kd2F0Y2goJ2NoZWNrcG9pbnQuZGF0YXNldCcsIGZ1bmN0aW9uIChqc29uKSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmNoZWNrcG9pbnQuZGF0YXNldFN0cmluZyA9ICRmaWx0ZXIoJ2pzb24nKShqc29uKTtcbiAgICAgICAgICAgICAgICBvcGRhdGVPcHRpb25zKCk7XG4gICAgICAgICAgICB9LCB0cnVlKTtcblxuICAgICAgICAgICAgJHNjb3BlLiR3YXRjaCgnY2hlY2twb2ludC5kYXRhc2V0U3RyaW5nJywgZnVuY3Rpb24gKGpzb24pIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY2hlY2twb2ludC5kYXRhc2V0ID0gSlNPTi5wYXJzZShqc29uKTtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLndlbGxGb3JtZWREYXRhc2V0ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS53ZWxsRm9ybWVkRGF0YXNldCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIHRydWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQWRkIHRpbWVzdGFtcCB0byBvcHRpb25zIHRvIHJlZHJhd1xuICAgICAgICAvL1xuICAgICAgICBmdW5jdGlvbiBvcGRhdGVPcHRpb25zKCkge1xuICAgICAgICAgICAgLy8gSXMgY2FsbGVkIHRvIG9mdGVuLCBub3Qgb25seSBvbiByZXNpemVcbiAgICAgICAgICAgIGlmICgkc2NvcGUuY2hlY2twb2ludCAmJiAkc2NvcGUuY2hlY2twb2ludC5vcHRpb25zKSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmNoZWNrcG9pbnQub3B0aW9ucy51cGRhdGVkID0gbmV3IERhdGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRyaWdnZXIgbmV3IHJlbmRlciBvbiByZXNpemVcbiAgICAgICAgLy9cbiAgICAgICAgZnVuY3Rpb24gdXBkYXRlT25SZXNpemUoKSB7XG4gICAgICAgICAgICB2YXIgbXlFbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NoYXJ0QXJlYScpO1xuICAgICAgICAgICAgYWRkUmVzaXplTGlzdGVuZXIobXlFbGVtZW50LCBvcGRhdGVPcHRpb25zKTtcblxuICAgICAgICAgICAgJHNjb3BlLiRvbihcIiRkZXN0cm95XCIsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZW1vdmVSZXNpemVMaXN0ZW5lcihteUVsZW1lbnQsIG9wZGF0ZU9wdGlvbnMpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgIH1cblxuICAgIGFuZ3VsYXJcbiAgICAgICAgLm1vZHVsZSgnZ3JhZmlkZGxlJylcbiAgICAgICAgLmNvbnRyb2xsZXIoJ0VkaXRvckNvbnRyb2xsZXInLCBFZGl0b3JDb250cm9sbGVyKTtcblxufSkoKTtcbiIsIihmdW5jdGlvbiAoKSB7XG5cbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBmdW5jdGlvbiBzdGF0ZXNDb25maWd1cmF0aW9uKCRzdGF0ZVByb3ZpZGVyLCAkdXJsUm91dGVyUHJvdmlkZXIsICRsb2NhdGlvblByb3ZpZGVyKSB7XG5cbiAgICAgICAgJHN0YXRlUHJvdmlkZXJcbiAgICAgICAgICAgIC5zdGF0ZSgnNDA0Jywge1xuICAgICAgICAgICAgICAgIHZpZXdzOiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnY29tcG9uZW50cy9jb21tb24vNDA0LzQwNC5odG1sJ1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5zdGF0ZSgnZW1iZWQnLCB7XG4gICAgICAgICAgICAgICAgdXJsOiAnLzppZC9lbWJlZCcsXG4gICAgICAgICAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAgICAgICAgICAgY29udGVudDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdjb21wb25lbnRzL2VtYmVkL2VtYmVkLmh0bWwnLFxuICAgICAgICAgICAgICAgICAgICAgICAgY29udHJvbGxlcjogJ0VtYmVkQ29udHJvbGxlcidcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuc3RhdGUoJ3RyZWUnLCB7XG4gICAgICAgICAgICAgICAgdXJsOiAnLzppZC90cmVlJyxcbiAgICAgICAgICAgICAgICB2aWV3czoge1xuICAgICAgICAgICAgICAgICAgICBjb250ZW50OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ2NvbXBvbmVudHMvdHJlZS90cmVlLmh0bWwnLFxuICAgICAgICAgICAgICAgICAgICAgICAgY29udHJvbGxlcjogJ1RyZWVDb250cm9sbGVyJ1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5zdGF0ZSgnZWRpdG9yJywge1xuICAgICAgICAgICAgICAgIHVybDogJy86aWQnLFxuICAgICAgICAgICAgICAgIHZpZXdzOiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnY29tcG9uZW50cy9lZGl0b3IvZWRpdG9yLmh0bWwnLFxuICAgICAgICAgICAgICAgICAgICAgICAgY29udHJvbGxlcjogJ0VkaXRvckNvbnRyb2xsZXInXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAvKiBAbmdJbmplY3QgKi9cbiAgICAgICAgJHVybFJvdXRlclByb3ZpZGVyLm90aGVyd2lzZShmdW5jdGlvbiAoJGluamVjdG9yLCAkbG9jYXRpb24pIHtcbiAgICAgICAgICAgIC8vIFVzZXJTZXJ2aWNlICYgJHN0YXRlIG5vdCBhdmFpbGFibGUgZHVyaW5nIC5jb25maWcoKSwgaW5qZWN0IHRoZW0gKG1hbnVhbGx5KSBsYXRlclxuXG4gICAgICAgICAgICAvLyByZXF1ZXN0aW5nIHVua25vd24gcGFnZSB1bmVxdWFsIHRvICcvJ1xuICAgICAgICAgICAgdmFyIHBhdGggPSAkbG9jYXRpb24ucGF0aCgpO1xuICAgICAgICAgICAgaWYgKHBhdGggIT09ICcvJykge1xuICAgICAgICAgICAgICAgICRpbmplY3Rvci5nZXQoJyRzdGF0ZScpLmdvKCc0MDQnKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcGF0aDsgLy8gdGhpcyB0cmljayBhbGxvd3MgdG8gc2hvdyB0aGUgZXJyb3IgcGFnZSBvbiB1bmtub3duIGFkZHJlc3NcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuICcvbmV3JztcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJGxvY2F0aW9uUHJvdmlkZXJcbiAgICAgICAgICAgIC5odG1sNU1vZGUodHJ1ZSlcbiAgICAgICAgICAgIC5oYXNoUHJlZml4KCchJyk7XG4gICAgfVxuXG5cbiAgICBhbmd1bGFyXG4gICAgICAgIC5tb2R1bGUoJ2dyYWZpZGRsZScpXG4gICAgICAgIC5jb25maWcoc3RhdGVzQ29uZmlndXJhdGlvbik7XG5cbn0pKCk7IiwiKGZ1bmN0aW9uKCl7XG5cbiAgICB2YXIgYXR0YWNoRXZlbnQgPSBkb2N1bWVudC5hdHRhY2hFdmVudDtcbiAgICB2YXIgaXNJRSA9IG5hdmlnYXRvci51c2VyQWdlbnQubWF0Y2goL1RyaWRlbnQvKTtcbiAgICB2YXIgcmVxdWVzdEZyYW1lID0gKGZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciByYWYgPSB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8IHdpbmRvdy5tb3pSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHwgd2luZG93LndlYmtpdFJlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuICAgICAgICAgICAgZnVuY3Rpb24oZm4peyByZXR1cm4gd2luZG93LnNldFRpbWVvdXQoZm4sIDIwKTsgfTtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKGZuKXsgcmV0dXJuIHJhZihmbik7IH07XG4gICAgfSkoKTtcblxuICAgIHZhciBjYW5jZWxGcmFtZSA9IChmdW5jdGlvbigpe1xuICAgICAgICB2YXIgY2FuY2VsID0gd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lIHx8IHdpbmRvdy5tb3pDYW5jZWxBbmltYXRpb25GcmFtZSB8fCB3aW5kb3cud2Via2l0Q2FuY2VsQW5pbWF0aW9uRnJhbWUgfHxcbiAgICAgICAgICAgIHdpbmRvdy5jbGVhclRpbWVvdXQ7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbihpZCl7IHJldHVybiBjYW5jZWwoaWQpOyB9O1xuICAgIH0pKCk7XG5cbiAgICBmdW5jdGlvbiByZXNpemVMaXN0ZW5lcihlKXtcbiAgICAgICAgdmFyIHdpbiA9IGUudGFyZ2V0IHx8IGUuc3JjRWxlbWVudDtcbiAgICAgICAgaWYgKHdpbi5fX3Jlc2l6ZVJBRl9fKSBjYW5jZWxGcmFtZSh3aW4uX19yZXNpemVSQUZfXyk7XG4gICAgICAgIHdpbi5fX3Jlc2l6ZVJBRl9fID0gcmVxdWVzdEZyYW1lKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICB2YXIgdHJpZ2dlciA9IHdpbi5fX3Jlc2l6ZVRyaWdnZXJfXztcbiAgICAgICAgICAgIHRyaWdnZXIuX19yZXNpemVMaXN0ZW5lcnNfXy5mb3JFYWNoKGZ1bmN0aW9uKGZuKXtcbiAgICAgICAgICAgICAgICBmbi5jYWxsKHRyaWdnZXIsIGUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG9iamVjdExvYWQoZSl7XG4gICAgICAgIHRoaXMuY29udGVudERvY3VtZW50LmRlZmF1bHRWaWV3Ll9fcmVzaXplVHJpZ2dlcl9fID0gdGhpcy5fX3Jlc2l6ZUVsZW1lbnRfXztcbiAgICAgICAgdGhpcy5jb250ZW50RG9jdW1lbnQuZGVmYXVsdFZpZXcuYWRkRXZlbnRMaXN0ZW5lcigncmVzaXplJywgcmVzaXplTGlzdGVuZXIpO1xuICAgIH1cblxuICAgIHdpbmRvdy5hZGRSZXNpemVMaXN0ZW5lciA9IGZ1bmN0aW9uKGVsZW1lbnQsIGZuKXtcbiAgICAgICAgaWYgKCFlbGVtZW50Ll9fcmVzaXplTGlzdGVuZXJzX18pIHtcbiAgICAgICAgICAgIGVsZW1lbnQuX19yZXNpemVMaXN0ZW5lcnNfXyA9IFtdO1xuICAgICAgICAgICAgaWYgKGF0dGFjaEV2ZW50KSB7XG4gICAgICAgICAgICAgICAgZWxlbWVudC5fX3Jlc2l6ZVRyaWdnZXJfXyA9IGVsZW1lbnQ7XG4gICAgICAgICAgICAgICAgZWxlbWVudC5hdHRhY2hFdmVudCgnb25yZXNpemUnLCByZXNpemVMaXN0ZW5lcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoZ2V0Q29tcHV0ZWRTdHlsZShlbGVtZW50KS5wb3NpdGlvbiA9PSAnc3RhdGljJykgZWxlbWVudC5zdHlsZS5wb3NpdGlvbiA9ICdyZWxhdGl2ZSc7XG4gICAgICAgICAgICAgICAgdmFyIG9iaiA9IGVsZW1lbnQuX19yZXNpemVUcmlnZ2VyX18gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdvYmplY3QnKTtcbiAgICAgICAgICAgICAgICBvYmouc2V0QXR0cmlidXRlKCdzdHlsZScsICdkaXNwbGF5OiBibG9jazsgcG9zaXRpb246IGFic29sdXRlOyB0b3A6IDA7IGxlZnQ6IDA7IGhlaWdodDogMTAwJTsgd2lkdGg6IDEwMCU7IG92ZXJmbG93OiBoaWRkZW47IHBvaW50ZXItZXZlbnRzOiBub25lOyB6LWluZGV4OiAtMTsnKTtcbiAgICAgICAgICAgICAgICBvYmouX19yZXNpemVFbGVtZW50X18gPSBlbGVtZW50O1xuICAgICAgICAgICAgICAgIG9iai5vbmxvYWQgPSBvYmplY3RMb2FkO1xuICAgICAgICAgICAgICAgIG9iai50eXBlID0gJ3RleHQvaHRtbCc7XG4gICAgICAgICAgICAgICAgaWYgKGlzSUUpIGVsZW1lbnQuYXBwZW5kQ2hpbGQob2JqKTtcbiAgICAgICAgICAgICAgICBvYmouZGF0YSA9ICdhYm91dDpibGFuayc7XG4gICAgICAgICAgICAgICAgaWYgKCFpc0lFKSBlbGVtZW50LmFwcGVuZENoaWxkKG9iaik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxlbWVudC5fX3Jlc2l6ZUxpc3RlbmVyc19fLnB1c2goZm4pO1xuICAgIH07XG5cbiAgICB3aW5kb3cucmVtb3ZlUmVzaXplTGlzdGVuZXIgPSBmdW5jdGlvbihlbGVtZW50LCBmbil7XG4gICAgICAgIGVsZW1lbnQuX19yZXNpemVMaXN0ZW5lcnNfXy5zcGxpY2UoZWxlbWVudC5fX3Jlc2l6ZUxpc3RlbmVyc19fLmluZGV4T2YoZm4pLCAxKTtcbiAgICAgICAgaWYgKCFlbGVtZW50Ll9fcmVzaXplTGlzdGVuZXJzX18ubGVuZ3RoKSB7XG4gICAgICAgICAgICBpZiAoYXR0YWNoRXZlbnQpIGVsZW1lbnQuZGV0YWNoRXZlbnQoJ29ucmVzaXplJywgcmVzaXplTGlzdGVuZXIpO1xuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgZWxlbWVudC5fX3Jlc2l6ZVRyaWdnZXJfXy5jb250ZW50RG9jdW1lbnQuZGVmYXVsdFZpZXcucmVtb3ZlRXZlbnRMaXN0ZW5lcigncmVzaXplJywgcmVzaXplTGlzdGVuZXIpO1xuICAgICAgICAgICAgICAgIGVsZW1lbnQuX19yZXNpemVUcmlnZ2VyX18gPSAhZWxlbWVudC5yZW1vdmVDaGlsZChlbGVtZW50Ll9fcmVzaXplVHJpZ2dlcl9fKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBcbn0pKCk7IiwiKGZ1bmN0aW9uICgpIHtcblxuICAgIGZ1bmN0aW9uIEFwcENvbnRyb2xsZXIoJHNjb3BlKSB7XG5cbiAgICAgICAgJHNjb3BlLm1ldGFkYXRhID0ge307XG4gICAgICAgICRzY29wZS5tZXRhZGF0YS5wYWdlVGl0bGUgPSAnU2hhcmUgeW91ciB2aXN1YWxpemF0aW9ucyBvbiBncmFmaWRkbGUnO1xuICAgICAgICAkc2NvcGUubWV0YWRhdGEub2cgPSB7XG4gICAgICAgICAgICAnb2c6dHlwZSc6ICdhcnRpY2xlJyxcbiAgICAgICAgICAgICdhcnRpY2xlOnNlY3Rpb24nOiAnU2hhcmFibGUgZGF0YSB2aXN1YWxpemF0aW9uJyxcbiAgICAgICAgICAgICdvZzp0aXRsZSc6ICdTaGFyZSB5b3VyIHZpc3VhbGl6YXRpb25zIG9uIGdyYWZpZGRsZScsXG4gICAgICAgICAgICAnb2c6aW1hZ2UnOiAnJyxcbiAgICAgICAgICAgICdvZzpkZXNjcmlwdGlvbic6ICdTaGFyYWJsZSBkYXRhIHZpc3VhbGl6YXRpb24nXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgYW5ndWxhclxuICAgICAgICAubW9kdWxlKCdncmFmaWRkbGUnKVxuICAgICAgICAuY29udHJvbGxlcignQXBwQ29udHJvbGxlcicsIEFwcENvbnRyb2xsZXIpO1xuXG59KSgpO1xuIiwiKGZ1bmN0aW9uICgpIHtcblxuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGZ1bmN0aW9uIENoZWNrcG9pbnRFbmRwb2ludCgkcmVzb3VyY2UsIEVOVikge1xuICAgICAgICByZXR1cm4gJHJlc291cmNlKEVOVi5hcGkgKyAnY2hlY2twb2ludC86aWQnLCB7XG4gICAgICAgICAgICBpZDogJ0BpZCdcbiAgICAgICAgfSwge1xuICAgICAgICAgICAgc2F2ZToge1xuICAgICAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZ2V0OiB7XG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnR0VUJ1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBhbmd1bGFyXG4gICAgICAgIC5tb2R1bGUoJ2dyYWZpZGRsZScpXG4gICAgICAgIC5mYWN0b3J5KCdDaGVja3BvaW50RW5kcG9pbnQnLCBDaGVja3BvaW50RW5kcG9pbnQpO1xuXG59KSgpO1xuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9