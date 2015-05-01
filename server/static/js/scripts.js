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

    function EmbedController($scope, $state, $filter, $location, $timeout, CheckpointEndpoint) {

        $scope.checkpoint = {};

        activate();

        //

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
        }

        function saveAsImage() {
            //canvg(document.getElementById('canvas'), d3.select(".angularchart").node().innerHTML);
            //$scope.asImage = document.getElementById('canvas').toDataURL();
            //$scope.metadata.og['og:image'] = $scope.asImage;
        }

        function setCheckpoint(checkpoint) {
            $scope.checkpoint.datasetString = '';
            $scope.checkpoint.dataset = checkpoint.data;
            $scope.checkpoint.schemaString = '';
            $scope.checkpoint.schema = {};
            $scope.checkpoint.optionsString = '';
            $scope.checkpoint.options = checkpoint.options;
            $scope.title = checkpoint.title;
            $scope.author = checkpoint.author;
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

        //$scope.datasetString = '';
        //$scope.dataset = [
        //    {
        //        'day': '2013-01-02_00:00:00',
        //        'sales': 3461.295202,
        //        'income': 12365.053
        //    },
        //    {
        //        'day': '2013-01-03_00:00:00',
        //        'sales': 4461.295202,
        //        'income': 13365.053
        //    },
        //    {
        //        'day': '2013-01-04_00:00:00',
        //        'sales': 4561.295202,
        //        'income': 14365.053
        //    }
        //];
        //
        //$scope.schema = {
        //    day: {
        //        type: 'datetime',
        //        format: '%Y-%m-%d_%H:%M:%S',
        //        name: 'Date'
        //    }
        //};
        //
        //$scope.optionsString = '';
        //$scope.options = {
        //    rows: [{
        //        key: 'income',
        //        type: 'bar'
        //    }, {
        //        key: 'sales'
        //    }],
        //    xAxis: {
        //        key: 'day',
        //        displayFormat: '%Y-%m-%d %H:%M:%S'
        //    }
        //};

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


        //$scope.$watch('options', function(json) {
        //    $scope.optionsString = $filter('json')(json);
        //}, true);
        //
        //$scope.$watch('optionsString', function(json) {
        //    try {
        //        $scope.options = JSON.parse(json);
        //        $scope.wellFormedOptions = true;
        //    } catch (e) {
        //        $scope.wellFormedOptions = false;
        //    }
        //}, true);
        //
        //$scope.$watch('dataset', function(json) {
        //    $scope.datasetString = $filter('json')(json);
        //}, true);
        //
        //$scope.$watch('datasetString', function(json) {
        //    try {
        //        $scope.dataset = JSON.parse(json);
        //        $scope.wellFormedDataset = true;
        //    } catch (e) {
        //        $scope.wellFormedDataset = false;
        //    }
        //}, true);

    }
    EmbedController.$inject = ["$scope", "$state", "$filter", "$location", "$timeout", "CheckpointEndpoint"];

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
        $scope.author = '';

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
                "author": $scope.author,
                "base": $scope.serverCheckpoint && $scope.serverCheckpoint.id,
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
                    "day": "2013-01-02",
                    "first": 12365.053,
                    "second": 1600,
                    "third": 1300,
                    "fouth": 1500,
                    "line": 6000.295202
                },
                {
                    "day": "2013-01-03",
                    "first": 1203.053,
                    "second": 16000,
                    "third": 1300,
                    "fouth": 1500,
                    "line": 13365.053
                },
                {
                    "day": "2013-01-04",
                    "first": 1235.053,
                    "second": 1600,
                    "third": 13000,
                    "fouth": 1500,
                    "line": 9365.053
                },
                {
                    "day": "2013-01-05",
                    "first": 1265.053,
                    "second": 1600,
                    "third": 1300,
                    "fouth": 15000,
                    "line": 14365.053
                }
            ];
            var schema = {
            };
            var options = {
                "rows": [
                    {
                        "key": "first",
                        "type": "bar",
                        "color": "green"
                    },
                    {
                        "key": "second",
                        "type": "bar",
                        "color": "orange"
                    },
                    {
                        "key": "third",
                        "type": "bar",
                        "color": "blue"
                    },
                    {
                        "key": "fouth",
                        "type": "bar",
                        "color": "red"
                    },
                    {
                        "key": "line",
                        "type": "spline",
                        "color": "black"
                    }
                ],
                "updated": "2015-05-01T11:56:50.707Z",
                "xAxis": {
                    "key": "day"
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
            $scope.author = checkpoint.author;
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImNvbW1vbi9vbi1yZWFkLWZpbGUvb24tcmVhZC1maWxlLWRpcmVjdGl2ZS5qcyIsInRyZWUvdHJlZS1lbmRwb2ludC5qcyIsInRyZWUvdHJlZS1jb250cm9sbGVyLmpzIiwiZW1iZWQvZW1iZWQtY29udHJvbGxlci5qcyIsImVkaXRvci9lZGl0b3ItY29udHJvbGxlci5qcyIsImNvbW1vbi9zdGF0ZXMuY29uZmlnLmpzIiwiY29tbW9uL29ucmVzaXplLmpzIiwiY29tbW9uL2FwcC1jb250cm9sbGVyLmpzIiwiY2hlY2twb2ludC9jaGVja3BvaW50LWVuZHBvaW50LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLENBQUMsWUFBWTs7RUFFWDs7RUFFQTtLQUNHLE9BQU8sYUFBYTtNQUNuQjtNQUNBO01BQ0E7TUFDQTtNQUNBO01BQ0E7TUFDQTtNQUNBO01BQ0E7Ozs7QUFJTjtBQ2xCQSxDQUFDLFlBQVk7O0lBRVQ7Ozs7Ozs7Ozs7Ozs7OztJQWVBLFNBQVMsV0FBVyxRQUFRO1FBQ3hCLE9BQU87WUFDSCxVQUFVO1lBQ1YsT0FBTztZQUNQLE1BQU0sU0FBUyxPQUFPLFNBQVMsT0FBTztnQkFDbEMsSUFBSSxLQUFLLE9BQU8sTUFBTTs7Z0JBRXRCLFFBQVEsR0FBRyxVQUFVLFNBQVMsZUFBZTtvQkFDekMsSUFBSSxTQUFTLElBQUk7O29CQUVqQixPQUFPLFNBQVMsU0FBUyxhQUFhO3dCQUNsQyxNQUFNLE9BQU8sV0FBVzs0QkFDcEIsR0FBRyxPQUFPLENBQUMsYUFBYSxZQUFZLE9BQU87Ozs7b0JBSW5ELE9BQU8sV0FBVyxDQUFDLGNBQWMsY0FBYyxjQUFjLFFBQVEsTUFBTTs7Ozs7OztJQU0zRjtTQUNLLE9BQU87U0FDUCxVQUFVLGNBQWM7OztBQUdqQztBQzVDQSxDQUFDLFlBQVk7O0lBRVQ7O0lBRUEsU0FBUyxhQUFhLFdBQVcsS0FBSztRQUNsQyxPQUFPLFVBQVUsSUFBSSxNQUFNLFlBQVk7WUFDbkMsSUFBSTtXQUNMO1lBQ0Ms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TSxRQUFRLG9CQUFvQixTQUFTLGNBQWM7Z0JBQzdELElBQUksYUFBYSxTQUFTO2dCQUMxQixJQUFJLG9CQUFvQjtnQkFDeEIsSUFBSSxTQUFTO2dCQUNiLElBQUksT0FBTztnQkFDWCxJQUFJLE1BQU0sUUFBUSxZQUFZO2dCQUM5QixJQUFJLE9BQU87Z0JBQ1gsSUFBSSxDQUFDLE1BQU0sUUFBUSxZQUFZOzs7UUFHdkMsUUFBUSxvQkFBb0IsS0FBSzs7O0lBR3JDLE9BQU8sdUJBQXVCLFNBQVMsU0FBUyxHQUFHO1FBQy9DLFFBQVEsb0JBQW9CLE9BQU8sUUFBUSxvQkFBb0IsUUFBUSxLQUFLO1FBQzVFLElBQUksQ0FBQyxRQUFRLG9CQUFvQixRQUFRO1lBQ3JDLElBQUksYUFBYSxRQUFRLFlBQVksWUFBWTtpQkFDNUM7Z0JBQ0QsUUFBUSxrQkFBa0IsZ0JBQWdCLFlBQVksb0JBQW9CLFVBQVU7Z0JBQ3BGLFFBQVEsb0JBQW9CLENBQUMsUUFBUSxZQUFZLFFBQVE7Ozs7O0tBS3BFO0FDakVMLENBQUMsWUFBWTs7SUFFVCxTQUFTLGNBQWMsUUFBUTs7UUFFM0IsT0FBTyxXQUFXO1FBQ2xCLE9BQU8sU0FBUyxZQUFZO1FBQzVCLE9BQU8sU0FBUyxLQUFLO1lBQ2pCLFdBQVc7WUFDWCxtQkFBbUI7WUFDbkIsWUFBWTtZQUNaLFlBQVk7WUFDWixrQkFBa0I7Ozs7O0lBSTFCO1NBQ0ssT0FBTztTQUNQLFdBQVcsaUJBQWlCOzs7QUFHckM7QUNwQkEsQ0FBQyxZQUFZOztJQUVUOztJQUVBLFNBQVMsbUJBQW1CLFdBQVcsS0FBSztRQUN4QyxPQUFPLFVBQVUsSUFBSSxNQUFNLGtCQUFrQjtZQUN6QyxJQUFJO1dBQ0w7WUFDQyxNQUFNO2dCQUNGLFFBQVE7O1lBRVosS0FBSztnQkFDRCxRQUFROzs7Ozs7SUFLcEI7U0FDSyxPQUFPO1NBQ1AsUUFBUSxzQkFBc0I7OztBQUd2QyIsImZpbGUiOiJzY3JpcHRzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uICgpIHtcblxuICAndXNlIHN0cmljdCc7XG5cbiAgYW5ndWxhclxuICAgIC5tb2R1bGUoJ2dyYWZpZGRsZScsIFtcbiAgICAgICdncmFmaWRkbGUuY29uZmlnJyxcbiAgICAgICdncmFmaWRkbGUudGVtcGxhdGVzJyxcbiAgICAgICduZ1Jlc291cmNlJyxcbiAgICAgICduZ1Nhbml0aXplJyxcbiAgICAgICduZ0FuaW1hdGUnLFxuICAgICAgJ3VpLnJvdXRlcicsXG4gICAgICAndWkubGF5b3V0JyxcbiAgICAgICd1aS5hY2UnLFxuICAgICAgJ2FuZ3VsYXJDaGFydCdcbiAgICBdKTtcblxufSkoKTtcbiIsIihmdW5jdGlvbiAoKSB7XG5cbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICAvKipcbiAgICAgKiBAbmdkb2MgZGlyZWN0aXZlXG4gICAgICogQG5hbWUgZ3JhZmlkZGxlLmRpcmVjdGl2ZTpvblJlYWRGaWxlXG4gICAgICogQHJlcXVpcmVzICRwYXJzZVxuICAgICAqIEByZXF1aXJlcyAkbG9nXG4gICAgICogQHJlc3RyaWN0IEFcbiAgICAgKlxuICAgICAqIEBkZXNjcmlwdGlvblxuICAgICAqIFRoZSBgb25SZWFkRmlsZWAgZGlyZWN0aXZlIG9wZW5zIHVwIGEgRmlsZVJlYWRlciBkaWFsb2cgdG8gdXBsb2FkIGZpbGVzIGZyb20gdGhlIGxvY2FsIGZpbGVzeXN0ZW0uXG4gICAgICpcbiAgICAgKiBAZWxlbWVudCBBTllcbiAgICAgKiBAbmdJbmplY3RcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBvblJlYWRGaWxlKCRwYXJzZSkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzdHJpY3Q6ICdBJyxcbiAgICAgICAgICAgIHNjb3BlOiBmYWxzZSxcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xuICAgICAgICAgICAgICAgIHZhciBmbiA9ICRwYXJzZShhdHRycy5vblJlYWRGaWxlKTtcblxuICAgICAgICAgICAgICAgIGVsZW1lbnQub24oJ2NoYW5nZScsIGZ1bmN0aW9uKG9uQ2hhbmdlRXZlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgcmVhZGVyLm9ubG9hZCA9IGZ1bmN0aW9uKG9uTG9hZEV2ZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzY29wZS4kYXBwbHkoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm4oc2NvcGUsIHskZmlsZUNvbnRlbnQ6b25Mb2FkRXZlbnQudGFyZ2V0LnJlc3VsdH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgICAgcmVhZGVyLnJlYWRBc1RleHQoKG9uQ2hhbmdlRXZlbnQuc3JjRWxlbWVudCB8fCBvbkNoYW5nZUV2ZW50LnRhcmdldCkuZmlsZXNbMF0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIGFuZ3VsYXJcbiAgICAgICAgLm1vZHVsZSgnZ3JhZmlkZGxlJylcbiAgICAgICAgLmRpcmVjdGl2ZSgnb25SZWFkRmlsZScsIG9uUmVhZEZpbGUpO1xuXG59KSgpO1xuIiwiKGZ1bmN0aW9uICgpIHtcblxuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGZ1bmN0aW9uIFRyZWVFbmRwb2ludCgkcmVzb3VyY2UsIEVOVikge1xuICAgICAgICByZXR1cm4gJHJlc291cmNlKEVOVi5hcGkgKyAndHJlZS86aWQnLCB7XG4gICAgICAgICAgICBpZDogJ0BpZCdcbiAgICAgICAgfSwge1xuICAgICAgICAgICAgZ2V0OiB7XG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgICAgICAgICBpc0FycmF5OiB0cnVlXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGFuZ3VsYXJcbiAgICAgICAgLm1vZHVsZSgnZ3JhZmlkZGxlJylcbiAgICAgICAgLmZhY3RvcnkoJ1RyZWVFbmRwb2ludCcsIFRyZWVFbmRwb2ludCk7XG5cbn0pKCk7XG4iLCIoZnVuY3Rpb24gKCkge1xuXG4gICAgZnVuY3Rpb24gVHJlZUNvbnRyb2xsZXIoJHNjb3BlLCAkc3RhdGUsIENoZWNrcG9pbnRFbmRwb2ludCwgVHJlZUVuZHBvaW50KSB7XG4gICAgICAgIHZhciB0cmVlRGF0YSA9IFtdO1xuICAgICAgICAkc2NvcGUuY2hlY2twb2ludCA9IHtcbiAgICAgICAgICAgIGlkOiAkc3RhdGUucGFyYW1zLmlkXG4gICAgICAgIH07XG5cbiAgICAgICAgQ2hlY2twb2ludEVuZHBvaW50XG4gICAgICAgICAgICAuZ2V0KHtpZDogJHN0YXRlLnBhcmFtcy5pZH0pXG4gICAgICAgICAgICAuJHByb21pc2VcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKGNoZWNrcG9pbnQpIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUuY2hlY2twb2ludCA9IGNoZWNrcG9pbnQ7XG4gICAgICAgICAgICAgICAgVHJlZUVuZHBvaW50XG4gICAgICAgICAgICAgICAgICAgIC5nZXQoe2lkOiBjaGVja3BvaW50LnRyZWV9KVxuICAgICAgICAgICAgICAgICAgICAuJHByb21pc2VcbiAgICAgICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24odHJlZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHJlZURhdGEgPSBjb252ZXJ0VHJlZSh0cmVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRyYXcoKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICBmdW5jdGlvbiBjb252ZXJ0VHJlZSh0cmVlKSB7XG4gICAgICAgICAgICAvLyBmaW5kIGJhc2VcbiAgICAgICAgICAgIHZhciBiYXNlID0ge307XG4gICAgICAgICAgICBhbmd1bGFyLmZvckVhY2godHJlZSwgZnVuY3Rpb24obm9kZSkge1xuICAgICAgICAgICAgICAgIGlmIChub2RlLmJhc2UgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgYmFzZSA9IG5vZGU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHZhciB0cmVlRGF0YSA9IFtdO1xuICAgICAgICAgICAgdHJlZURhdGEucHVzaChiYXNlKTtcbiAgICAgICAgICAgIGFkZENoaWxkcmVuKGJhc2UsIHRyZWUpO1xuXG4gICAgICAgICAgICByZXR1cm4gdHJlZURhdGFcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGFkZENoaWxkcmVuKGJhc2UsIHRyZWUpIHtcbiAgICAgICAgICAgIGJhc2UuY2hpbGRyZW4gPSBbXTtcbiAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaCh0cmVlLCBmdW5jdGlvbihub2RlKSB7XG4gICAgICAgICAgICAgICAgaWYgKG5vZGUuYmFzZSA9PT0gYmFzZS5pZCkge1xuICAgICAgICAgICAgICAgICAgICBiYXNlLmNoaWxkcmVuLnB1c2gobm9kZSk7XG4gICAgICAgICAgICAgICAgICAgIGFkZENoaWxkcmVuKG5vZGUsIHRyZWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBjbGljayhkKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhkKTtcbiAgICAgICAgICAgICRzdGF0ZS5nbygnZWRpdG9yJywge2lkOiBkLmlkfSk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBkcmF3KCkge1xuXG4gICAgICAgICAgICAvLyAqKioqKioqKioqKioqKiBHZW5lcmF0ZSB0aGUgdHJlZSBkaWFncmFtXHQgKioqKioqKioqKioqKioqKipcbiAgICAgICAgICAgIHZhciBtYXJnaW4gPSB7dG9wOiA0MCwgcmlnaHQ6IDAsIGJvdHRvbTogMjAsIGxlZnQ6IDB9LFxuICAgICAgICAgICAgICAgIHdpZHRoID0gOTAwIC0gbWFyZ2luLnJpZ2h0IC0gbWFyZ2luLmxlZnQsXG4gICAgICAgICAgICAgICAgaGVpZ2h0ID0gNzAwIC0gbWFyZ2luLnRvcCAtIG1hcmdpbi5ib3R0b207XG5cbiAgICAgICAgICAgIHZhciBpID0gMDtcblxuICAgICAgICAgICAgdmFyIHRyZWUgPSBkMy5sYXlvdXQudHJlZSgpXG4gICAgICAgICAgICAgICAgLnNpemUoW2hlaWdodCwgd2lkdGhdKTtcblxuICAgICAgICAgICAgdmFyIGRpYWdvbmFsID0gZDMuc3ZnLmRpYWdvbmFsKClcbiAgICAgICAgICAgICAgICAucHJvamVjdGlvbihmdW5jdGlvbihkKSB7IHJldHVybiBbZC54LCBkLnldOyB9KTtcblxuICAgICAgICAgICAgdmFyIHN2ZyA9IGQzLnNlbGVjdChcIiN0cmVlXCIpLmFwcGVuZChcInN2Z1wiKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwid2lkdGhcIiwgd2lkdGggKyBtYXJnaW4ucmlnaHQgKyBtYXJnaW4ubGVmdClcbiAgICAgICAgICAgICAgICAuYXR0cihcImhlaWdodFwiLCBoZWlnaHQgKyBtYXJnaW4udG9wICsgbWFyZ2luLmJvdHRvbSlcbiAgICAgICAgICAgICAgICAuYXBwZW5kKFwiZ1wiKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKFwiICsgbWFyZ2luLmxlZnQgKyBcIixcIiArIG1hcmdpbi50b3AgKyBcIilcIik7XG5cbiAgICAgICAgICAgIHJvb3QgPSB0cmVlRGF0YVswXTtcblxuICAgICAgICAgICAgdXBkYXRlKHJvb3QpO1xuXG4gICAgICAgICAgICBmdW5jdGlvbiB1cGRhdGUoc291cmNlKSB7XG5cbiAgICAgICAgICAgICAgICAvLyBDb21wdXRlIHRoZSBuZXcgdHJlZSBsYXlvdXQuXG4gICAgICAgICAgICAgICAgdmFyIG5vZGVzID0gdHJlZS5ub2Rlcyhyb290KS5yZXZlcnNlKCksXG4gICAgICAgICAgICAgICAgICAgIGxpbmtzID0gdHJlZS5saW5rcyhub2Rlcyk7XG5cbiAgICAgICAgICAgICAgICAvLyBOb3JtYWxpemUgZm9yIGZpeGVkLWRlcHRoLlxuICAgICAgICAgICAgICAgIG5vZGVzLmZvckVhY2goZnVuY3Rpb24oZCkgeyBkLnkgPSBkLmRlcHRoICogMTAwOyB9KTtcblxuICAgICAgICAgICAgICAgIC8vIERlY2xhcmUgdGhlIG5vZGVz4oCmXG4gICAgICAgICAgICAgICAgdmFyIG5vZGUgPSBzdmcuc2VsZWN0QWxsKFwiZy5ub2RlXCIpXG4gICAgICAgICAgICAgICAgICAgIC5kYXRhKG5vZGVzLCBmdW5jdGlvbihkKSB7IHJldHVybiBkLmlkIHx8IChkLmlkID0gKytpKTsgfSk7XG5cbiAgICAgICAgICAgICAgICAvLyBFbnRlciB0aGUgbm9kZXMuXG4gICAgICAgICAgICAgICAgdmFyIG5vZGVFbnRlciA9IG5vZGUuZW50ZXIoKS5hcHBlbmQoXCJnXCIpXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJub2RlXCIpXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBcInRyYW5zbGF0ZShcIiArIGQueCArIFwiLFwiICsgZC55ICsgXCIpXCI7IH0pXG4gICAgICAgICAgICAgICAgICAgIC5vbihcImNsaWNrXCIsIGNsaWNrKTs7XG5cbiAgICAgICAgICAgICAgICBub2RlRW50ZXIuYXBwZW5kKFwiY2lyY2xlXCIpXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKFwiclwiLCAxMClcbiAgICAgICAgICAgICAgICAgICAgLnN0eWxlKFwiZmlsbFwiLCBcIiNmZmZcIik7XG5cbiAgICAgICAgICAgICAgICBub2RlRW50ZXIuYXBwZW5kKFwidGV4dFwiKVxuICAgICAgICAgICAgICAgICAgICAuYXR0cihcInlcIiwgZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGQuY2hpbGRyZW4gfHwgZC5fY2hpbGRyZW4gPyAtMTggOiAxODsgfSlcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoXCJkeVwiLCBcIi4zNWVtXCIpXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKFwidGV4dC1hbmNob3JcIiwgXCJtaWRkbGVcIilcbiAgICAgICAgICAgICAgICAgICAgLnRleHQoZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHRleHQgPSBkLnRpdGxlO1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gKyAnIGJ5ICcgKyBkLmF1dGhvcjtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkLmlkID09ICRzY29wZS5jaGVja3BvaW50LmlkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGV4dCArPSAnIChjdXJyZW50KSc7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGV4dDtcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgLnN0eWxlKFwiZmlsbC1vcGFjaXR5XCIsIDEpO1xuXG4gICAgICAgICAgICAgICAgLy8gRGVjbGFyZSB0aGUgbGlua3PigKZcbiAgICAgICAgICAgICAgICB2YXIgbGluayA9IHN2Zy5zZWxlY3RBbGwoXCJwYXRoLmxpbmtcIilcbiAgICAgICAgICAgICAgICAgICAgLmRhdGEobGlua3MsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQudGFyZ2V0LmlkOyB9KTtcblxuICAgICAgICAgICAgICAgIC8vIEVudGVyIHRoZSBsaW5rcy5cbiAgICAgICAgICAgICAgICBsaW5rLmVudGVyKCkuaW5zZXJ0KFwicGF0aFwiLCBcImdcIilcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcImxpbmtcIilcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoXCJkXCIsIGRpYWdvbmFsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGFuZ3VsYXJcbiAgICAgICAgLm1vZHVsZSgnZ3JhZmlkZGxlJylcbiAgICAgICAgLmNvbnRyb2xsZXIoJ1RyZWVDb250cm9sbGVyJywgVHJlZUNvbnRyb2xsZXIpO1xuXG59KSgpOyIsIihmdW5jdGlvbiAoKSB7XG5cbiAgICBmdW5jdGlvbiBFbWJlZENvbnRyb2xsZXIoJHNjb3BlLCAkc3RhdGUsICRmaWx0ZXIsICRsb2NhdGlvbiwgJHRpbWVvdXQsIENoZWNrcG9pbnRFbmRwb2ludCkge1xuXG4gICAgICAgICRzY29wZS5jaGVja3BvaW50ID0ge307XG5cbiAgICAgICAgYWN0aXZhdGUoKTtcblxuICAgICAgICAvL1xuXG4gICAgICAgIGZ1bmN0aW9uIGFjdGl2YXRlKCkge1xuXG4gICAgICAgICAgICBpZiAoJHN0YXRlLnBhcmFtcy5pZCkge1xuICAgICAgICAgICAgICAgIENoZWNrcG9pbnRFbmRwb2ludFxuICAgICAgICAgICAgICAgICAgICAuZ2V0KHtpZDogJHN0YXRlLnBhcmFtcy5pZH0pXG4gICAgICAgICAgICAgICAgICAgIC4kcHJvbWlzZVxuICAgICAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbihjaGVja3BvaW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuc2VydmVyQ2hlY2twb2ludCA9IGNoZWNrcG9pbnQ7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZXRDaGVja3BvaW50KGNoZWNrcG9pbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgJHRpbWVvdXQoc2F2ZUFzSW1hZ2UsIDApO1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAuY2F0Y2goZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnZWRpdG9yJywge2lkOiAnJ30pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbG9hZERlZmF1bHREYXRhKCk7XG4gICAgICAgICAgICAgICAgJHRpbWVvdXQoc2F2ZUFzSW1hZ2UsIDApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3luY09wdGlvbnMoKTtcbiAgICAgICAgICAgIHN5bmNEYXRhc2V0KCk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBzYXZlQXNJbWFnZSgpIHtcbiAgICAgICAgICAgIC8vY2FudmcoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NhbnZhcycpLCBkMy5zZWxlY3QoXCIuYW5ndWxhcmNoYXJ0XCIpLm5vZGUoKS5pbm5lckhUTUwpO1xuICAgICAgICAgICAgLy8kc2NvcGUuYXNJbWFnZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjYW52YXMnKS50b0RhdGFVUkwoKTtcbiAgICAgICAgICAgIC8vJHNjb3BlLm1ldGFkYXRhLm9nWydvZzppbWFnZSddID0gJHNjb3BlLmFzSW1hZ2U7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBzZXRDaGVja3BvaW50KGNoZWNrcG9pbnQpIHtcbiAgICAgICAgICAgICRzY29wZS5jaGVja3BvaW50LmRhdGFzZXRTdHJpbmcgPSAnJztcbiAgICAgICAgICAgICRzY29wZS5jaGVja3BvaW50LmRhdGFzZXQgPSBjaGVja3BvaW50LmRhdGE7XG4gICAgICAgICAgICAkc2NvcGUuY2hlY2twb2ludC5zY2hlbWFTdHJpbmcgPSAnJztcbiAgICAgICAgICAgICRzY29wZS5jaGVja3BvaW50LnNjaGVtYSA9IHt9O1xuICAgICAgICAgICAgJHNjb3BlLmNoZWNrcG9pbnQub3B0aW9uc1N0cmluZyA9ICcnO1xuICAgICAgICAgICAgJHNjb3BlLmNoZWNrcG9pbnQub3B0aW9ucyA9IGNoZWNrcG9pbnQub3B0aW9ucztcbiAgICAgICAgICAgICRzY29wZS50aXRsZSA9IGNoZWNrcG9pbnQudGl0bGU7XG4gICAgICAgICAgICAkc2NvcGUuYXV0aG9yID0gY2hlY2twb2ludC5hdXRob3I7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTeW5jIE9iamVjdCBhbmQgU3RyaW5nIHJlcHJlc2VudGF0aW9uXG4gICAgICAgIC8vXG4gICAgICAgIGZ1bmN0aW9uIHN5bmNPcHRpb25zKCkge1xuICAgICAgICAgICAgJHNjb3BlLiR3YXRjaCgnY2hlY2twb2ludC5vcHRpb25zJywgZnVuY3Rpb24gKGpzb24pIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUuY2hlY2twb2ludC5vcHRpb25zU3RyaW5nID0gJGZpbHRlcignanNvbicpKGpzb24pO1xuICAgICAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgICAgICRzY29wZS4kd2F0Y2goJ2NoZWNrcG9pbnQub3B0aW9uc1N0cmluZycsIGZ1bmN0aW9uIChqc29uKSB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmNoZWNrcG9pbnQub3B0aW9ucyA9IEpTT04ucGFyc2UoanNvbik7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS53ZWxsRm9ybWVkT3B0aW9ucyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIHVwZGF0ZU9wdGlvbnNVSShqc29uKTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS53ZWxsRm9ybWVkT3B0aW9ucyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIHRydWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU3luYyBPYmplY3QgYW5kIFN0cmluZyByZXByZXNlbnRhdGlvblxuICAgICAgICAvL1xuICAgICAgICBmdW5jdGlvbiBzeW5jRGF0YXNldCgpIHtcbiAgICAgICAgICAgICRzY29wZS4kd2F0Y2goJ2NoZWNrcG9pbnQuZGF0YXNldCcsIGZ1bmN0aW9uIChqc29uKSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmNoZWNrcG9pbnQuZGF0YXNldFN0cmluZyA9ICRmaWx0ZXIoJ2pzb24nKShqc29uKTtcbiAgICAgICAgICAgICAgICBvcGRhdGVPcHRpb25zKCk7XG4gICAgICAgICAgICB9LCB0cnVlKTtcblxuICAgICAgICAgICAgJHNjb3BlLiR3YXRjaCgnY2hlY2twb2ludC5kYXRhc2V0U3RyaW5nJywgZnVuY3Rpb24gKGpzb24pIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY2hlY2twb2ludC5kYXRhc2V0ID0gSlNPTi5wYXJzZShqc29uKTtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLndlbGxGb3JtZWREYXRhc2V0ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS53ZWxsRm9ybWVkRGF0YXNldCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIHRydWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQWRkIHRpbWVzdGFtcCB0byBvcHRpb25zIHRvIHJlZHJhd1xuICAgICAgICAvL1xuICAgICAgICBmdW5jdGlvbiBvcGRhdGVPcHRpb25zKCkge1xuICAgICAgICAgICAgLy8gSXMgY2FsbGVkIHRvIG9mdGVuLCBub3Qgb25seSBvbiByZXNpemVcbiAgICAgICAgICAgIGlmICgkc2NvcGUuY2hlY2twb2ludCAmJiAkc2NvcGUuY2hlY2twb2ludC5vcHRpb25zKSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmNoZWNrcG9pbnQub3B0aW9ucy51cGRhdGVkID0gbmV3IERhdGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG5cbiAgICAgICAgJHNjb3BlLmVtYmVkVmlldyA9ICdjaGFydCc7XG4gICAgICAgIHZhciByZXF1ZXN0VmlldyA9ICRsb2NhdGlvbi5zZWFyY2goKS52aWV3O1xuICAgICAgICBpZihyZXF1ZXN0Vmlldykge1xuICAgICAgICAgICAgJHNjb3BlLmVtYmVkVmlldyA9IHJlcXVlc3RWaWV3O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAkc2NvcGUuc2V0VmlldyA9IGZ1bmN0aW9uKG5ld1ZpZXcpIHtcbiAgICAgICAgICAgICRzY29wZS5lbWJlZFZpZXcgPSBuZXdWaWV3O1xuICAgICAgICAgICAgJHNjb3BlLm9wdGlvbnNFZGl0b3IucmVzaXplKCk7XG4gICAgICAgICAgICAkc2NvcGUuZGF0YUVkaXRvci5yZXNpemUoKTtcbiAgICAgICAgICAgICRzY29wZS5vcHRpb25zRWRpdG9yLnJlbmRlcmVyLnVwZGF0ZUZ1bGwoKTtcbiAgICAgICAgICAgICRzY29wZS5kYXRhRWRpdG9yLnJlbmRlcmVyLnVwZGF0ZUZ1bGwoKTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuaXNWaWV3ID0gZnVuY3Rpb24odmlldykge1xuICAgICAgICAgICAgcmV0dXJuIHZpZXcgPT0gJHNjb3BlLmVtYmVkVmlldztcbiAgICAgICAgfTtcblxuICAgICAgICAvLyRzY29wZS5kYXRhc2V0U3RyaW5nID0gJyc7XG4gICAgICAgIC8vJHNjb3BlLmRhdGFzZXQgPSBbXG4gICAgICAgIC8vICAgIHtcbiAgICAgICAgLy8gICAgICAgICdkYXknOiAnMjAxMy0wMS0wMl8wMDowMDowMCcsXG4gICAgICAgIC8vICAgICAgICAnc2FsZXMnOiAzNDYxLjI5NTIwMixcbiAgICAgICAgLy8gICAgICAgICdpbmNvbWUnOiAxMjM2NS4wNTNcbiAgICAgICAgLy8gICAgfSxcbiAgICAgICAgLy8gICAge1xuICAgICAgICAvLyAgICAgICAgJ2RheSc6ICcyMDEzLTAxLTAzXzAwOjAwOjAwJyxcbiAgICAgICAgLy8gICAgICAgICdzYWxlcyc6IDQ0NjEuMjk1MjAyLFxuICAgICAgICAvLyAgICAgICAgJ2luY29tZSc6IDEzMzY1LjA1M1xuICAgICAgICAvLyAgICB9LFxuICAgICAgICAvLyAgICB7XG4gICAgICAgIC8vICAgICAgICAnZGF5JzogJzIwMTMtMDEtMDRfMDA6MDA6MDAnLFxuICAgICAgICAvLyAgICAgICAgJ3NhbGVzJzogNDU2MS4yOTUyMDIsXG4gICAgICAgIC8vICAgICAgICAnaW5jb21lJzogMTQzNjUuMDUzXG4gICAgICAgIC8vICAgIH1cbiAgICAgICAgLy9dO1xuICAgICAgICAvL1xuICAgICAgICAvLyRzY29wZS5zY2hlbWEgPSB7XG4gICAgICAgIC8vICAgIGRheToge1xuICAgICAgICAvLyAgICAgICAgdHlwZTogJ2RhdGV0aW1lJyxcbiAgICAgICAgLy8gICAgICAgIGZvcm1hdDogJyVZLSVtLSVkXyVIOiVNOiVTJyxcbiAgICAgICAgLy8gICAgICAgIG5hbWU6ICdEYXRlJ1xuICAgICAgICAvLyAgICB9XG4gICAgICAgIC8vfTtcbiAgICAgICAgLy9cbiAgICAgICAgLy8kc2NvcGUub3B0aW9uc1N0cmluZyA9ICcnO1xuICAgICAgICAvLyRzY29wZS5vcHRpb25zID0ge1xuICAgICAgICAvLyAgICByb3dzOiBbe1xuICAgICAgICAvLyAgICAgICAga2V5OiAnaW5jb21lJyxcbiAgICAgICAgLy8gICAgICAgIHR5cGU6ICdiYXInXG4gICAgICAgIC8vICAgIH0sIHtcbiAgICAgICAgLy8gICAgICAgIGtleTogJ3NhbGVzJ1xuICAgICAgICAvLyAgICB9XSxcbiAgICAgICAgLy8gICAgeEF4aXM6IHtcbiAgICAgICAgLy8gICAgICAgIGtleTogJ2RheScsXG4gICAgICAgIC8vICAgICAgICBkaXNwbGF5Rm9ybWF0OiAnJVktJW0tJWQgJUg6JU06JVMnXG4gICAgICAgIC8vICAgIH1cbiAgICAgICAgLy99O1xuXG4gICAgICAgIC8vIGRlZmluZSBjb2RlIGhpZ2hsaWdodGluZ1xuICAgICAgICAkc2NvcGUub3B0aW9uc0FjZUNvbmZpZyA9IHtcbiAgICAgICAgICAgIG1vZGU6ICdqc29uJyxcbiAgICAgICAgICAgIHVzZVdyYXBNb2RlOiBmYWxzZSxcbiAgICAgICAgICAgIG9uTG9hZDogZnVuY3Rpb24oX2VkaXRvcikge1xuICAgICAgICAgICAgICAgIF9lZGl0b3Iuc2V0U2hvd1ByaW50TWFyZ2luKGZhbHNlKTtcbiAgICAgICAgICAgICAgICAkc2NvcGUub3B0aW9uc0VkaXRvciA9IF9lZGl0b3I7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLmRhdGFzZXRBY2VDb25maWcgPSB7XG4gICAgICAgICAgICBtb2RlOiAnanNvbicsXG4gICAgICAgICAgICB1c2VXcmFwTW9kZTogZmFsc2UsXG4gICAgICAgICAgICBvbkxvYWQ6IGZ1bmN0aW9uKF9lZGl0b3IpIHtcbiAgICAgICAgICAgICAgICBfZWRpdG9yLnNldFNob3dQcmludE1hcmdpbihmYWxzZSk7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmRhdGFFZGl0b3IgPSBfZWRpdG9yO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG5cbiAgICAgICAgLy8kc2NvcGUuJHdhdGNoKCdvcHRpb25zJywgZnVuY3Rpb24oanNvbikge1xuICAgICAgICAvLyAgICAkc2NvcGUub3B0aW9uc1N0cmluZyA9ICRmaWx0ZXIoJ2pzb24nKShqc29uKTtcbiAgICAgICAgLy99LCB0cnVlKTtcbiAgICAgICAgLy9cbiAgICAgICAgLy8kc2NvcGUuJHdhdGNoKCdvcHRpb25zU3RyaW5nJywgZnVuY3Rpb24oanNvbikge1xuICAgICAgICAvLyAgICB0cnkge1xuICAgICAgICAvLyAgICAgICAgJHNjb3BlLm9wdGlvbnMgPSBKU09OLnBhcnNlKGpzb24pO1xuICAgICAgICAvLyAgICAgICAgJHNjb3BlLndlbGxGb3JtZWRPcHRpb25zID0gdHJ1ZTtcbiAgICAgICAgLy8gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAvLyAgICAgICAgJHNjb3BlLndlbGxGb3JtZWRPcHRpb25zID0gZmFsc2U7XG4gICAgICAgIC8vICAgIH1cbiAgICAgICAgLy99LCB0cnVlKTtcbiAgICAgICAgLy9cbiAgICAgICAgLy8kc2NvcGUuJHdhdGNoKCdkYXRhc2V0JywgZnVuY3Rpb24oanNvbikge1xuICAgICAgICAvLyAgICAkc2NvcGUuZGF0YXNldFN0cmluZyA9ICRmaWx0ZXIoJ2pzb24nKShqc29uKTtcbiAgICAgICAgLy99LCB0cnVlKTtcbiAgICAgICAgLy9cbiAgICAgICAgLy8kc2NvcGUuJHdhdGNoKCdkYXRhc2V0U3RyaW5nJywgZnVuY3Rpb24oanNvbikge1xuICAgICAgICAvLyAgICB0cnkge1xuICAgICAgICAvLyAgICAgICAgJHNjb3BlLmRhdGFzZXQgPSBKU09OLnBhcnNlKGpzb24pO1xuICAgICAgICAvLyAgICAgICAgJHNjb3BlLndlbGxGb3JtZWREYXRhc2V0ID0gdHJ1ZTtcbiAgICAgICAgLy8gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAvLyAgICAgICAgJHNjb3BlLndlbGxGb3JtZWREYXRhc2V0ID0gZmFsc2U7XG4gICAgICAgIC8vICAgIH1cbiAgICAgICAgLy99LCB0cnVlKTtcblxuICAgIH1cblxuICAgIGFuZ3VsYXJcbiAgICAgICAgLm1vZHVsZSgnZ3JhZmlkZGxlJylcbiAgICAgICAgLmNvbnRyb2xsZXIoJ0VtYmVkQ29udHJvbGxlcicsIEVtYmVkQ29udHJvbGxlcik7XG5cbn0pKCk7XG4iLCIoZnVuY3Rpb24gKCkge1xuXG4gICAgZnVuY3Rpb24gRWRpdG9yQ29udHJvbGxlcigkc2NvcGUsICRmaWx0ZXIsICRzdGF0ZSwgJHdpbmRvdywgJHRpbWVvdXQsIENoZWNrcG9pbnRFbmRwb2ludCkge1xuXG4gICAgICAgICRzY29wZS5zaG93RGF0YUVkaXRvciA9IGZhbHNlO1xuICAgICAgICAkc2NvcGUuc2hvd09wdGlvbnNVSSAgPSBmYWxzZTtcbiAgICAgICAgJHNjb3BlLnNob3dTaGFyZVBvcHVwID0gZmFsc2U7XG4gICAgICAgICRzY29wZS5zd2l0Y2hEYXRhQnV0dG9uVGl0bGUgICAgPSAnTWFudWFsIGRhdGEgZW50cnknO1xuICAgICAgICAkc2NvcGUuc3dpdGNoT3B0aW9uc0J1dHRvblRpdGxlID0gJ0VkaXQgaW4gR1VJJztcbiAgICAgICAgJHNjb3BlLnRvZ2dsZURhdGFFZGl0b3IgPSB0b2dnbGVEYXRhRWRpdG9yO1xuICAgICAgICAkc2NvcGUudG9nZ2xlT3B0aW9uc1VJICA9IHRvZ2dsZU9wdGlvbnNVSTtcbiAgICAgICAgJHNjb3BlLnNoYXJlUG9wdXAgICAgICAgPSBzaGFyZVBvcHVwO1xuICAgICAgICAkc2NvcGUub25TaGFyZVRleHRDbGljayA9IG9uU2hhcmVUZXh0Q2xpY2s7XG4gICAgICAgICRzY29wZS5hZGRPcHRpb24gPSBhZGRPcHRpb247XG4gICAgICAgICRzY29wZS50aXRsZSA9ICcnO1xuICAgICAgICAkc2NvcGUuYXV0aG9yID0gJyc7XG5cbiAgICAgICAgJHNjb3BlLnNoYXJlID0gc2hhcmU7XG4gICAgICAgICRzY29wZS5zYXZlID0gc2F2ZTtcbiAgICAgICAgJHNjb3BlLnVwbG9hZEZpbGUgPSB1cGxvYWRGaWxlO1xuXG4gICAgICAgICRzY29wZS5vcHRpb25zVUlyb3dUeXBlT3B0aW9ucyA9IFtcbiAgICAgICAgICAgIHsgbGFiZWw6ICdsaW5lJywgdmFsdWU6IDEgfSxcbiAgICAgICAgICAgIHsgbGFiZWw6ICdzcGxpbmUnLCB2YWx1ZTogMiB9LFxuICAgICAgICAgICAgeyBsYWJlbDogJ2JhcicsIHZhbHVlOiAzIH0sXG4gICAgICAgICAgICB7IGxhYmVsOiAnc2NhdHRlcicsIHZhbHVlOiA0IH0sXG4gICAgICAgICAgICB7IGxhYmVsOiAnYXJlYScsIHZhbHVlOiA1IH0sXG4gICAgICAgICAgICB7IGxhYmVsOiAnYXJlYS1zcGxpbmUnLCB2YWx1ZTogNiB9LFxuICAgICAgICAgICAgeyBsYWJlbDogJ3N0ZXAnLCB2YWx1ZTogNyB9LFxuICAgICAgICAgICAgeyBsYWJlbDogJ2FyZWEtc3RlcCcsIHZhbHVlOiA4IH0sXG4gICAgICAgICAgICB7IGxhYmVsOiAnc3RlcCcsIHZhbHVlOiA5IH1cbiAgICAgICAgXTtcblxuICAgICAgICAkc2NvcGUuY2hlY2twb2ludCA9IHt9O1xuICAgICAgICAkc2NvcGUuYWNlSnNvbkNvbmZpZyA9IHtcbiAgICAgICAgICAgIG1vZGU6ICdqc29uJyxcbiAgICAgICAgICAgIHVzZVdyYXBNb2RlOiBmYWxzZSxcbiAgICAgICAgICAgIG9uTG9hZDogZnVuY3Rpb24gKF9lZGl0b3IpIHtcbiAgICAgICAgICAgICAgICBfZWRpdG9yLnNldFNob3dQcmludE1hcmdpbihmYWxzZSk7XG4gICAgICAgICAgICAgICAgX2VkaXRvci4kYmxvY2tTY3JvbGxpbmcgPSBJbmZpbml0eTtcbiAgICAgICAgICAgICAgICAkc2NvcGUuZWRpdG9ycyA9IF9lZGl0b3I7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgYWN0aXZhdGUoKTtcblxuICAgICAgICAvLy8vLy8vLy8vLy9cblxuICAgICAgICBmdW5jdGlvbiBhY3RpdmF0ZSgpIHtcblxuICAgICAgICAgICAgaWYgKCRzdGF0ZS5wYXJhbXMuaWQpIHtcbiAgICAgICAgICAgICAgICBDaGVja3BvaW50RW5kcG9pbnRcbiAgICAgICAgICAgICAgICAgICAgLmdldCh7aWQ6ICRzdGF0ZS5wYXJhbXMuaWR9KVxuICAgICAgICAgICAgICAgICAgICAuJHByb21pc2VcbiAgICAgICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oY2hlY2twb2ludCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnNlcnZlckNoZWNrcG9pbnQgPSBjaGVja3BvaW50O1xuICAgICAgICAgICAgICAgICAgICAgICAgc2V0Q2hlY2twb2ludChjaGVja3BvaW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICR0aW1lb3V0KHNhdmVBc0ltYWdlLCAwKTtcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ2VkaXRvcicsIHtpZDogJyd9KTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGxvYWREZWZhdWx0RGF0YSgpO1xuICAgICAgICAgICAgICAgICR0aW1lb3V0KHNhdmVBc0ltYWdlLCAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN5bmNPcHRpb25zKCk7XG4gICAgICAgICAgICBzeW5jRGF0YXNldCgpO1xuICAgICAgICAgICAgLy91cGRhdGVPblJlc2l6ZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gc2F2ZUFzSW1hZ2UoKSB7XG4gICAgICAgICAgICBjYW52Zyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2FudmFzJyksIGQzLnNlbGVjdChcIi5hbmd1bGFyY2hhcnRcIikubm9kZSgpLmlubmVySFRNTCk7XG4gICAgICAgICAgICAkc2NvcGUuYXNJbWFnZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjYW52YXMnKS50b0RhdGFVUkwoKTtcbiAgICAgICAgICAgICRzY29wZS5tZXRhZGF0YS5vZ1snb2c6aW1hZ2UnXSA9ICRzY29wZS5hc0ltYWdlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2F2ZSB0aGUgY3VycmVudCBWZXJzaW9uXG4gICAgICAgIC8vXG4gICAgICAgIGZ1bmN0aW9uIHNhdmUoKSB7XG4gICAgICAgICAgICBDaGVja3BvaW50RW5kcG9pbnQuc2F2ZSh7XG4gICAgICAgICAgICAgICAgXCJkYXRhXCI6ICRzY29wZS5jaGVja3BvaW50LmRhdGFzZXQsXG4gICAgICAgICAgICAgICAgXCJvcHRpb25zXCI6ICRzY29wZS5jaGVja3BvaW50Lm9wdGlvbnMsXG4gICAgICAgICAgICAgICAgXCJhdXRob3JcIjogJHNjb3BlLmF1dGhvcixcbiAgICAgICAgICAgICAgICBcImJhc2VcIjogJHNjb3BlLnNlcnZlckNoZWNrcG9pbnQgJiYgJHNjb3BlLnNlcnZlckNoZWNrcG9pbnQuaWQsXG4gICAgICAgICAgICAgICAgXCJ0aXRsZVwiOiAkc2NvcGUudGl0bGVcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLiRwcm9taXNlXG4gICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKGNoZWNrcG9pbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3NhdmVkIGNoZWNrcG9pbnQ6ICcsIGNoZWNrcG9pbnQpO1xuICAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ2VkaXRvcicsIHtpZDogY2hlY2twb2ludC5pZH0pO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ3NhdmUgZmFpbGVkJywgZSk7XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNoYXJlIHRoZSBmaWRkbGVcbiAgICAgICAgLy9cbiAgICAgICAgZnVuY3Rpb24gc2hhcmUodGFyZ2V0KSB7XG4gICAgICAgICAgICBmaWRkbGVVUkwgICAgICAgPSAnaHR0cDovL2dyYWZpZGRsZS5hcHBzcG90LmNvbS8nICsgJHN0YXRlLnBhcmFtcy5pZDtcbiAgICAgICAgICAgIGlmKHRhcmdldCA9PSAnRkInKSB7XG4gICAgICAgICAgICAgICAgJHdpbmRvdy5vcGVuKCdodHRwczovL3d3dy5mYWNlYm9vay5jb20vc2hhcmVyL3NoYXJlci5waHA/dT0nICsgZmlkZGxlVVJMLCAnX2JsYW5rJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZih0YXJnZXQgPT0gJ1R3aXR0ZXInKSB7XG4gICAgICAgICAgICAgICAgJHdpbmRvdy5vcGVuKCdodHRwczovL3R3aXR0ZXIuY29tL2ludGVudC90d2VldD90ZXh0PUNoZWNrJTIwb3V0JTIwdGhpcyUyMHN3ZWV0JTIwZ3JhZmlkZGxlJTIwJnVybD0nICsgZmlkZGxlVVJMLCAnX2JsYW5rJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZih0YXJnZXQgPT0gJ0UtTWFpbCcpIHtcbiAgICAgICAgICAgICAgICAkd2luZG93LmxvY2F0aW9uID0gJ21haWx0bzphQGIuY2Q/c3ViamVjdD1DaGVjayUyMG91dCUyMHRoaXMlMjBhd2Vzb21lJTIwR3JhZmlkZGxlJmJvZHk9JyArIGZpZGRsZVVSTDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwbG9hZCBhIGZpbGUgYXMgZGF0YSBzb3VyY2VcbiAgICAgICAgLy9cbiAgICAgICAgZnVuY3Rpb24gdXBsb2FkRmlsZShmaWxlKSB7XG4gICAgICAgICAgICAkc2NvcGUuY2hlY2twb2ludC5kYXRhc2V0U3RyaW5nID0gZmlsZTtcbiAgICAgICAgICAgICRzY29wZS50b2dnbGVEYXRhRWRpdG9yKCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBUb2dnbGUgZnJvbSBkYXRhIHZpZXdcbiAgICAgICAgLy9cbiAgICAgICAgZnVuY3Rpb24gdG9nZ2xlRGF0YUVkaXRvcigpIHtcbiAgICAgICAgICAgICRzY29wZS5zaG93RGF0YUVkaXRvciA9ICEkc2NvcGUuc2hvd0RhdGFFZGl0b3I7XG4gICAgICAgICAgICAkc2NvcGUuc3dpdGNoRGF0YUJ1dHRvblRpdGxlID0gJHNjb3BlLnNob3dEYXRhRWRpdG9yID8gJ0JhY2sgdG8gaW5wdXQgZGlhbG9nJyA6ICdNYW51YWwgZGF0YSBlbnRyeSc7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBUb2dnbGUgZnJvbSBqc29uLW9wdGlvbiB2aWV3XG4gICAgICAgIC8vXG4gICAgICAgIGZ1bmN0aW9uIHRvZ2dsZU9wdGlvbnNVSSgpIHtcbiAgICAgICAgICAgICRzY29wZS5zaG93T3B0aW9uc1VJID0gISRzY29wZS5zaG93T3B0aW9uc1VJO1xuICAgICAgICAgICAgJHNjb3BlLnN3aXRjaE9wdGlvbnNCdXR0b25UaXRsZSA9ICRzY29wZS5zaG93T3B0aW9uc1VJID8gJ0VkaXQgYXMgSlNPTicgOiAnRWRpdCBpbiBHVUknO1xuICAgICAgICAgICAgJHNjb3BlLmVkaXRvcnMucmVzaXplKCk7XG4gICAgICAgICAgICAkc2NvcGUuZWRpdG9ycy5yZW5kZXJlci51cGRhdGVGdWxsKCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDcmVhdGUgdGhlIEhUTUwgVUkgcmVwcmVzZW50YXRpb24gb2YgdGhlIG9wdGlvbnMganNvblxuICAgICAgICAvL1xuICAgICAgICBmdW5jdGlvbiB1cGRhdGVPcHRpb25zVUkoanNvbikge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJ1cGRhdGUgb3B0aW9ucyB1aVwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNob3cgdGhlIHNoYXJlIHNoZWV0XG4gICAgICAgIC8vXG4gICAgICAgIGZ1bmN0aW9uIHNoYXJlUG9wdXAoKSB7XG4gICAgICAgICAgICAkc2NvcGUuc2hvd1NoYXJlUG9wdXAgPSAhJHNjb3BlLnNob3dTaGFyZVBvcHVwO1xuICAgICAgICAgICAgJHNjb3BlLmZpZGRsZVVSTCAgICAgICA9ICdodHRwOi8vZ3JhZmlkZGxlLmFwcHNwb3QuY29tLycgKyAkc3RhdGUucGFyYW1zLmlkO1xuICAgICAgICAgICAgJHNjb3BlLmZpZGRsZUNoYXJ0VVJMICA9ICdodHRwOi8vZ3JhZmlkZGxlLmFwcHNwb3QuY29tLycgKyAkc3RhdGUucGFyYW1zLmlkICsgJy5wbmcnO1xuICAgICAgICAgICAgJHNjb3BlLmZpZGRsZUVtYmVkQ29kZSA9ICc8aWZyYW1lIHdpZHRoPVwiMTAwJVwiIGhlaWdodD1cIjMwMFwiIHNyYz1cIi8vZ3JhZmlkZGxlLmFwcHNwb3QuY29tL2VtYmVkLycgKyAkc3RhdGUucGFyYW1zLmlkICsgJ1wiIGFsbG93ZnVsbHNjcmVlbj1cImFsbG93ZnVsbHNjcmVlblwiIGZyYW1lYm9yZGVyPVwiMFwiPjwvaWZyYW1lPic7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBbGxvdyBzaGFyZSB0ZXh0IGZpZWxkcyB0byBhdXRvc2VsZWN0IG9uIGZvY3VzXG4gICAgICAgIC8vXG4gICAgICAgIGZ1bmN0aW9uIG9uU2hhcmVUZXh0Q2xpY2soJGV2ZW50KSB7XG4gICAgICAgICAgICAkZXZlbnQudGFyZ2V0LnNlbGVjdCgpO1xuICAgICAgICB9O1xuXG4gICAgICAgIFxuICAgICAgICAvLyBJbnNlcnQgZGVmYXVsdCBkYXRhXG4gICAgICAgIC8vXG4gICAgICAgIGZ1bmN0aW9uIGFkZE9wdGlvbihvcHRpb24pIHtcbiAgICAgICAgICAgIGlmKG9wdGlvbiA9PSAncm93JylcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUuY2hlY2twb2ludC5vcHRpb25zLnJvd3MgPSAkc2NvcGUuY2hlY2twb2ludC5vcHRpb25zLnJvd3MuY29uY2F0KFt7a2V5IDogXCJuZXcgcm93XCJ9XSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG5cbiAgICAgICAgLy8gSW5zZXJ0IGRlZmF1bHQgZGF0YVxuICAgICAgICAvL1xuICAgICAgICBmdW5jdGlvbiBsb2FkRGVmYXVsdERhdGEoKSB7XG4gICAgICAgICAgICB2YXIgZGF0YXNldCA9IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIFwiZGF5XCI6IFwiMjAxMy0wMS0wMlwiLFxuICAgICAgICAgICAgICAgICAgICBcImZpcnN0XCI6IDEyMzY1LjA1MyxcbiAgICAgICAgICAgICAgICAgICAgXCJzZWNvbmRcIjogMTYwMCxcbiAgICAgICAgICAgICAgICAgICAgXCJ0aGlyZFwiOiAxMzAwLFxuICAgICAgICAgICAgICAgICAgICBcImZvdXRoXCI6IDE1MDAsXG4gICAgICAgICAgICAgICAgICAgIFwibGluZVwiOiA2MDAwLjI5NTIwMlxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBcImRheVwiOiBcIjIwMTMtMDEtMDNcIixcbiAgICAgICAgICAgICAgICAgICAgXCJmaXJzdFwiOiAxMjAzLjA1MyxcbiAgICAgICAgICAgICAgICAgICAgXCJzZWNvbmRcIjogMTYwMDAsXG4gICAgICAgICAgICAgICAgICAgIFwidGhpcmRcIjogMTMwMCxcbiAgICAgICAgICAgICAgICAgICAgXCJmb3V0aFwiOiAxNTAwLFxuICAgICAgICAgICAgICAgICAgICBcImxpbmVcIjogMTMzNjUuMDUzXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIFwiZGF5XCI6IFwiMjAxMy0wMS0wNFwiLFxuICAgICAgICAgICAgICAgICAgICBcImZpcnN0XCI6IDEyMzUuMDUzLFxuICAgICAgICAgICAgICAgICAgICBcInNlY29uZFwiOiAxNjAwLFxuICAgICAgICAgICAgICAgICAgICBcInRoaXJkXCI6IDEzMDAwLFxuICAgICAgICAgICAgICAgICAgICBcImZvdXRoXCI6IDE1MDAsXG4gICAgICAgICAgICAgICAgICAgIFwibGluZVwiOiA5MzY1LjA1M1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBcImRheVwiOiBcIjIwMTMtMDEtMDVcIixcbiAgICAgICAgICAgICAgICAgICAgXCJmaXJzdFwiOiAxMjY1LjA1MyxcbiAgICAgICAgICAgICAgICAgICAgXCJzZWNvbmRcIjogMTYwMCxcbiAgICAgICAgICAgICAgICAgICAgXCJ0aGlyZFwiOiAxMzAwLFxuICAgICAgICAgICAgICAgICAgICBcImZvdXRoXCI6IDE1MDAwLFxuICAgICAgICAgICAgICAgICAgICBcImxpbmVcIjogMTQzNjUuMDUzXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXTtcbiAgICAgICAgICAgIHZhciBzY2hlbWEgPSB7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdmFyIG9wdGlvbnMgPSB7XG4gICAgICAgICAgICAgICAgXCJyb3dzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJrZXlcIjogXCJmaXJzdFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiYmFyXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcImNvbG9yXCI6IFwiZ3JlZW5cIlxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBcImtleVwiOiBcInNlY29uZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiYmFyXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcImNvbG9yXCI6IFwib3JhbmdlXCJcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJrZXlcIjogXCJ0aGlyZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiYmFyXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcImNvbG9yXCI6IFwiYmx1ZVwiXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwia2V5XCI6IFwiZm91dGhcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImJhclwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJjb2xvclwiOiBcInJlZFwiXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwia2V5XCI6IFwibGluZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwic3BsaW5lXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcImNvbG9yXCI6IFwiYmxhY2tcIlxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBcInVwZGF0ZWRcIjogXCIyMDE1LTA1LTAxVDExOjU2OjUwLjcwN1pcIixcbiAgICAgICAgICAgICAgICBcInhBeGlzXCI6IHtcbiAgICAgICAgICAgICAgICAgICAgXCJrZXlcIjogXCJkYXlcIlxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICRzY29wZS5jaGVja3BvaW50LmRhdGFzZXRTdHJpbmcgPSAnJztcbiAgICAgICAgICAgICRzY29wZS5jaGVja3BvaW50LmRhdGFzZXQgPSBkYXRhc2V0O1xuICAgICAgICAgICAgJHNjb3BlLmNoZWNrcG9pbnQuc2NoZW1hU3RyaW5nID0gJyc7XG4gICAgICAgICAgICAkc2NvcGUuY2hlY2twb2ludC5zY2hlbWEgPSBzY2hlbWE7XG4gICAgICAgICAgICAkc2NvcGUuY2hlY2twb2ludC5vcHRpb25zU3RyaW5nID0gJyc7XG4gICAgICAgICAgICAkc2NvcGUuY2hlY2twb2ludC5vcHRpb25zID0gb3B0aW9ucztcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHNldENoZWNrcG9pbnQoY2hlY2twb2ludCkge1xuICAgICAgICAgICAgJHNjb3BlLmNoZWNrcG9pbnQuZGF0YXNldFN0cmluZyA9ICcnO1xuICAgICAgICAgICAgJHNjb3BlLmNoZWNrcG9pbnQuZGF0YXNldCA9IGNoZWNrcG9pbnQuZGF0YTtcbiAgICAgICAgICAgICRzY29wZS5jaGVja3BvaW50LnNjaGVtYVN0cmluZyA9ICcnO1xuICAgICAgICAgICAgJHNjb3BlLmNoZWNrcG9pbnQuc2NoZW1hID0ge307XG4gICAgICAgICAgICAkc2NvcGUuY2hlY2twb2ludC5vcHRpb25zU3RyaW5nID0gJyc7XG4gICAgICAgICAgICAkc2NvcGUuY2hlY2twb2ludC5vcHRpb25zID0gY2hlY2twb2ludC5vcHRpb25zO1xuICAgICAgICAgICAgJHNjb3BlLnRpdGxlID0gY2hlY2twb2ludC50aXRsZTtcbiAgICAgICAgICAgICRzY29wZS5hdXRob3IgPSBjaGVja3BvaW50LmF1dGhvcjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFN5bmMgT2JqZWN0IGFuZCBTdHJpbmcgcmVwcmVzZW50YXRpb25cbiAgICAgICAgLy9cbiAgICAgICAgZnVuY3Rpb24gc3luY09wdGlvbnMoKSB7XG4gICAgICAgICAgICAkc2NvcGUuJHdhdGNoKCdjaGVja3BvaW50Lm9wdGlvbnMnLCBmdW5jdGlvbiAoanNvbikge1xuICAgICAgICAgICAgICAgICRzY29wZS5jaGVja3BvaW50Lm9wdGlvbnNTdHJpbmcgPSAkZmlsdGVyKCdqc29uJykoanNvbik7XG4gICAgICAgICAgICB9LCB0cnVlKTtcblxuICAgICAgICAgICAgJHNjb3BlLiR3YXRjaCgnY2hlY2twb2ludC5vcHRpb25zU3RyaW5nJywgZnVuY3Rpb24gKGpzb24pIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY2hlY2twb2ludC5vcHRpb25zID0gSlNPTi5wYXJzZShqc29uKTtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLndlbGxGb3JtZWRPcHRpb25zID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgdXBkYXRlT3B0aW9uc1VJKGpzb24pO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLndlbGxGb3JtZWRPcHRpb25zID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgdHJ1ZSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTeW5jIE9iamVjdCBhbmQgU3RyaW5nIHJlcHJlc2VudGF0aW9uXG4gICAgICAgIC8vXG4gICAgICAgIGZ1bmN0aW9uIHN5bmNEYXRhc2V0KCkge1xuICAgICAgICAgICAgJHNjb3BlLiR3YXRjaCgnY2hlY2twb2ludC5kYXRhc2V0JywgZnVuY3Rpb24gKGpzb24pIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUuY2hlY2twb2ludC5kYXRhc2V0U3RyaW5nID0gJGZpbHRlcignanNvbicpKGpzb24pO1xuICAgICAgICAgICAgICAgIG9wZGF0ZU9wdGlvbnMoKTtcbiAgICAgICAgICAgIH0sIHRydWUpO1xuXG4gICAgICAgICAgICAkc2NvcGUuJHdhdGNoKCdjaGVja3BvaW50LmRhdGFzZXRTdHJpbmcnLCBmdW5jdGlvbiAoanNvbikge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5jaGVja3BvaW50LmRhdGFzZXQgPSBKU09OLnBhcnNlKGpzb24pO1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUud2VsbEZvcm1lZERhdGFzZXQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLndlbGxGb3JtZWREYXRhc2V0ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgdHJ1ZSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBZGQgdGltZXN0YW1wIHRvIG9wdGlvbnMgdG8gcmVkcmF3XG4gICAgICAgIC8vXG4gICAgICAgIGZ1bmN0aW9uIG9wZGF0ZU9wdGlvbnMoKSB7XG4gICAgICAgICAgICAvLyBJcyBjYWxsZWQgdG8gb2Z0ZW4sIG5vdCBvbmx5IG9uIHJlc2l6ZVxuICAgICAgICAgICAgaWYgKCRzY29wZS5jaGVja3BvaW50ICYmICRzY29wZS5jaGVja3BvaW50Lm9wdGlvbnMpIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUuY2hlY2twb2ludC5vcHRpb25zLnVwZGF0ZWQgPSBuZXcgRGF0ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gVHJpZ2dlciBuZXcgcmVuZGVyIG9uIHJlc2l6ZVxuICAgICAgICAvL1xuICAgICAgICBmdW5jdGlvbiB1cGRhdGVPblJlc2l6ZSgpIHtcbiAgICAgICAgICAgIHZhciBteUVsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2hhcnRBcmVhJyk7XG4gICAgICAgICAgICBhZGRSZXNpemVMaXN0ZW5lcihteUVsZW1lbnQsIG9wZGF0ZU9wdGlvbnMpO1xuXG4gICAgICAgICAgICAkc2NvcGUuJG9uKFwiJGRlc3Ryb3lcIiwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJlbW92ZVJlc2l6ZUxpc3RlbmVyKG15RWxlbWVudCwgb3BkYXRlT3B0aW9ucyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgfVxuXG4gICAgYW5ndWxhclxuICAgICAgICAubW9kdWxlKCdncmFmaWRkbGUnKVxuICAgICAgICAuY29udHJvbGxlcignRWRpdG9yQ29udHJvbGxlcicsIEVkaXRvckNvbnRyb2xsZXIpO1xuXG59KSgpO1xuIiwiKGZ1bmN0aW9uICgpIHtcblxuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGZ1bmN0aW9uIHN0YXRlc0NvbmZpZ3VyYXRpb24oJHN0YXRlUHJvdmlkZXIsICR1cmxSb3V0ZXJQcm92aWRlciwgJGxvY2F0aW9uUHJvdmlkZXIpIHtcblxuICAgICAgICAkc3RhdGVQcm92aWRlclxuICAgICAgICAgICAgLnN0YXRlKCc0MDQnLCB7XG4gICAgICAgICAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAgICAgICAgICAgY29udGVudDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdjb21wb25lbnRzL2NvbW1vbi80MDQvNDA0Lmh0bWwnXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLnN0YXRlKCdlbWJlZCcsIHtcbiAgICAgICAgICAgICAgICB1cmw6ICcvOmlkL2VtYmVkJyxcbiAgICAgICAgICAgICAgICB2aWV3czoge1xuICAgICAgICAgICAgICAgICAgICBjb250ZW50OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ2NvbXBvbmVudHMvZW1iZWQvZW1iZWQuaHRtbCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250cm9sbGVyOiAnRW1iZWRDb250cm9sbGVyJ1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5zdGF0ZSgndHJlZScsIHtcbiAgICAgICAgICAgICAgICB1cmw6ICcvOmlkL3RyZWUnLFxuICAgICAgICAgICAgICAgIHZpZXdzOiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnY29tcG9uZW50cy90cmVlL3RyZWUuaHRtbCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250cm9sbGVyOiAnVHJlZUNvbnRyb2xsZXInXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLnN0YXRlKCdlZGl0b3InLCB7XG4gICAgICAgICAgICAgICAgdXJsOiAnLzppZCcsXG4gICAgICAgICAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAgICAgICAgICAgY29udGVudDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdjb21wb25lbnRzL2VkaXRvci9lZGl0b3IuaHRtbCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250cm9sbGVyOiAnRWRpdG9yQ29udHJvbGxlcidcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIC8qIEBuZ0luamVjdCAqL1xuICAgICAgICAkdXJsUm91dGVyUHJvdmlkZXIub3RoZXJ3aXNlKGZ1bmN0aW9uICgkaW5qZWN0b3IsICRsb2NhdGlvbikge1xuICAgICAgICAgICAgLy8gVXNlclNlcnZpY2UgJiAkc3RhdGUgbm90IGF2YWlsYWJsZSBkdXJpbmcgLmNvbmZpZygpLCBpbmplY3QgdGhlbSAobWFudWFsbHkpIGxhdGVyXG5cbiAgICAgICAgICAgIC8vIHJlcXVlc3RpbmcgdW5rbm93biBwYWdlIHVuZXF1YWwgdG8gJy8nXG4gICAgICAgICAgICB2YXIgcGF0aCA9ICRsb2NhdGlvbi5wYXRoKCk7XG4gICAgICAgICAgICBpZiAocGF0aCAhPT0gJy8nKSB7XG4gICAgICAgICAgICAgICAgJGluamVjdG9yLmdldCgnJHN0YXRlJykuZ28oJzQwNCcpO1xuICAgICAgICAgICAgICAgIHJldHVybiBwYXRoOyAvLyB0aGlzIHRyaWNrIGFsbG93cyB0byBzaG93IHRoZSBlcnJvciBwYWdlIG9uIHVua25vd24gYWRkcmVzc1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gJy9uZXcnO1xuICAgICAgICB9KTtcblxuICAgICAgICAkbG9jYXRpb25Qcm92aWRlclxuICAgICAgICAgICAgLmh0bWw1TW9kZSh0cnVlKVxuICAgICAgICAgICAgLmhhc2hQcmVmaXgoJyEnKTtcbiAgICB9XG5cblxuICAgIGFuZ3VsYXJcbiAgICAgICAgLm1vZHVsZSgnZ3JhZmlkZGxlJylcbiAgICAgICAgLmNvbmZpZyhzdGF0ZXNDb25maWd1cmF0aW9uKTtcblxufSkoKTsiLCIoZnVuY3Rpb24oKXtcblxuICAgIHZhciBhdHRhY2hFdmVudCA9IGRvY3VtZW50LmF0dGFjaEV2ZW50O1xuICAgIHZhciBpc0lFID0gbmF2aWdhdG9yLnVzZXJBZ2VudC5tYXRjaCgvVHJpZGVudC8pO1xuICAgIHZhciByZXF1ZXN0RnJhbWUgPSAoZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIHJhZiA9IHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHwgd2luZG93Lm1velJlcXVlc3RBbmltYXRpb25GcmFtZSB8fCB3aW5kb3cud2Via2l0UmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG4gICAgICAgICAgICBmdW5jdGlvbihmbil7IHJldHVybiB3aW5kb3cuc2V0VGltZW91dChmbiwgMjApOyB9O1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24oZm4peyByZXR1cm4gcmFmKGZuKTsgfTtcbiAgICB9KSgpO1xuXG4gICAgdmFyIGNhbmNlbEZyYW1lID0gKGZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciBjYW5jZWwgPSB3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUgfHwgd2luZG93Lm1vekNhbmNlbEFuaW1hdGlvbkZyYW1lIHx8IHdpbmRvdy53ZWJraXRDYW5jZWxBbmltYXRpb25GcmFtZSB8fFxuICAgICAgICAgICAgd2luZG93LmNsZWFyVGltZW91dDtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKGlkKXsgcmV0dXJuIGNhbmNlbChpZCk7IH07XG4gICAgfSkoKTtcblxuICAgIGZ1bmN0aW9uIHJlc2l6ZUxpc3RlbmVyKGUpe1xuICAgICAgICB2YXIgd2luID0gZS50YXJnZXQgfHwgZS5zcmNFbGVtZW50O1xuICAgICAgICBpZiAod2luLl9fcmVzaXplUkFGX18pIGNhbmNlbEZyYW1lKHdpbi5fX3Jlc2l6ZVJBRl9fKTtcbiAgICAgICAgd2luLl9fcmVzaXplUkFGX18gPSByZXF1ZXN0RnJhbWUoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHZhciB0cmlnZ2VyID0gd2luLl9fcmVzaXplVHJpZ2dlcl9fO1xuICAgICAgICAgICAgdHJpZ2dlci5fX3Jlc2l6ZUxpc3RlbmVyc19fLmZvckVhY2goZnVuY3Rpb24oZm4pe1xuICAgICAgICAgICAgICAgIGZuLmNhbGwodHJpZ2dlciwgZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gb2JqZWN0TG9hZChlKXtcbiAgICAgICAgdGhpcy5jb250ZW50RG9jdW1lbnQuZGVmYXVsdFZpZXcuX19yZXNpemVUcmlnZ2VyX18gPSB0aGlzLl9fcmVzaXplRWxlbWVudF9fO1xuICAgICAgICB0aGlzLmNvbnRlbnREb2N1bWVudC5kZWZhdWx0Vmlldy5hZGRFdmVudExpc3RlbmVyKCdyZXNpemUnLCByZXNpemVMaXN0ZW5lcik7XG4gICAgfVxuXG4gICAgd2luZG93LmFkZFJlc2l6ZUxpc3RlbmVyID0gZnVuY3Rpb24oZWxlbWVudCwgZm4pe1xuICAgICAgICBpZiAoIWVsZW1lbnQuX19yZXNpemVMaXN0ZW5lcnNfXykge1xuICAgICAgICAgICAgZWxlbWVudC5fX3Jlc2l6ZUxpc3RlbmVyc19fID0gW107XG4gICAgICAgICAgICBpZiAoYXR0YWNoRXZlbnQpIHtcbiAgICAgICAgICAgICAgICBlbGVtZW50Ll9fcmVzaXplVHJpZ2dlcl9fID0gZWxlbWVudDtcbiAgICAgICAgICAgICAgICBlbGVtZW50LmF0dGFjaEV2ZW50KCdvbnJlc2l6ZScsIHJlc2l6ZUxpc3RlbmVyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChnZXRDb21wdXRlZFN0eWxlKGVsZW1lbnQpLnBvc2l0aW9uID09ICdzdGF0aWMnKSBlbGVtZW50LnN0eWxlLnBvc2l0aW9uID0gJ3JlbGF0aXZlJztcbiAgICAgICAgICAgICAgICB2YXIgb2JqID0gZWxlbWVudC5fX3Jlc2l6ZVRyaWdnZXJfXyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ29iamVjdCcpO1xuICAgICAgICAgICAgICAgIG9iai5zZXRBdHRyaWJ1dGUoJ3N0eWxlJywgJ2Rpc3BsYXk6IGJsb2NrOyBwb3NpdGlvbjogYWJzb2x1dGU7IHRvcDogMDsgbGVmdDogMDsgaGVpZ2h0OiAxMDAlOyB3aWR0aDogMTAwJTsgb3ZlcmZsb3c6IGhpZGRlbjsgcG9pbnRlci1ldmVudHM6IG5vbmU7IHotaW5kZXg6IC0xOycpO1xuICAgICAgICAgICAgICAgIG9iai5fX3Jlc2l6ZUVsZW1lbnRfXyA9IGVsZW1lbnQ7XG4gICAgICAgICAgICAgICAgb2JqLm9ubG9hZCA9IG9iamVjdExvYWQ7XG4gICAgICAgICAgICAgICAgb2JqLnR5cGUgPSAndGV4dC9odG1sJztcbiAgICAgICAgICAgICAgICBpZiAoaXNJRSkgZWxlbWVudC5hcHBlbmRDaGlsZChvYmopO1xuICAgICAgICAgICAgICAgIG9iai5kYXRhID0gJ2Fib3V0OmJsYW5rJztcbiAgICAgICAgICAgICAgICBpZiAoIWlzSUUpIGVsZW1lbnQuYXBwZW5kQ2hpbGQob2JqKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbGVtZW50Ll9fcmVzaXplTGlzdGVuZXJzX18ucHVzaChmbik7XG4gICAgfTtcblxuICAgIHdpbmRvdy5yZW1vdmVSZXNpemVMaXN0ZW5lciA9IGZ1bmN0aW9uKGVsZW1lbnQsIGZuKXtcbiAgICAgICAgZWxlbWVudC5fX3Jlc2l6ZUxpc3RlbmVyc19fLnNwbGljZShlbGVtZW50Ll9fcmVzaXplTGlzdGVuZXJzX18uaW5kZXhPZihmbiksIDEpO1xuICAgICAgICBpZiAoIWVsZW1lbnQuX19yZXNpemVMaXN0ZW5lcnNfXy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGlmIChhdHRhY2hFdmVudCkgZWxlbWVudC5kZXRhY2hFdmVudCgnb25yZXNpemUnLCByZXNpemVMaXN0ZW5lcik7XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBlbGVtZW50Ll9fcmVzaXplVHJpZ2dlcl9fLmNvbnRlbnREb2N1bWVudC5kZWZhdWx0Vmlldy5yZW1vdmVFdmVudExpc3RlbmVyKCdyZXNpemUnLCByZXNpemVMaXN0ZW5lcik7XG4gICAgICAgICAgICAgICAgZWxlbWVudC5fX3Jlc2l6ZVRyaWdnZXJfXyA9ICFlbGVtZW50LnJlbW92ZUNoaWxkKGVsZW1lbnQuX19yZXNpemVUcmlnZ2VyX18pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIFxufSkoKTsiLCIoZnVuY3Rpb24gKCkge1xuXG4gICAgZnVuY3Rpb24gQXBwQ29udHJvbGxlcigkc2NvcGUpIHtcblxuICAgICAgICAkc2NvcGUubWV0YWRhdGEgPSB7fTtcbiAgICAgICAgJHNjb3BlLm1ldGFkYXRhLnBhZ2VUaXRsZSA9ICdTaGFyZSB5b3VyIHZpc3VhbGl6YXRpb25zIG9uIGdyYWZpZGRsZSc7XG4gICAgICAgICRzY29wZS5tZXRhZGF0YS5vZyA9IHtcbiAgICAgICAgICAgICdvZzp0eXBlJzogJ2FydGljbGUnLFxuICAgICAgICAgICAgJ2FydGljbGU6c2VjdGlvbic6ICdTaGFyYWJsZSBkYXRhIHZpc3VhbGl6YXRpb24nLFxuICAgICAgICAgICAgJ29nOnRpdGxlJzogJ1NoYXJlIHlvdXIgdmlzdWFsaXphdGlvbnMgb24gZ3JhZmlkZGxlJyxcbiAgICAgICAgICAgICdvZzppbWFnZSc6ICcnLFxuICAgICAgICAgICAgJ29nOmRlc2NyaXB0aW9uJzogJ1NoYXJhYmxlIGRhdGEgdmlzdWFsaXphdGlvbidcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBhbmd1bGFyXG4gICAgICAgIC5tb2R1bGUoJ2dyYWZpZGRsZScpXG4gICAgICAgIC5jb250cm9sbGVyKCdBcHBDb250cm9sbGVyJywgQXBwQ29udHJvbGxlcik7XG5cbn0pKCk7XG4iLCIoZnVuY3Rpb24gKCkge1xuXG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgZnVuY3Rpb24gQ2hlY2twb2ludEVuZHBvaW50KCRyZXNvdXJjZSwgRU5WKSB7XG4gICAgICAgIHJldHVybiAkcmVzb3VyY2UoRU5WLmFwaSArICdjaGVja3BvaW50LzppZCcsIHtcbiAgICAgICAgICAgIGlkOiAnQGlkJ1xuICAgICAgICB9LCB7XG4gICAgICAgICAgICBzYXZlOiB7XG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZXQ6IHtcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdHRVQnXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGFuZ3VsYXJcbiAgICAgICAgLm1vZHVsZSgnZ3JhZmlkZGxlJylcbiAgICAgICAgLmZhY3RvcnkoJ0NoZWNrcG9pbnRFbmRwb2ludCcsIENoZWNrcG9pbnRFbmRwb2ludCk7XG5cbn0pKCk7XG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=