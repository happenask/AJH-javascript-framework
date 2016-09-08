/**
 * Created by anjeonghu on 2016-05-17.
 */
/*
 App_Framework - v0.1
 release date : 2016-XX-XX

 Copyright (C) XXXX Ltd., 2016.
 All rights reserved.

 This software is covered by the license agreement between
 the end user and XXXXX Ltd., and may be
 used and copied only in accordance with the terms of the
 said agreement.

 XXXXX Ltd. assumes no responsibility or
 liability for any errors or inaccuracies in this software,
 or any consequential, incidental or indirect damage arising
 out of the use of the software
 */

/**
 * Description: Injector is an dependency Injection class
 * please, add what you want more in order to advance Injector
 */
var app_container = {};

app_container.$configPhase = {
    $component: {},
    $injectable: {}
};

app_container.$runPhase = {
    $component: {},
    $injectable: {}
};

////////////topological sort for dependency relation/////////////////////
function toposort(nodes, edges) {
    var cursor = nodes.length;
    var sorted = new Array(cursor);
    var visited = {};
    var i = cursor;

    while(i--){
        if (!visited[i]){
            visit(nodes[i], i, []);
        }
    }
    console.log('sorted '+sorted);
    return sorted;

    function visit(node, i, predecessors) {
        if(predecessors.indexOf(node) >= 0) {
            throw new Error('Cyclic Dependency: '+ node);
        }

        if(visited[i])
            return;
        visited[i] = true;

        // outgoing edges
        var outgoing = edges.filter(function(edge){

            return edge[0] === node;
        });

        if(i = outgoing.length){
            var preds = predecessors.concat(node);

            do {
                var child = outgoing[--i][1];
                visit(child, nodes.indexOf(child), preds);
            } while (i)
        }

        sorted[--cursor] = node;


    }
}

function uniqueNodes(arr){
    var res = [];
    for (var i = 0, len = arr.length; i < len; i++) {
        var edge = arr[i];

        if(res.indexOf(edge[0]) < 0){
            res.push(edge[0]);
        }

        if(res.indexOf(edge[1]) < 0) {
            res.push(edge[1]);
        }
    }
    return res;
}
//////////////////////////////////////////////////////


function makeComponent(obj_const){
    //make component such as controller, factory, provier, service with obj_const

    var FN_ARGS = /^[^\(]*\(\s*([^\)]*)\)/m;
    var FN_ARG_SPLIT = /,/;
    var FN_ARG = /^\s*(_?)(\S+?)\1\s*$/;
    var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
    var obj = {};

    if(typeof obj_const === "function"){
        obj.$const = obj_const;
        obj.$inject = [];

        var fnText = obj_const.toString().replace(STRIP_COMMENTS, '');
        var argDecl = fnText.match(FN_ARGS);
        
        argDecl[1].split(FN_ARG_SPLIT).forEach(function(arg){
            arg.replace(FN_ARG, function(all, underscore, name){
                obj.$inject.push(name);
            });
        });

    }else if(obj_const.constructor === Array){
        if(obj_const.length === 1){ //why need this if statement? user can add constructor in array form
            obj.$const = obj_const[0];
            obj.$inject = [];

        }else{
            obj.$const = obj_const[obj_const.length -1]; //the last parameter
            obj.$inject = obj_const.slice(0, obj_const.length-1); //all parameters except the last one
        }
    }

    return obj;
}

function makePhase(obj_phase){

    // execute all the methods of obj_phase such as constructor methods, the $config method of provider objects
    var construct, inject;
    var params = [];
    var initOrder = [];
    // get module names from component object of init phase or run phase by extracting dependency name from component object
    for(var name in obj_phase.$component){
        var module = obj_phase.$component[name];
        if(module.$inject.length == 0){
            var arr = [];
            arr.push(name);
            arr.push(undefined);		//dummy inject in order to make DAG(for no incoming vertex)
            initOrder.push(arr);
        }else{
            for(var i=0;i<module.$inject.length;i++){
                var arr = [];
                arr.push(name);			//dummy inject in order to make DAG(for incoming vertex)
                arr.push(module.$inject[i]);
                initOrder.push(arr);
            }
        }


    }
    console.log(initOrder);
    var moduleTopos = toposort(uniqueNodes(initOrder), initOrder);
    var module_count = moduleTopos.length - 1;


    for(var i=module_count; i>= 0; i--){
        var name = moduleTopos[i];

        if(!obj_phase.$component[name]){
            continue;
        }
        var injectLen = obj_phase.$component[name].$inject.length;
        var params = [];
        // get dependencies from phase object in order to inject them into modules(ex, controller, provider, factory)
        for(var j=0;j<injectLen;j++){
            var moduleName = obj_phase.$component[name].$inject[j];

            if(obj_phase.$injectable[moduleName]){
                params.push(obj_phase.$injectable[moduleName]);
            }else{
                throw new Error('No Module : ' + moduleName);
            }
        }
        //check if module is config,controller, factory, provider
        if(obj_phase.$component[name].type === 'config'){

            (obj_phase.$component[name].$const).apply(obj_phase.$component[name].$const, params);

        }
        else if(obj_phase.$component[name].type === 'controller'){

            var scope = {};
            scope.id = makeScope();
            obj_phase.$component[name].$scope = scope;
            (obj_phase.$component[name].$const).apply(obj_phase.$component[name].$scope, params);

        }else if(obj_phase.$component[name].type === 'factory'){
            obj_phase.$injectable[name] = obj_phase.$component[name].$const = (obj_phase.$component[name].$const).apply(obj_phase.$component[name], params);

        }else if(obj_phase.$component[name].type === 'provider'){
            obj_phase.$injectable[name] = obj_phase.$component[name].$const  =  (obj_phase.$component[name].$const).apply(obj_phase.$component[name], params);

            // provider needs $config method in order to initialize Factory named with the Provider name
            if(obj_phase.$component[name].$const.$config){

                app_container.defineFactory(name, obj_phase.$component[name].$const.$config);

            }else{
                throw new Error("Provider has to define '$config' property : " + name);
            }
        }
    }

}
/**
 * Description: makeScopeId is for unique Id of scope object, it's using closure of javascript
 * every time controller is created, each controller has it's own scope object with unique id
 */
function makeScopeId()
{
    var id = 0;
    return function(){return (id+=1);};
}
var makeScope = makeScopeId();

app_container.defineConfig = function(name,constructor){

    var type = "config";
    app_container.$configPhase.$component[name] = makeComponent(constructor);
    app_container.$configPhase.$component[name].type = type;
    return this;
}

/**
 * Description: defineController is to define controller for each view of application by adding services such as factory, provider, service
 * please, add what you want more in order to advance defineController
 * @name - the name of controller
 * @constructor - object including dependencies and controller constructor
 */
app_container.defineController = function(name, constructor){
    var type = "controller";

    app_container.$runPhase.$component[name] = makeComponent(constructor);
    app_container.$runPhase.$component[name].type = type;
    return this;
}

/**
 * Description: defineFactory is to define factory which developer can add to any controller
 * please, add what you want more in order to advance defineFactory
 * @name - the name of Factory
 * @constructor - object including dependencies and factory constructor
 */
app_container.defineFactory = function(name, constructor){
    var type = "factory";

    app_container.$runPhase.$component[name] = makeComponent(constructor);
    app_container.$runPhase.$component[name].type = type;
    app_container.$runPhase.$injectable[name] = app_container.$runPhase.$component[name].$const;

    //Factory can return any type of data(or object)
    return this;
}

/**
 * Description: defineProvider is to define provider which developer can add to any controller
 * please, add what you want more in order to advance defineProvider
 * @name - the name of Provider
 * @constructor - object including dependencies and provider constructo
 * 
 * 
 * 
 * r
 */
app_container.defineProvider = function(name, constructor){
    var type = "provider";

    app_container.$configPhase.$component[name] = makeComponent(constructor);
    app_container.$configPhase.$component[name].type = type;
    app_container.$configPhase.$injectable[name] = app_container.$configPhase.$component[name].$const;
    //app_container.$configPhase.name = name;
    //define module and include it to configPhase

    return this;
    //return app_container.$configPhase;
}



/**
 * Description: defineService is to define service which developer can add to any controller
 * please, add what you want more in order to advance defineService
 */

window.addEventListener("load", function(e){
    makePhase(app_container.$configPhase);
    makePhase(app_container.$runPhase);
    console.log(app_container);
});
window.app_container = app_container;



