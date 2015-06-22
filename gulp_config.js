var argv = require('yargs').argv;


// PRODUCTION FLAG (--production)
var production = !!(argv.production); // true if --production flag is used

// ANGULAR MODULE NAMES
var appName      = 'grafiddle';
var configName   = 'grafiddle.config';
var templateName = 'grafiddle.templates';

// BASES AND PATHS
//
var bases = {
  app: 'client/',
  dist: 'server/static/'
};

var app = {
  config: bases.app + 'config.json',
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
//
var port = 8000;
var testingPort = 9001;


module.exports = {
  production: production,
  bases: bases,
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