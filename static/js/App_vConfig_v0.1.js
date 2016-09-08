/**
 * Created by anjeonghu on 2016-05-25.
 */
app_container.defineConfig("mainConfig",function($routerProvider){


    $routerProvider.when('/', {
        templateUrl: 'inject.html',
        controller: 'test_main'
    }).when('/page1?:id', {
        templateUrl: 'inject2.html',
        controller: 'test_main2'
    }).when('/page2', {
        templateUrl: 'inject3.html',
        controller: 'test_main3'
    });


    window.addEventListener('hashchange', $routerProvider.router);
    // Listen on page load:
    window.addEventListener('load', $routerProvider.router);
});