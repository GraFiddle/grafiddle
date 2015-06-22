'use strict';

var gulp = require('gulp'),
  runSequence = require('run-sequence');


require('./gulp-modular/tasks/clean');
require('./gulp-modular/tasks/bower');
require('./gulp-modular/tasks/configScripts');
require('./gulp-modular/tasks/scripts');
require('./gulp-modular/tasks/vendorScripts');
require('./gulp-modular/tasks/compass');
require('./gulp-modular/tasks/vendorStyles');
require('./gulp-modular/tasks/fonts');
require('./gulp-modular/tasks/partials');
require('./gulp-modular/tasks/images');
require('./gulp-modular/tasks/index');
require('./gulp-modular/tasks/statics');
require('./gulp-modular/tasks/connect');
require('./gulp-modular/tasks/reload');
require('./gulp-modular/tasks/open');
require('./gulp-modular/tasks/watch');
require('./gulp-modular/tasks/jshint');


// gulp build
// build project in dist folder
gulp.task('build', ['images', 'index', 'fonts', 'partials', 'statics']);


// gulp
// build project in dist folder, serve it, open browser and reload on file changes
gulp.task('default', ['watch', 'connect', 'open']);


// gulp all
// runs all kinds of checks
gulp.task('all', function() {
  runSequence('jshint', 'test:all', 'e2e');
});
