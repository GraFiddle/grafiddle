'use strict';

var gulp = require('gulp');
var karma = require('karma').server;

// Require and load all dependent modules
//
var argv = require('yargs').argv,
    concat = require('gulp-concat'),
    gutil = require('gulp-util'),
    sourcemaps = require('gulp-sourcemaps'),
    uglify = require('gulp-uglify'),
    gulpif = require('gulp-if'),
    ngConstant = require('gulp-ng-constant'),
    ngAnnotate = require('gulp-ng-annotate'),
    ngFilesort = require('gulp-angular-filesort'),
    compass = require('gulp-compass'),
    minifyCSS = require('gulp-minify-css'),
    imagemin = require('gulp-imagemin'),
    flatten = require('gulp-flatten'),
    gulpInject = require('gulp-inject'),
    preprocess = require('gulp-preprocess'),
    bowerFiles = require('main-bower-files'),
    connect = require('gulp-connect'),
    historyApiFallback = require('connect-history-api-fallback'),
    gulpOpen = require('gulp-open'),
    newer = require('gulp-newer'),
    cached = require('gulp-cached'),
    remember = require('gulp-remember'),
    del = require('del'),
    plumber = require('gulp-plumber'),
    docco = require('gulp-docco'),
    protractor = require('gulp-protractor').protractor,
    exit = require('gulp-exit'),
    maven = require('gulp-maven-deploy'),
    jshint = require('gulp-jshint'),
    runSequence = require('run-sequence'),
    ngHtml2Js = require('gulp-ng-html2js'),
    minifyHtml = require('gulp-minify-html'),
    extend = require('extend'),
    bower = require('gulp-bower');

// PRODUCTION FLAG (--production)
//
var production = !!(argv.production); // true if --production flag is used

var scssMain = 'style.scss';

// BASES AND PATHS
//
var bases = {
    app: 'app/',
    dist: 'dist/'
};

var app = {
    config: bases.app + 'config.json',
    js: [
        bases.app + 'app.js',
        bases.app + 'components/user/session/user-session-service.js',
        bases.app + 'components/**/*.js',
        '!' + bases.app + 'components/**/*_test.js',
        '!' + bases.app + 'components/**/*_mock.js',
        '!' + bases.app + 'components/testing/*',
        '!' + bases.app + 'components/editor/scratchpad-model.js'
    ],
    mocks: [
        bases.app + 'bower_components/angular-mocks/angular-mocks.js',

        bases.app + 'components/testing/mock-app.js',
        bases.app + 'components/testing/mock-data.js',

        bases.app + 'components/**/*_mock.js',
        // bases.app + 'components/datasets/datasets-endpoint_mock.js',
        // bases.app + 'components/units/units-endpoint_mock.js',
        // bases.app + 'components/views/views-endpoint_mock.js',
        // bases.app + 'components/user/user-endpoint_mock.js',
        // bases.app + 'components/user/user-endpoint_mock.js',
        // bases.app + 'components/processors/processors-endpoint_mock.js',
        // bases.app + 'components/workflows/workflows-endpoint_mock.js',

        bases.app + 'components/testing/mock-pass.js'
    ],
    scss: bases.app + scssMain,
    scssAll: [bases.app + scssMain, bases.app + 'components/**/*.scss'],
    alljs: [
        bases.app + 'app.js',
        bases.app + 'components/**/*.js',
        'e2e/**/*.js',
        'gulpfile.js',
        'karma.conf.js',
        'protractor.conf.js'
    ],
    index: bases.app + 'index.html',
    images: bases.app + 'components/**/*.{png,jpg,jpeg,gif,svg,ico}',
    views: bases.app + 'components/**/*.html',
    statics: ['app/.htaccess', 'app/favicon.ico', 'app/robots.txt']
};

var dist = {
    js: bases.dist + 'js/',
    css: bases.dist + 'css/',
    fonts: bases.dist + 'fonts/',
    images: bases.dist + 'images/'
};

var mockFile = 'mocks.js';

// SERVING CONFIG
//
var port = 8000;
var testingPort = 9001;

// DEFAULT TASK CONFIGURATION
// (be careful to edit defaults; will be set by higher level tasks to propagate to lower levels)
//
var includeMock = false;
var appName = 'grafiddle';
var appBase = '';


// BOWER DEPENDENCIES
gulp.task('bower:prune', function() {
    return bower({ cmd: 'prune'});
});

gulp.task('bower:install', function() {
    return bower();
});

// JAVASCRIPT PROCESSING
gulp.task('config', function () {
    gulp.src(app.config)
        .pipe(ngConstant({
            name: 'grafiddle.config'
        }))
        .pipe(gulp.dest(dist.js));
});

gulp.task('scripts', function () {
    var scriptsFile = 'scripts.js';
    if (production) {

        scriptsFile = 'scripts.min.js';
    }
    return gulp.src(app.js)
        .pipe(sourcemaps.init())
        .pipe(cached('scriptsCache'))
        .pipe(plumber())
        .on('error', gutil.log)
        .pipe(ngAnnotate())
        .pipe(ngFilesort())
        .pipe(remember('scriptsCache'))
        .pipe(concat(scriptsFile))
        .pipe(gulpif(production, uglify()))
        .pipe(sourcemaps.write())
        .pipe(gulp.dest(dist.js));
});

gulp.task('vendorScripts', ['bower:install', 'bower:prune'], function () {
    var vendorFile = 'vendor.js';
    if (production) {
        vendorFile = 'vendor.min.js';
    }
    return gulp.src(bowerFiles({
        filter: /\.js$/i
    }))
        .pipe(sourcemaps.init())
        .pipe(newer(dist.js + vendorFile))
        .pipe(concat(vendorFile))
        .pipe(gulpif(production, uglify()))
        .pipe(sourcemaps.write())
        .pipe(gulp.dest(dist.js));
});

gulp.task('mockScripts', function () {
    if (!includeMock) {
        del([dist.js + mockFile]);
        return;
    }

    return gulp.src(app.mocks)
        .pipe(sourcemaps.init())
        .pipe(cached('mockScriptsCache'))
        .pipe(plumber())
        .on('error', gutil.log)
        .pipe(ngAnnotate())
        .pipe(remember('mockScriptsCache'))
        .pipe(concat(mockFile))
        .pipe(sourcemaps.write())
        .pipe(gulp.dest(dist.js));
});


// STYLESHEETS PROCESSING
//
gulp.task('compass', ['images'], function () {
    var environment = 'development';
    if (production) {
        environment = 'production';
    }

    return gulp.src(app.scss)
        .pipe(compass({
            project: __dirname,
            sass: 'app/',
            css: 'dist/css/',
            environment: environment,
            sourcemap: true,
            debug: false,
            logging: false
        }));
});

gulp.task('vendorStyles', ['bower:install', 'bower:prune'], function () {
    var vendorFile = 'vendor.css';

    return gulp.src(bowerFiles({
        filter: /\.css$/i
    }))
        .pipe(sourcemaps.init())
        .pipe(newer(dist.css + vendorFile))
        .pipe(concat(vendorFile))
        .pipe(minifyCSS({
            keepSpecialComments: 0
        }))
        .pipe(sourcemaps.write())
        .pipe(gulp.dest(dist.css));
});


// FONT PROCESSING
//
gulp.task('fonts', ['bower:install', 'bower:prune'], function () {
    return gulp.src(bowerFiles({
        filter: /\.(otf|eot|svg|ttf|woff)/i
    }))
        .pipe(gulp.dest(dist.fonts));
});


// HTML PROCESSING
//
gulp.task('partials', function () {

    var partialsFile = 'partials.js';
    if (production) {
        partialsFile = 'partials.min.js';
    }

    return gulp.src(app.views)
        .pipe(minifyHtml({
            empty: true,
            spare: true,
            quotes: true
        }))
        .pipe(ngHtml2Js({
            moduleName: 'grafiddle.templates',
            prefix: 'components/'
        }))
        .pipe(newer(dist.js + partialsFile))
        .pipe(concat(partialsFile))
        .pipe(gulpif(production, uglify()))
        .pipe(gulp.dest(dist.js));
});


function injectIndex() {
    var destinationDir = bases.dist;
    // don't read, just insert paths
    var srcOptions = {
        cwd: destinationDir,
        read: false
    };

    var jsFiles = ['js/vendor.js', 'js/config.js', 'js/partials.js', 'js/scripts.js', 'js/' + mockFile];
    if (production) {
        jsFiles = ['js/vendor.min.js', 'js/config.js', 'js/partials.min.js', 'js/scripts.min.js', 'js/' + mockFile];
    }

    // use relative paths with dist as base; remove the prepended '../dist' in the path
    var injectOptions = {
        relative: true,
        ignorePath: '../' + destinationDir
    };

    return gulp.src(app.index)
        .pipe(gulpInject(gulp.src(['css/vendor.css', 'css/style.css'], srcOptions), injectOptions))
        .pipe(gulpInject(gulp.src(jsFiles, srcOptions), extend({}, injectOptions)))
        .pipe(preprocess({
            context: {
                APP: appName,
                BASE: appBase
            }
        }))
        .pipe(gulp.dest(destinationDir));
}

gulp.task('injectIndex', injectIndex);

// use this for building
gulp.task('index', ['compass', 'config', 'scripts', 'mockScripts', 'vendorScripts', 'vendorStyles'], injectIndex);

// IMAGES PROCESSING
//
gulp.task('images', function () {
    return gulp.src(app.images)
        // just compress if newer version available
        .pipe(newer(dist.images))
        .pipe(imagemin())
        .pipe(flatten())
        .pipe(gulp.dest(dist.images));
});


// MISC STATIC ASSETS PROCESSING
//
gulp.task('statics', function () {
    return gulp.src(app.statics)
        .pipe(gulp.dest(bases.dist));
});


// CONNECT
//
gulp.task('connect', ['build'], function () {
    connect.server({
        root: ['dist'],
        port: port,
        livereload: true,
        middleware: function (connect, opt) {
            return [historyApiFallback];
        }
    });
});


// WATCH
//
gulp.task('watch', ['build'], function () {
    gulp.watch(app.index, ['injectIndex']);
    gulp.watch(app.views, ['partials']);
    gulp.watch(app.statics, ['statics']);
    gulp.watch(app.images, ['images']);
    gulp.watch(app.scssAll, ['compass']);
    gulp.watch(app.config, ['config']);
    gulp.watch(app.js, ['scripts']);
    gulp.watch(app.mocks, ['mockScripts']);
    // watch any change in dist folder; reload immediately in case of detected change
    gulp.watch(bases.dist + '**', ['reload']);
});


gulp.task('reload', function () {
    return gulp.src(bases.dist)
        .pipe(connect.reload());
});

// OPEN
//
gulp.task('open', ['index'], function () {
    var options = {
        url: 'http://localhost:' + port
    };
    gulp.src('dist/index.html')
        .pipe(gulpOpen('', options));
});


// DOCS
//
// TODO: enable and test
//gulp.task('docs', function () {
//  return gulp.src(app.js)
//    .pipe(concat('app.js'))
//    .pipe(docco())
//    .pipe(gulp.dest('docs/'));
//});

gulp.task('jshint', function () {
    return gulp.src(app.alljs)
        .pipe(jshint('.jshintrc'))
        .pipe(jshint.reporter('jshint-stylish'));
});


// Unit Test
//
gulp.task('karma', function (done) {
    karma.start({
        configFile: __dirname + '/karma.conf.js',
        singleRun: true
    }, function() {
        done();
    });
});
gulp.task('karma:watch', function (done) {
    karma.start({
        configFile: __dirname + '/karma.conf.js',
        singleRun: false,
        autoWatch: true
    }, function() {
        done();
    });
});
gulp.task('karma:all', function (done) {
    karma.start({
        configFile: __dirname + '/karma.conf.js',
        browsers: ['PhantomJS', 'Firefox', 'Chrome'],
        singleRun: true
    }, function() {
        done();
    });
});

// e2e Test
//
gulp.task('protractor', function (done) {
    gulp.src(['e2e/**/*.js'])
        .pipe(protractor({
            configFile: 'protractor.conf.js'
        })).on('error', function (e) {
            console.log(e);
            done();
        }).on('end', done);
});
gulp.task('e2e:singleRun', ['build:mock', 'connect', 'protractor'], function () {
    gulp.src(bases.dist)
        .pipe(connect.serverClose());
    gulp.src(bases.dist)
        .pipe(exit());
});


function enableMock() {
    includeMock = true;
    appName = 'onedataMock';
}

function enableDeploy() {
    appBase = '${context.path}';
}


// gulp clean
// remove build (erase dist/ folder recursively)
//
gulp.task('clean', function () {
    del([bases.dist]);
});

// gulp build [:mock]
// build project in dist/ folder (with optional mock argument)
//
gulp.task('build', ['images', 'index', 'fonts', 'partials', 'statics']);
gulp.task('build:mock', function () {
    enableMock();
    gulp.start(['build']);
});
gulp.task('build-deploy', function () {
    enableDeploy();
    gulp.start(['build']);
});


gulp.task('maven-deploy', ['build-deploy'], function() {
    gulp.src('.')
        .pipe(maven.deploy({
            'config': {
                'groupId': 'de.onelogic.forecasting.client',
                'artifactId': 'Client',
                'type': 'zip',
                'repositories': [
                    {
                        'id': 'nexus',
                        'url': 'http://ci.intranet.onelogic.de:8081/nexus/content/repositories/releases/'
                    }
                ]
            }
        }));
});

gulp.task('maven-deploy-local', ['build-deploy'], function() {
    gulp.src('.')
        .pipe(maven.install({
            'config': {
                'groupId': 'de.onelogic.forecasting.client',
                'artifactId': 'Client',
                'type': 'zip'
            }
        }));
});


// gulp [mock]
// build project in dist/ folder, serve it, open browser and reload on file changes (with optional mock argument)
//
gulp.task('default', ['watch', 'connect', 'open']);
gulp.task('mock', function () {
    enableMock();
    gulp.start(['default']);
});

// gulp test [:all, :watch]
// run unit tests on source code
// - all: run in different real browsers
// - watch: keep alive and run again on file changes
//
gulp.task('test', function () {
    runSequence(['config', 'partials', 'vendorScripts'], 'karma');
});
gulp.task('test:all', function () {
    runSequence(['config', 'partials', 'vendorScripts'], 'karma:all');
});
gulp.task('test:watch', function () {
    runSequence(['config', 'partials', 'vendorScripts'], 'karma:watch');
});

// gulp e2e
// run end to end tests on the mocked build
//
gulp.task('e2e', function () {
    port = testingPort;
    gulp.start(['e2e:singleRun']);
});

// gulp all
// runs all kinds of checks
//
gulp.task('all', function () {
    runSequence('jshint', 'test:all', 'e2e');
});
