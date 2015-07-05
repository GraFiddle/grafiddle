'use strict';

var argv = require('yargs').argv;
var gulp = require('gulp');
var modular = require('gulp-modular');

// gulp-modular tasks
var tasks = [
  'bower',
  'clean',
  'fonts',
  'sass',
  'configScripts',
  'connect',
  'images',
  'index',
  'jshint',
  'open',
  'partials',
  'reload',
  'scripts',
  'statics',
  'vendorFonts',
  'vendorScripts',
  'vendorStyles',
  'watch'
];

var environments = {
  development: {
    rev: false,
    constants: {
      ENV: {
        name: 'development',
        api: 'http://grafiddle.it/'
      }
    }
  },
  production: {
    rev: true,
    constants: {
      ENV: {
        name: 'production',
        api: 'http://grafiddle.it/'
      }
    }
  }
};

// ENVIRONMENT FLAG
var env = environments.development;
for (var index in environments) {
  if (!!argv[index]) {
    env = environments[index];
  }
}

// ANGULAR MODULE NAMES
var appName      = 'grafiddle';
var configName   = 'grafiddle.config';
var templateName = 'grafiddle.templates';

// BASES AND PATHS
var bases = {
  app: 'client/',
  dist: 'server/static/'
};

var app = {
  js: [
    bases.app + 'app.js',
    bases.app + 'components/**/*.js',
    '!' + bases.app + 'components/**/*_test.js'
  ],
  scss: bases.app + 'style.scss',
  scssAll: [bases.app + 'style.scss', bases.app + 'components/**/*.scss'],
  alljs: [
    bases.app + 'app.js',
    bases.app + 'components/**/*.js',
    'gulpfile.js',
    'karma.conf.js'
  ],
  index: bases.app + 'index.html',
  fonts: bases.app + 'fonts/*',
  images: bases.app + 'components/**/*.{png,jpg,jpeg,gif,svg,ico}',
  views: bases.app + 'components/**/*.html',
  statics: [
    bases.app + '.htaccess',
    bases.app + 'favicon*',
    bases.app + 'robots.txt',
    bases.app + 'bower_components/ace-builds/src-noconflict/worker-json.js'
  ]
};

var dist = {
  js: bases.dist + 'js/',
  css: bases.dist + 'css/',
  fonts: bases.dist + 'fonts/',
  images: bases.dist + 'images/'
};

// SERVING CONFIG
var port = 8000;
var testingPort = 9001;

var config = {
  env: env,
  bases: bases,
  debug: false,
  bowerjson: 'bower.json',
  app: app,
  dist: dist,
  sourceMapsPath: '.', // place sourcemap file next to the transpiled file
  dirname: __dirname,
  port: port,
  testingPort: testingPort,
  appName: appName,
  configName: configName,
  templateName: templateName
};

modular(gulp, tasks, config);

gulp.task('build', ['images', 'index', 'vendorFonts', 'statics']);

gulp.task('default', ['watch', 'connect', 'open']);
