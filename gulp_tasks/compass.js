var gulp = require('gulp'),
  compass = require('gulp-compass'),
  config = require('../gulp_config');


var environment = 'development';

gulp.task('compass', function() {
  if (config.production) {
    environment = 'production';
  }
  return gulp.src(config.app.scss)
    .pipe(compass({
      project: config.dirname,
      sass: config.bases.app,
      css: config.dist.css,
      environment: environment,
      sourcemap: true,
      debug: false,
      logging: false
    }));
});
