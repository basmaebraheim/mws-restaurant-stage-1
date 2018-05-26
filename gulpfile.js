var gulp = require('gulp');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var minify = require('gulp-minify-css');
var babel = require('gulp-babel');
var sourcemaps = require('gulp-sourcemaps');
var browserSync = require('browser-sync');
// var changed = require('gulp-changed');
var imagemin = require('gulp-imagemin');

gulp.task('copy-index', function(done){
    gulp.src('index.html')
    .pipe(gulp.dest('./dist'));
    done();
});
gulp.task('copy-restaurant', function(done){
    gulp.src('restaurant.html')
    .pipe(gulp.dest('./dist'));
    done();
});

gulp.task('copy-images', function(done) {
    var imgSrc = 'images/*',
    imgDst = 'dist/images';
    
    gulp.src(imgSrc)
    .pipe(imagemin())
    .pipe(gulp.dest(imgDst));
    done();
 });

gulp.task('script-dist', function(done){
    gulp.src('js/*.js')
    .pipe(sourcemaps.init())
    .pipe(babel({
        presets: ['env']
    }))
    .pipe(concat('script.js'))
    .pipe(uglify())
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('dist/js/'));
    done();
 });
 
 gulp.task('style-dist', function(done){
    gulp.src('css/*.css')
    .pipe(sourcemaps.init())
    .pipe(concat('styles.css'))
    .pipe(minify())
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('dist/css/'));
    done();
 });
 
 gulp.task('default',gulp.series('copy-index','copy-restaurant','copy-images','style-dist','script-dist', function(done) {
    gulp.watch('index.html', gulp.series('copy-index'));
    gulp.watch('restaurant.html', gulp.series('copy-restaurant'));
    gulp.watch('css/*.css', gulp.series('style-dist'));
    gulp.watch('js/*.js', gulp.series('script-dist'));
    gulp.watch('./dist/index.html').on('change', browserSync.reload);
    gulp.watch('./dist/restaurant.html').on('change', browserSync.reload);
    done();
 }));