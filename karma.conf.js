// Karma configuration
// http://karma-runner.github.io/0.10/config/configuration-file.html
'use strict';

module.exports = function(config) {
  config.set({
    // base path, that will be used to resolve files and exclude
    basePath: '',

    // testing framework to use (jasmine/mocha/qunit/...)
    frameworks: ['jasmine'],

    // list of files / patterns to load in the browser
    files: [
      // vendor scripts
      'dist/js/vendor.js',
      'app/bower_components/angular-mocks/angular-mocks.js',

      // config
      'dist/js/config.js',

      // partials
      'dist/js/partials.js',

      // app
      'app/app.js',
      'app/components/**/*.js'
    ],

    plugins: [
      'karma-jasmine',
      'karma-coverage',
      'karma-junit-reporter',
      'karma-phantomjs-launcher',
      'karma-chrome-launcher',
      'karma-firefox-launcher'
    ],

    // list of files / patterns to exclude
    exclude: [
      'app/components/testing/mock-app.js',
      'app/components/testing/mock-pass.js'
    ],

    // web server port
    port: 9002,

    // level of logging
    // possible values: LOG_DISABLE || LOG_ERROR || LOG_WARN || LOG_INFO || LOG_DEBUG
    logLevel: config.LOG_INFO,


    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: false,


    // Start these browsers, currently available:
    // - Chrome
    // - ChromeCanary
    // - Firefox
    // - Opera
    // - Safari (only Mac)
    // - PhantomJS
    // - IE (only Windows)
    browsers: ['PhantomJS'],


    // Continuous Integration mode
    // if true, it capture browsers, run tests and exit
    singleRun: false,


    // Report Test Results
    reporters: ['progress', 'junit', 'coverage'],

    // the default configuration
    junitReporter: {
      outputFile: 'test-results/unit-results.xml',
      suite: ''
    },

    preprocessors: {
      // source files, that you wanna generate coverage for
      // do not include tests or libraries
      // (these files will be instrumented by Istanbul)
      'app/app.js': ['coverage'],
      'app/components/**/!(test*)/!(*test|*mock).js': ['coverage']
    },

    // optionally, configure the reporter
    coverageReporter: {
      reporters: [{
        type: 'html',
        dir: 'test-results/'
      }, {
        type: 'cobertura',
        dir: 'test-results/',
        file: 'coverage-results.xml'
      }]

    }
  });
};
