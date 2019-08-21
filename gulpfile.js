"use strict";

var browserify = require('browserify');
var express = require('express');
var path = require('path');
var rimraf = require('rimraf');

var gulp = require('gulp');
var gutil = require('gulp-util');
var gulpif = require('gulp-if');
var buffer = require('gulp-buffer');
var concat = require('gulp-concat');
var cssmin = require('gulp-cssmin');
var eslint = require('gulp-eslint');
var htmlmin = require('gulp-htmlmin');
var less = require('gulp-less');
var micro = require('gulp-micro');
var size = require('gulp-size');
var uglify = require('gulp-uglify');
var zip = require('gulp-zip');
var source = require('vinyl-source-stream');

var minimist = require('minimist');

var knownOptions = {
  alias: {'P': 'prod'},
  boolean: true,
  // default: { env: process.env.NODE_ENV || 'production' }
};

var options = minimist(process.argv.slice(2), knownOptions);
console.log(options)


var production = options.prod

const build_source = () => {
  var bundler = browserify('./src/main', {debug: !production});
  if (production) {
    bundler.plugin(require('bundle-collapser/plugin'));
  }

  return bundler
    .bundle()
    .on('error', browserifyError)
    .pipe(source('build.js'))
    .pipe(buffer())
    .pipe(gulpif(production, uglify()))
    .pipe(gulp.dest('build'));
};

const build_index = () => {
  return gulp.src('src/index.html')
    .pipe(gulpif(production, htmlmin({
      collapseWhitespace: true,
      removeAttributeQuotes: true,
      removeComments: true,
    })))
    .pipe(gulp.dest('build'));
};

const build_styles = () => {
  return gulp.src('src/styles.less')
    .pipe(less())
    .pipe(concat('build.css'))
    .pipe(gulpif(production, cssmin()))
    .pipe(gulp.dest('build'));
};

const build = gulp.series(build_source, build_index, build_styles)

const clean = (done) => {
  rimraf.sync('build');
  rimraf.sync('dist');
  done();
};

const lint = () => {
  return gulp.src(['*.js', 'src/**/*.js'])
    .pipe(eslint())
    .pipe(eslint.format());
};

const dist = gulp.series(build, function() {
  if (!production) {
    gutil.log(gutil.colors.yellow('WARNING'), gutil.colors.gray('Missing flag --prod'));
    gutil.log(gutil.colors.yellow('WARNING'), gutil.colors.gray('You should generate production assets to lower the archive size'));
  }

  return gulp.src('build/*')
    .pipe(zip('archive.zip'))
    .pipe(size())
    .pipe(micro({limit: 13 * 1024}))
    .pipe(gulp.dest('dist'));
});

const watch = () => {
  gulp.watch('src/**/*.js', gulp.series(lint, build_source));
  gulp.watch('src/styles.less', gulp.series(build_styles));
  gulp.watch('src/index.html', gulp.series(build_index));
};

const serve = gulp.series(build, function() {
  var htdocs = path.resolve(__dirname, 'build');
  var app = express();

  app.use(express.static(htdocs));
  app.listen(3000, function() {
    gutil.log("Server started on '" + gutil.colors.green('http://localhost:3000') + "'");
  });
});

function browserifyError(err) {
  gutil.log(gutil.colors.red('ERROR'), gutil.colors.gray(err.message));
  this.emit('end');
}

// gulp.task('build', build);
// gulp.task('default', build);

exports.clean = clean
exports.dist = dist
exports.serve = serve
exports.build = build
exports.watch = watch
exports.lint = lint
exports.default = build
