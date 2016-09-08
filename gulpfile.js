/**
 * Created by anjeonghu on 2016-05-18.
 *
 * gulp file configration
 * 1. npm init
 * 2. npm install gulp -g
 * 3. npm install gulp-[plugin name] --save-dev
 * 4. npm install browser-sync gulp --save-dev
 *
 */

// Include gulp
var gulp = require('gulp');
var templateCache = require('gulp-template-cache');
// Include Our Plugins
var jshint = require('gulp-jshint');
/*var sass = require('gulp-sass');*/
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var browserSync = require('browser-sync').create();
var htmlmin = require('gulp-html-minifier');

// Static server
gulp.task('serve',['buildApp'], function() {

    browserSync.init({
        server: "dist",
        browser: ["chrome", "firefox"]

    });

});



// Lint Task
gulp.task('lint', function() {
    return gulp.src('static/js/*.js')
        .pipe(jshint())
        .pipe(jshint.reporter('default'));
});

// Compile Our Sass
/*gulp.task('sass', function() {
 return gulp.src('scss/!*.scss')
 .pipe(sass())
 .pipe(gulp.dest('dist/css'));
 });*/

// Concatenate & Minify JS
gulp.task('scripts', function() {
    return gulp.src(['.tmp/*.js','static/js/*.js'])
        .pipe(concat('all.js'))
        .pipe(gulp.dest('dist/js'))
        .pipe(rename('all.min.js'))
        .pipe(uglify())
        .pipe(gulp.dest('dist/js'))
});


gulp.task('html', function () {
    return gulp.src('index.html')
        .pipe(gulp.dest( 'dist'));
});
// Watch Files For Changes
gulp.task('watch', function() {
    gulp.watch(['static/js/*.js','*.html'], ['lint', 'scripts','html']).on('change', browserSync.reload);;
/*    gulp.watch('scss/!*.scss', ['sass']);*/
});

gulp.task('buildApp',['html','templates', 'lint', 'scripts', 'watch']);



gulp.task('templates', function() {

    return gulp.src(['./*.html','!./index.html'])
        .pipe(htmlmin({collapseWhitespace: true}))
        .pipe(templateCache())
        .pipe(gulp.dest('.tmp'));
});
