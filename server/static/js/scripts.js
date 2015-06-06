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
                        delete $scope.checkpoint.dataset;
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
            $scope.fiddleEmbedCode = '<iframe width="100%" height="300" src="//grafiddle.appspot.com/' + $state.params.id + '/embed" allowfullscreen="allowfullscreen" frameborder="0"></iframe>';
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
            var options = {
                "data": dataset,
                "dimensions": {
                    first: {
                        "key": "first",
                        "type": "bar",
                        "color": "green"
                    },
                    second: {
                        "key": "second",
                        "type": "bar",
                        "color": "orange"
                    },
                    third: {
                        "key": "third",
                        "type": "bar",
                        "color": "blue"
                    },
                    fouth: {
                        "key": "fouth",
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

            $scope.checkpoint.datasetString = '';
            $scope.checkpoint.dataset = dataset;
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
            $scope.$watch('checkpoint.options', function (options) {
                var toParse = {
                    dimensions: options.dimensions,
                    chart: options.chart,
                    state: options.state
                };
                $scope.checkpoint.optionsString = $filter('json')(toParse);
            }, true);

            $scope.$watch('checkpoint.optionsString', function (json) {
                try {
                    var parsed = JSON.parse(json);
                    parsed.data = $scope.checkpoint.dataset;
                    $scope.checkpoint.options = parsed;
                    console.log($scope.checkpoint.options);
                    $scope.wellFormedOptions = true;
                    //updateOptionsUI(json);
                } catch (e) {
                    $scope.wellFormedOptions = false;
                }
            }, true);
        }

        // Sync Object and String representation
        //
        function syncDataset() {
            $scope.$watch('checkpoint.dataset', function (json) {
                console.log('update dataset string');
                $scope.checkpoint.datasetString = $filter('json')(json);
                //opdateOptions();
            }, true);

            $scope.$watch('checkpoint.datasetString', function (json) {
                console.log('update dataset object');
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImNvbW1vbi9vbi1yZWFkLWZpbGUvb24tcmVhZC1maWxlLWRpcmVjdGl2ZS5qcyIsInRyZWUvdHJlZS1lbmRwb2ludC5qcyIsInRyZWUvdHJlZS1jb250cm9sbGVyLmpzIiwiZW1iZWQvZW1iZWQtY29udHJvbGxlci5qcyIsImVkaXRvci9lZGl0b3ItY29udHJvbGxlci5qcyIsImNvbW1vbi9zdGF0ZXMuY29uZmlnLmpzIiwiY29tbW9uL29ucmVzaXplLmpzIiwiY29tbW9uL2FwcC1jb250cm9sbGVyLmpzIiwiY2hlY2twb2ludC9jaGVja3BvaW50LWVuZHBvaW50LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLENBQUMsWUFBWTs7RUFFWDs7RUFFQTtLQUNHLE9BQU8sYUFBYTtNQUNuQjtNQUNBO01BQ0E7TUFDQTtNQUNBO01BQ0E7TUFDQTtNQUNBOzs7O0FBSU47QUNqQkEsQ0FBQyxZQUFZOztJQUVUOzs7Ozs7Ozs7Ozs7Ozs7SUFlQSxTQUFTLFdBQVcsUUFBUTtRQUN4QixPQUFPO1lBQ0gsVUFBVTtZQUNWLE9BQU87WUFDUCxNQUFNLFNBQVMsT0FBTyxTQUFTLE9BQU87Z0JBQ2xDLElBQUksS0FBSyxPQUFPLE1BQU07O2dCQUV0QixRQUFRLEdBQUcsVUFBVSxTQUFTLGVBQWU7b0JBQ3pDLElBQUksU0FBUyxJQUFJOztvQkFFakIsT0FBTyxTQUFTLFNBQVMsYUFBYTt3QkFDbEMsTUFBTSxPQUFPLFdBQVc7NEJBQ3BCLEdBQUcsT0FBTyxDQUFDLGFBQWEsWUFBWSxPQUFPOzs7O29CQUluRCxPQUFPLFdBQVcsQ0FBQyxjQUFjLGNBQWMsY0FBYyxRQUFRLE1BQU07Ozs7Ozs7SUFNM0Y7U0FDSyxPQUFPO1NBQ1AsVUFBVSxjQUFjOzs7QUFHakM7QUM1Q0EsQ0FBQyxZQUFZOztJQUVUOztJQUVBLFNBQVMsYUFBYSxXQUFXLEtBQUs7UUFDbEMsT0FBTyxVQUFVLElBQUksTUFBTSxZQUFZO1lBQ25DLElBQUk7V0FDTDtZQUNDLEtBQUs7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QUksTUFBTSxrQkFBa0I7WUFDekMsSUFBSTtXQUNMO1lBQ0MsTUFBTTtnQkFDRixRQUFROztZQUVaLEtBQUs7Z0JBQ0QsUUFBUTs7Ozs7O0lBS3BCO1NBQ0ssT0FBTztTQUNQLFFBQVEsc0JBQXNCOzs7QUFHdkMiLCJmaWxlIjoic2NyaXB0cy5qcyIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiAoKSB7XG5cbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIGFuZ3VsYXJcbiAgICAubW9kdWxlKCdncmFmaWRkbGUnLCBbXG4gICAgICAnZ3JhZmlkZGxlLmNvbmZpZycsXG4gICAgICAnZ3JhZmlkZGxlLnRlbXBsYXRlcycsXG4gICAgICAnbmdSZXNvdXJjZScsXG4gICAgICAnbmdTYW5pdGl6ZScsXG4gICAgICAndWkucm91dGVyJyxcbiAgICAgICd1aS5sYXlvdXQnLFxuICAgICAgJ3VpLmFjZScsXG4gICAgICAnYW5ndWxhckNoYXJ0J1xuICAgIF0pO1xuXG59KSgpO1xuIiwiKGZ1bmN0aW9uICgpIHtcblxuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIC8qKlxuICAgICAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAgICAgKiBAbmFtZSBncmFmaWRkbGUuZGlyZWN0aXZlOm9uUmVhZEZpbGVcbiAgICAgKiBAcmVxdWlyZXMgJHBhcnNlXG4gICAgICogQHJlcXVpcmVzICRsb2dcbiAgICAgKiBAcmVzdHJpY3QgQVxuICAgICAqXG4gICAgICogQGRlc2NyaXB0aW9uXG4gICAgICogVGhlIGBvblJlYWRGaWxlYCBkaXJlY3RpdmUgb3BlbnMgdXAgYSBGaWxlUmVhZGVyIGRpYWxvZyB0byB1cGxvYWQgZmlsZXMgZnJvbSB0aGUgbG9jYWwgZmlsZXN5c3RlbS5cbiAgICAgKlxuICAgICAqIEBlbGVtZW50IEFOWVxuICAgICAqIEBuZ0luamVjdFxuICAgICAqL1xuICAgIGZ1bmN0aW9uIG9uUmVhZEZpbGUoJHBhcnNlKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByZXN0cmljdDogJ0EnLFxuICAgICAgICAgICAgc2NvcGU6IGZhbHNlLFxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XG4gICAgICAgICAgICAgICAgdmFyIGZuID0gJHBhcnNlKGF0dHJzLm9uUmVhZEZpbGUpO1xuXG4gICAgICAgICAgICAgICAgZWxlbWVudC5vbignY2hhbmdlJywgZnVuY3Rpb24ob25DaGFuZ2VFdmVudCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcblxuICAgICAgICAgICAgICAgICAgICByZWFkZXIub25sb2FkID0gZnVuY3Rpb24ob25Mb2FkRXZlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLiRhcHBseShmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmbihzY29wZSwgeyRmaWxlQ29udGVudDpvbkxvYWRFdmVudC50YXJnZXQucmVzdWx0fSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgICAgICByZWFkZXIucmVhZEFzVGV4dCgob25DaGFuZ2VFdmVudC5zcmNFbGVtZW50IHx8IG9uQ2hhbmdlRXZlbnQudGFyZ2V0KS5maWxlc1swXSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgYW5ndWxhclxuICAgICAgICAubW9kdWxlKCdncmFmaWRkbGUnKVxuICAgICAgICAuZGlyZWN0aXZlKCdvblJlYWRGaWxlJywgb25SZWFkRmlsZSk7XG5cbn0pKCk7XG4iLCIoZnVuY3Rpb24gKCkge1xuXG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgZnVuY3Rpb24gVHJlZUVuZHBvaW50KCRyZXNvdXJjZSwgRU5WKSB7XG4gICAgICAgIHJldHVybiAkcmVzb3VyY2UoRU5WLmFwaSArICd0cmVlLzppZCcsIHtcbiAgICAgICAgICAgIGlkOiAnQGlkJ1xuICAgICAgICB9LCB7XG4gICAgICAgICAgICBnZXQ6IHtcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgICAgIGlzQXJyYXk6IHRydWVcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgYW5ndWxhclxuICAgICAgICAubW9kdWxlKCdncmFmaWRkbGUnKVxuICAgICAgICAuZmFjdG9yeSgnVHJlZUVuZHBvaW50JywgVHJlZUVuZHBvaW50KTtcblxufSkoKTtcbiIsIihmdW5jdGlvbiAoKSB7XG5cbiAgICBmdW5jdGlvbiBUcmVlQ29udHJvbGxlcigkc2NvcGUsICRzdGF0ZSwgQ2hlY2twb2ludEVuZHBvaW50LCBUcmVlRW5kcG9pbnQpIHtcbiAgICAgICAgdmFyIHRyZWVEYXRhID0gW107XG4gICAgICAgICRzY29wZS5jaGVja3BvaW50ID0ge1xuICAgICAgICAgICAgaWQ6ICRzdGF0ZS5wYXJhbXMuaWRcbiAgICAgICAgfTtcblxuICAgICAgICBDaGVja3BvaW50RW5kcG9pbnRcbiAgICAgICAgICAgIC5nZXQoe2lkOiAkc3RhdGUucGFyYW1zLmlkfSlcbiAgICAgICAgICAgIC4kcHJvbWlzZVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oY2hlY2twb2ludCkge1xuICAgICAgICAgICAgICAgICRzY29wZS5jaGVja3BvaW50ID0gY2hlY2twb2ludDtcbiAgICAgICAgICAgICAgICBUcmVlRW5kcG9pbnRcbiAgICAgICAgICAgICAgICAgICAgLmdldCh7aWQ6IGNoZWNrcG9pbnQudHJlZX0pXG4gICAgICAgICAgICAgICAgICAgIC4kcHJvbWlzZVxuICAgICAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbih0cmVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0cmVlRGF0YSA9IGNvbnZlcnRUcmVlKHRyZWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZHJhdygpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIGZ1bmN0aW9uIGNvbnZlcnRUcmVlKHRyZWUpIHtcbiAgICAgICAgICAgIC8vIGZpbmQgYmFzZVxuICAgICAgICAgICAgdmFyIGJhc2UgPSB7fTtcbiAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaCh0cmVlLCBmdW5jdGlvbihub2RlKSB7XG4gICAgICAgICAgICAgICAgaWYgKG5vZGUuYmFzZSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICBiYXNlID0gbm9kZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgdmFyIHRyZWVEYXRhID0gW107XG4gICAgICAgICAgICB0cmVlRGF0YS5wdXNoKGJhc2UpO1xuICAgICAgICAgICAgYWRkQ2hpbGRyZW4oYmFzZSwgdHJlZSk7XG5cbiAgICAgICAgICAgIHJldHVybiB0cmVlRGF0YVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gYWRkQ2hpbGRyZW4oYmFzZSwgdHJlZSkge1xuICAgICAgICAgICAgYmFzZS5jaGlsZHJlbiA9IFtdO1xuICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKHRyZWUsIGZ1bmN0aW9uKG5vZGUpIHtcbiAgICAgICAgICAgICAgICBpZiAobm9kZS5iYXNlID09PSBiYXNlLmlkKSB7XG4gICAgICAgICAgICAgICAgICAgIGJhc2UuY2hpbGRyZW4ucHVzaChub2RlKTtcbiAgICAgICAgICAgICAgICAgICAgYWRkQ2hpbGRyZW4obm9kZSwgdHJlZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGNsaWNrKGQpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGQpO1xuICAgICAgICAgICAgJHN0YXRlLmdvKCdlZGl0b3InLCB7aWQ6IGQuaWR9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGRyYXcoKSB7XG5cbiAgICAgICAgICAgIC8vICoqKioqKioqKioqKioqIEdlbmVyYXRlIHRoZSB0cmVlIGRpYWdyYW1cdCAqKioqKioqKioqKioqKioqKlxuICAgICAgICAgICAgdmFyIG1hcmdpbiA9IHt0b3A6IDQwLCByaWdodDogMCwgYm90dG9tOiAyMCwgbGVmdDogMH0sXG4gICAgICAgICAgICAgICAgd2lkdGggPSA5MDAgLSBtYXJnaW4ucmlnaHQgLSBtYXJnaW4ubGVmdCxcbiAgICAgICAgICAgICAgICBoZWlnaHQgPSA3MDAgLSBtYXJnaW4udG9wIC0gbWFyZ2luLmJvdHRvbTtcblxuICAgICAgICAgICAgdmFyIGkgPSAwO1xuXG4gICAgICAgICAgICB2YXIgdHJlZSA9IGQzLmxheW91dC50cmVlKClcbiAgICAgICAgICAgICAgICAuc2l6ZShbaGVpZ2h0LCB3aWR0aF0pO1xuXG4gICAgICAgICAgICB2YXIgZGlhZ29uYWwgPSBkMy5zdmcuZGlhZ29uYWwoKVxuICAgICAgICAgICAgICAgIC5wcm9qZWN0aW9uKGZ1bmN0aW9uKGQpIHsgcmV0dXJuIFtkLngsIGQueV07IH0pO1xuXG4gICAgICAgICAgICB2YXIgc3ZnID0gZDMuc2VsZWN0KFwiI3RyZWVcIikuYXBwZW5kKFwic3ZnXCIpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJ3aWR0aFwiLCB3aWR0aCArIG1hcmdpbi5yaWdodCArIG1hcmdpbi5sZWZ0KVxuICAgICAgICAgICAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIGhlaWdodCArIG1hcmdpbi50b3AgKyBtYXJnaW4uYm90dG9tKVxuICAgICAgICAgICAgICAgIC5hcHBlbmQoXCJnXCIpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoXCIgKyBtYXJnaW4ubGVmdCArIFwiLFwiICsgbWFyZ2luLnRvcCArIFwiKVwiKTtcblxuICAgICAgICAgICAgcm9vdCA9IHRyZWVEYXRhWzBdO1xuXG4gICAgICAgICAgICB1cGRhdGUocm9vdCk7XG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIHVwZGF0ZShzb3VyY2UpIHtcblxuICAgICAgICAgICAgICAgIC8vIENvbXB1dGUgdGhlIG5ldyB0cmVlIGxheW91dC5cbiAgICAgICAgICAgICAgICB2YXIgbm9kZXMgPSB0cmVlLm5vZGVzKHJvb3QpLnJldmVyc2UoKSxcbiAgICAgICAgICAgICAgICAgICAgbGlua3MgPSB0cmVlLmxpbmtzKG5vZGVzKTtcblxuICAgICAgICAgICAgICAgIC8vIE5vcm1hbGl6ZSBmb3IgZml4ZWQtZGVwdGguXG4gICAgICAgICAgICAgICAgbm9kZXMuZm9yRWFjaChmdW5jdGlvbihkKSB7IGQueSA9IGQuZGVwdGggKiAxMDA7IH0pO1xuXG4gICAgICAgICAgICAgICAgLy8gRGVjbGFyZSB0aGUgbm9kZXPigKZcbiAgICAgICAgICAgICAgICB2YXIgbm9kZSA9IHN2Zy5zZWxlY3RBbGwoXCJnLm5vZGVcIilcbiAgICAgICAgICAgICAgICAgICAgLmRhdGEobm9kZXMsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQuaWQgfHwgKGQuaWQgPSArK2kpOyB9KTtcblxuICAgICAgICAgICAgICAgIC8vIEVudGVyIHRoZSBub2Rlcy5cbiAgICAgICAgICAgICAgICB2YXIgbm9kZUVudGVyID0gbm9kZS5lbnRlcigpLmFwcGVuZChcImdcIilcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcIm5vZGVcIilcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwidHJhbnNsYXRlKFwiICsgZC54ICsgXCIsXCIgKyBkLnkgKyBcIilcIjsgfSlcbiAgICAgICAgICAgICAgICAgICAgLm9uKFwiY2xpY2tcIiwgY2xpY2spOztcblxuICAgICAgICAgICAgICAgIG5vZGVFbnRlci5hcHBlbmQoXCJjaXJjbGVcIilcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoXCJyXCIsIDEwKVxuICAgICAgICAgICAgICAgICAgICAuc3R5bGUoXCJmaWxsXCIsIFwiI2ZmZlwiKTtcblxuICAgICAgICAgICAgICAgIG5vZGVFbnRlci5hcHBlbmQoXCJ0ZXh0XCIpXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKFwieVwiLCBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZC5jaGlsZHJlbiB8fCBkLl9jaGlsZHJlbiA/IC0xOCA6IDE4OyB9KVxuICAgICAgICAgICAgICAgICAgICAuYXR0cihcImR5XCIsIFwiLjM1ZW1cIilcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoXCJ0ZXh0LWFuY2hvclwiLCBcIm1pZGRsZVwiKVxuICAgICAgICAgICAgICAgICAgICAudGV4dChmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgdGV4dCA9IGQudGl0bGU7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyArICcgYnkgJyArIGQuYXV0aG9yO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGQuaWQgPT0gJHNjb3BlLmNoZWNrcG9pbnQuaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZXh0ICs9ICcgKGN1cnJlbnQpJztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0ZXh0O1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAuc3R5bGUoXCJmaWxsLW9wYWNpdHlcIiwgMSk7XG5cbiAgICAgICAgICAgICAgICAvLyBEZWNsYXJlIHRoZSBsaW5rc+KAplxuICAgICAgICAgICAgICAgIHZhciBsaW5rID0gc3ZnLnNlbGVjdEFsbChcInBhdGgubGlua1wiKVxuICAgICAgICAgICAgICAgICAgICAuZGF0YShsaW5rcywgZnVuY3Rpb24oZCkgeyByZXR1cm4gZC50YXJnZXQuaWQ7IH0pO1xuXG4gICAgICAgICAgICAgICAgLy8gRW50ZXIgdGhlIGxpbmtzLlxuICAgICAgICAgICAgICAgIGxpbmsuZW50ZXIoKS5pbnNlcnQoXCJwYXRoXCIsIFwiZ1wiKVxuICAgICAgICAgICAgICAgICAgICAuYXR0cihcImNsYXNzXCIsIFwibGlua1wiKVxuICAgICAgICAgICAgICAgICAgICAuYXR0cihcImRcIiwgZGlhZ29uYWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgYW5ndWxhclxuICAgICAgICAubW9kdWxlKCdncmFmaWRkbGUnKVxuICAgICAgICAuY29udHJvbGxlcignVHJlZUNvbnRyb2xsZXInLCBUcmVlQ29udHJvbGxlcik7XG5cbn0pKCk7IiwiKGZ1bmN0aW9uICgpIHtcblxuICAgIGZ1bmN0aW9uIEVtYmVkQ29udHJvbGxlcigkc2NvcGUsICRzdGF0ZSwgJGZpbHRlciwgJGxvY2F0aW9uLCAkdGltZW91dCwgQ2hlY2twb2ludEVuZHBvaW50KSB7XG5cbiAgICAgICAgJHNjb3BlLmNoZWNrcG9pbnQgPSB7fTtcblxuICAgICAgICBhY3RpdmF0ZSgpO1xuXG4gICAgICAgIC8vXG5cbiAgICAgICAgZnVuY3Rpb24gYWN0aXZhdGUoKSB7XG5cbiAgICAgICAgICAgIGlmICgkc3RhdGUucGFyYW1zLmlkKSB7XG4gICAgICAgICAgICAgICAgQ2hlY2twb2ludEVuZHBvaW50XG4gICAgICAgICAgICAgICAgICAgIC5nZXQoe2lkOiAkc3RhdGUucGFyYW1zLmlkfSlcbiAgICAgICAgICAgICAgICAgICAgLiRwcm9taXNlXG4gICAgICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKGNoZWNrcG9pbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5zZXJ2ZXJDaGVja3BvaW50ID0gY2hlY2twb2ludDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNldENoZWNrcG9pbnQoY2hlY2twb2ludCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAkdGltZW91dChzYXZlQXNJbWFnZSwgMCk7XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIC5jYXRjaChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICAgICAgJHN0YXRlLmdvKCdlZGl0b3InLCB7aWQ6ICcnfSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBsb2FkRGVmYXVsdERhdGEoKTtcbiAgICAgICAgICAgICAgICAkdGltZW91dChzYXZlQXNJbWFnZSwgMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzeW5jT3B0aW9ucygpO1xuICAgICAgICAgICAgc3luY0RhdGFzZXQoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHNhdmVBc0ltYWdlKCkge1xuICAgICAgICAgICAgLy9jYW52Zyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2FudmFzJyksIGQzLnNlbGVjdChcIi5hbmd1bGFyY2hhcnRcIikubm9kZSgpLmlubmVySFRNTCk7XG4gICAgICAgICAgICAvLyRzY29wZS5hc0ltYWdlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NhbnZhcycpLnRvRGF0YVVSTCgpO1xuICAgICAgICAgICAgLy8kc2NvcGUubWV0YWRhdGEub2dbJ29nOmltYWdlJ10gPSAkc2NvcGUuYXNJbWFnZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHNldENoZWNrcG9pbnQoY2hlY2twb2ludCkge1xuICAgICAgICAgICAgJHNjb3BlLmNoZWNrcG9pbnQuZGF0YXNldFN0cmluZyA9ICcnO1xuICAgICAgICAgICAgJHNjb3BlLmNoZWNrcG9pbnQuZGF0YXNldCA9IGNoZWNrcG9pbnQuZGF0YTtcbiAgICAgICAgICAgICRzY29wZS5jaGVja3BvaW50LnNjaGVtYVN0cmluZyA9ICcnO1xuICAgICAgICAgICAgJHNjb3BlLmNoZWNrcG9pbnQuc2NoZW1hID0ge307XG4gICAgICAgICAgICAkc2NvcGUuY2hlY2twb2ludC5vcHRpb25zU3RyaW5nID0gJyc7XG4gICAgICAgICAgICAkc2NvcGUuY2hlY2twb2ludC5vcHRpb25zID0gY2hlY2twb2ludC5vcHRpb25zO1xuICAgICAgICAgICAgJHNjb3BlLnRpdGxlID0gY2hlY2twb2ludC50aXRsZTtcbiAgICAgICAgICAgICRzY29wZS5hdXRob3IgPSBjaGVja3BvaW50LmF1dGhvcjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFN5bmMgT2JqZWN0IGFuZCBTdHJpbmcgcmVwcmVzZW50YXRpb25cbiAgICAgICAgLy9cbiAgICAgICAgZnVuY3Rpb24gc3luY09wdGlvbnMoKSB7XG4gICAgICAgICAgICAkc2NvcGUuJHdhdGNoKCdjaGVja3BvaW50Lm9wdGlvbnMnLCBmdW5jdGlvbiAoanNvbikge1xuICAgICAgICAgICAgICAgICRzY29wZS5jaGVja3BvaW50Lm9wdGlvbnNTdHJpbmcgPSAkZmlsdGVyKCdqc29uJykoanNvbik7XG4gICAgICAgICAgICB9LCB0cnVlKTtcblxuICAgICAgICAgICAgJHNjb3BlLiR3YXRjaCgnY2hlY2twb2ludC5vcHRpb25zU3RyaW5nJywgZnVuY3Rpb24gKGpzb24pIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY2hlY2twb2ludC5vcHRpb25zID0gSlNPTi5wYXJzZShqc29uKTtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLndlbGxGb3JtZWRPcHRpb25zID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgdXBkYXRlT3B0aW9uc1VJKGpzb24pO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLndlbGxGb3JtZWRPcHRpb25zID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgdHJ1ZSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTeW5jIE9iamVjdCBhbmQgU3RyaW5nIHJlcHJlc2VudGF0aW9uXG4gICAgICAgIC8vXG4gICAgICAgIGZ1bmN0aW9uIHN5bmNEYXRhc2V0KCkge1xuICAgICAgICAgICAgJHNjb3BlLiR3YXRjaCgnY2hlY2twb2ludC5kYXRhc2V0JywgZnVuY3Rpb24gKGpzb24pIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUuY2hlY2twb2ludC5kYXRhc2V0U3RyaW5nID0gJGZpbHRlcignanNvbicpKGpzb24pO1xuICAgICAgICAgICAgICAgIG9wZGF0ZU9wdGlvbnMoKTtcbiAgICAgICAgICAgIH0sIHRydWUpO1xuXG4gICAgICAgICAgICAkc2NvcGUuJHdhdGNoKCdjaGVja3BvaW50LmRhdGFzZXRTdHJpbmcnLCBmdW5jdGlvbiAoanNvbikge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5jaGVja3BvaW50LmRhdGFzZXQgPSBKU09OLnBhcnNlKGpzb24pO1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUud2VsbEZvcm1lZERhdGFzZXQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLndlbGxGb3JtZWREYXRhc2V0ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgdHJ1ZSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBZGQgdGltZXN0YW1wIHRvIG9wdGlvbnMgdG8gcmVkcmF3XG4gICAgICAgIC8vXG4gICAgICAgIGZ1bmN0aW9uIG9wZGF0ZU9wdGlvbnMoKSB7XG4gICAgICAgICAgICAvLyBJcyBjYWxsZWQgdG8gb2Z0ZW4sIG5vdCBvbmx5IG9uIHJlc2l6ZVxuICAgICAgICAgICAgaWYgKCRzY29wZS5jaGVja3BvaW50ICYmICRzY29wZS5jaGVja3BvaW50Lm9wdGlvbnMpIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUuY2hlY2twb2ludC5vcHRpb25zLnVwZGF0ZWQgPSBuZXcgRGF0ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cblxuICAgICAgICAkc2NvcGUuZW1iZWRWaWV3ID0gJ2NoYXJ0JztcbiAgICAgICAgdmFyIHJlcXVlc3RWaWV3ID0gJGxvY2F0aW9uLnNlYXJjaCgpLnZpZXc7XG4gICAgICAgIGlmKHJlcXVlc3RWaWV3KSB7XG4gICAgICAgICAgICAkc2NvcGUuZW1iZWRWaWV3ID0gcmVxdWVzdFZpZXc7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgICRzY29wZS5zZXRWaWV3ID0gZnVuY3Rpb24obmV3Vmlldykge1xuICAgICAgICAgICAgJHNjb3BlLmVtYmVkVmlldyA9IG5ld1ZpZXc7XG4gICAgICAgICAgICAkc2NvcGUub3B0aW9uc0VkaXRvci5yZXNpemUoKTtcbiAgICAgICAgICAgICRzY29wZS5kYXRhRWRpdG9yLnJlc2l6ZSgpO1xuICAgICAgICAgICAgJHNjb3BlLm9wdGlvbnNFZGl0b3IucmVuZGVyZXIudXBkYXRlRnVsbCgpO1xuICAgICAgICAgICAgJHNjb3BlLmRhdGFFZGl0b3IucmVuZGVyZXIudXBkYXRlRnVsbCgpO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5pc1ZpZXcgPSBmdW5jdGlvbih2aWV3KSB7XG4gICAgICAgICAgICByZXR1cm4gdmlldyA9PSAkc2NvcGUuZW1iZWRWaWV3O1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vJHNjb3BlLmRhdGFzZXRTdHJpbmcgPSAnJztcbiAgICAgICAgLy8kc2NvcGUuZGF0YXNldCA9IFtcbiAgICAgICAgLy8gICAge1xuICAgICAgICAvLyAgICAgICAgJ2RheSc6ICcyMDEzLTAxLTAyXzAwOjAwOjAwJyxcbiAgICAgICAgLy8gICAgICAgICdzYWxlcyc6IDM0NjEuMjk1MjAyLFxuICAgICAgICAvLyAgICAgICAgJ2luY29tZSc6IDEyMzY1LjA1M1xuICAgICAgICAvLyAgICB9LFxuICAgICAgICAvLyAgICB7XG4gICAgICAgIC8vICAgICAgICAnZGF5JzogJzIwMTMtMDEtMDNfMDA6MDA6MDAnLFxuICAgICAgICAvLyAgICAgICAgJ3NhbGVzJzogNDQ2MS4yOTUyMDIsXG4gICAgICAgIC8vICAgICAgICAnaW5jb21lJzogMTMzNjUuMDUzXG4gICAgICAgIC8vICAgIH0sXG4gICAgICAgIC8vICAgIHtcbiAgICAgICAgLy8gICAgICAgICdkYXknOiAnMjAxMy0wMS0wNF8wMDowMDowMCcsXG4gICAgICAgIC8vICAgICAgICAnc2FsZXMnOiA0NTYxLjI5NTIwMixcbiAgICAgICAgLy8gICAgICAgICdpbmNvbWUnOiAxNDM2NS4wNTNcbiAgICAgICAgLy8gICAgfVxuICAgICAgICAvL107XG4gICAgICAgIC8vXG4gICAgICAgIC8vJHNjb3BlLnNjaGVtYSA9IHtcbiAgICAgICAgLy8gICAgZGF5OiB7XG4gICAgICAgIC8vICAgICAgICB0eXBlOiAnZGF0ZXRpbWUnLFxuICAgICAgICAvLyAgICAgICAgZm9ybWF0OiAnJVktJW0tJWRfJUg6JU06JVMnLFxuICAgICAgICAvLyAgICAgICAgbmFtZTogJ0RhdGUnXG4gICAgICAgIC8vICAgIH1cbiAgICAgICAgLy99O1xuICAgICAgICAvL1xuICAgICAgICAvLyRzY29wZS5vcHRpb25zU3RyaW5nID0gJyc7XG4gICAgICAgIC8vJHNjb3BlLm9wdGlvbnMgPSB7XG4gICAgICAgIC8vICAgIHJvd3M6IFt7XG4gICAgICAgIC8vICAgICAgICBrZXk6ICdpbmNvbWUnLFxuICAgICAgICAvLyAgICAgICAgdHlwZTogJ2JhcidcbiAgICAgICAgLy8gICAgfSwge1xuICAgICAgICAvLyAgICAgICAga2V5OiAnc2FsZXMnXG4gICAgICAgIC8vICAgIH1dLFxuICAgICAgICAvLyAgICB4QXhpczoge1xuICAgICAgICAvLyAgICAgICAga2V5OiAnZGF5JyxcbiAgICAgICAgLy8gICAgICAgIGRpc3BsYXlGb3JtYXQ6ICclWS0lbS0lZCAlSDolTTolUydcbiAgICAgICAgLy8gICAgfVxuICAgICAgICAvL307XG5cbiAgICAgICAgLy8gZGVmaW5lIGNvZGUgaGlnaGxpZ2h0aW5nXG4gICAgICAgICRzY29wZS5vcHRpb25zQWNlQ29uZmlnID0ge1xuICAgICAgICAgICAgbW9kZTogJ2pzb24nLFxuICAgICAgICAgICAgdXNlV3JhcE1vZGU6IGZhbHNlLFxuICAgICAgICAgICAgb25Mb2FkOiBmdW5jdGlvbihfZWRpdG9yKSB7XG4gICAgICAgICAgICAgICAgX2VkaXRvci5zZXRTaG93UHJpbnRNYXJnaW4oZmFsc2UpO1xuICAgICAgICAgICAgICAgICRzY29wZS5vcHRpb25zRWRpdG9yID0gX2VkaXRvcjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuZGF0YXNldEFjZUNvbmZpZyA9IHtcbiAgICAgICAgICAgIG1vZGU6ICdqc29uJyxcbiAgICAgICAgICAgIHVzZVdyYXBNb2RlOiBmYWxzZSxcbiAgICAgICAgICAgIG9uTG9hZDogZnVuY3Rpb24oX2VkaXRvcikge1xuICAgICAgICAgICAgICAgIF9lZGl0b3Iuc2V0U2hvd1ByaW50TWFyZ2luKGZhbHNlKTtcbiAgICAgICAgICAgICAgICAkc2NvcGUuZGF0YUVkaXRvciA9IF9lZGl0b3I7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cblxuICAgICAgICAvLyRzY29wZS4kd2F0Y2goJ29wdGlvbnMnLCBmdW5jdGlvbihqc29uKSB7XG4gICAgICAgIC8vICAgICRzY29wZS5vcHRpb25zU3RyaW5nID0gJGZpbHRlcignanNvbicpKGpzb24pO1xuICAgICAgICAvL30sIHRydWUpO1xuICAgICAgICAvL1xuICAgICAgICAvLyRzY29wZS4kd2F0Y2goJ29wdGlvbnNTdHJpbmcnLCBmdW5jdGlvbihqc29uKSB7XG4gICAgICAgIC8vICAgIHRyeSB7XG4gICAgICAgIC8vICAgICAgICAkc2NvcGUub3B0aW9ucyA9IEpTT04ucGFyc2UoanNvbik7XG4gICAgICAgIC8vICAgICAgICAkc2NvcGUud2VsbEZvcm1lZE9wdGlvbnMgPSB0cnVlO1xuICAgICAgICAvLyAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIC8vICAgICAgICAkc2NvcGUud2VsbEZvcm1lZE9wdGlvbnMgPSBmYWxzZTtcbiAgICAgICAgLy8gICAgfVxuICAgICAgICAvL30sIHRydWUpO1xuICAgICAgICAvL1xuICAgICAgICAvLyRzY29wZS4kd2F0Y2goJ2RhdGFzZXQnLCBmdW5jdGlvbihqc29uKSB7XG4gICAgICAgIC8vICAgICRzY29wZS5kYXRhc2V0U3RyaW5nID0gJGZpbHRlcignanNvbicpKGpzb24pO1xuICAgICAgICAvL30sIHRydWUpO1xuICAgICAgICAvL1xuICAgICAgICAvLyRzY29wZS4kd2F0Y2goJ2RhdGFzZXRTdHJpbmcnLCBmdW5jdGlvbihqc29uKSB7XG4gICAgICAgIC8vICAgIHRyeSB7XG4gICAgICAgIC8vICAgICAgICAkc2NvcGUuZGF0YXNldCA9IEpTT04ucGFyc2UoanNvbik7XG4gICAgICAgIC8vICAgICAgICAkc2NvcGUud2VsbEZvcm1lZERhdGFzZXQgPSB0cnVlO1xuICAgICAgICAvLyAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIC8vICAgICAgICAkc2NvcGUud2VsbEZvcm1lZERhdGFzZXQgPSBmYWxzZTtcbiAgICAgICAgLy8gICAgfVxuICAgICAgICAvL30sIHRydWUpO1xuXG4gICAgfVxuXG4gICAgYW5ndWxhclxuICAgICAgICAubW9kdWxlKCdncmFmaWRkbGUnKVxuICAgICAgICAuY29udHJvbGxlcignRW1iZWRDb250cm9sbGVyJywgRW1iZWRDb250cm9sbGVyKTtcblxufSkoKTtcbiIsIihmdW5jdGlvbiAoKSB7XG5cbiAgICBmdW5jdGlvbiBFZGl0b3JDb250cm9sbGVyKCRzY29wZSwgJGZpbHRlciwgJHN0YXRlLCAkd2luZG93LCAkdGltZW91dCwgQ2hlY2twb2ludEVuZHBvaW50KSB7XG5cbiAgICAgICAgJHNjb3BlLnNob3dEYXRhRWRpdG9yID0gZmFsc2U7XG4gICAgICAgICRzY29wZS5zaG93T3B0aW9uc1VJICA9IGZhbHNlO1xuICAgICAgICAkc2NvcGUuc2hvd1NoYXJlUG9wdXAgPSBmYWxzZTtcbiAgICAgICAgJHNjb3BlLnN3aXRjaERhdGFCdXR0b25UaXRsZSAgICA9ICdNYW51YWwgZGF0YSBlbnRyeSc7XG4gICAgICAgICRzY29wZS5zd2l0Y2hPcHRpb25zQnV0dG9uVGl0bGUgPSAnRWRpdCBpbiBHVUknO1xuICAgICAgICAkc2NvcGUudG9nZ2xlRGF0YUVkaXRvciA9IHRvZ2dsZURhdGFFZGl0b3I7XG4gICAgICAgICRzY29wZS50b2dnbGVPcHRpb25zVUkgID0gdG9nZ2xlT3B0aW9uc1VJO1xuICAgICAgICAkc2NvcGUuc2hhcmVQb3B1cCAgICAgICA9IHNoYXJlUG9wdXA7XG4gICAgICAgICRzY29wZS5vblNoYXJlVGV4dENsaWNrID0gb25TaGFyZVRleHRDbGljaztcbiAgICAgICAgJHNjb3BlLmFkZE9wdGlvbiA9IGFkZE9wdGlvbjtcbiAgICAgICAgJHNjb3BlLnRpdGxlID0gJyc7XG4gICAgICAgICRzY29wZS5hdXRob3IgPSAnJztcblxuICAgICAgICAkc2NvcGUuc2hhcmUgPSBzaGFyZTtcbiAgICAgICAgJHNjb3BlLnNhdmUgPSBzYXZlO1xuICAgICAgICAkc2NvcGUudXBsb2FkRmlsZSA9IHVwbG9hZEZpbGU7XG5cbiAgICAgICAgJHNjb3BlLm9wdGlvbnNVSXJvd1R5cGVPcHRpb25zID0gW1xuICAgICAgICAgICAgeyBsYWJlbDogJ2xpbmUnLCB2YWx1ZTogMSB9LFxuICAgICAgICAgICAgeyBsYWJlbDogJ3NwbGluZScsIHZhbHVlOiAyIH0sXG4gICAgICAgICAgICB7IGxhYmVsOiAnYmFyJywgdmFsdWU6IDMgfSxcbiAgICAgICAgICAgIHsgbGFiZWw6ICdzY2F0dGVyJywgdmFsdWU6IDQgfSxcbiAgICAgICAgICAgIHsgbGFiZWw6ICdhcmVhJywgdmFsdWU6IDUgfSxcbiAgICAgICAgICAgIHsgbGFiZWw6ICdhcmVhLXNwbGluZScsIHZhbHVlOiA2IH0sXG4gICAgICAgICAgICB7IGxhYmVsOiAnc3RlcCcsIHZhbHVlOiA3IH0sXG4gICAgICAgICAgICB7IGxhYmVsOiAnYXJlYS1zdGVwJywgdmFsdWU6IDggfSxcbiAgICAgICAgICAgIHsgbGFiZWw6ICdzdGVwJywgdmFsdWU6IDkgfVxuICAgICAgICBdO1xuXG4gICAgICAgICRzY29wZS5jaGVja3BvaW50ID0ge307XG4gICAgICAgICRzY29wZS5hY2VKc29uQ29uZmlnID0ge1xuICAgICAgICAgICAgbW9kZTogJ2pzb24nLFxuICAgICAgICAgICAgdXNlV3JhcE1vZGU6IGZhbHNlLFxuICAgICAgICAgICAgb25Mb2FkOiBmdW5jdGlvbiAoX2VkaXRvcikge1xuICAgICAgICAgICAgICAgIF9lZGl0b3Iuc2V0U2hvd1ByaW50TWFyZ2luKGZhbHNlKTtcbiAgICAgICAgICAgICAgICBfZWRpdG9yLiRibG9ja1Njcm9sbGluZyA9IEluZmluaXR5O1xuICAgICAgICAgICAgICAgICRzY29wZS5lZGl0b3JzID0gX2VkaXRvcjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBhY3RpdmF0ZSgpO1xuXG4gICAgICAgIC8vLy8vLy8vLy8vL1xuXG4gICAgICAgIGZ1bmN0aW9uIGFjdGl2YXRlKCkge1xuXG4gICAgICAgICAgICBpZiAoJHN0YXRlLnBhcmFtcy5pZCkge1xuICAgICAgICAgICAgICAgIENoZWNrcG9pbnRFbmRwb2ludFxuICAgICAgICAgICAgICAgICAgICAuZ2V0KHtpZDogJHN0YXRlLnBhcmFtcy5pZH0pXG4gICAgICAgICAgICAgICAgICAgIC4kcHJvbWlzZVxuICAgICAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbihjaGVja3BvaW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuc2VydmVyQ2hlY2twb2ludCA9IGNoZWNrcG9pbnQ7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZXRDaGVja3BvaW50KGNoZWNrcG9pbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlICRzY29wZS5jaGVja3BvaW50LmRhdGFzZXQ7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZXRDaGVja3BvaW50KGNoZWNrcG9pbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgJHRpbWVvdXQoc2F2ZUFzSW1hZ2UsIDApO1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAuY2F0Y2goZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnZWRpdG9yJywge2lkOiAnJ30pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbG9hZERlZmF1bHREYXRhKCk7XG4gICAgICAgICAgICAgICAgJHRpbWVvdXQoc2F2ZUFzSW1hZ2UsIDApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3luY09wdGlvbnMoKTtcbiAgICAgICAgICAgIHN5bmNEYXRhc2V0KCk7XG4gICAgICAgICAgICAvL3VwZGF0ZU9uUmVzaXplKCk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBzYXZlQXNJbWFnZSgpIHtcbiAgICAgICAgICAgIGNhbnZnKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjYW52YXMnKSwgZDMuc2VsZWN0KFwiLmFuZ3VsYXJjaGFydFwiKS5ub2RlKCkuaW5uZXJIVE1MKTtcbiAgICAgICAgICAgICRzY29wZS5hc0ltYWdlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NhbnZhcycpLnRvRGF0YVVSTCgpO1xuICAgICAgICAgICAgJHNjb3BlLm1ldGFkYXRhLm9nWydvZzppbWFnZSddID0gJHNjb3BlLmFzSW1hZ2U7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTYXZlIHRoZSBjdXJyZW50IFZlcnNpb25cbiAgICAgICAgLy9cbiAgICAgICAgZnVuY3Rpb24gc2F2ZSgpIHtcbiAgICAgICAgICAgIENoZWNrcG9pbnRFbmRwb2ludC5zYXZlKHtcbiAgICAgICAgICAgICAgICBcImRhdGFcIjogJHNjb3BlLmNoZWNrcG9pbnQuZGF0YXNldCxcbiAgICAgICAgICAgICAgICBcIm9wdGlvbnNcIjogJHNjb3BlLmNoZWNrcG9pbnQub3B0aW9ucyxcbiAgICAgICAgICAgICAgICBcImF1dGhvclwiOiAkc2NvcGUuYXV0aG9yLFxuICAgICAgICAgICAgICAgIFwiYmFzZVwiOiAkc2NvcGUuc2VydmVyQ2hlY2twb2ludCAmJiAkc2NvcGUuc2VydmVyQ2hlY2twb2ludC5pZCxcbiAgICAgICAgICAgICAgICBcInRpdGxlXCI6ICRzY29wZS50aXRsZVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAuJHByb21pc2VcbiAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbiAoY2hlY2twb2ludCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnc2F2ZWQgY2hlY2twb2ludDogJywgY2hlY2twb2ludCk7XG4gICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnZWRpdG9yJywge2lkOiBjaGVja3BvaW50LmlkfSk7XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAuY2F0Y2goZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignc2F2ZSBmYWlsZWQnLCBlKTtcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2hhcmUgdGhlIGZpZGRsZVxuICAgICAgICAvL1xuICAgICAgICBmdW5jdGlvbiBzaGFyZSh0YXJnZXQpIHtcbiAgICAgICAgICAgIGZpZGRsZVVSTCAgICAgICA9ICdodHRwOi8vZ3JhZmlkZGxlLmFwcHNwb3QuY29tLycgKyAkc3RhdGUucGFyYW1zLmlkO1xuICAgICAgICAgICAgaWYodGFyZ2V0ID09ICdGQicpIHtcbiAgICAgICAgICAgICAgICAkd2luZG93Lm9wZW4oJ2h0dHBzOi8vd3d3LmZhY2Vib29rLmNvbS9zaGFyZXIvc2hhcmVyLnBocD91PScgKyBmaWRkbGVVUkwsICdfYmxhbmsnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmKHRhcmdldCA9PSAnVHdpdHRlcicpIHtcbiAgICAgICAgICAgICAgICAkd2luZG93Lm9wZW4oJ2h0dHBzOi8vdHdpdHRlci5jb20vaW50ZW50L3R3ZWV0P3RleHQ9Q2hlY2slMjBvdXQlMjB0aGlzJTIwc3dlZXQlMjBncmFmaWRkbGUlMjAmdXJsPScgKyBmaWRkbGVVUkwsICdfYmxhbmsnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmKHRhcmdldCA9PSAnRS1NYWlsJykge1xuICAgICAgICAgICAgICAgICR3aW5kb3cubG9jYXRpb24gPSAnbWFpbHRvOmFAYi5jZD9zdWJqZWN0PUNoZWNrJTIwb3V0JTIwdGhpcyUyMGF3ZXNvbWUlMjBHcmFmaWRkbGUmYm9keT0nICsgZmlkZGxlVVJMO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBsb2FkIGEgZmlsZSBhcyBkYXRhIHNvdXJjZVxuICAgICAgICAvL1xuICAgICAgICBmdW5jdGlvbiB1cGxvYWRGaWxlKGZpbGUpIHtcbiAgICAgICAgICAgICRzY29wZS5jaGVja3BvaW50LmRhdGFzZXRTdHJpbmcgPSBmaWxlO1xuICAgICAgICAgICAgJHNjb3BlLnRvZ2dsZURhdGFFZGl0b3IoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRvZ2dsZSBmcm9tIGRhdGEgdmlld1xuICAgICAgICAvL1xuICAgICAgICBmdW5jdGlvbiB0b2dnbGVEYXRhRWRpdG9yKCkge1xuICAgICAgICAgICAgJHNjb3BlLnNob3dEYXRhRWRpdG9yID0gISRzY29wZS5zaG93RGF0YUVkaXRvcjtcbiAgICAgICAgICAgICRzY29wZS5zd2l0Y2hEYXRhQnV0dG9uVGl0bGUgPSAkc2NvcGUuc2hvd0RhdGFFZGl0b3IgPyAnQmFjayB0byBpbnB1dCBkaWFsb2cnIDogJ01hbnVhbCBkYXRhIGVudHJ5JztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRvZ2dsZSBmcm9tIGpzb24tb3B0aW9uIHZpZXdcbiAgICAgICAgLy9cbiAgICAgICAgZnVuY3Rpb24gdG9nZ2xlT3B0aW9uc1VJKCkge1xuICAgICAgICAgICAgJHNjb3BlLnNob3dPcHRpb25zVUkgPSAhJHNjb3BlLnNob3dPcHRpb25zVUk7XG4gICAgICAgICAgICAkc2NvcGUuc3dpdGNoT3B0aW9uc0J1dHRvblRpdGxlID0gJHNjb3BlLnNob3dPcHRpb25zVUkgPyAnRWRpdCBhcyBKU09OJyA6ICdFZGl0IGluIEdVSSc7XG4gICAgICAgICAgICAkc2NvcGUuZWRpdG9ycy5yZXNpemUoKTtcbiAgICAgICAgICAgICRzY29wZS5lZGl0b3JzLnJlbmRlcmVyLnVwZGF0ZUZ1bGwoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENyZWF0ZSB0aGUgSFRNTCBVSSByZXByZXNlbnRhdGlvbiBvZiB0aGUgb3B0aW9ucyBqc29uXG4gICAgICAgIC8vXG4gICAgICAgIGZ1bmN0aW9uIHVwZGF0ZU9wdGlvbnNVSShqc29uKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcInVwZGF0ZSBvcHRpb25zIHVpXCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2hvdyB0aGUgc2hhcmUgc2hlZXRcbiAgICAgICAgLy9cbiAgICAgICAgZnVuY3Rpb24gc2hhcmVQb3B1cCgpIHtcbiAgICAgICAgICAgICRzY29wZS5zaG93U2hhcmVQb3B1cCA9ICEkc2NvcGUuc2hvd1NoYXJlUG9wdXA7XG4gICAgICAgICAgICAkc2NvcGUuZmlkZGxlVVJMICAgICAgID0gJ2h0dHA6Ly9ncmFmaWRkbGUuYXBwc3BvdC5jb20vJyArICRzdGF0ZS5wYXJhbXMuaWQ7XG4gICAgICAgICAgICAkc2NvcGUuZmlkZGxlQ2hhcnRVUkwgID0gJ2h0dHA6Ly9ncmFmaWRkbGUuYXBwc3BvdC5jb20vJyArICRzdGF0ZS5wYXJhbXMuaWQgKyAnLnBuZyc7XG4gICAgICAgICAgICAkc2NvcGUuZmlkZGxlRW1iZWRDb2RlID0gJzxpZnJhbWUgd2lkdGg9XCIxMDAlXCIgaGVpZ2h0PVwiMzAwXCIgc3JjPVwiLy9ncmFmaWRkbGUuYXBwc3BvdC5jb20vJyArICRzdGF0ZS5wYXJhbXMuaWQgKyAnL2VtYmVkXCIgYWxsb3dmdWxsc2NyZWVuPVwiYWxsb3dmdWxsc2NyZWVuXCIgZnJhbWVib3JkZXI9XCIwXCI+PC9pZnJhbWU+JztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFsbG93IHNoYXJlIHRleHQgZmllbGRzIHRvIGF1dG9zZWxlY3Qgb24gZm9jdXNcbiAgICAgICAgLy9cbiAgICAgICAgZnVuY3Rpb24gb25TaGFyZVRleHRDbGljaygkZXZlbnQpIHtcbiAgICAgICAgICAgICRldmVudC50YXJnZXQuc2VsZWN0KCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgXG4gICAgICAgIC8vIEluc2VydCBkZWZhdWx0IGRhdGFcbiAgICAgICAgLy9cbiAgICAgICAgZnVuY3Rpb24gYWRkT3B0aW9uKG9wdGlvbikge1xuICAgICAgICAgICAgaWYob3B0aW9uID09ICdyb3cnKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICRzY29wZS5jaGVja3BvaW50Lm9wdGlvbnMucm93cyA9ICRzY29wZS5jaGVja3BvaW50Lm9wdGlvbnMucm93cy5jb25jYXQoW3trZXkgOiBcIm5ldyByb3dcIn1dKVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cblxuICAgICAgICAvLyBJbnNlcnQgZGVmYXVsdCBkYXRhXG4gICAgICAgIC8vXG4gICAgICAgIGZ1bmN0aW9uIGxvYWREZWZhdWx0RGF0YSgpIHtcbiAgICAgICAgICAgIHZhciBkYXRhc2V0ID0gW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgXCJkYXlcIjogXCIyMDEzLTAxLTAyXCIsXG4gICAgICAgICAgICAgICAgICAgIFwiZmlyc3RcIjogMTIzNjUuMDUzLFxuICAgICAgICAgICAgICAgICAgICBcInNlY29uZFwiOiAxNjAwLFxuICAgICAgICAgICAgICAgICAgICBcInRoaXJkXCI6IDEzMDAsXG4gICAgICAgICAgICAgICAgICAgIFwiZm91dGhcIjogMTUwMCxcbiAgICAgICAgICAgICAgICAgICAgXCJsaW5lXCI6IDYwMDAuMjk1MjAyXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIFwiZGF5XCI6IFwiMjAxMy0wMS0wM1wiLFxuICAgICAgICAgICAgICAgICAgICBcImZpcnN0XCI6IDEyMDMuMDUzLFxuICAgICAgICAgICAgICAgICAgICBcInNlY29uZFwiOiAxNjAwMCxcbiAgICAgICAgICAgICAgICAgICAgXCJ0aGlyZFwiOiAxMzAwLFxuICAgICAgICAgICAgICAgICAgICBcImZvdXRoXCI6IDE1MDAsXG4gICAgICAgICAgICAgICAgICAgIFwibGluZVwiOiAxMzM2NS4wNTNcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgXCJkYXlcIjogXCIyMDEzLTAxLTA0XCIsXG4gICAgICAgICAgICAgICAgICAgIFwiZmlyc3RcIjogMTIzNS4wNTMsXG4gICAgICAgICAgICAgICAgICAgIFwic2Vjb25kXCI6IDE2MDAsXG4gICAgICAgICAgICAgICAgICAgIFwidGhpcmRcIjogMTMwMDAsXG4gICAgICAgICAgICAgICAgICAgIFwiZm91dGhcIjogMTUwMCxcbiAgICAgICAgICAgICAgICAgICAgXCJsaW5lXCI6IDkzNjUuMDUzXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIFwiZGF5XCI6IFwiMjAxMy0wMS0wNVwiLFxuICAgICAgICAgICAgICAgICAgICBcImZpcnN0XCI6IDEyNjUuMDUzLFxuICAgICAgICAgICAgICAgICAgICBcInNlY29uZFwiOiAxNjAwLFxuICAgICAgICAgICAgICAgICAgICBcInRoaXJkXCI6IDEzMDAsXG4gICAgICAgICAgICAgICAgICAgIFwiZm91dGhcIjogMTUwMDAsXG4gICAgICAgICAgICAgICAgICAgIFwibGluZVwiOiAxNDM2NS4wNTNcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdO1xuICAgICAgICAgICAgdmFyIG9wdGlvbnMgPSB7XG4gICAgICAgICAgICAgICAgXCJkYXRhXCI6IGRhdGFzZXQsXG4gICAgICAgICAgICAgICAgXCJkaW1lbnNpb25zXCI6IHtcbiAgICAgICAgICAgICAgICAgICAgZmlyc3Q6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwia2V5XCI6IFwiZmlyc3RcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImJhclwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJjb2xvclwiOiBcImdyZWVuXCJcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgc2Vjb25kOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBcImtleVwiOiBcInNlY29uZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiYmFyXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcImNvbG9yXCI6IFwib3JhbmdlXCJcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgdGhpcmQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwia2V5XCI6IFwidGhpcmRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImJhclwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJjb2xvclwiOiBcImJsdWVcIlxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBmb3V0aDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJrZXlcIjogXCJmb3V0aFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiYmFyXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcImNvbG9yXCI6IFwicmVkXCJcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgbGluZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJrZXlcIjogXCJsaW5lXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJzcGxpbmVcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiY29sb3JcIjogXCJibGFja1wiXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIFwiY2hhcnRcIjoge1xuICAgICAgICAgICAgICAgICAgICBcImRhdGFcIjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJzZWxlY3Rpb25cIjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiZW5hYmxlZFwiOiB0cnVlXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHpvb206IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IHRydWVcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICRzY29wZS5jaGVja3BvaW50LmRhdGFzZXRTdHJpbmcgPSAnJztcbiAgICAgICAgICAgICRzY29wZS5jaGVja3BvaW50LmRhdGFzZXQgPSBkYXRhc2V0O1xuICAgICAgICAgICAgJHNjb3BlLmNoZWNrcG9pbnQub3B0aW9uc1N0cmluZyA9ICcnO1xuICAgICAgICAgICAgJHNjb3BlLmNoZWNrcG9pbnQub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBzZXRDaGVja3BvaW50KGNoZWNrcG9pbnQpIHtcbiAgICAgICAgICAgICRzY29wZS5jaGVja3BvaW50LmRhdGFzZXRTdHJpbmcgPSAnJztcbiAgICAgICAgICAgICRzY29wZS5jaGVja3BvaW50LmRhdGFzZXQgPSBjaGVja3BvaW50LmRhdGE7XG4gICAgICAgICAgICAkc2NvcGUuY2hlY2twb2ludC5zY2hlbWFTdHJpbmcgPSAnJztcbiAgICAgICAgICAgICRzY29wZS5jaGVja3BvaW50LnNjaGVtYSA9IHt9O1xuICAgICAgICAgICAgJHNjb3BlLmNoZWNrcG9pbnQub3B0aW9uc1N0cmluZyA9ICcnO1xuICAgICAgICAgICAgJHNjb3BlLmNoZWNrcG9pbnQub3B0aW9ucyA9IGNoZWNrcG9pbnQub3B0aW9ucztcbiAgICAgICAgICAgICRzY29wZS50aXRsZSA9IGNoZWNrcG9pbnQudGl0bGU7XG4gICAgICAgICAgICAkc2NvcGUuYXV0aG9yID0gY2hlY2twb2ludC5hdXRob3I7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTeW5jIE9iamVjdCBhbmQgU3RyaW5nIHJlcHJlc2VudGF0aW9uXG4gICAgICAgIC8vXG4gICAgICAgIGZ1bmN0aW9uIHN5bmNPcHRpb25zKCkge1xuICAgICAgICAgICAgJHNjb3BlLiR3YXRjaCgnY2hlY2twb2ludC5vcHRpb25zJywgZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICAgICAgICAgICAgICB2YXIgdG9QYXJzZSA9IHtcbiAgICAgICAgICAgICAgICAgICAgZGltZW5zaW9uczogb3B0aW9ucy5kaW1lbnNpb25zLFxuICAgICAgICAgICAgICAgICAgICBjaGFydDogb3B0aW9ucy5jaGFydCxcbiAgICAgICAgICAgICAgICAgICAgc3RhdGU6IG9wdGlvbnMuc3RhdGVcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICRzY29wZS5jaGVja3BvaW50Lm9wdGlvbnNTdHJpbmcgPSAkZmlsdGVyKCdqc29uJykodG9QYXJzZSk7XG4gICAgICAgICAgICB9LCB0cnVlKTtcblxuICAgICAgICAgICAgJHNjb3BlLiR3YXRjaCgnY2hlY2twb2ludC5vcHRpb25zU3RyaW5nJywgZnVuY3Rpb24gKGpzb24pIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgcGFyc2VkID0gSlNPTi5wYXJzZShqc29uKTtcbiAgICAgICAgICAgICAgICAgICAgcGFyc2VkLmRhdGEgPSAkc2NvcGUuY2hlY2twb2ludC5kYXRhc2V0O1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY2hlY2twb2ludC5vcHRpb25zID0gcGFyc2VkO1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygkc2NvcGUuY2hlY2twb2ludC5vcHRpb25zKTtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLndlbGxGb3JtZWRPcHRpb25zID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgLy91cGRhdGVPcHRpb25zVUkoanNvbik7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUud2VsbEZvcm1lZE9wdGlvbnMgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCB0cnVlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFN5bmMgT2JqZWN0IGFuZCBTdHJpbmcgcmVwcmVzZW50YXRpb25cbiAgICAgICAgLy9cbiAgICAgICAgZnVuY3Rpb24gc3luY0RhdGFzZXQoKSB7XG4gICAgICAgICAgICAkc2NvcGUuJHdhdGNoKCdjaGVja3BvaW50LmRhdGFzZXQnLCBmdW5jdGlvbiAoanNvbikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCd1cGRhdGUgZGF0YXNldCBzdHJpbmcnKTtcbiAgICAgICAgICAgICAgICAkc2NvcGUuY2hlY2twb2ludC5kYXRhc2V0U3RyaW5nID0gJGZpbHRlcignanNvbicpKGpzb24pO1xuICAgICAgICAgICAgICAgIC8vb3BkYXRlT3B0aW9ucygpO1xuICAgICAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgICAgICRzY29wZS4kd2F0Y2goJ2NoZWNrcG9pbnQuZGF0YXNldFN0cmluZycsIGZ1bmN0aW9uIChqc29uKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3VwZGF0ZSBkYXRhc2V0IG9iamVjdCcpO1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5jaGVja3BvaW50LmRhdGFzZXQgPSBKU09OLnBhcnNlKGpzb24pO1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUud2VsbEZvcm1lZERhdGFzZXQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLndlbGxGb3JtZWREYXRhc2V0ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgdHJ1ZSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBZGQgdGltZXN0YW1wIHRvIG9wdGlvbnMgdG8gcmVkcmF3XG4gICAgICAgIC8vXG4gICAgICAgIGZ1bmN0aW9uIG9wZGF0ZU9wdGlvbnMoKSB7XG4gICAgICAgICAgICAvLyBJcyBjYWxsZWQgdG8gb2Z0ZW4sIG5vdCBvbmx5IG9uIHJlc2l6ZVxuICAgICAgICAgICAgaWYgKCRzY29wZS5jaGVja3BvaW50ICYmICRzY29wZS5jaGVja3BvaW50Lm9wdGlvbnMpIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUuY2hlY2twb2ludC5vcHRpb25zLnVwZGF0ZWQgPSBuZXcgRGF0ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gVHJpZ2dlciBuZXcgcmVuZGVyIG9uIHJlc2l6ZVxuICAgICAgICAvL1xuICAgICAgICBmdW5jdGlvbiB1cGRhdGVPblJlc2l6ZSgpIHtcbiAgICAgICAgICAgIHZhciBteUVsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2hhcnRBcmVhJyk7XG4gICAgICAgICAgICBhZGRSZXNpemVMaXN0ZW5lcihteUVsZW1lbnQsIG9wZGF0ZU9wdGlvbnMpO1xuXG4gICAgICAgICAgICAkc2NvcGUuJG9uKFwiJGRlc3Ryb3lcIiwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJlbW92ZVJlc2l6ZUxpc3RlbmVyKG15RWxlbWVudCwgb3BkYXRlT3B0aW9ucyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgfVxuXG4gICAgYW5ndWxhclxuICAgICAgICAubW9kdWxlKCdncmFmaWRkbGUnKVxuICAgICAgICAuY29udHJvbGxlcignRWRpdG9yQ29udHJvbGxlcicsIEVkaXRvckNvbnRyb2xsZXIpO1xuXG59KSgpO1xuIiwiKGZ1bmN0aW9uICgpIHtcblxuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGZ1bmN0aW9uIHN0YXRlc0NvbmZpZ3VyYXRpb24oJHN0YXRlUHJvdmlkZXIsICR1cmxSb3V0ZXJQcm92aWRlciwgJGxvY2F0aW9uUHJvdmlkZXIpIHtcblxuICAgICAgICAkc3RhdGVQcm92aWRlclxuICAgICAgICAgICAgLnN0YXRlKCc0MDQnLCB7XG4gICAgICAgICAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAgICAgICAgICAgY29udGVudDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdjb21wb25lbnRzL2NvbW1vbi80MDQvNDA0Lmh0bWwnXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLnN0YXRlKCdlbWJlZCcsIHtcbiAgICAgICAgICAgICAgICB1cmw6ICcvOmlkL2VtYmVkJyxcbiAgICAgICAgICAgICAgICB2aWV3czoge1xuICAgICAgICAgICAgICAgICAgICBjb250ZW50OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ2NvbXBvbmVudHMvZW1iZWQvZW1iZWQuaHRtbCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250cm9sbGVyOiAnRW1iZWRDb250cm9sbGVyJ1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5zdGF0ZSgndHJlZScsIHtcbiAgICAgICAgICAgICAgICB1cmw6ICcvOmlkL3RyZWUnLFxuICAgICAgICAgICAgICAgIHZpZXdzOiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnY29tcG9uZW50cy90cmVlL3RyZWUuaHRtbCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250cm9sbGVyOiAnVHJlZUNvbnRyb2xsZXInXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLnN0YXRlKCdlZGl0b3InLCB7XG4gICAgICAgICAgICAgICAgdXJsOiAnLzppZCcsXG4gICAgICAgICAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAgICAgICAgICAgY29udGVudDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdjb21wb25lbnRzL2VkaXRvci9lZGl0b3IuaHRtbCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250cm9sbGVyOiAnRWRpdG9yQ29udHJvbGxlcidcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIC8qIEBuZ0luamVjdCAqL1xuICAgICAgICAkdXJsUm91dGVyUHJvdmlkZXIub3RoZXJ3aXNlKGZ1bmN0aW9uICgkaW5qZWN0b3IsICRsb2NhdGlvbikge1xuICAgICAgICAgICAgLy8gVXNlclNlcnZpY2UgJiAkc3RhdGUgbm90IGF2YWlsYWJsZSBkdXJpbmcgLmNvbmZpZygpLCBpbmplY3QgdGhlbSAobWFudWFsbHkpIGxhdGVyXG5cbiAgICAgICAgICAgIC8vIHJlcXVlc3RpbmcgdW5rbm93biBwYWdlIHVuZXF1YWwgdG8gJy8nXG4gICAgICAgICAgICB2YXIgcGF0aCA9ICRsb2NhdGlvbi5wYXRoKCk7XG4gICAgICAgICAgICBpZiAocGF0aCAhPT0gJy8nKSB7XG4gICAgICAgICAgICAgICAgJGluamVjdG9yLmdldCgnJHN0YXRlJykuZ28oJzQwNCcpO1xuICAgICAgICAgICAgICAgIHJldHVybiBwYXRoOyAvLyB0aGlzIHRyaWNrIGFsbG93cyB0byBzaG93IHRoZSBlcnJvciBwYWdlIG9uIHVua25vd24gYWRkcmVzc1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gJy9uZXcnO1xuICAgICAgICB9KTtcblxuICAgICAgICAkbG9jYXRpb25Qcm92aWRlclxuICAgICAgICAgICAgLmh0bWw1TW9kZSh0cnVlKVxuICAgICAgICAgICAgLmhhc2hQcmVmaXgoJyEnKTtcbiAgICB9XG5cblxuICAgIGFuZ3VsYXJcbiAgICAgICAgLm1vZHVsZSgnZ3JhZmlkZGxlJylcbiAgICAgICAgLmNvbmZpZyhzdGF0ZXNDb25maWd1cmF0aW9uKTtcblxufSkoKTsiLCIoZnVuY3Rpb24oKXtcblxuICAgIHZhciBhdHRhY2hFdmVudCA9IGRvY3VtZW50LmF0dGFjaEV2ZW50O1xuICAgIHZhciBpc0lFID0gbmF2aWdhdG9yLnVzZXJBZ2VudC5tYXRjaCgvVHJpZGVudC8pO1xuICAgIHZhciByZXF1ZXN0RnJhbWUgPSAoZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIHJhZiA9IHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHwgd2luZG93Lm1velJlcXVlc3RBbmltYXRpb25GcmFtZSB8fCB3aW5kb3cud2Via2l0UmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG4gICAgICAgICAgICBmdW5jdGlvbihmbil7IHJldHVybiB3aW5kb3cuc2V0VGltZW91dChmbiwgMjApOyB9O1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24oZm4peyByZXR1cm4gcmFmKGZuKTsgfTtcbiAgICB9KSgpO1xuXG4gICAgdmFyIGNhbmNlbEZyYW1lID0gKGZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciBjYW5jZWwgPSB3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUgfHwgd2luZG93Lm1vekNhbmNlbEFuaW1hdGlvbkZyYW1lIHx8IHdpbmRvdy53ZWJraXRDYW5jZWxBbmltYXRpb25GcmFtZSB8fFxuICAgICAgICAgICAgd2luZG93LmNsZWFyVGltZW91dDtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKGlkKXsgcmV0dXJuIGNhbmNlbChpZCk7IH07XG4gICAgfSkoKTtcblxuICAgIGZ1bmN0aW9uIHJlc2l6ZUxpc3RlbmVyKGUpe1xuICAgICAgICB2YXIgd2luID0gZS50YXJnZXQgfHwgZS5zcmNFbGVtZW50O1xuICAgICAgICBpZiAod2luLl9fcmVzaXplUkFGX18pIGNhbmNlbEZyYW1lKHdpbi5fX3Jlc2l6ZVJBRl9fKTtcbiAgICAgICAgd2luLl9fcmVzaXplUkFGX18gPSByZXF1ZXN0RnJhbWUoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHZhciB0cmlnZ2VyID0gd2luLl9fcmVzaXplVHJpZ2dlcl9fO1xuICAgICAgICAgICAgdHJpZ2dlci5fX3Jlc2l6ZUxpc3RlbmVyc19fLmZvckVhY2goZnVuY3Rpb24oZm4pe1xuICAgICAgICAgICAgICAgIGZuLmNhbGwodHJpZ2dlciwgZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gb2JqZWN0TG9hZChlKXtcbiAgICAgICAgdGhpcy5jb250ZW50RG9jdW1lbnQuZGVmYXVsdFZpZXcuX19yZXNpemVUcmlnZ2VyX18gPSB0aGlzLl9fcmVzaXplRWxlbWVudF9fO1xuICAgICAgICB0aGlzLmNvbnRlbnREb2N1bWVudC5kZWZhdWx0Vmlldy5hZGRFdmVudExpc3RlbmVyKCdyZXNpemUnLCByZXNpemVMaXN0ZW5lcik7XG4gICAgfVxuXG4gICAgd2luZG93LmFkZFJlc2l6ZUxpc3RlbmVyID0gZnVuY3Rpb24oZWxlbWVudCwgZm4pe1xuICAgICAgICBpZiAoIWVsZW1lbnQuX19yZXNpemVMaXN0ZW5lcnNfXykge1xuICAgICAgICAgICAgZWxlbWVudC5fX3Jlc2l6ZUxpc3RlbmVyc19fID0gW107XG4gICAgICAgICAgICBpZiAoYXR0YWNoRXZlbnQpIHtcbiAgICAgICAgICAgICAgICBlbGVtZW50Ll9fcmVzaXplVHJpZ2dlcl9fID0gZWxlbWVudDtcbiAgICAgICAgICAgICAgICBlbGVtZW50LmF0dGFjaEV2ZW50KCdvbnJlc2l6ZScsIHJlc2l6ZUxpc3RlbmVyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChnZXRDb21wdXRlZFN0eWxlKGVsZW1lbnQpLnBvc2l0aW9uID09ICdzdGF0aWMnKSBlbGVtZW50LnN0eWxlLnBvc2l0aW9uID0gJ3JlbGF0aXZlJztcbiAgICAgICAgICAgICAgICB2YXIgb2JqID0gZWxlbWVudC5fX3Jlc2l6ZVRyaWdnZXJfXyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ29iamVjdCcpO1xuICAgICAgICAgICAgICAgIG9iai5zZXRBdHRyaWJ1dGUoJ3N0eWxlJywgJ2Rpc3BsYXk6IGJsb2NrOyBwb3NpdGlvbjogYWJzb2x1dGU7IHRvcDogMDsgbGVmdDogMDsgaGVpZ2h0OiAxMDAlOyB3aWR0aDogMTAwJTsgb3ZlcmZsb3c6IGhpZGRlbjsgcG9pbnRlci1ldmVudHM6IG5vbmU7IHotaW5kZXg6IC0xOycpO1xuICAgICAgICAgICAgICAgIG9iai5fX3Jlc2l6ZUVsZW1lbnRfXyA9IGVsZW1lbnQ7XG4gICAgICAgICAgICAgICAgb2JqLm9ubG9hZCA9IG9iamVjdExvYWQ7XG4gICAgICAgICAgICAgICAgb2JqLnR5cGUgPSAndGV4dC9odG1sJztcbiAgICAgICAgICAgICAgICBpZiAoaXNJRSkgZWxlbWVudC5hcHBlbmRDaGlsZChvYmopO1xuICAgICAgICAgICAgICAgIG9iai5kYXRhID0gJ2Fib3V0OmJsYW5rJztcbiAgICAgICAgICAgICAgICBpZiAoIWlzSUUpIGVsZW1lbnQuYXBwZW5kQ2hpbGQob2JqKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbGVtZW50Ll9fcmVzaXplTGlzdGVuZXJzX18ucHVzaChmbik7XG4gICAgfTtcblxuICAgIHdpbmRvdy5yZW1vdmVSZXNpemVMaXN0ZW5lciA9IGZ1bmN0aW9uKGVsZW1lbnQsIGZuKXtcbiAgICAgICAgZWxlbWVudC5fX3Jlc2l6ZUxpc3RlbmVyc19fLnNwbGljZShlbGVtZW50Ll9fcmVzaXplTGlzdGVuZXJzX18uaW5kZXhPZihmbiksIDEpO1xuICAgICAgICBpZiAoIWVsZW1lbnQuX19yZXNpemVMaXN0ZW5lcnNfXy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGlmIChhdHRhY2hFdmVudCkgZWxlbWVudC5kZXRhY2hFdmVudCgnb25yZXNpemUnLCByZXNpemVMaXN0ZW5lcik7XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBlbGVtZW50Ll9fcmVzaXplVHJpZ2dlcl9fLmNvbnRlbnREb2N1bWVudC5kZWZhdWx0Vmlldy5yZW1vdmVFdmVudExpc3RlbmVyKCdyZXNpemUnLCByZXNpemVMaXN0ZW5lcik7XG4gICAgICAgICAgICAgICAgZWxlbWVudC5fX3Jlc2l6ZVRyaWdnZXJfXyA9ICFlbGVtZW50LnJlbW92ZUNoaWxkKGVsZW1lbnQuX19yZXNpemVUcmlnZ2VyX18pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIFxufSkoKTsiLCIoZnVuY3Rpb24gKCkge1xuXG4gICAgZnVuY3Rpb24gQXBwQ29udHJvbGxlcigkc2NvcGUpIHtcblxuICAgICAgICAkc2NvcGUubWV0YWRhdGEgPSB7fTtcbiAgICAgICAgJHNjb3BlLm1ldGFkYXRhLnBhZ2VUaXRsZSA9ICdTaGFyZSB5b3VyIHZpc3VhbGl6YXRpb25zIG9uIGdyYWZpZGRsZSc7XG4gICAgICAgICRzY29wZS5tZXRhZGF0YS5vZyA9IHtcbiAgICAgICAgICAgICdvZzp0eXBlJzogJ2FydGljbGUnLFxuICAgICAgICAgICAgJ2FydGljbGU6c2VjdGlvbic6ICdTaGFyYWJsZSBkYXRhIHZpc3VhbGl6YXRpb24nLFxuICAgICAgICAgICAgJ29nOnRpdGxlJzogJ1NoYXJlIHlvdXIgdmlzdWFsaXphdGlvbnMgb24gZ3JhZmlkZGxlJyxcbiAgICAgICAgICAgICdvZzppbWFnZSc6ICcnLFxuICAgICAgICAgICAgJ29nOmRlc2NyaXB0aW9uJzogJ1NoYXJhYmxlIGRhdGEgdmlzdWFsaXphdGlvbidcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBhbmd1bGFyXG4gICAgICAgIC5tb2R1bGUoJ2dyYWZpZGRsZScpXG4gICAgICAgIC5jb250cm9sbGVyKCdBcHBDb250cm9sbGVyJywgQXBwQ29udHJvbGxlcik7XG5cbn0pKCk7XG4iLCIoZnVuY3Rpb24gKCkge1xuXG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgZnVuY3Rpb24gQ2hlY2twb2ludEVuZHBvaW50KCRyZXNvdXJjZSwgRU5WKSB7XG4gICAgICAgIHJldHVybiAkcmVzb3VyY2UoRU5WLmFwaSArICdjaGVja3BvaW50LzppZCcsIHtcbiAgICAgICAgICAgIGlkOiAnQGlkJ1xuICAgICAgICB9LCB7XG4gICAgICAgICAgICBzYXZlOiB7XG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZXQ6IHtcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdHRVQnXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGFuZ3VsYXJcbiAgICAgICAgLm1vZHVsZSgnZ3JhZmlkZGxlJylcbiAgICAgICAgLmZhY3RvcnkoJ0NoZWNrcG9pbnRFbmRwb2ludCcsIENoZWNrcG9pbnRFbmRwb2ludCk7XG5cbn0pKCk7XG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=