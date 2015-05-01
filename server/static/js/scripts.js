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
                "base": $scope.serverCheckpoint.id
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImNvbW1vbi9vbi1yZWFkLWZpbGUvb24tcmVhZC1maWxlLWRpcmVjdGl2ZS5qcyIsInRyZWUvdHJlZS1lbmRwb2ludC5qcyIsInRyZWUvdHJlZS1jb250cm9sbGVyLmpzIiwiZW1iZWQvZW1iZWQtY29udHJvbGxlci5qcyIsImVkaXRvci9lZGl0b3ItY29udHJvbGxlci5qcyIsImNvbW1vbi9zdGF0ZXMuY29uZmlnLmpzIiwiY29tbW9uL29ucmVzaXplLmpzIiwiY29tbW9uL2FwcC1jb250cm9sbGVyLmpzIiwiY2hlY2twb2ludC9jaGVja3BvaW50LWVuZHBvaW50LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLENBQUMsWUFBWTs7RUFFWDs7RUFFQTtLQUNHLE9BQU8sYUFBYTtNQUNuQjtNQUNBO01BQ0E7TUFDQTtNQUNBO01BQ0E7TUFDQTtNQUNBO01BQ0E7Ozs7QUFJTjtBQ2xCQSxDQUFDLFlBQVk7O0lBRVQ7Ozs7Ozs7Ozs7Ozs7OztJQWVBLFNBQVMsV0FBVyxRQUFRO1FBQ3hCLE9BQU87WUFDSCxVQUFVO1lBQ1YsT0FBTztZQUNQLE1BQU0sU0FBUyxPQUFPLFNBQVMsT0FBTztnQkFDbEMsSUFBSSxLQUFLLE9BQU8sTUFBTTs7Z0JBRXRCLFFBQVEsR0FBRyxVQUFVLFNBQVMsZUFBZTtvQkFDekMsSUFBSSxTQUFTLElBQUk7O29CQUVqQixPQUFPLFNBQVMsU0FBUyxhQUFhO3dCQUNsQyxNQUFNLE9BQU8sV0FBVzs0QkFDcEIsR0FBRyxPQUFPLENBQUMsYUFBYSxZQUFZLE9BQU87Ozs7b0JBSW5ELE9BQU8sV0FBVyxDQUFDLGNBQWMsY0FBYyxjQUFjLFFBQVEsTUFBTTs7Ozs7OztJQU0zRjtTQUNLLE9BQU87U0FDUCxVQUFVLGNBQWM7OztBQUdqQztBQzVDQSxDQUFDLFlBQVk7O0lBRVQ7O0lBRUEsU0FBUyxhQUFhLFdBQVcsS0FBSztRQUNsQyxPQUFPLFVBQVUsSUFBSSxNQUFNLFlBQVk7WUFDbkMsSUFBSTtXQUNMO1lBQ0Ms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Z0JBQ0QsUUFBUTs7Ozs7O0lBS3BCO1NBQ0ssT0FBTztTQUNQLFFBQVEsc0JBQXNCOzs7QUFHdkMiLCJmaWxlIjoic2NyaXB0cy5qcyIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiAoKSB7XG5cbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIGFuZ3VsYXJcbiAgICAubW9kdWxlKCdncmFmaWRkbGUnLCBbXG4gICAgICAnZ3JhZmlkZGxlLmNvbmZpZycsXG4gICAgICAnZ3JhZmlkZGxlLnRlbXBsYXRlcycsXG4gICAgICAnbmdSZXNvdXJjZScsXG4gICAgICAnbmdTYW5pdGl6ZScsXG4gICAgICAnbmdBbmltYXRlJyxcbiAgICAgICd1aS5yb3V0ZXInLFxuICAgICAgJ3VpLmxheW91dCcsXG4gICAgICAndWkuYWNlJyxcbiAgICAgICdhbmd1bGFyQ2hhcnQnXG4gICAgXSk7XG5cbn0pKCk7XG4iLCIoZnVuY3Rpb24gKCkge1xuXG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgLyoqXG4gICAgICogQG5nZG9jIGRpcmVjdGl2ZVxuICAgICAqIEBuYW1lIGdyYWZpZGRsZS5kaXJlY3RpdmU6b25SZWFkRmlsZVxuICAgICAqIEByZXF1aXJlcyAkcGFyc2VcbiAgICAgKiBAcmVxdWlyZXMgJGxvZ1xuICAgICAqIEByZXN0cmljdCBBXG4gICAgICpcbiAgICAgKiBAZGVzY3JpcHRpb25cbiAgICAgKiBUaGUgYG9uUmVhZEZpbGVgIGRpcmVjdGl2ZSBvcGVucyB1cCBhIEZpbGVSZWFkZXIgZGlhbG9nIHRvIHVwbG9hZCBmaWxlcyBmcm9tIHRoZSBsb2NhbCBmaWxlc3lzdGVtLlxuICAgICAqXG4gICAgICogQGVsZW1lbnQgQU5ZXG4gICAgICogQG5nSW5qZWN0XG4gICAgICovXG4gICAgZnVuY3Rpb24gb25SZWFkRmlsZSgkcGFyc2UpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnQScsXG4gICAgICAgICAgICBzY29wZTogZmFsc2UsXG4gICAgICAgICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcbiAgICAgICAgICAgICAgICB2YXIgZm4gPSAkcGFyc2UoYXR0cnMub25SZWFkRmlsZSk7XG5cbiAgICAgICAgICAgICAgICBlbGVtZW50Lm9uKCdjaGFuZ2UnLCBmdW5jdGlvbihvbkNoYW5nZUV2ZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpO1xuXG4gICAgICAgICAgICAgICAgICAgIHJlYWRlci5vbmxvYWQgPSBmdW5jdGlvbihvbkxvYWRFdmVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUuJGFwcGx5KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZuKHNjb3BlLCB7JGZpbGVDb250ZW50Om9uTG9hZEV2ZW50LnRhcmdldC5yZXN1bHR9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgICAgIHJlYWRlci5yZWFkQXNUZXh0KChvbkNoYW5nZUV2ZW50LnNyY0VsZW1lbnQgfHwgb25DaGFuZ2VFdmVudC50YXJnZXQpLmZpbGVzWzBdKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBhbmd1bGFyXG4gICAgICAgIC5tb2R1bGUoJ2dyYWZpZGRsZScpXG4gICAgICAgIC5kaXJlY3RpdmUoJ29uUmVhZEZpbGUnLCBvblJlYWRGaWxlKTtcblxufSkoKTtcbiIsIihmdW5jdGlvbiAoKSB7XG5cbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBmdW5jdGlvbiBUcmVlRW5kcG9pbnQoJHJlc291cmNlLCBFTlYpIHtcbiAgICAgICAgcmV0dXJuICRyZXNvdXJjZShFTlYuYXBpICsgJ3RyZWUvOmlkJywge1xuICAgICAgICAgICAgaWQ6ICdAaWQnXG4gICAgICAgIH0sIHtcbiAgICAgICAgICAgIGdldDoge1xuICAgICAgICAgICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgICAgICAgICAgaXNBcnJheTogdHJ1ZVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBhbmd1bGFyXG4gICAgICAgIC5tb2R1bGUoJ2dyYWZpZGRsZScpXG4gICAgICAgIC5mYWN0b3J5KCdUcmVlRW5kcG9pbnQnLCBUcmVlRW5kcG9pbnQpO1xuXG59KSgpO1xuIiwiKGZ1bmN0aW9uICgpIHtcblxuICAgIGZ1bmN0aW9uIFRyZWVDb250cm9sbGVyKCRzY29wZSwgJHN0YXRlLCBDaGVja3BvaW50RW5kcG9pbnQsIFRyZWVFbmRwb2ludCkge1xuICAgICAgICB2YXIgdHJlZURhdGEgPSBbXTtcbiAgICAgICAgJHNjb3BlLmNoZWNrcG9pbnQgPSB7XG4gICAgICAgICAgICBpZDogJHN0YXRlLnBhcmFtcy5pZFxuICAgICAgICB9O1xuXG4gICAgICAgIENoZWNrcG9pbnRFbmRwb2ludFxuICAgICAgICAgICAgLmdldCh7aWQ6ICRzdGF0ZS5wYXJhbXMuaWR9KVxuICAgICAgICAgICAgLiRwcm9taXNlXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbihjaGVja3BvaW50KSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmNoZWNrcG9pbnQgPSBjaGVja3BvaW50O1xuICAgICAgICAgICAgICAgIFRyZWVFbmRwb2ludFxuICAgICAgICAgICAgICAgICAgICAuZ2V0KHtpZDogY2hlY2twb2ludC50cmVlfSlcbiAgICAgICAgICAgICAgICAgICAgLiRwcm9taXNlXG4gICAgICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHRyZWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyZWVEYXRhID0gY29udmVydFRyZWUodHJlZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBkcmF3KCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgZnVuY3Rpb24gY29udmVydFRyZWUodHJlZSkge1xuICAgICAgICAgICAgLy8gZmluZCBiYXNlXG4gICAgICAgICAgICB2YXIgYmFzZSA9IHt9O1xuICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKHRyZWUsIGZ1bmN0aW9uKG5vZGUpIHtcbiAgICAgICAgICAgICAgICBpZiAobm9kZS5iYXNlID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIGJhc2UgPSBub2RlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICB2YXIgdHJlZURhdGEgPSBbXTtcbiAgICAgICAgICAgIHRyZWVEYXRhLnB1c2goYmFzZSk7XG4gICAgICAgICAgICBhZGRDaGlsZHJlbihiYXNlLCB0cmVlKTtcblxuICAgICAgICAgICAgcmV0dXJuIHRyZWVEYXRhXG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBhZGRDaGlsZHJlbihiYXNlLCB0cmVlKSB7XG4gICAgICAgICAgICBiYXNlLmNoaWxkcmVuID0gW107XG4gICAgICAgICAgICBhbmd1bGFyLmZvckVhY2godHJlZSwgZnVuY3Rpb24obm9kZSkge1xuICAgICAgICAgICAgICAgIGlmIChub2RlLmJhc2UgPT09IGJhc2UuaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgYmFzZS5jaGlsZHJlbi5wdXNoKG5vZGUpO1xuICAgICAgICAgICAgICAgICAgICBhZGRDaGlsZHJlbihub2RlLCB0cmVlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gY2xpY2soZCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coZCk7XG4gICAgICAgICAgICAkc3RhdGUuZ28oJ2VkaXRvcicsIHtpZDogZC5pZH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZHJhdygpIHtcblxuICAgICAgICAgICAgLy8gKioqKioqKioqKioqKiogR2VuZXJhdGUgdGhlIHRyZWUgZGlhZ3JhbVx0ICoqKioqKioqKioqKioqKioqXG4gICAgICAgICAgICB2YXIgbWFyZ2luID0ge3RvcDogNDAsIHJpZ2h0OiAwLCBib3R0b206IDIwLCBsZWZ0OiAwfSxcbiAgICAgICAgICAgICAgICB3aWR0aCA9IDkwMCAtIG1hcmdpbi5yaWdodCAtIG1hcmdpbi5sZWZ0LFxuICAgICAgICAgICAgICAgIGhlaWdodCA9IDcwMCAtIG1hcmdpbi50b3AgLSBtYXJnaW4uYm90dG9tO1xuXG4gICAgICAgICAgICB2YXIgaSA9IDA7XG5cbiAgICAgICAgICAgIHZhciB0cmVlID0gZDMubGF5b3V0LnRyZWUoKVxuICAgICAgICAgICAgICAgIC5zaXplKFtoZWlnaHQsIHdpZHRoXSk7XG5cbiAgICAgICAgICAgIHZhciBkaWFnb25hbCA9IGQzLnN2Zy5kaWFnb25hbCgpXG4gICAgICAgICAgICAgICAgLnByb2plY3Rpb24oZnVuY3Rpb24oZCkgeyByZXR1cm4gW2QueCwgZC55XTsgfSk7XG5cbiAgICAgICAgICAgIHZhciBzdmcgPSBkMy5zZWxlY3QoXCIjdHJlZVwiKS5hcHBlbmQoXCJzdmdcIilcbiAgICAgICAgICAgICAgICAuYXR0cihcIndpZHRoXCIsIHdpZHRoICsgbWFyZ2luLnJpZ2h0ICsgbWFyZ2luLmxlZnQpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJoZWlnaHRcIiwgaGVpZ2h0ICsgbWFyZ2luLnRvcCArIG1hcmdpbi5ib3R0b20pXG4gICAgICAgICAgICAgICAgLmFwcGVuZChcImdcIilcbiAgICAgICAgICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZShcIiArIG1hcmdpbi5sZWZ0ICsgXCIsXCIgKyBtYXJnaW4udG9wICsgXCIpXCIpO1xuXG4gICAgICAgICAgICByb290ID0gdHJlZURhdGFbMF07XG5cbiAgICAgICAgICAgIHVwZGF0ZShyb290KTtcblxuICAgICAgICAgICAgZnVuY3Rpb24gdXBkYXRlKHNvdXJjZSkge1xuXG4gICAgICAgICAgICAgICAgLy8gQ29tcHV0ZSB0aGUgbmV3IHRyZWUgbGF5b3V0LlxuICAgICAgICAgICAgICAgIHZhciBub2RlcyA9IHRyZWUubm9kZXMocm9vdCkucmV2ZXJzZSgpLFxuICAgICAgICAgICAgICAgICAgICBsaW5rcyA9IHRyZWUubGlua3Mobm9kZXMpO1xuXG4gICAgICAgICAgICAgICAgLy8gTm9ybWFsaXplIGZvciBmaXhlZC1kZXB0aC5cbiAgICAgICAgICAgICAgICBub2Rlcy5mb3JFYWNoKGZ1bmN0aW9uKGQpIHsgZC55ID0gZC5kZXB0aCAqIDEwMDsgfSk7XG5cbiAgICAgICAgICAgICAgICAvLyBEZWNsYXJlIHRoZSBub2Rlc+KAplxuICAgICAgICAgICAgICAgIHZhciBub2RlID0gc3ZnLnNlbGVjdEFsbChcImcubm9kZVwiKVxuICAgICAgICAgICAgICAgICAgICAuZGF0YShub2RlcywgZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5pZCB8fCAoZC5pZCA9ICsraSk7IH0pO1xuXG4gICAgICAgICAgICAgICAgLy8gRW50ZXIgdGhlIG5vZGVzLlxuICAgICAgICAgICAgICAgIHZhciBub2RlRW50ZXIgPSBub2RlLmVudGVyKCkuYXBwZW5kKFwiZ1wiKVxuICAgICAgICAgICAgICAgICAgICAuYXR0cihcImNsYXNzXCIsIFwibm9kZVwiKVxuICAgICAgICAgICAgICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJ0cmFuc2xhdGUoXCIgKyBkLnggKyBcIixcIiArIGQueSArIFwiKVwiOyB9KVxuICAgICAgICAgICAgICAgICAgICAub24oXCJjbGlja1wiLCBjbGljayk7O1xuXG4gICAgICAgICAgICAgICAgbm9kZUVudGVyLmFwcGVuZChcImNpcmNsZVwiKVxuICAgICAgICAgICAgICAgICAgICAuYXR0cihcInJcIiwgMTApXG4gICAgICAgICAgICAgICAgICAgIC5zdHlsZShcImZpbGxcIiwgXCIjZmZmXCIpO1xuXG4gICAgICAgICAgICAgICAgbm9kZUVudGVyLmFwcGVuZChcInRleHRcIilcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoXCJ5XCIsIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBkLmNoaWxkcmVuIHx8IGQuX2NoaWxkcmVuID8gLTE4IDogMTg7IH0pXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKFwiZHlcIiwgXCIuMzVlbVwiKVxuICAgICAgICAgICAgICAgICAgICAuYXR0cihcInRleHQtYW5jaG9yXCIsIFwibWlkZGxlXCIpXG4gICAgICAgICAgICAgICAgICAgIC50ZXh0KGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB0ZXh0ID0gZC50aXRsZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vICsgJyBieSAnICsgZC5hdXRob3I7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZC5pZCA9PSAkc2NvcGUuY2hlY2twb2ludC5pZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRleHQgKz0gJyAoY3VycmVudCknO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRleHQ7XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIC5zdHlsZShcImZpbGwtb3BhY2l0eVwiLCAxKTtcblxuICAgICAgICAgICAgICAgIC8vIERlY2xhcmUgdGhlIGxpbmtz4oCmXG4gICAgICAgICAgICAgICAgdmFyIGxpbmsgPSBzdmcuc2VsZWN0QWxsKFwicGF0aC5saW5rXCIpXG4gICAgICAgICAgICAgICAgICAgIC5kYXRhKGxpbmtzLCBmdW5jdGlvbihkKSB7IHJldHVybiBkLnRhcmdldC5pZDsgfSk7XG5cbiAgICAgICAgICAgICAgICAvLyBFbnRlciB0aGUgbGlua3MuXG4gICAgICAgICAgICAgICAgbGluay5lbnRlcigpLmluc2VydChcInBhdGhcIiwgXCJnXCIpXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJsaW5rXCIpXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKFwiZFwiLCBkaWFnb25hbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBhbmd1bGFyXG4gICAgICAgIC5tb2R1bGUoJ2dyYWZpZGRsZScpXG4gICAgICAgIC5jb250cm9sbGVyKCdUcmVlQ29udHJvbGxlcicsIFRyZWVDb250cm9sbGVyKTtcblxufSkoKTsiLCIoZnVuY3Rpb24gKCkge1xuXG4gICAgZnVuY3Rpb24gRW1iZWRDb250cm9sbGVyKCRzY29wZSwgJGZpbHRlciwgJGxvY2F0aW9uKSB7XG5cbiAgICAgICAgJHNjb3BlLmZpZGRsZWlkID0gJGxvY2F0aW9uLnBhdGgoKS5zdWJzdHIoMSkuc3BsaXQoJz8nLCAxKVswXTtcblxuICAgICAgICAkc2NvcGUuZW1iZWRWaWV3ID0gJ2NoYXJ0JztcbiAgICAgICAgdmFyIHJlcXVlc3RWaWV3ID0gJGxvY2F0aW9uLnNlYXJjaCgpLnZpZXc7XG4gICAgICAgIGlmKHJlcXVlc3RWaWV3KSB7XG4gICAgICAgICAgICAkc2NvcGUuZW1iZWRWaWV3ID0gcmVxdWVzdFZpZXc7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgICRzY29wZS5zZXRWaWV3ID0gZnVuY3Rpb24obmV3Vmlldykge1xuICAgICAgICAgICAgJHNjb3BlLmVtYmVkVmlldyA9IG5ld1ZpZXc7XG4gICAgICAgICAgICAkc2NvcGUub3B0aW9uc0VkaXRvci5yZXNpemUoKTtcbiAgICAgICAgICAgICRzY29wZS5kYXRhRWRpdG9yLnJlc2l6ZSgpO1xuICAgICAgICAgICAgJHNjb3BlLm9wdGlvbnNFZGl0b3IucmVuZGVyZXIudXBkYXRlRnVsbCgpO1xuICAgICAgICAgICAgJHNjb3BlLmRhdGFFZGl0b3IucmVuZGVyZXIudXBkYXRlRnVsbCgpO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5pc1ZpZXcgPSBmdW5jdGlvbih2aWV3KSB7XG4gICAgICAgICAgICByZXR1cm4gdmlldyA9PSAkc2NvcGUuZW1iZWRWaWV3O1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5kYXRhc2V0U3RyaW5nID0gJyc7XG4gICAgICAgICRzY29wZS5kYXRhc2V0ID0gW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICdkYXknOiAnMjAxMy0wMS0wMl8wMDowMDowMCcsXG4gICAgICAgICAgICAgICAgJ3NhbGVzJzogMzQ2MS4yOTUyMDIsXG4gICAgICAgICAgICAgICAgJ2luY29tZSc6IDEyMzY1LjA1M1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAnZGF5JzogJzIwMTMtMDEtMDNfMDA6MDA6MDAnLFxuICAgICAgICAgICAgICAgICdzYWxlcyc6IDQ0NjEuMjk1MjAyLFxuICAgICAgICAgICAgICAgICdpbmNvbWUnOiAxMzM2NS4wNTNcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgJ2RheSc6ICcyMDEzLTAxLTA0XzAwOjAwOjAwJyxcbiAgICAgICAgICAgICAgICAnc2FsZXMnOiA0NTYxLjI5NTIwMixcbiAgICAgICAgICAgICAgICAnaW5jb21lJzogMTQzNjUuMDUzXG4gICAgICAgICAgICB9XG4gICAgICAgIF07XG5cbiAgICAgICAgJHNjb3BlLnNjaGVtYSA9IHtcbiAgICAgICAgICAgIGRheToge1xuICAgICAgICAgICAgICAgIHR5cGU6ICdkYXRldGltZScsXG4gICAgICAgICAgICAgICAgZm9ybWF0OiAnJVktJW0tJWRfJUg6JU06JVMnLFxuICAgICAgICAgICAgICAgIG5hbWU6ICdEYXRlJ1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5vcHRpb25zU3RyaW5nID0gJyc7XG4gICAgICAgICRzY29wZS5vcHRpb25zID0ge1xuICAgICAgICAgICAgcm93czogW3tcbiAgICAgICAgICAgICAgICBrZXk6ICdpbmNvbWUnLFxuICAgICAgICAgICAgICAgIHR5cGU6ICdiYXInXG4gICAgICAgICAgICB9LCB7XG4gICAgICAgICAgICAgICAga2V5OiAnc2FsZXMnXG4gICAgICAgICAgICB9XSxcbiAgICAgICAgICAgIHhBeGlzOiB7XG4gICAgICAgICAgICAgICAga2V5OiAnZGF5JyxcbiAgICAgICAgICAgICAgICBkaXNwbGF5Rm9ybWF0OiAnJVktJW0tJWQgJUg6JU06JVMnXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gZGVmaW5lIGNvZGUgaGlnaGxpZ2h0aW5nXG4gICAgICAgICRzY29wZS5vcHRpb25zQWNlQ29uZmlnID0ge1xuICAgICAgICAgICAgbW9kZTogJ2pzb24nLFxuICAgICAgICAgICAgdXNlV3JhcE1vZGU6IGZhbHNlLFxuICAgICAgICAgICAgb25Mb2FkOiBmdW5jdGlvbihfZWRpdG9yKSB7XG4gICAgICAgICAgICAgICAgX2VkaXRvci5zZXRTaG93UHJpbnRNYXJnaW4oZmFsc2UpO1xuICAgICAgICAgICAgICAgICRzY29wZS5vcHRpb25zRWRpdG9yID0gX2VkaXRvcjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuZGF0YXNldEFjZUNvbmZpZyA9IHtcbiAgICAgICAgICAgIG1vZGU6ICdqc29uJyxcbiAgICAgICAgICAgIHVzZVdyYXBNb2RlOiBmYWxzZSxcbiAgICAgICAgICAgIG9uTG9hZDogZnVuY3Rpb24oX2VkaXRvcikge1xuICAgICAgICAgICAgICAgIF9lZGl0b3Iuc2V0U2hvd1ByaW50TWFyZ2luKGZhbHNlKTtcbiAgICAgICAgICAgICAgICAkc2NvcGUuZGF0YUVkaXRvciA9IF9lZGl0b3I7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cblxuICAgICAgICAkc2NvcGUuJHdhdGNoKCdvcHRpb25zJywgZnVuY3Rpb24oanNvbikge1xuICAgICAgICAgICAgJHNjb3BlLm9wdGlvbnNTdHJpbmcgPSAkZmlsdGVyKCdqc29uJykoanNvbik7XG4gICAgICAgIH0sIHRydWUpO1xuXG4gICAgICAgICRzY29wZS4kd2F0Y2goJ29wdGlvbnNTdHJpbmcnLCBmdW5jdGlvbihqc29uKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICRzY29wZS5vcHRpb25zID0gSlNPTi5wYXJzZShqc29uKTtcbiAgICAgICAgICAgICAgICAkc2NvcGUud2VsbEZvcm1lZE9wdGlvbnMgPSB0cnVlO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICRzY29wZS53ZWxsRm9ybWVkT3B0aW9ucyA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCB0cnVlKTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoKCdkYXRhc2V0JywgZnVuY3Rpb24oanNvbikge1xuICAgICAgICAgICAgJHNjb3BlLmRhdGFzZXRTdHJpbmcgPSAkZmlsdGVyKCdqc29uJykoanNvbik7XG4gICAgICAgIH0sIHRydWUpO1xuXG4gICAgICAgICRzY29wZS4kd2F0Y2goJ2RhdGFzZXRTdHJpbmcnLCBmdW5jdGlvbihqc29uKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICRzY29wZS5kYXRhc2V0ID0gSlNPTi5wYXJzZShqc29uKTtcbiAgICAgICAgICAgICAgICAkc2NvcGUud2VsbEZvcm1lZERhdGFzZXQgPSB0cnVlO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICRzY29wZS53ZWxsRm9ybWVkRGF0YXNldCA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCB0cnVlKTtcblxuICAgIH1cblxuICAgIGFuZ3VsYXJcbiAgICAgICAgLm1vZHVsZSgnZ3JhZmlkZGxlJylcbiAgICAgICAgLmNvbnRyb2xsZXIoJ0VtYmVkQ29udHJvbGxlcicsIEVtYmVkQ29udHJvbGxlcik7XG5cbn0pKCk7XG4iLCIoZnVuY3Rpb24gKCkge1xuXG4gICAgZnVuY3Rpb24gRWRpdG9yQ29udHJvbGxlcigkc2NvcGUsICRmaWx0ZXIsICRzdGF0ZSwgJHdpbmRvdywgJHRpbWVvdXQsIENoZWNrcG9pbnRFbmRwb2ludCkge1xuXG4gICAgICAgICRzY29wZS5zaG93RGF0YUVkaXRvciA9IGZhbHNlO1xuICAgICAgICAkc2NvcGUuc2hvd09wdGlvbnNVSSAgPSBmYWxzZTtcbiAgICAgICAgJHNjb3BlLnNob3dTaGFyZVBvcHVwID0gZmFsc2U7XG4gICAgICAgICRzY29wZS5zd2l0Y2hEYXRhQnV0dG9uVGl0bGUgICAgPSAnTWFudWFsIGRhdGEgZW50cnknO1xuICAgICAgICAkc2NvcGUuc3dpdGNoT3B0aW9uc0J1dHRvblRpdGxlID0gJ0VkaXQgaW4gR1VJJztcbiAgICAgICAgJHNjb3BlLnRvZ2dsZURhdGFFZGl0b3IgPSB0b2dnbGVEYXRhRWRpdG9yO1xuICAgICAgICAkc2NvcGUudG9nZ2xlT3B0aW9uc1VJICA9IHRvZ2dsZU9wdGlvbnNVSTtcbiAgICAgICAgJHNjb3BlLnNoYXJlUG9wdXAgICAgICAgPSBzaGFyZVBvcHVwO1xuICAgICAgICAkc2NvcGUub25TaGFyZVRleHRDbGljayA9IG9uU2hhcmVUZXh0Q2xpY2s7XG4gICAgICAgICRzY29wZS5hZGRPcHRpb24gPSBhZGRPcHRpb247XG5cbiAgICAgICAgJHNjb3BlLnNoYXJlID0gc2hhcmU7XG4gICAgICAgICRzY29wZS5zYXZlID0gc2F2ZTtcbiAgICAgICAgJHNjb3BlLnVwbG9hZEZpbGUgPSB1cGxvYWRGaWxlO1xuXG4gICAgICAgICRzY29wZS5vcHRpb25zVUlyb3dUeXBlT3B0aW9ucyA9IFtcbiAgICAgICAgICAgIHsgbGFiZWw6ICdsaW5lJywgdmFsdWU6IDEgfSxcbiAgICAgICAgICAgIHsgbGFiZWw6ICdzcGxpbmUnLCB2YWx1ZTogMiB9LFxuICAgICAgICAgICAgeyBsYWJlbDogJ2JhcicsIHZhbHVlOiAzIH0sXG4gICAgICAgICAgICB7IGxhYmVsOiAnc2NhdHRlcicsIHZhbHVlOiA0IH0sXG4gICAgICAgICAgICB7IGxhYmVsOiAnYXJlYScsIHZhbHVlOiA1IH0sXG4gICAgICAgICAgICB7IGxhYmVsOiAnYXJlYS1zcGxpbmUnLCB2YWx1ZTogNiB9LFxuICAgICAgICAgICAgeyBsYWJlbDogJ3N0ZXAnLCB2YWx1ZTogNyB9LFxuICAgICAgICAgICAgeyBsYWJlbDogJ2FyZWEtc3RlcCcsIHZhbHVlOiA4IH0sXG4gICAgICAgICAgICB7IGxhYmVsOiAnc3RlcCcsIHZhbHVlOiA5IH1cbiAgICAgICAgXTtcblxuICAgICAgICAkc2NvcGUuY2hlY2twb2ludCA9IHt9O1xuICAgICAgICAkc2NvcGUuYWNlSnNvbkNvbmZpZyA9IHtcbiAgICAgICAgICAgIG1vZGU6ICdqc29uJyxcbiAgICAgICAgICAgIHVzZVdyYXBNb2RlOiBmYWxzZSxcbiAgICAgICAgICAgIG9uTG9hZDogZnVuY3Rpb24gKF9lZGl0b3IpIHtcbiAgICAgICAgICAgICAgICBfZWRpdG9yLnNldFNob3dQcmludE1hcmdpbihmYWxzZSk7XG4gICAgICAgICAgICAgICAgX2VkaXRvci4kYmxvY2tTY3JvbGxpbmcgPSBJbmZpbml0eTtcbiAgICAgICAgICAgICAgICAkc2NvcGUuZWRpdG9ycyA9IF9lZGl0b3I7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgYWN0aXZhdGUoKTtcblxuICAgICAgICAvLy8vLy8vLy8vLy9cblxuICAgICAgICBmdW5jdGlvbiBhY3RpdmF0ZSgpIHtcblxuICAgICAgICAgICAgaWYgKCRzdGF0ZS5wYXJhbXMuaWQpIHtcbiAgICAgICAgICAgICAgICBDaGVja3BvaW50RW5kcG9pbnRcbiAgICAgICAgICAgICAgICAgICAgLmdldCh7aWQ6ICRzdGF0ZS5wYXJhbXMuaWR9KVxuICAgICAgICAgICAgICAgICAgICAuJHByb21pc2VcbiAgICAgICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oY2hlY2twb2ludCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnNlcnZlckNoZWNrcG9pbnQgPSBjaGVja3BvaW50O1xuICAgICAgICAgICAgICAgICAgICAgICAgc2V0Q2hlY2twb2ludChjaGVja3BvaW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICR0aW1lb3V0KHNhdmVBc0ltYWdlLCAwKTtcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ2VkaXRvcicsIHtpZDogJyd9KTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGxvYWREZWZhdWx0RGF0YSgpO1xuICAgICAgICAgICAgICAgICR0aW1lb3V0KHNhdmVBc0ltYWdlLCAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN5bmNPcHRpb25zKCk7XG4gICAgICAgICAgICBzeW5jRGF0YXNldCgpO1xuICAgICAgICAgICAgLy91cGRhdGVPblJlc2l6ZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gc2F2ZUFzSW1hZ2UoKSB7XG4gICAgICAgICAgICBjYW52Zyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2FudmFzJyksIGQzLnNlbGVjdChcIi5hbmd1bGFyY2hhcnRcIikubm9kZSgpLmlubmVySFRNTCk7XG4gICAgICAgICAgICAkc2NvcGUuYXNJbWFnZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjYW52YXMnKS50b0RhdGFVUkwoKTtcbiAgICAgICAgICAgICRzY29wZS5tZXRhZGF0YS5vZ1snb2c6aW1hZ2UnXSA9ICRzY29wZS5hc0ltYWdlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2F2ZSB0aGUgY3VycmVudCBWZXJzaW9uXG4gICAgICAgIC8vXG4gICAgICAgIGZ1bmN0aW9uIHNhdmUoKSB7XG4gICAgICAgICAgICBDaGVja3BvaW50RW5kcG9pbnQuc2F2ZSh7XG4gICAgICAgICAgICAgICAgXCJkYXRhXCI6ICRzY29wZS5jaGVja3BvaW50LmRhdGFzZXQsXG4gICAgICAgICAgICAgICAgXCJvcHRpb25zXCI6ICRzY29wZS5jaGVja3BvaW50Lm9wdGlvbnMsXG4gICAgICAgICAgICAgICAgXCJhdXRob3JcIjogXCJBbm9ueW1cIixcbiAgICAgICAgICAgICAgICBcImJhc2VcIjogJHNjb3BlLnNlcnZlckNoZWNrcG9pbnQuaWRcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLiRwcm9taXNlXG4gICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKGNoZWNrcG9pbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3NhdmVkIGNoZWNrcG9pbnQ6ICcsIGNoZWNrcG9pbnQpO1xuICAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ2VkaXRvcicsIHtpZDogY2hlY2twb2ludC5pZH0pO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ3NhdmUgZmFpbGVkJywgZSk7XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNoYXJlIHRoZSBmaWRkbGVcbiAgICAgICAgLy9cbiAgICAgICAgZnVuY3Rpb24gc2hhcmUodGFyZ2V0KSB7XG4gICAgICAgICAgICBmaWRkbGVVUkwgICAgICAgPSAnaHR0cDovL2dyYWZpZGRsZS5hcHBzcG90LmNvbS8nICsgJHN0YXRlLnBhcmFtcy5pZDtcbiAgICAgICAgICAgIGlmKHRhcmdldCA9PSAnRkInKSB7XG4gICAgICAgICAgICAgICAgJHdpbmRvdy5vcGVuKCdodHRwczovL3d3dy5mYWNlYm9vay5jb20vc2hhcmVyL3NoYXJlci5waHA/dT0nICsgZmlkZGxlVVJMLCAnX2JsYW5rJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZih0YXJnZXQgPT0gJ1R3aXR0ZXInKSB7XG4gICAgICAgICAgICAgICAgJHdpbmRvdy5vcGVuKCdodHRwczovL3R3aXR0ZXIuY29tL2ludGVudC90d2VldD90ZXh0PUNoZWNrJTIwb3V0JTIwdGhpcyUyMHN3ZWV0JTIwZ3JhZmlkZGxlJTIwJnVybD0nICsgZmlkZGxlVVJMLCAnX2JsYW5rJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZih0YXJnZXQgPT0gJ0UtTWFpbCcpIHtcbiAgICAgICAgICAgICAgICAkd2luZG93LmxvY2F0aW9uID0gJ21haWx0bzphQGIuY2Q/c3ViamVjdD1DaGVjayUyMG91dCUyMHRoaXMlMjBhd2Vzb21lJTIwR3JhZmlkZGxlJmJvZHk9JyArIGZpZGRsZVVSTDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwbG9hZCBhIGZpbGUgYXMgZGF0YSBzb3VyY2VcbiAgICAgICAgLy9cbiAgICAgICAgZnVuY3Rpb24gdXBsb2FkRmlsZShmaWxlKSB7XG4gICAgICAgICAgICAkc2NvcGUuY2hlY2twb2ludC5kYXRhc2V0U3RyaW5nID0gZmlsZTtcbiAgICAgICAgICAgICRzY29wZS50b2dnbGVEYXRhRWRpdG9yKCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBUb2dnbGUgZnJvbSBkYXRhIHZpZXdcbiAgICAgICAgLy9cbiAgICAgICAgZnVuY3Rpb24gdG9nZ2xlRGF0YUVkaXRvcigpIHtcbiAgICAgICAgICAgICRzY29wZS5zaG93RGF0YUVkaXRvciA9ICEkc2NvcGUuc2hvd0RhdGFFZGl0b3I7XG4gICAgICAgICAgICAkc2NvcGUuc3dpdGNoRGF0YUJ1dHRvblRpdGxlID0gJHNjb3BlLnNob3dEYXRhRWRpdG9yID8gJ0JhY2sgdG8gaW5wdXQgZGlhbG9nJyA6ICdNYW51YWwgZGF0YSBlbnRyeSc7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBUb2dnbGUgZnJvbSBqc29uLW9wdGlvbiB2aWV3XG4gICAgICAgIC8vXG4gICAgICAgIGZ1bmN0aW9uIHRvZ2dsZU9wdGlvbnNVSSgpIHtcbiAgICAgICAgICAgICRzY29wZS5zaG93T3B0aW9uc1VJID0gISRzY29wZS5zaG93T3B0aW9uc1VJO1xuICAgICAgICAgICAgJHNjb3BlLnN3aXRjaE9wdGlvbnNCdXR0b25UaXRsZSA9ICRzY29wZS5zaG93T3B0aW9uc1VJID8gJ0VkaXQgYXMgSlNPTicgOiAnRWRpdCBpbiBHVUknO1xuICAgICAgICAgICAgJHNjb3BlLmVkaXRvcnMucmVzaXplKCk7XG4gICAgICAgICAgICAkc2NvcGUuZWRpdG9ycy5yZW5kZXJlci51cGRhdGVGdWxsKCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDcmVhdGUgdGhlIEhUTUwgVUkgcmVwcmVzZW50YXRpb24gb2YgdGhlIG9wdGlvbnMganNvblxuICAgICAgICAvL1xuICAgICAgICBmdW5jdGlvbiB1cGRhdGVPcHRpb25zVUkoanNvbikge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJ1cGRhdGUgb3B0aW9ucyB1aVwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNob3cgdGhlIHNoYXJlIHNoZWV0XG4gICAgICAgIC8vXG4gICAgICAgIGZ1bmN0aW9uIHNoYXJlUG9wdXAoKSB7XG4gICAgICAgICAgICAkc2NvcGUuc2hvd1NoYXJlUG9wdXAgPSAhJHNjb3BlLnNob3dTaGFyZVBvcHVwO1xuICAgICAgICAgICAgJHNjb3BlLmZpZGRsZVVSTCAgICAgICA9ICdodHRwOi8vZ3JhZmlkZGxlLmFwcHNwb3QuY29tLycgKyAkc3RhdGUucGFyYW1zLmlkO1xuICAgICAgICAgICAgJHNjb3BlLmZpZGRsZUNoYXJ0VVJMICA9ICdodHRwOi8vZ3JhZmlkZGxlLmFwcHNwb3QuY29tLycgKyAkc3RhdGUucGFyYW1zLmlkICsgJy5wbmcnO1xuICAgICAgICAgICAgJHNjb3BlLmZpZGRsZUVtYmVkQ29kZSA9ICc8aWZyYW1lIHdpZHRoPVwiMTAwJVwiIGhlaWdodD1cIjMwMFwiIHNyYz1cIi8vZ3JhZmlkZGxlLmFwcHNwb3QuY29tL2VtYmVkLycgKyAkc3RhdGUucGFyYW1zLmlkICsgJ1wiIGFsbG93ZnVsbHNjcmVlbj1cImFsbG93ZnVsbHNjcmVlblwiIGZyYW1lYm9yZGVyPVwiMFwiPjwvaWZyYW1lPic7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBbGxvdyBzaGFyZSB0ZXh0IGZpZWxkcyB0byBhdXRvc2VsZWN0IG9uIGZvY3VzXG4gICAgICAgIC8vXG4gICAgICAgIGZ1bmN0aW9uIG9uU2hhcmVUZXh0Q2xpY2soJGV2ZW50KSB7XG4gICAgICAgICAgICAkZXZlbnQudGFyZ2V0LnNlbGVjdCgpO1xuICAgICAgICB9O1xuXG4gICAgICAgIFxuICAgICAgICAvLyBJbnNlcnQgZGVmYXVsdCBkYXRhXG4gICAgICAgIC8vXG4gICAgICAgIGZ1bmN0aW9uIGFkZE9wdGlvbihvcHRpb24pIHtcbiAgICAgICAgICAgIGlmKG9wdGlvbiA9PSAncm93JylcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUuY2hlY2twb2ludC5vcHRpb25zLnJvd3MgPSAkc2NvcGUuY2hlY2twb2ludC5vcHRpb25zLnJvd3MuY29uY2F0KFt7a2V5IDogXCJuZXcgcm93XCJ9XSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG5cbiAgICAgICAgLy8gSW5zZXJ0IGRlZmF1bHQgZGF0YVxuICAgICAgICAvL1xuICAgICAgICBmdW5jdGlvbiBsb2FkRGVmYXVsdERhdGEoKSB7XG4gICAgICAgICAgICB2YXIgZGF0YXNldCA9IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICdkYXknOiAnMjAxMy0wMS0wMl8wMDowMDowMCcsXG4gICAgICAgICAgICAgICAgICAgICdzYWxlcyc6IDM0NjEuMjk1MjAyLFxuICAgICAgICAgICAgICAgICAgICAnaW5jb21lJzogMTIzNjUuMDUzXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICdkYXknOiAnMjAxMy0wMS0wM18wMDowMDowMCcsXG4gICAgICAgICAgICAgICAgICAgICdzYWxlcyc6IDQ0NjEuMjk1MjAyLFxuICAgICAgICAgICAgICAgICAgICAnaW5jb21lJzogMTMzNjUuMDUzXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICdkYXknOiAnMjAxMy0wMS0wNF8wMDowMDowMCcsXG4gICAgICAgICAgICAgICAgICAgICdzYWxlcyc6IDQ1NjEuMjk1MjAyLFxuICAgICAgICAgICAgICAgICAgICAnaW5jb21lJzogMTQzNjUuMDUzXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXTtcbiAgICAgICAgICAgIHZhciBzY2hlbWEgPSB7XG4gICAgICAgICAgICAgICAgZGF5OiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkYXRldGltZScsXG4gICAgICAgICAgICAgICAgICAgIGZvcm1hdDogJyVZLSVtLSVkXyVIOiVNOiVTJyxcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogJ0RhdGUnXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHZhciBvcHRpb25zID0ge1xuICAgICAgICAgICAgICAgIHJvd3M6IFt7XG4gICAgICAgICAgICAgICAgICAgIGtleTogJ2luY29tZScsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdiYXInXG4gICAgICAgICAgICAgICAgfSwge1xuICAgICAgICAgICAgICAgICAgICBrZXk6ICdzYWxlcydcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgICAgICAgICB4QXhpczoge1xuICAgICAgICAgICAgICAgICAgICBrZXk6ICdkYXknLFxuICAgICAgICAgICAgICAgICAgICBkaXNwbGF5Rm9ybWF0OiAnJVktJW0tJWQgJUg6JU06JVMnXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgJHNjb3BlLmNoZWNrcG9pbnQuZGF0YXNldFN0cmluZyA9ICcnO1xuICAgICAgICAgICAgJHNjb3BlLmNoZWNrcG9pbnQuZGF0YXNldCA9IGRhdGFzZXQ7XG4gICAgICAgICAgICAkc2NvcGUuY2hlY2twb2ludC5zY2hlbWFTdHJpbmcgPSAnJztcbiAgICAgICAgICAgICRzY29wZS5jaGVja3BvaW50LnNjaGVtYSA9IHNjaGVtYTtcbiAgICAgICAgICAgICRzY29wZS5jaGVja3BvaW50Lm9wdGlvbnNTdHJpbmcgPSAnJztcbiAgICAgICAgICAgICRzY29wZS5jaGVja3BvaW50Lm9wdGlvbnMgPSBvcHRpb25zO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gc2V0Q2hlY2twb2ludChjaGVja3BvaW50KSB7XG4gICAgICAgICAgICAkc2NvcGUuY2hlY2twb2ludC5kYXRhc2V0U3RyaW5nID0gJyc7XG4gICAgICAgICAgICAkc2NvcGUuY2hlY2twb2ludC5kYXRhc2V0ID0gY2hlY2twb2ludC5kYXRhO1xuICAgICAgICAgICAgJHNjb3BlLmNoZWNrcG9pbnQuc2NoZW1hU3RyaW5nID0gJyc7XG4gICAgICAgICAgICAkc2NvcGUuY2hlY2twb2ludC5zY2hlbWEgPSB7fTtcbiAgICAgICAgICAgICRzY29wZS5jaGVja3BvaW50Lm9wdGlvbnNTdHJpbmcgPSAnJztcbiAgICAgICAgICAgICRzY29wZS5jaGVja3BvaW50Lm9wdGlvbnMgPSBjaGVja3BvaW50Lm9wdGlvbnM7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTeW5jIE9iamVjdCBhbmQgU3RyaW5nIHJlcHJlc2VudGF0aW9uXG4gICAgICAgIC8vXG4gICAgICAgIGZ1bmN0aW9uIHN5bmNPcHRpb25zKCkge1xuICAgICAgICAgICAgJHNjb3BlLiR3YXRjaCgnY2hlY2twb2ludC5vcHRpb25zJywgZnVuY3Rpb24gKGpzb24pIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUuY2hlY2twb2ludC5vcHRpb25zU3RyaW5nID0gJGZpbHRlcignanNvbicpKGpzb24pO1xuICAgICAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgICAgICRzY29wZS4kd2F0Y2goJ2NoZWNrcG9pbnQub3B0aW9uc1N0cmluZycsIGZ1bmN0aW9uIChqc29uKSB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmNoZWNrcG9pbnQub3B0aW9ucyA9IEpTT04ucGFyc2UoanNvbik7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS53ZWxsRm9ybWVkT3B0aW9ucyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIHVwZGF0ZU9wdGlvbnNVSShqc29uKTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS53ZWxsRm9ybWVkT3B0aW9ucyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIHRydWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU3luYyBPYmplY3QgYW5kIFN0cmluZyByZXByZXNlbnRhdGlvblxuICAgICAgICAvL1xuICAgICAgICBmdW5jdGlvbiBzeW5jRGF0YXNldCgpIHtcbiAgICAgICAgICAgICRzY29wZS4kd2F0Y2goJ2NoZWNrcG9pbnQuZGF0YXNldCcsIGZ1bmN0aW9uIChqc29uKSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmNoZWNrcG9pbnQuZGF0YXNldFN0cmluZyA9ICRmaWx0ZXIoJ2pzb24nKShqc29uKTtcbiAgICAgICAgICAgICAgICBvcGRhdGVPcHRpb25zKCk7XG4gICAgICAgICAgICB9LCB0cnVlKTtcblxuICAgICAgICAgICAgJHNjb3BlLiR3YXRjaCgnY2hlY2twb2ludC5kYXRhc2V0U3RyaW5nJywgZnVuY3Rpb24gKGpzb24pIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY2hlY2twb2ludC5kYXRhc2V0ID0gSlNPTi5wYXJzZShqc29uKTtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLndlbGxGb3JtZWREYXRhc2V0ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS53ZWxsRm9ybWVkRGF0YXNldCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIHRydWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQWRkIHRpbWVzdGFtcCB0byBvcHRpb25zIHRvIHJlZHJhd1xuICAgICAgICAvL1xuICAgICAgICBmdW5jdGlvbiBvcGRhdGVPcHRpb25zKCkge1xuICAgICAgICAgICAgLy8gSXMgY2FsbGVkIHRvIG9mdGVuLCBub3Qgb25seSBvbiByZXNpemVcbiAgICAgICAgICAgIGlmICgkc2NvcGUuY2hlY2twb2ludCAmJiAkc2NvcGUuY2hlY2twb2ludC5vcHRpb25zKSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmNoZWNrcG9pbnQub3B0aW9ucy51cGRhdGVkID0gbmV3IERhdGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRyaWdnZXIgbmV3IHJlbmRlciBvbiByZXNpemVcbiAgICAgICAgLy9cbiAgICAgICAgZnVuY3Rpb24gdXBkYXRlT25SZXNpemUoKSB7XG4gICAgICAgICAgICB2YXIgbXlFbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NoYXJ0QXJlYScpO1xuICAgICAgICAgICAgYWRkUmVzaXplTGlzdGVuZXIobXlFbGVtZW50LCBvcGRhdGVPcHRpb25zKTtcblxuICAgICAgICAgICAgJHNjb3BlLiRvbihcIiRkZXN0cm95XCIsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZW1vdmVSZXNpemVMaXN0ZW5lcihteUVsZW1lbnQsIG9wZGF0ZU9wdGlvbnMpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgIH1cblxuICAgIGFuZ3VsYXJcbiAgICAgICAgLm1vZHVsZSgnZ3JhZmlkZGxlJylcbiAgICAgICAgLmNvbnRyb2xsZXIoJ0VkaXRvckNvbnRyb2xsZXInLCBFZGl0b3JDb250cm9sbGVyKTtcblxufSkoKTtcbiIsIihmdW5jdGlvbiAoKSB7XG5cbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBmdW5jdGlvbiBzdGF0ZXNDb25maWd1cmF0aW9uKCRzdGF0ZVByb3ZpZGVyLCAkdXJsUm91dGVyUHJvdmlkZXIsICRsb2NhdGlvblByb3ZpZGVyKSB7XG5cbiAgICAgICAgJHN0YXRlUHJvdmlkZXJcbiAgICAgICAgICAgIC5zdGF0ZSgnNDA0Jywge1xuICAgICAgICAgICAgICAgIHZpZXdzOiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnY29tcG9uZW50cy9jb21tb24vNDA0LzQwNC5odG1sJ1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5zdGF0ZSgnZW1iZWQnLCB7XG4gICAgICAgICAgICAgICAgdXJsOiAnL2VtYmVkJyxcbiAgICAgICAgICAgICAgICB2aWV3czoge1xuICAgICAgICAgICAgICAgICAgICBjb250ZW50OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ2NvbXBvbmVudHMvZW1iZWQvZW1iZWQuaHRtbCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250cm9sbGVyOiAnRW1iZWRDb250cm9sbGVyJ1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5zdGF0ZSgndHJlZScsIHtcbiAgICAgICAgICAgICAgICB1cmw6ICcvOmlkL3RyZWUnLFxuICAgICAgICAgICAgICAgIHZpZXdzOiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnY29tcG9uZW50cy90cmVlL3RyZWUuaHRtbCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250cm9sbGVyOiAnVHJlZUNvbnRyb2xsZXInXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLnN0YXRlKCdlZGl0b3InLCB7XG4gICAgICAgICAgICAgICAgdXJsOiAnLzppZCcsXG4gICAgICAgICAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAgICAgICAgICAgY29udGVudDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdjb21wb25lbnRzL2VkaXRvci9lZGl0b3IuaHRtbCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250cm9sbGVyOiAnRWRpdG9yQ29udHJvbGxlcidcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIC8qIEBuZ0luamVjdCAqL1xuICAgICAgICAkdXJsUm91dGVyUHJvdmlkZXIub3RoZXJ3aXNlKGZ1bmN0aW9uICgkaW5qZWN0b3IsICRsb2NhdGlvbikge1xuICAgICAgICAgICAgLy8gVXNlclNlcnZpY2UgJiAkc3RhdGUgbm90IGF2YWlsYWJsZSBkdXJpbmcgLmNvbmZpZygpLCBpbmplY3QgdGhlbSAobWFudWFsbHkpIGxhdGVyXG5cbiAgICAgICAgICAgIC8vIHJlcXVlc3RpbmcgdW5rbm93biBwYWdlIHVuZXF1YWwgdG8gJy8nXG4gICAgICAgICAgICB2YXIgcGF0aCA9ICRsb2NhdGlvbi5wYXRoKCk7XG4gICAgICAgICAgICBpZiAocGF0aCAhPT0gJy8nKSB7XG4gICAgICAgICAgICAgICAgJGluamVjdG9yLmdldCgnJHN0YXRlJykuZ28oJzQwNCcpO1xuICAgICAgICAgICAgICAgIHJldHVybiBwYXRoOyAvLyB0aGlzIHRyaWNrIGFsbG93cyB0byBzaG93IHRoZSBlcnJvciBwYWdlIG9uIHVua25vd24gYWRkcmVzc1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gJy9uZXcnO1xuICAgICAgICB9KTtcblxuICAgICAgICAkbG9jYXRpb25Qcm92aWRlclxuICAgICAgICAgICAgLmh0bWw1TW9kZSh0cnVlKVxuICAgICAgICAgICAgLmhhc2hQcmVmaXgoJyEnKTtcbiAgICB9XG5cblxuICAgIGFuZ3VsYXJcbiAgICAgICAgLm1vZHVsZSgnZ3JhZmlkZGxlJylcbiAgICAgICAgLmNvbmZpZyhzdGF0ZXNDb25maWd1cmF0aW9uKTtcblxufSkoKTsiLCIoZnVuY3Rpb24oKXtcblxuICAgIHZhciBhdHRhY2hFdmVudCA9IGRvY3VtZW50LmF0dGFjaEV2ZW50O1xuICAgIHZhciBpc0lFID0gbmF2aWdhdG9yLnVzZXJBZ2VudC5tYXRjaCgvVHJpZGVudC8pO1xuICAgIHZhciByZXF1ZXN0RnJhbWUgPSAoZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIHJhZiA9IHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHwgd2luZG93Lm1velJlcXVlc3RBbmltYXRpb25GcmFtZSB8fCB3aW5kb3cud2Via2l0UmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG4gICAgICAgICAgICBmdW5jdGlvbihmbil7IHJldHVybiB3aW5kb3cuc2V0VGltZW91dChmbiwgMjApOyB9O1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24oZm4peyByZXR1cm4gcmFmKGZuKTsgfTtcbiAgICB9KSgpO1xuXG4gICAgdmFyIGNhbmNlbEZyYW1lID0gKGZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciBjYW5jZWwgPSB3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUgfHwgd2luZG93Lm1vekNhbmNlbEFuaW1hdGlvbkZyYW1lIHx8IHdpbmRvdy53ZWJraXRDYW5jZWxBbmltYXRpb25GcmFtZSB8fFxuICAgICAgICAgICAgd2luZG93LmNsZWFyVGltZW91dDtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKGlkKXsgcmV0dXJuIGNhbmNlbChpZCk7IH07XG4gICAgfSkoKTtcblxuICAgIGZ1bmN0aW9uIHJlc2l6ZUxpc3RlbmVyKGUpe1xuICAgICAgICB2YXIgd2luID0gZS50YXJnZXQgfHwgZS5zcmNFbGVtZW50O1xuICAgICAgICBpZiAod2luLl9fcmVzaXplUkFGX18pIGNhbmNlbEZyYW1lKHdpbi5fX3Jlc2l6ZVJBRl9fKTtcbiAgICAgICAgd2luLl9fcmVzaXplUkFGX18gPSByZXF1ZXN0RnJhbWUoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHZhciB0cmlnZ2VyID0gd2luLl9fcmVzaXplVHJpZ2dlcl9fO1xuICAgICAgICAgICAgdHJpZ2dlci5fX3Jlc2l6ZUxpc3RlbmVyc19fLmZvckVhY2goZnVuY3Rpb24oZm4pe1xuICAgICAgICAgICAgICAgIGZuLmNhbGwodHJpZ2dlciwgZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gb2JqZWN0TG9hZChlKXtcbiAgICAgICAgdGhpcy5jb250ZW50RG9jdW1lbnQuZGVmYXVsdFZpZXcuX19yZXNpemVUcmlnZ2VyX18gPSB0aGlzLl9fcmVzaXplRWxlbWVudF9fO1xuICAgICAgICB0aGlzLmNvbnRlbnREb2N1bWVudC5kZWZhdWx0Vmlldy5hZGRFdmVudExpc3RlbmVyKCdyZXNpemUnLCByZXNpemVMaXN0ZW5lcik7XG4gICAgfVxuXG4gICAgd2luZG93LmFkZFJlc2l6ZUxpc3RlbmVyID0gZnVuY3Rpb24oZWxlbWVudCwgZm4pe1xuICAgICAgICBpZiAoIWVsZW1lbnQuX19yZXNpemVMaXN0ZW5lcnNfXykge1xuICAgICAgICAgICAgZWxlbWVudC5fX3Jlc2l6ZUxpc3RlbmVyc19fID0gW107XG4gICAgICAgICAgICBpZiAoYXR0YWNoRXZlbnQpIHtcbiAgICAgICAgICAgICAgICBlbGVtZW50Ll9fcmVzaXplVHJpZ2dlcl9fID0gZWxlbWVudDtcbiAgICAgICAgICAgICAgICBlbGVtZW50LmF0dGFjaEV2ZW50KCdvbnJlc2l6ZScsIHJlc2l6ZUxpc3RlbmVyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChnZXRDb21wdXRlZFN0eWxlKGVsZW1lbnQpLnBvc2l0aW9uID09ICdzdGF0aWMnKSBlbGVtZW50LnN0eWxlLnBvc2l0aW9uID0gJ3JlbGF0aXZlJztcbiAgICAgICAgICAgICAgICB2YXIgb2JqID0gZWxlbWVudC5fX3Jlc2l6ZVRyaWdnZXJfXyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ29iamVjdCcpO1xuICAgICAgICAgICAgICAgIG9iai5zZXRBdHRyaWJ1dGUoJ3N0eWxlJywgJ2Rpc3BsYXk6IGJsb2NrOyBwb3NpdGlvbjogYWJzb2x1dGU7IHRvcDogMDsgbGVmdDogMDsgaGVpZ2h0OiAxMDAlOyB3aWR0aDogMTAwJTsgb3ZlcmZsb3c6IGhpZGRlbjsgcG9pbnRlci1ldmVudHM6IG5vbmU7IHotaW5kZXg6IC0xOycpO1xuICAgICAgICAgICAgICAgIG9iai5fX3Jlc2l6ZUVsZW1lbnRfXyA9IGVsZW1lbnQ7XG4gICAgICAgICAgICAgICAgb2JqLm9ubG9hZCA9IG9iamVjdExvYWQ7XG4gICAgICAgICAgICAgICAgb2JqLnR5cGUgPSAndGV4dC9odG1sJztcbiAgICAgICAgICAgICAgICBpZiAoaXNJRSkgZWxlbWVudC5hcHBlbmRDaGlsZChvYmopO1xuICAgICAgICAgICAgICAgIG9iai5kYXRhID0gJ2Fib3V0OmJsYW5rJztcbiAgICAgICAgICAgICAgICBpZiAoIWlzSUUpIGVsZW1lbnQuYXBwZW5kQ2hpbGQob2JqKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbGVtZW50Ll9fcmVzaXplTGlzdGVuZXJzX18ucHVzaChmbik7XG4gICAgfTtcblxuICAgIHdpbmRvdy5yZW1vdmVSZXNpemVMaXN0ZW5lciA9IGZ1bmN0aW9uKGVsZW1lbnQsIGZuKXtcbiAgICAgICAgZWxlbWVudC5fX3Jlc2l6ZUxpc3RlbmVyc19fLnNwbGljZShlbGVtZW50Ll9fcmVzaXplTGlzdGVuZXJzX18uaW5kZXhPZihmbiksIDEpO1xuICAgICAgICBpZiAoIWVsZW1lbnQuX19yZXNpemVMaXN0ZW5lcnNfXy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGlmIChhdHRhY2hFdmVudCkgZWxlbWVudC5kZXRhY2hFdmVudCgnb25yZXNpemUnLCByZXNpemVMaXN0ZW5lcik7XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBlbGVtZW50Ll9fcmVzaXplVHJpZ2dlcl9fLmNvbnRlbnREb2N1bWVudC5kZWZhdWx0Vmlldy5yZW1vdmVFdmVudExpc3RlbmVyKCdyZXNpemUnLCByZXNpemVMaXN0ZW5lcik7XG4gICAgICAgICAgICAgICAgZWxlbWVudC5fX3Jlc2l6ZVRyaWdnZXJfXyA9ICFlbGVtZW50LnJlbW92ZUNoaWxkKGVsZW1lbnQuX19yZXNpemVUcmlnZ2VyX18pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIFxufSkoKTsiLCIoZnVuY3Rpb24gKCkge1xuXG4gICAgZnVuY3Rpb24gQXBwQ29udHJvbGxlcigkc2NvcGUpIHtcblxuICAgICAgICAkc2NvcGUubWV0YWRhdGEgPSB7fTtcbiAgICAgICAgJHNjb3BlLm1ldGFkYXRhLnBhZ2VUaXRsZSA9ICdTaGFyZSB5b3VyIHZpc3VhbGl6YXRpb25zIG9uIGdyYWZpZGRsZSc7XG4gICAgICAgICRzY29wZS5tZXRhZGF0YS5vZyA9IHtcbiAgICAgICAgICAgICdvZzp0eXBlJzogJ2FydGljbGUnLFxuICAgICAgICAgICAgJ2FydGljbGU6c2VjdGlvbic6ICdTaGFyYWJsZSBkYXRhIHZpc3VhbGl6YXRpb24nLFxuICAgICAgICAgICAgJ29nOnRpdGxlJzogJ1NoYXJlIHlvdXIgdmlzdWFsaXphdGlvbnMgb24gZ3JhZmlkZGxlJyxcbiAgICAgICAgICAgICdvZzppbWFnZSc6ICcnLFxuICAgICAgICAgICAgJ29nOmRlc2NyaXB0aW9uJzogJ1NoYXJhYmxlIGRhdGEgdmlzdWFsaXphdGlvbidcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBhbmd1bGFyXG4gICAgICAgIC5tb2R1bGUoJ2dyYWZpZGRsZScpXG4gICAgICAgIC5jb250cm9sbGVyKCdBcHBDb250cm9sbGVyJywgQXBwQ29udHJvbGxlcik7XG5cbn0pKCk7XG4iLCIoZnVuY3Rpb24gKCkge1xuXG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgZnVuY3Rpb24gQ2hlY2twb2ludEVuZHBvaW50KCRyZXNvdXJjZSwgRU5WKSB7XG4gICAgICAgIHJldHVybiAkcmVzb3VyY2UoRU5WLmFwaSArICdjaGVja3BvaW50LzppZCcsIHtcbiAgICAgICAgICAgIGlkOiAnQGlkJ1xuICAgICAgICB9LCB7XG4gICAgICAgICAgICBzYXZlOiB7XG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZXQ6IHtcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdHRVQnXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGFuZ3VsYXJcbiAgICAgICAgLm1vZHVsZSgnZ3JhZmlkZGxlJylcbiAgICAgICAgLmZhY3RvcnkoJ0NoZWNrcG9pbnRFbmRwb2ludCcsIENoZWNrcG9pbnRFbmRwb2ludCk7XG5cbn0pKCk7XG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=