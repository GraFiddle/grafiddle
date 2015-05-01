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
        }

        // Create the HTML UI representation of the options json
        //
        function updateOptionsUI(json) {
            $scope.optionsUI = "test";
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImNvbW1vbi9vbi1yZWFkLWZpbGUvb24tcmVhZC1maWxlLWRpcmVjdGl2ZS5qcyIsImVtYmVkL2VtYmVkLWNvbnRyb2xsZXIuanMiLCJlZGl0b3IvZWRpdG9yLWNvbnRyb2xsZXIuanMiLCJjb21tb24vc3RhdGVzLmNvbmZpZy5qcyIsImNvbW1vbi9vbnJlc2l6ZS5qcyIsImNvbW1vbi9hcHAtY29udHJvbGxlci5qcyIsImNoZWNrcG9pbnQvY2hlY2twb2ludC1lbmRwb2ludC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxDQUFDLFlBQVk7O0VBRVg7O0VBRUE7S0FDRyxPQUFPLGFBQWE7TUFDbkI7TUFDQTtNQUNBO01BQ0E7TUFDQTtNQUNBO01BQ0E7TUFDQTtNQUNBOzs7O0FBSU47QUNsQkEsQ0FBQyxZQUFZOztJQUVUOzs7Ozs7Ozs7Ozs7Ozs7SUFlQSxTQUFTLFdBQVcsUUFBUTtRQUN4QixPQUFPO1lBQ0gsVUFBVTtZQUNWLE9BQU87WUFDUCxNQUFNLFNBQVMsT0FBTyxTQUFTLE9BQU87Z0JBQ2xDLElBQUksS0FBSyxPQUFPLE1BQU07O2dCQUV0QixRQUFRLEdBQUcsVUFBVSxTQUFTLGVBQWU7b0JBQ3pDLElBQUksU0FBUyxJQUFJOztvQkFFakIsT0FBTyxTQUFTLFNBQVMsYUFBYTt3QkFDbEMsTUFBTSxPQUFPLFdBQVc7NEJBQ3BCLEdBQUcsT0FBTyxDQUFDLGFBQWEsWUFBWSxPQUFPOzs7O29CQUluRCxPQUFPLFdBQVcsQ0FBQyxjQUFjLGNBQWMsY0FBYyxRQUFRLE1BQU07Ozs7Ozs7SUFNM0Y7U0FDSyxPQUFPO1NBQ1AsVUFBVSxjQUFjOzs7QUFHakM7QUM1Q0EsQ0FBQyxZQUFZOztJQUVULFNBQVMsZ0JBQWdCLFFBQVEsU0FBUyxXQUFXOztRQUVqRCxPQUFPLFdBQVcsVUFBVSxPQUFPLE9BQU8sR0FBRyxNQUFNLEtBQUssR0FBRzs7UUFFM0QsT0FBTyxZQUFZO1FBQ25CLElBQUksY0FBYyxVQUFVLFNBQVM7UUFDckMs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e1xuXG4gICd1c2Ugc3RyaWN0JztcblxuICBhbmd1bGFyXG4gICAgLm1vZHVsZSgnZ3JhZmlkZGxlJywgW1xuICAgICAgJ2dyYWZpZGRsZS5jb25maWcnLFxuICAgICAgJ2dyYWZpZGRsZS50ZW1wbGF0ZXMnLFxuICAgICAgJ25nUmVzb3VyY2UnLFxuICAgICAgJ25nU2FuaXRpemUnLFxuICAgICAgJ25nQW5pbWF0ZScsXG4gICAgICAndWkucm91dGVyJyxcbiAgICAgICd1aS5sYXlvdXQnLFxuICAgICAgJ3VpLmFjZScsXG4gICAgICAnYW5ndWxhckNoYXJ0J1xuICAgIF0pO1xuXG59KSgpO1xuIiwiKGZ1bmN0aW9uICgpIHtcblxuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIC8qKlxuICAgICAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAgICAgKiBAbmFtZSBncmFmaWRkbGUuZGlyZWN0aXZlOm9uUmVhZEZpbGVcbiAgICAgKiBAcmVxdWlyZXMgJHBhcnNlXG4gICAgICogQHJlcXVpcmVzICRsb2dcbiAgICAgKiBAcmVzdHJpY3QgQVxuICAgICAqXG4gICAgICogQGRlc2NyaXB0aW9uXG4gICAgICogVGhlIGBvblJlYWRGaWxlYCBkaXJlY3RpdmUgb3BlbnMgdXAgYSBGaWxlUmVhZGVyIGRpYWxvZyB0byB1cGxvYWQgZmlsZXMgZnJvbSB0aGUgbG9jYWwgZmlsZXN5c3RlbS5cbiAgICAgKlxuICAgICAqIEBlbGVtZW50IEFOWVxuICAgICAqIEBuZ0luamVjdFxuICAgICAqL1xuICAgIGZ1bmN0aW9uIG9uUmVhZEZpbGUoJHBhcnNlKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByZXN0cmljdDogJ0EnLFxuICAgICAgICAgICAgc2NvcGU6IGZhbHNlLFxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XG4gICAgICAgICAgICAgICAgdmFyIGZuID0gJHBhcnNlKGF0dHJzLm9uUmVhZEZpbGUpO1xuXG4gICAgICAgICAgICAgICAgZWxlbWVudC5vbignY2hhbmdlJywgZnVuY3Rpb24ob25DaGFuZ2VFdmVudCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcblxuICAgICAgICAgICAgICAgICAgICByZWFkZXIub25sb2FkID0gZnVuY3Rpb24ob25Mb2FkRXZlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLiRhcHBseShmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmbihzY29wZSwgeyRmaWxlQ29udGVudDpvbkxvYWRFdmVudC50YXJnZXQucmVzdWx0fSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgICAgICByZWFkZXIucmVhZEFzVGV4dCgob25DaGFuZ2VFdmVudC5zcmNFbGVtZW50IHx8IG9uQ2hhbmdlRXZlbnQudGFyZ2V0KS5maWxlc1swXSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgYW5ndWxhclxuICAgICAgICAubW9kdWxlKCdncmFmaWRkbGUnKVxuICAgICAgICAuZGlyZWN0aXZlKCdvblJlYWRGaWxlJywgb25SZWFkRmlsZSk7XG5cbn0pKCk7XG4iLCIoZnVuY3Rpb24gKCkge1xuXG4gICAgZnVuY3Rpb24gRW1iZWRDb250cm9sbGVyKCRzY29wZSwgJGZpbHRlciwgJGxvY2F0aW9uKSB7XG5cbiAgICAgICAgJHNjb3BlLmZpZGRsZWlkID0gJGxvY2F0aW9uLnBhdGgoKS5zdWJzdHIoMSkuc3BsaXQoJz8nLCAxKVswXTtcblxuICAgICAgICAkc2NvcGUuZW1iZWRWaWV3ID0gJ2NoYXJ0JztcbiAgICAgICAgdmFyIHJlcXVlc3RWaWV3ID0gJGxvY2F0aW9uLnNlYXJjaCgpLnZpZXc7XG4gICAgICAgIGlmKHJlcXVlc3RWaWV3KSB7XG4gICAgICAgICAgICAkc2NvcGUuZW1iZWRWaWV3ID0gcmVxdWVzdFZpZXc7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgICRzY29wZS5zZXRWaWV3ID0gZnVuY3Rpb24obmV3Vmlldykge1xuICAgICAgICAgICAgJHNjb3BlLmVtYmVkVmlldyA9IG5ld1ZpZXc7XG4gICAgICAgICAgICAkc2NvcGUub3B0aW9uc0VkaXRvci5yZXNpemUoKTtcbiAgICAgICAgICAgICRzY29wZS5kYXRhRWRpdG9yLnJlc2l6ZSgpO1xuICAgICAgICAgICAgJHNjb3BlLm9wdGlvbnNFZGl0b3IucmVuZGVyZXIudXBkYXRlRnVsbCgpO1xuICAgICAgICAgICAgJHNjb3BlLmRhdGFFZGl0b3IucmVuZGVyZXIudXBkYXRlRnVsbCgpO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5pc1ZpZXcgPSBmdW5jdGlvbih2aWV3KSB7XG4gICAgICAgICAgICByZXR1cm4gdmlldyA9PSAkc2NvcGUuZW1iZWRWaWV3O1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5kYXRhc2V0U3RyaW5nID0gJyc7XG4gICAgICAgICRzY29wZS5kYXRhc2V0ID0gW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICdkYXknOiAnMjAxMy0wMS0wMl8wMDowMDowMCcsXG4gICAgICAgICAgICAgICAgJ3NhbGVzJzogMzQ2MS4yOTUyMDIsXG4gICAgICAgICAgICAgICAgJ2luY29tZSc6IDEyMzY1LjA1M1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAnZGF5JzogJzIwMTMtMDEtMDNfMDA6MDA6MDAnLFxuICAgICAgICAgICAgICAgICdzYWxlcyc6IDQ0NjEuMjk1MjAyLFxuICAgICAgICAgICAgICAgICdpbmNvbWUnOiAxMzM2NS4wNTNcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgJ2RheSc6ICcyMDEzLTAxLTA0XzAwOjAwOjAwJyxcbiAgICAgICAgICAgICAgICAnc2FsZXMnOiA0NTYxLjI5NTIwMixcbiAgICAgICAgICAgICAgICAnaW5jb21lJzogMTQzNjUuMDUzXG4gICAgICAgICAgICB9XG4gICAgICAgIF07XG5cbiAgICAgICAgJHNjb3BlLnNjaGVtYSA9IHtcbiAgICAgICAgICAgIGRheToge1xuICAgICAgICAgICAgICAgIHR5cGU6ICdkYXRldGltZScsXG4gICAgICAgICAgICAgICAgZm9ybWF0OiAnJVktJW0tJWRfJUg6JU06JVMnLFxuICAgICAgICAgICAgICAgIG5hbWU6ICdEYXRlJ1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5vcHRpb25zU3RyaW5nID0gJyc7XG4gICAgICAgICRzY29wZS5vcHRpb25zID0ge1xuICAgICAgICAgICAgcm93czogW3tcbiAgICAgICAgICAgICAgICBrZXk6ICdpbmNvbWUnLFxuICAgICAgICAgICAgICAgIHR5cGU6ICdiYXInXG4gICAgICAgICAgICB9LCB7XG4gICAgICAgICAgICAgICAga2V5OiAnc2FsZXMnXG4gICAgICAgICAgICB9XSxcbiAgICAgICAgICAgIHhBeGlzOiB7XG4gICAgICAgICAgICAgICAga2V5OiAnZGF5JyxcbiAgICAgICAgICAgICAgICBkaXNwbGF5Rm9ybWF0OiAnJVktJW0tJWQgJUg6JU06JVMnXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gZGVmaW5lIGNvZGUgaGlnaGxpZ2h0aW5nXG4gICAgICAgICRzY29wZS5vcHRpb25zQWNlQ29uZmlnID0ge1xuICAgICAgICAgICAgbW9kZTogJ2pzb24nLFxuICAgICAgICAgICAgdXNlV3JhcE1vZGU6IGZhbHNlLFxuICAgICAgICAgICAgb25Mb2FkOiBmdW5jdGlvbihfZWRpdG9yKSB7XG4gICAgICAgICAgICAgICAgX2VkaXRvci5zZXRTaG93UHJpbnRNYXJnaW4oZmFsc2UpO1xuICAgICAgICAgICAgICAgICRzY29wZS5vcHRpb25zRWRpdG9yID0gX2VkaXRvcjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuZGF0YXNldEFjZUNvbmZpZyA9IHtcbiAgICAgICAgICAgIG1vZGU6ICdqc29uJyxcbiAgICAgICAgICAgIHVzZVdyYXBNb2RlOiBmYWxzZSxcbiAgICAgICAgICAgIG9uTG9hZDogZnVuY3Rpb24oX2VkaXRvcikge1xuICAgICAgICAgICAgICAgIF9lZGl0b3Iuc2V0U2hvd1ByaW50TWFyZ2luKGZhbHNlKTtcbiAgICAgICAgICAgICAgICAkc2NvcGUuZGF0YUVkaXRvciA9IF9lZGl0b3I7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cblxuICAgICAgICAkc2NvcGUuJHdhdGNoKCdvcHRpb25zJywgZnVuY3Rpb24oanNvbikge1xuICAgICAgICAgICAgJHNjb3BlLm9wdGlvbnNTdHJpbmcgPSAkZmlsdGVyKCdqc29uJykoanNvbik7XG4gICAgICAgIH0sIHRydWUpO1xuXG4gICAgICAgICRzY29wZS4kd2F0Y2goJ29wdGlvbnNTdHJpbmcnLCBmdW5jdGlvbihqc29uKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICRzY29wZS5vcHRpb25zID0gSlNPTi5wYXJzZShqc29uKTtcbiAgICAgICAgICAgICAgICAkc2NvcGUud2VsbEZvcm1lZE9wdGlvbnMgPSB0cnVlO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICRzY29wZS53ZWxsRm9ybWVkT3B0aW9ucyA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCB0cnVlKTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoKCdkYXRhc2V0JywgZnVuY3Rpb24oanNvbikge1xuICAgICAgICAgICAgJHNjb3BlLmRhdGFzZXRTdHJpbmcgPSAkZmlsdGVyKCdqc29uJykoanNvbik7XG4gICAgICAgIH0sIHRydWUpO1xuXG4gICAgICAgICRzY29wZS4kd2F0Y2goJ2RhdGFzZXRTdHJpbmcnLCBmdW5jdGlvbihqc29uKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICRzY29wZS5kYXRhc2V0ID0gSlNPTi5wYXJzZShqc29uKTtcbiAgICAgICAgICAgICAgICAkc2NvcGUud2VsbEZvcm1lZERhdGFzZXQgPSB0cnVlO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICRzY29wZS53ZWxsRm9ybWVkRGF0YXNldCA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCB0cnVlKTtcblxuICAgIH1cblxuICAgIGFuZ3VsYXJcbiAgICAgICAgLm1vZHVsZSgnZ3JhZmlkZGxlJylcbiAgICAgICAgLmNvbnRyb2xsZXIoJ0VtYmVkQ29udHJvbGxlcicsIEVtYmVkQ29udHJvbGxlcik7XG5cbn0pKCk7XG4iLCIoZnVuY3Rpb24gKCkge1xuXG4gICAgZnVuY3Rpb24gRWRpdG9yQ29udHJvbGxlcigkc2NvcGUsICRmaWx0ZXIsICRzdGF0ZSwgJHdpbmRvdywgJHRpbWVvdXQsIENoZWNrcG9pbnRFbmRwb2ludCkge1xuXG4gICAgICAgICRzY29wZS5zaG93RGF0YUVkaXRvciA9IGZhbHNlO1xuICAgICAgICAkc2NvcGUuc2hvd09wdGlvbnNVSSAgPSBmYWxzZTtcbiAgICAgICAgJHNjb3BlLnNob3dTaGFyZVBvcHVwID0gZmFsc2U7XG4gICAgICAgICRzY29wZS5zd2l0Y2hEYXRhQnV0dG9uVGl0bGUgICAgPSAnTWFudWFsIGRhdGEgZW50cnknO1xuICAgICAgICAkc2NvcGUuc3dpdGNoT3B0aW9uc0J1dHRvblRpdGxlID0gJ0VkaXQgaW4gR1VJJztcbiAgICAgICAgJHNjb3BlLnRvZ2dsZURhdGFFZGl0b3IgPSB0b2dnbGVEYXRhRWRpdG9yO1xuICAgICAgICAkc2NvcGUudG9nZ2xlT3B0aW9uc1VJICA9IHRvZ2dsZU9wdGlvbnNVSTtcbiAgICAgICAgJHNjb3BlLnNoYXJlUG9wdXAgICAgICAgPSBzaGFyZVBvcHVwO1xuICAgICAgICAkc2NvcGUub25TaGFyZVRleHRDbGljayA9IG9uU2hhcmVUZXh0Q2xpY2s7XG5cbiAgICAgICAgJHNjb3BlLnNoYXJlID0gc2hhcmU7XG4gICAgICAgICRzY29wZS5zYXZlID0gc2F2ZTtcbiAgICAgICAgJHNjb3BlLnVwbG9hZEZpbGUgPSB1cGxvYWRGaWxlO1xuXG4gICAgICAgICRzY29wZS5jaGVja3BvaW50ID0ge307XG4gICAgICAgICRzY29wZS5hY2VKc29uQ29uZmlnID0ge1xuICAgICAgICAgICAgbW9kZTogJ2pzb24nLFxuICAgICAgICAgICAgdXNlV3JhcE1vZGU6IGZhbHNlLFxuICAgICAgICAgICAgb25Mb2FkOiBmdW5jdGlvbiAoX2VkaXRvcikge1xuICAgICAgICAgICAgICAgIF9lZGl0b3Iuc2V0U2hvd1ByaW50TWFyZ2luKGZhbHNlKTtcbiAgICAgICAgICAgICAgICBfZWRpdG9yLiRibG9ja1Njcm9sbGluZyA9IEluZmluaXR5O1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIGFjdGl2YXRlKCk7XG5cbiAgICAgICAgLy8vLy8vLy8vLy8vXG5cbiAgICAgICAgZnVuY3Rpb24gYWN0aXZhdGUoKSB7XG5cbiAgICAgICAgICAgIGlmICgkc3RhdGUucGFyYW1zLmlkKSB7XG4gICAgICAgICAgICAgICAgQ2hlY2twb2ludEVuZHBvaW50XG4gICAgICAgICAgICAgICAgICAgIC5nZXQoe2lkOiAkc3RhdGUucGFyYW1zLmlkfSlcbiAgICAgICAgICAgICAgICAgICAgLiRwcm9taXNlXG4gICAgICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKGNoZWNrcG9pbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5zZXJ2ZXJDaGVja3BvaW50ID0gY2hlY2twb2ludDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNldENoZWNrcG9pbnQoY2hlY2twb2ludCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAkdGltZW91dChzYXZlQXNJbWFnZSwgMCk7XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIC5jYXRjaChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICAgICAgJHN0YXRlLmdvKCdlZGl0b3InLCB7aWQ6ICcnfSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBsb2FkRGVmYXVsdERhdGEoKTtcbiAgICAgICAgICAgICAgICAkdGltZW91dChzYXZlQXNJbWFnZSwgMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzeW5jT3B0aW9ucygpO1xuICAgICAgICAgICAgc3luY0RhdGFzZXQoKTtcbiAgICAgICAgICAgIHVwZGF0ZU9uUmVzaXplKCk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBzYXZlQXNJbWFnZSgpIHtcbiAgICAgICAgICAgIGNhbnZnKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjYW52YXMnKSwgZDMuc2VsZWN0KFwiLmFuZ3VsYXJjaGFydFwiKS5ub2RlKCkuaW5uZXJIVE1MKTtcbiAgICAgICAgICAgICRzY29wZS5hc0ltYWdlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NhbnZhcycpLnRvRGF0YVVSTCgpO1xuICAgICAgICAgICAgJHNjb3BlLm1ldGFkYXRhLm9nWydvZzppbWFnZSddID0gJHNjb3BlLmFzSW1hZ2U7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTYXZlIHRoZSBjdXJyZW50IFZlcnNpb25cbiAgICAgICAgLy9cbiAgICAgICAgZnVuY3Rpb24gc2F2ZSgpIHtcbiAgICAgICAgICAgIENoZWNrcG9pbnRFbmRwb2ludC5zYXZlKHtcbiAgICAgICAgICAgICAgICBcImRhdGFcIjogJHNjb3BlLmNoZWNrcG9pbnQuZGF0YXNldCxcbiAgICAgICAgICAgICAgICBcIm9wdGlvbnNcIjogJHNjb3BlLmNoZWNrcG9pbnQub3B0aW9ucyxcbiAgICAgICAgICAgICAgICBcImF1dGhvclwiOiBcIkFub255bVwiXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC4kcHJvbWlzZVxuICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uIChjaGVja3BvaW50KSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzYXZlZCBjaGVja3BvaW50OiAnLCBjaGVja3BvaW50KTtcbiAgICAgICAgICAgICAgICAgICAgJHN0YXRlLmdvKCdlZGl0b3InLCB7aWQ6IGNoZWNrcG9pbnQuaWR9KTtcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC5jYXRjaChmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdzYXZlIGZhaWxlZCcsIGUpO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgIH1cblxuICAgICAgICAvLyBTaGFyZSB0aGUgZmlkZGxlXG4gICAgICAgIC8vXG4gICAgICAgIGZ1bmN0aW9uIHNoYXJlKHRhcmdldCkge1xuICAgICAgICAgICAgZmlkZGxlVVJMICAgICAgID0gJ2h0dHA6Ly9ncmFmaWRkbGUuYXBwc3BvdC5jb20vJyArICRzdGF0ZS5wYXJhbXMuaWQ7XG4gICAgICAgICAgICBpZih0YXJnZXQgPT0gJ0ZCJykge1xuICAgICAgICAgICAgICAgICR3aW5kb3cub3BlbignaHR0cHM6Ly93d3cuZmFjZWJvb2suY29tL3NoYXJlci9zaGFyZXIucGhwP3U9JyArIGZpZGRsZVVSTCwgJ19ibGFuaycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYodGFyZ2V0ID09ICdUd2l0dGVyJykge1xuICAgICAgICAgICAgICAgICR3aW5kb3cub3BlbignaHR0cHM6Ly90d2l0dGVyLmNvbS9pbnRlbnQvdHdlZXQ/dGV4dD1DaGVjayUyMG91dCUyMHRoaXMlMjBzd2VldCUyMGdyYWZpZGRsZSUyMCZ1cmw9JyArIGZpZGRsZVVSTCwgJ19ibGFuaycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYodGFyZ2V0ID09ICdFLU1haWwnKSB7XG4gICAgICAgICAgICAgICAgJHdpbmRvdy5sb2NhdGlvbiA9ICdtYWlsdG86YUBiLmNkP3N1YmplY3Q9Q2hlY2slMjBvdXQlMjB0aGlzJTIwYXdlc29tZSUyMEdyYWZpZGRsZSZib2R5PScgKyBmaWRkbGVVUkw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVcGxvYWQgYSBmaWxlIGFzIGRhdGEgc291cmNlXG4gICAgICAgIC8vXG4gICAgICAgIGZ1bmN0aW9uIHVwbG9hZEZpbGUoZmlsZSkge1xuICAgICAgICAgICAgJHNjb3BlLmNoZWNrcG9pbnQuZGF0YXNldFN0cmluZyA9IGZpbGU7XG4gICAgICAgICAgICAkc2NvcGUudG9nZ2xlRGF0YUVkaXRvcigpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVG9nZ2xlIGZyb20gZGF0YSB2aWV3XG4gICAgICAgIC8vXG4gICAgICAgIGZ1bmN0aW9uIHRvZ2dsZURhdGFFZGl0b3IoKSB7XG4gICAgICAgICAgICAkc2NvcGUuc2hvd0RhdGFFZGl0b3IgPSAhJHNjb3BlLnNob3dEYXRhRWRpdG9yO1xuICAgICAgICAgICAgJHNjb3BlLnN3aXRjaERhdGFCdXR0b25UaXRsZSA9ICRzY29wZS5zaG93RGF0YUVkaXRvciA/ICdCYWNrIHRvIGlucHV0IGRpYWxvZycgOiAnTWFudWFsIGRhdGEgZW50cnknO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVG9nZ2xlIGZyb20ganNvbi1vcHRpb24gdmlld1xuICAgICAgICAvL1xuICAgICAgICBmdW5jdGlvbiB0b2dnbGVPcHRpb25zVUkoKSB7XG4gICAgICAgICAgICAkc2NvcGUuc2hvd09wdGlvbnNVSSA9ICEkc2NvcGUuc2hvd09wdGlvbnNVSTtcbiAgICAgICAgICAgICRzY29wZS5zd2l0Y2hPcHRpb25zQnV0dG9uVGl0bGUgPSAkc2NvcGUuc2hvd09wdGlvbnNVSSA/ICdFZGl0IGFzIEpTT04nIDogJ0VkaXQgaW4gR1VJJztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENyZWF0ZSB0aGUgSFRNTCBVSSByZXByZXNlbnRhdGlvbiBvZiB0aGUgb3B0aW9ucyBqc29uXG4gICAgICAgIC8vXG4gICAgICAgIGZ1bmN0aW9uIHVwZGF0ZU9wdGlvbnNVSShqc29uKSB7XG4gICAgICAgICAgICAkc2NvcGUub3B0aW9uc1VJID0gXCJ0ZXN0XCI7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTaG93IHRoZSBzaGFyZSBzaGVldFxuICAgICAgICAvL1xuICAgICAgICBmdW5jdGlvbiBzaGFyZVBvcHVwKCkge1xuICAgICAgICAgICAgJHNjb3BlLnNob3dTaGFyZVBvcHVwID0gISRzY29wZS5zaG93U2hhcmVQb3B1cDtcbiAgICAgICAgICAgICRzY29wZS5maWRkbGVVUkwgICAgICAgPSAnaHR0cDovL2dyYWZpZGRsZS5hcHBzcG90LmNvbS8nICsgJHN0YXRlLnBhcmFtcy5pZDtcbiAgICAgICAgICAgICRzY29wZS5maWRkbGVDaGFydFVSTCAgPSAnaHR0cDovL2dyYWZpZGRsZS5hcHBzcG90LmNvbS8nICsgJHN0YXRlLnBhcmFtcy5pZCArICcucG5nJztcbiAgICAgICAgICAgICRzY29wZS5maWRkbGVFbWJlZENvZGUgPSAnPGlmcmFtZSB3aWR0aD1cIjEwMCVcIiBoZWlnaHQ9XCIzMDBcIiBzcmM9XCIvL2dyYWZpZGRsZS5hcHBzcG90LmNvbS9lbWJlZC8nICsgJHN0YXRlLnBhcmFtcy5pZCArICdcIiBhbGxvd2Z1bGxzY3JlZW49XCJhbGxvd2Z1bGxzY3JlZW5cIiBmcmFtZWJvcmRlcj1cIjBcIj48L2lmcmFtZT4nO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQWxsb3cgc2hhcmUgdGV4dCBmaWVsZHMgdG8gYXV0b3NlbGVjdCBvbiBmb2N1c1xuICAgICAgICAvL1xuICAgICAgICBmdW5jdGlvbiBvblNoYXJlVGV4dENsaWNrKCRldmVudCkge1xuICAgICAgICAgICAgJGV2ZW50LnRhcmdldC5zZWxlY3QoKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBJbnNlcnQgZGVmYXVsdCBkYXRhXG4gICAgICAgIC8vXG4gICAgICAgIGZ1bmN0aW9uIGxvYWREZWZhdWx0RGF0YSgpIHtcbiAgICAgICAgICAgIHZhciBkYXRhc2V0ID0gW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgJ2RheSc6ICcyMDEzLTAxLTAyXzAwOjAwOjAwJyxcbiAgICAgICAgICAgICAgICAgICAgJ3NhbGVzJzogMzQ2MS4yOTUyMDIsXG4gICAgICAgICAgICAgICAgICAgICdpbmNvbWUnOiAxMjM2NS4wNTNcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgJ2RheSc6ICcyMDEzLTAxLTAzXzAwOjAwOjAwJyxcbiAgICAgICAgICAgICAgICAgICAgJ3NhbGVzJzogNDQ2MS4yOTUyMDIsXG4gICAgICAgICAgICAgICAgICAgICdpbmNvbWUnOiAxMzM2NS4wNTNcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgJ2RheSc6ICcyMDEzLTAxLTA0XzAwOjAwOjAwJyxcbiAgICAgICAgICAgICAgICAgICAgJ3NhbGVzJzogNDU2MS4yOTUyMDIsXG4gICAgICAgICAgICAgICAgICAgICdpbmNvbWUnOiAxNDM2NS4wNTNcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdO1xuICAgICAgICAgICAgdmFyIHNjaGVtYSA9IHtcbiAgICAgICAgICAgICAgICBkYXk6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2RhdGV0aW1lJyxcbiAgICAgICAgICAgICAgICAgICAgZm9ybWF0OiAnJVktJW0tJWRfJUg6JU06JVMnLFxuICAgICAgICAgICAgICAgICAgICBuYW1lOiAnRGF0ZSdcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdmFyIG9wdGlvbnMgPSB7XG4gICAgICAgICAgICAgICAgcm93czogW3tcbiAgICAgICAgICAgICAgICAgICAga2V5OiAnaW5jb21lJyxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2JhcidcbiAgICAgICAgICAgICAgICB9LCB7XG4gICAgICAgICAgICAgICAgICAgIGtleTogJ3NhbGVzJ1xuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgICAgICAgIHhBeGlzOiB7XG4gICAgICAgICAgICAgICAgICAgIGtleTogJ2RheScsXG4gICAgICAgICAgICAgICAgICAgIGRpc3BsYXlGb3JtYXQ6ICclWS0lbS0lZCAlSDolTTolUydcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAkc2NvcGUuY2hlY2twb2ludC5kYXRhc2V0U3RyaW5nID0gJyc7XG4gICAgICAgICAgICAkc2NvcGUuY2hlY2twb2ludC5kYXRhc2V0ID0gZGF0YXNldDtcbiAgICAgICAgICAgICRzY29wZS5jaGVja3BvaW50LnNjaGVtYVN0cmluZyA9ICcnO1xuICAgICAgICAgICAgJHNjb3BlLmNoZWNrcG9pbnQuc2NoZW1hID0gc2NoZW1hO1xuICAgICAgICAgICAgJHNjb3BlLmNoZWNrcG9pbnQub3B0aW9uc1N0cmluZyA9ICcnO1xuICAgICAgICAgICAgJHNjb3BlLmNoZWNrcG9pbnQub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBzZXRDaGVja3BvaW50KGNoZWNrcG9pbnQpIHtcbiAgICAgICAgICAgICRzY29wZS5jaGVja3BvaW50LmRhdGFzZXRTdHJpbmcgPSAnJztcbiAgICAgICAgICAgICRzY29wZS5jaGVja3BvaW50LmRhdGFzZXQgPSBjaGVja3BvaW50LmRhdGE7XG4gICAgICAgICAgICAkc2NvcGUuY2hlY2twb2ludC5zY2hlbWFTdHJpbmcgPSAnJztcbiAgICAgICAgICAgICRzY29wZS5jaGVja3BvaW50LnNjaGVtYSA9IHt9O1xuICAgICAgICAgICAgJHNjb3BlLmNoZWNrcG9pbnQub3B0aW9uc1N0cmluZyA9ICcnO1xuICAgICAgICAgICAgJHNjb3BlLmNoZWNrcG9pbnQub3B0aW9ucyA9IGNoZWNrcG9pbnQub3B0aW9ucztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFN5bmMgT2JqZWN0IGFuZCBTdHJpbmcgcmVwcmVzZW50YXRpb25cbiAgICAgICAgLy9cbiAgICAgICAgZnVuY3Rpb24gc3luY09wdGlvbnMoKSB7XG4gICAgICAgICAgICAkc2NvcGUuJHdhdGNoKCdjaGVja3BvaW50Lm9wdGlvbnMnLCBmdW5jdGlvbiAoanNvbikge1xuICAgICAgICAgICAgICAgICRzY29wZS5jaGVja3BvaW50Lm9wdGlvbnNTdHJpbmcgPSAkZmlsdGVyKCdqc29uJykoanNvbik7XG4gICAgICAgICAgICB9LCB0cnVlKTtcblxuICAgICAgICAgICAgJHNjb3BlLiR3YXRjaCgnY2hlY2twb2ludC5vcHRpb25zU3RyaW5nJywgZnVuY3Rpb24gKGpzb24pIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY2hlY2twb2ludC5vcHRpb25zID0gSlNPTi5wYXJzZShqc29uKTtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLndlbGxGb3JtZWRPcHRpb25zID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgdXBkYXRlT3B0aW9uc1VJKGpzb24pO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLndlbGxGb3JtZWRPcHRpb25zID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgdHJ1ZSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTeW5jIE9iamVjdCBhbmQgU3RyaW5nIHJlcHJlc2VudGF0aW9uXG4gICAgICAgIC8vXG4gICAgICAgIGZ1bmN0aW9uIHN5bmNEYXRhc2V0KCkge1xuICAgICAgICAgICAgJHNjb3BlLiR3YXRjaCgnY2hlY2twb2ludC5kYXRhc2V0JywgZnVuY3Rpb24gKGpzb24pIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUuY2hlY2twb2ludC5kYXRhc2V0U3RyaW5nID0gJGZpbHRlcignanNvbicpKGpzb24pO1xuICAgICAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgICAgICRzY29wZS4kd2F0Y2goJ2NoZWNrcG9pbnQuZGF0YXNldFN0cmluZycsIGZ1bmN0aW9uIChqc29uKSB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmNoZWNrcG9pbnQuZGF0YXNldCA9IEpTT04ucGFyc2UoanNvbik7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS53ZWxsRm9ybWVkRGF0YXNldCA9IHRydWU7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUud2VsbEZvcm1lZERhdGFzZXQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCB0cnVlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFkZCB0aW1lc3RhbXAgdG8gb3B0aW9ucyB0byByZWRyYXdcbiAgICAgICAgLy9cbiAgICAgICAgZnVuY3Rpb24gb3BkYXRlT3B0aW9ucygpIHtcbiAgICAgICAgICAgIC8vIElzIGNhbGxlZCB0byBvZnRlbiwgbm90IG9ubHkgb24gcmVzaXplXG4gICAgICAgICAgICAvLyRzY29wZS5jaGVja3BvaW50Lm9wdGlvbnMudXBkYXRlZCA9IG5ldyBEYXRlKCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBUcmlnZ2VyIG5ldyByZW5kZXIgb24gcmVzaXplXG4gICAgICAgIC8vXG4gICAgICAgIGZ1bmN0aW9uIHVwZGF0ZU9uUmVzaXplKCkge1xuICAgICAgICAgICAgdmFyIG15RWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjaGFydEFyZWEnKTtcbiAgICAgICAgICAgIGFkZFJlc2l6ZUxpc3RlbmVyKG15RWxlbWVudCwgb3BkYXRlT3B0aW9ucyk7XG5cbiAgICAgICAgICAgICRzY29wZS4kb24oXCIkZGVzdHJveVwiLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmVtb3ZlUmVzaXplTGlzdGVuZXIobXlFbGVtZW50LCBvcGRhdGVPcHRpb25zKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICB9XG5cbiAgICBhbmd1bGFyXG4gICAgICAgIC5tb2R1bGUoJ2dyYWZpZGRsZScpXG4gICAgICAgIC5jb250cm9sbGVyKCdFZGl0b3JDb250cm9sbGVyJywgRWRpdG9yQ29udHJvbGxlcik7XG5cbn0pKCk7XG4iLCIoZnVuY3Rpb24gKCkge1xuXG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgZnVuY3Rpb24gc3RhdGVzQ29uZmlndXJhdGlvbigkc3RhdGVQcm92aWRlciwgJHVybFJvdXRlclByb3ZpZGVyLCAkbG9jYXRpb25Qcm92aWRlcikge1xuXG4gICAgICAgICRzdGF0ZVByb3ZpZGVyXG4gICAgICAgICAgICAuc3RhdGUoJzQwNCcsIHtcbiAgICAgICAgICAgICAgICB2aWV3czoge1xuICAgICAgICAgICAgICAgICAgICBjb250ZW50OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ2NvbXBvbmVudHMvY29tbW9uLzQwNC80MDQuaHRtbCdcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuc3RhdGUoJ2VtYmVkJywge1xuICAgICAgICAgICAgICAgIHVybDogJy9lbWJlZCcsXG4gICAgICAgICAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAgICAgICAgICAgY29udGVudDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdjb21wb25lbnRzL2VtYmVkL2VtYmVkLmh0bWwnLFxuICAgICAgICAgICAgICAgICAgICAgICAgY29udHJvbGxlcjogJ0VtYmVkQ29udHJvbGxlcidcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuc3RhdGUoJ2VkaXRvcicsIHtcbiAgICAgICAgICAgICAgICB1cmw6ICcvOmlkJyxcbiAgICAgICAgICAgICAgICB2aWV3czoge1xuICAgICAgICAgICAgICAgICAgICBjb250ZW50OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ2NvbXBvbmVudHMvZWRpdG9yL2VkaXRvci5odG1sJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdFZGl0b3JDb250cm9sbGVyJ1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgLyogQG5nSW5qZWN0ICovXG4gICAgICAgICR1cmxSb3V0ZXJQcm92aWRlci5vdGhlcndpc2UoZnVuY3Rpb24gKCRpbmplY3RvciwgJGxvY2F0aW9uKSB7XG4gICAgICAgICAgICAvLyBVc2VyU2VydmljZSAmICRzdGF0ZSBub3QgYXZhaWxhYmxlIGR1cmluZyAuY29uZmlnKCksIGluamVjdCB0aGVtIChtYW51YWxseSkgbGF0ZXJcblxuICAgICAgICAgICAgLy8gcmVxdWVzdGluZyB1bmtub3duIHBhZ2UgdW5lcXVhbCB0byAnLydcbiAgICAgICAgICAgIHZhciBwYXRoID0gJGxvY2F0aW9uLnBhdGgoKTtcbiAgICAgICAgICAgIGlmIChwYXRoICE9PSAnLycpIHtcbiAgICAgICAgICAgICAgICAkaW5qZWN0b3IuZ2V0KCckc3RhdGUnKS5nbygnNDA0Jyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhdGg7IC8vIHRoaXMgdHJpY2sgYWxsb3dzIHRvIHNob3cgdGhlIGVycm9yIHBhZ2Ugb24gdW5rbm93biBhZGRyZXNzXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiAnL25ldyc7XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRsb2NhdGlvblByb3ZpZGVyXG4gICAgICAgICAgICAuaHRtbDVNb2RlKHRydWUpXG4gICAgICAgICAgICAuaGFzaFByZWZpeCgnIScpO1xuICAgIH1cblxuXG4gICAgYW5ndWxhclxuICAgICAgICAubW9kdWxlKCdncmFmaWRkbGUnKVxuICAgICAgICAuY29uZmlnKHN0YXRlc0NvbmZpZ3VyYXRpb24pO1xuXG59KSgpOyIsIihmdW5jdGlvbigpe1xuXG4gICAgdmFyIGF0dGFjaEV2ZW50ID0gZG9jdW1lbnQuYXR0YWNoRXZlbnQ7XG4gICAgdmFyIGlzSUUgPSBuYXZpZ2F0b3IudXNlckFnZW50Lm1hdGNoKC9UcmlkZW50Lyk7XG4gICAgdmFyIHJlcXVlc3RGcmFtZSA9IChmdW5jdGlvbigpe1xuICAgICAgICB2YXIgcmFmID0gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSB8fCB3aW5kb3cubW96UmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8IHdpbmRvdy53ZWJraXRSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcbiAgICAgICAgICAgIGZ1bmN0aW9uKGZuKXsgcmV0dXJuIHdpbmRvdy5zZXRUaW1lb3V0KGZuLCAyMCk7IH07XG4gICAgICAgIHJldHVybiBmdW5jdGlvbihmbil7IHJldHVybiByYWYoZm4pOyB9O1xuICAgIH0pKCk7XG5cbiAgICB2YXIgY2FuY2VsRnJhbWUgPSAoZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIGNhbmNlbCA9IHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZSB8fCB3aW5kb3cubW96Q2FuY2VsQW5pbWF0aW9uRnJhbWUgfHwgd2luZG93LndlYmtpdENhbmNlbEFuaW1hdGlvbkZyYW1lIHx8XG4gICAgICAgICAgICB3aW5kb3cuY2xlYXJUaW1lb3V0O1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24oaWQpeyByZXR1cm4gY2FuY2VsKGlkKTsgfTtcbiAgICB9KSgpO1xuXG4gICAgZnVuY3Rpb24gcmVzaXplTGlzdGVuZXIoZSl7XG4gICAgICAgIHZhciB3aW4gPSBlLnRhcmdldCB8fCBlLnNyY0VsZW1lbnQ7XG4gICAgICAgIGlmICh3aW4uX19yZXNpemVSQUZfXykgY2FuY2VsRnJhbWUod2luLl9fcmVzaXplUkFGX18pO1xuICAgICAgICB3aW4uX19yZXNpemVSQUZfXyA9IHJlcXVlc3RGcmFtZShmdW5jdGlvbigpe1xuICAgICAgICAgICAgdmFyIHRyaWdnZXIgPSB3aW4uX19yZXNpemVUcmlnZ2VyX187XG4gICAgICAgICAgICB0cmlnZ2VyLl9fcmVzaXplTGlzdGVuZXJzX18uZm9yRWFjaChmdW5jdGlvbihmbil7XG4gICAgICAgICAgICAgICAgZm4uY2FsbCh0cmlnZ2VyLCBlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBvYmplY3RMb2FkKGUpe1xuICAgICAgICB0aGlzLmNvbnRlbnREb2N1bWVudC5kZWZhdWx0Vmlldy5fX3Jlc2l6ZVRyaWdnZXJfXyA9IHRoaXMuX19yZXNpemVFbGVtZW50X187XG4gICAgICAgIHRoaXMuY29udGVudERvY3VtZW50LmRlZmF1bHRWaWV3LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIHJlc2l6ZUxpc3RlbmVyKTtcbiAgICB9XG5cbiAgICB3aW5kb3cuYWRkUmVzaXplTGlzdGVuZXIgPSBmdW5jdGlvbihlbGVtZW50LCBmbil7XG4gICAgICAgIGlmICghZWxlbWVudC5fX3Jlc2l6ZUxpc3RlbmVyc19fKSB7XG4gICAgICAgICAgICBlbGVtZW50Ll9fcmVzaXplTGlzdGVuZXJzX18gPSBbXTtcbiAgICAgICAgICAgIGlmIChhdHRhY2hFdmVudCkge1xuICAgICAgICAgICAgICAgIGVsZW1lbnQuX19yZXNpemVUcmlnZ2VyX18gPSBlbGVtZW50O1xuICAgICAgICAgICAgICAgIGVsZW1lbnQuYXR0YWNoRXZlbnQoJ29ucmVzaXplJywgcmVzaXplTGlzdGVuZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKGdldENvbXB1dGVkU3R5bGUoZWxlbWVudCkucG9zaXRpb24gPT0gJ3N0YXRpYycpIGVsZW1lbnQuc3R5bGUucG9zaXRpb24gPSAncmVsYXRpdmUnO1xuICAgICAgICAgICAgICAgIHZhciBvYmogPSBlbGVtZW50Ll9fcmVzaXplVHJpZ2dlcl9fID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnb2JqZWN0Jyk7XG4gICAgICAgICAgICAgICAgb2JqLnNldEF0dHJpYnV0ZSgnc3R5bGUnLCAnZGlzcGxheTogYmxvY2s7IHBvc2l0aW9uOiBhYnNvbHV0ZTsgdG9wOiAwOyBsZWZ0OiAwOyBoZWlnaHQ6IDEwMCU7IHdpZHRoOiAxMDAlOyBvdmVyZmxvdzogaGlkZGVuOyBwb2ludGVyLWV2ZW50czogbm9uZTsgei1pbmRleDogLTE7Jyk7XG4gICAgICAgICAgICAgICAgb2JqLl9fcmVzaXplRWxlbWVudF9fID0gZWxlbWVudDtcbiAgICAgICAgICAgICAgICBvYmoub25sb2FkID0gb2JqZWN0TG9hZDtcbiAgICAgICAgICAgICAgICBvYmoudHlwZSA9ICd0ZXh0L2h0bWwnO1xuICAgICAgICAgICAgICAgIGlmIChpc0lFKSBlbGVtZW50LmFwcGVuZENoaWxkKG9iaik7XG4gICAgICAgICAgICAgICAgb2JqLmRhdGEgPSAnYWJvdXQ6YmxhbmsnO1xuICAgICAgICAgICAgICAgIGlmICghaXNJRSkgZWxlbWVudC5hcHBlbmRDaGlsZChvYmopO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsZW1lbnQuX19yZXNpemVMaXN0ZW5lcnNfXy5wdXNoKGZuKTtcbiAgICB9O1xuXG4gICAgd2luZG93LnJlbW92ZVJlc2l6ZUxpc3RlbmVyID0gZnVuY3Rpb24oZWxlbWVudCwgZm4pe1xuICAgICAgICBlbGVtZW50Ll9fcmVzaXplTGlzdGVuZXJzX18uc3BsaWNlKGVsZW1lbnQuX19yZXNpemVMaXN0ZW5lcnNfXy5pbmRleE9mKGZuKSwgMSk7XG4gICAgICAgIGlmICghZWxlbWVudC5fX3Jlc2l6ZUxpc3RlbmVyc19fLmxlbmd0aCkge1xuICAgICAgICAgICAgaWYgKGF0dGFjaEV2ZW50KSBlbGVtZW50LmRldGFjaEV2ZW50KCdvbnJlc2l6ZScsIHJlc2l6ZUxpc3RlbmVyKTtcbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGVsZW1lbnQuX19yZXNpemVUcmlnZ2VyX18uY29udGVudERvY3VtZW50LmRlZmF1bHRWaWV3LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIHJlc2l6ZUxpc3RlbmVyKTtcbiAgICAgICAgICAgICAgICBlbGVtZW50Ll9fcmVzaXplVHJpZ2dlcl9fID0gIWVsZW1lbnQucmVtb3ZlQ2hpbGQoZWxlbWVudC5fX3Jlc2l6ZVRyaWdnZXJfXyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG59KSgpOyIsIihmdW5jdGlvbiAoKSB7XG5cbiAgICBmdW5jdGlvbiBBcHBDb250cm9sbGVyKCRzY29wZSkge1xuXG4gICAgICAgICRzY29wZS5tZXRhZGF0YSA9IHt9O1xuICAgICAgICAkc2NvcGUubWV0YWRhdGEucGFnZVRpdGxlID0gJ1NoYXJlIHlvdXIgdmlzdWFsaXphdGlvbnMgb24gZ3JhZmlkZGxlJztcbiAgICAgICAgJHNjb3BlLm1ldGFkYXRhLm9nID0ge1xuICAgICAgICAgICAgJ29nOnR5cGUnOiAnYXJ0aWNsZScsXG4gICAgICAgICAgICAnYXJ0aWNsZTpzZWN0aW9uJzogJ1NoYXJhYmxlIGRhdGEgdmlzdWFsaXphdGlvbicsXG4gICAgICAgICAgICAnb2c6dGl0bGUnOiAnU2hhcmUgeW91ciB2aXN1YWxpemF0aW9ucyBvbiBncmFmaWRkbGUnLFxuICAgICAgICAgICAgJ29nOmltYWdlJzogJycsXG4gICAgICAgICAgICAnb2c6ZGVzY3JpcHRpb24nOiAnU2hhcmFibGUgZGF0YSB2aXN1YWxpemF0aW9uJ1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIGFuZ3VsYXJcbiAgICAgICAgLm1vZHVsZSgnZ3JhZmlkZGxlJylcbiAgICAgICAgLmNvbnRyb2xsZXIoJ0FwcENvbnRyb2xsZXInLCBBcHBDb250cm9sbGVyKTtcblxufSkoKTtcbiIsIihmdW5jdGlvbiAoKSB7XG5cbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBmdW5jdGlvbiBDaGVja3BvaW50RW5kcG9pbnQoJHJlc291cmNlLCBFTlYpIHtcbiAgICAgICAgcmV0dXJuICRyZXNvdXJjZShFTlYuYXBpICsgJ2NoZWNrcG9pbnQvOmlkJywge1xuICAgICAgICAgICAgaWQ6ICdAaWQnXG4gICAgICAgIH0sIHtcbiAgICAgICAgICAgIHNhdmU6IHtcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdQT1NUJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdldDoge1xuICAgICAgICAgICAgICAgIG1ldGhvZDogJ0dFVCdcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgYW5ndWxhclxuICAgICAgICAubW9kdWxlKCdncmFmaWRkbGUnKVxuICAgICAgICAuZmFjdG9yeSgnQ2hlY2twb2ludEVuZHBvaW50JywgQ2hlY2twb2ludEVuZHBvaW50KTtcblxufSkoKTtcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==