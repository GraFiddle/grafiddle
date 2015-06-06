(function(module) {
try {
  module = angular.module('grafiddle.templates');
} catch (e) {
  module = angular.module('grafiddle.templates', []);
}
module.run(['$templateCache', function($templateCache) {
  $templateCache.put('components/editor/editor.html',
    '<div ui-layout=""><div ui-layout-container="" class="header" size="50px" max-size="50px" min-size="50px"><a href="" ui-sref="editor" class="header-logo left" title="grafiddle"></a><button type="button" class="btn left" ng-show="serverCheckpoint" ng-click="save()">Fork</button> <button type="button" class="btn left" ng-show="!serverCheckpoint" ng-click="save()">Save</button><button type="button" class="btn btn-primary left" ng-show="serverCheckpoint" ng-click="sharePopup()">Share</button><a href="" ui-sref="tree({id: serverCheckpoint.id})" ng-show="serverCheckpoint" class="link left">See Revisions</a><button type="button" class="btn btn-primary right">Sign in / Sign up</button></div><div ng-show="showSharePopup" class="sharebox"><div class="sharerow">Direct link to this grafiddle:<br><input ng-click="onShareTextClick($event)" type="text" ng-model="fiddleURL"></div><div class="sharerow">This grafiddle chart as a PNG:<br><input ng-click="onShareTextClick($event)" type="text" ng-model="fiddleChartURL"></div><div class="sharerow">Embed this grafiddle:<br><input ng-click="onShareTextClick($event)" type="text" ng-model="fiddleEmbedCode"></div><div class="sharerow"><button type="button" id="fbbutton" class="btn" ng-click="share(\'FB\')">Facebook</button> <button type="button" id="twitterbutton" class="btn" ng-click="share(\'Twitter\')">Twitter</button> <button type="button" class="btn" ng-click="share(\'E-Mail\')">E-Mail</button></div></div><div ui-layout-container="" class="chartArea" id="chartArea" size="60%"><angular-chart class="angularchart" options="checkpoint.options"></angular-chart><canvas id="canvas" style="display: none"></canvas></div><div ui-layout-container=""><div ui-layout="{flow : \'column\'}"><div ui-layout-container="" class="dataArea"><div style="position: absolute; top: 10px; right: 10px; z-index: 999;"><button class="btn btn-primary" style="opacity: 0.85;" ng-click="toggleDataEditor()">{{switchDataButtonTitle}}</button></div><div ng-hide="showDataEditor" class="inputbox"><div class="inputrow">Upload a JSON file: <span class="btn btn-file">browse…<input type="file" on-read-file="uploadFile($fileContent)"><br></span></div><div class="inputrow">Enter URL to JSON data: <input type="text" ng-model="dataURL"> <button class="btn" ng-click="loadfromURL()">Get!</button></div><div class="inputrow">Enter JSON data manually in the editor. <button class="btn" ng-click="toggleDataEditor()">Switch to editor</button></div></div><div ng-show="showDataEditor" ng-model="checkpoint.dataString" ui-ace="aceJsonConfig"></div></div><div ui-layout-container="" class="optionsArea"><div ng-model="checkpoint.optionsString" ui-ace="aceJsonConfig"></div></div></div></div></div>');
}]);
})();

(function(module) {
try {
  module = angular.module('grafiddle.templates');
} catch (e) {
  module = angular.module('grafiddle.templates', []);
}
module.run(['$templateCache', function($templateCache) {
  $templateCache.put('components/embed/embed.html',
    '<div ui-layout=""><div><ul class="embedview"><li ng-class="{active: embedView === \'chart\'}" class="embedview" ng-click="setView(\'chart\')"><span>Graph</span></li><li ng-class="{active: embedView === \'data\'}" class="embedview" ng-click="setView(\'data\')"><span>Data</span></li><li ng-class="{active: embedView === \'options\'}" class="embedview" ng-click="setView(\'options\')"><span>Options</span></li></ul><div style="float: right;"><a href="" ui-sref="editor({id: serverCheckpoint.id})" style="font-size: small;">Edit in grafiddle</a></div></div><div ng-show="embedView === \'chart\'" class="embedview"><angular-chart class="angularchart" options="checkpoint.options"></angular-chart></div><div ng-if="embedView === \'options\'" class="embedview"><div ng-model="checkpoint.optionsString" ui-ace="aceJsonConfig"></div></div><div ng-if="embedView === \'data\'" class="embedview"><div ng-model="checkpoint.dataString" ui-ace="aceJsonConfig"></div></div></div>');
}]);
})();

(function(module) {
try {
  module = angular.module('grafiddle.templates');
} catch (e) {
  module = angular.module('grafiddle.templates', []);
}
module.run(['$templateCache', function($templateCache) {
  $templateCache.put('components/tree/tree.html',
    '<div class="header" size="50px" max-size="50px" min-size="50px"><a href="" ui-sref="editor" class="header-logo left"></a> <a href="" ui-sref="editor({id: checkpoint.id})" class="link left">Back to the chart</a> <button type="button" class="btn right">Login</button> <button type="button" class="btn btn-primary right">Sign Up</button></div><div id="tree"></div>');
}]);
})();
