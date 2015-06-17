var gulp = require('gulp'),
  sourceMaps = require('gulp-sourcemaps'),
  cached = require('gulp-cached'),
  remember = require('gulp-remember'),
  ngAnnotate = require('gulp-ng-annotate'),
  ngFilesort = require('gulp-angular-filesort'),
  concat = require('gulp-concat'),
  gulpif = require('gulp-if'),
  uglify = require('gulp-uglify'),
  config = require('../gulp_config');


gulp.task('scripts', function() {
  var scriptsFile = 'scripts.js';
  if (config.production) {
    scriptsFile = 'scripts.min.js';
  }
  return gulp.src(config.app.js)
    .pipe(sourceMaps.init())
    .pipe(cached('scriptsCache'))
    .pipe(ngAnnotate())
    .pipe(ngFilesort())
    .pipe(remember('scriptsCache'))
    .pipe(concat(scriptsFile))
    .pipe(gulpif(config.production, uglify()))
    .pipe(sourceMaps.write(config.sourceMapsPath))
    .pipe(gulp.dest(config.dist.js));
});
