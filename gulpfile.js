'use strict';

var gulp = require('gulp'),
  runSequence = require('run-sequence');


require('./gulp_tasks/clean');
require('./gulp_tasks/bower');
require('./gulp_tasks/configScripts');
require('./gulp_tasks/scripts');
require('./gulp_tasks/vendorScripts');
require('./gulp_tasks/compass');
require('./gulp_tasks/vendorStyles');
require('./gulp_tasks/fonts');
require('./gulp_tasks/partials');
require('./gulp_tasks/images');
require('./gulp_tasks/index');
require('./gulp_tasks/statics');
require('./gulp_tasks/connect');
require('./gulp_tasks/reload');
require('./gulp_tasks/open');
require('./gulp_tasks/watch');
require('./gulp_tasks/jshint');


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
