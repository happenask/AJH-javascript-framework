(function() {
    window[ 'templateCache' ] = {};
    window[ 'templateCache' ][ 'inject.html' ] = '<h1>Page 1: <%greeting%></h1><p><%moreText %></p><button class="my-button">Click me</button>';
    window[ 'templateCache' ][ 'inject2.html' ] = '<h1>Page 2: <%heading%></h1><button class="my-button">Click me</button>';
    window[ 'templateCache' ][ 'inject3.html' ] = '<h1>Page 3: <%heading.head%></h1><p> <%heading.content%></p> <%for(var index in heading) {%> <h3><%heading[index]%></h3> <%}%>';
}());
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




/**
 * Created by anjeonghu on 2016-05-17.
 */
/*
 File Name: Modules_v0.1.js
 Description: User Definition Modules. Users can add new modules
 */

// name - $ajax
// version - dev_version
app_container.defineProvider("$ajax", [function(){
    var option = {
        timeout : 10000,
        query_param: {}
    };

    var request = function(options){
        util.ajax(options);
    }

    return {
        // this is for init phase
        option : option,
        request: request,
        $config: [function(){ //$config($run of Angularjs Provider) should be array-like or, function-like with return statement
            return {
                // this is for run phase
                option : option,
                request: request,
            };
        }]
    };
}]);

// name - ButtonHandler
// version - dev_version

app_container.defineProvider("$ButtonHandler", [function(){
    var option = {
        eventType: 'click',
        callback: null
    };
    var ButtonHelper = {};
    ButtonHelper.setButtonEvent = function(type, callback, elem){
        var type;
        if(type){
            type = type;
        }else{
            //set the default eventType
            type = option.eventType;
        }

        if(!callback && typeof callback === 'function'){
            throw new Error("You should define callback for the button");
        }

        if(!elem){
            throw new Error("You should select an element for the button");
        }else if(elem.length > 1){
            throw new Error("You should select only one element at a time");
        }

        elem.addEventListener(type, callback);
    }

    ButtonHelper.$config = [function(){
        return {
            getCurrentOption : function(){
                return option;
            }
        };
    }];

    return ButtonHelper;
}]);
/**
 * Created by anjeonghu on 2016-05-17.
 */
/*
 checking each browser such as chrome, IE, Safari
 checking each version of the browsers
 */
var UserAgent = navigator.userAgent.toLowerCase();
var chrome = "Chrome", safari = "Safari", ie = "Internet Explorer";
var IEVersion;


if(UserAgent.indexOf("chrome") != -1){
    UserAgent = chrome;

}else if(UserAgent.indexOf("safari") != -1){
    UserAgent = safari;

}else if(UserAgent.indexOf("msie") != -1){
    UserAgent = ie;
    IEVersion = getIEVersion();
    console.log("IE Version: " + IEVersion);
    //polyfilling IE console
    if(window.console == undefined){
        console = {log: function(){}}
    }
}else{
    var trident = navigator.userAgent.match(/Trident\/(\d)/i);
    if(trident){
        UserAgent = ie;
        //polyfilling IE console
        if(window.console == undefined){
            console = {log: function(){}}
        }

        if(trident[1] === "6"){
            IEVersion = "10"; //IE 10(trident/6.0)
        }else if(trident[1] === "7"){
            IEVersion = "11"; //IE 11(trident/7.0, the latest version of 2016)
        }else{
            throw new Error('This App only supports v 10 and v 11 of Internet Explorer');
        }
        console.log("IE Version: " + IEVersion);
    }else{
        UserAgent = 'Other Browser';
    }
}

function getIEVersion(){
    var v = -1;
    if(navigator.appName == 'Microsoft Internet Explorer'){
        var ua = navigator.userAgent;
        var re = new RegExp("MSIE ([0-9]{1,}[\.0-9]{0,})");
        if(re.exec(ua) != null){
            v = parseFloat(RegExp.$1);
        }
        return v;
    }
}

var util = {};

// @util.ajax
var xmlhttp = null;
util.ajax = function(options) {
    var opts = {
        url: null,
        type: "GET",
        data: null,
        async: true,
        timeout: 5000,
        dataType: "text",
        success: null,
        error: null,
        complete: null,
        requestHeader: null
    };

    for (var p in options) opts[p] = options[p];
    if(!opts.url) return;
    xmlhttp = null;
    xmlhttp = new XMLHttpRequest();

    if(opts.type === "GET" && opts.data) {
        opts.data = encodeFormData(opts.data);
        opts.url = opts.url +"?"+ opts.data;
        opts.data = null;
    }
    xmlhttp.open(opts.type, opts.url, opts.async);

    opts.type = opts.type.toUpperCase();
    if(opts.async) {
        xmlhttp.timeout = opts.timeout;
    }
    xmlhttp.onload = function(evt) {
        var xmlObj, jsonObj;
        if (xmlhttp.status === 200 || xmlhttp.status === 0) {
            if(typeof opts.success === "function") {
                if(opts.dataType === "json") {
                    if(this.responseText) {
                        try {
                            jsonObj = JSON.parse(this.responseText);
                        } catch (err) {
                            //xmlhttp.onerror = null;
                            opts.error(this, 'json parsererror', err);
                            return;
                        }
                        opts.success(jsonObj, this.statusText, xmlhttp);
                    } else {
                        opts.error(this, 'empty json', this.statusText);
                    }
                } else if(opts.dataType === "xml") {
                    if(this.responseXML) {
                        opts.success(this.responseXML, this.statusText, this);
                    } else if (this.responseText) {
                        try {
                            xmlObj = obigo.parseXML(this.responseText);
                        } catch (err) {
                            //xmlhttp.onerror = null;
                            opts.error(this, 'xml parsererror', err);
                            return;
                        }
                        opts.success(xmlObj, this.statusText, this);
                    } else {
                        opts.error(this, 'empty xml', this.statusText);
                    }
                } else {
                    opts.success(this.responseText, this.statusText, this);
                }
            }
            //500 internal error , Not found(server)
        } else if (xmlhttp.status !== 0) {
            opts.error(xmlhttp, "error", xmlhttp.statusText);
        }
    };
    xmlhttp.ontimeout = function(evt) {
        if(typeof opts.error == "function") {
            opts.error(xmlhttp, "timeout", "timeout");
        }
    };
    //Not found (local), cross-domain (local, server)
    xmlhttp.onerror = function(evt) {
        if(typeof opts.error == "function") {
            if(typeof evt == "string" && evt == "timeerror"){
                opts.error(xmlhttp, "timeerror", xmlhttp.statusText);
            }else{
                opts.error(xmlhttp, "error", xmlhttp.statusText);
            }
        }
    };
    xmlhttp.onloadend = function(evt) {
        if(typeof opts.complete == "function") {
            opts.complete(xmlhttp, xmlhttp.statusText);
        }
    };

    if(opts.type === "POST" && !JSON.stringify(opts.requestHeader).match(/content-type/ig)) {
        xmlhttp.setRequestHeader("Content-Type", "application/x-www-form-urlencoded;charset=UTF-8");

    }
    if(opts.requestHeader) {
        var headers = opts.requestHeader;
        for(var key in headers) {
            if(headers.hasOwnProperty(key)) {
                xmlhttp.setRequestHeader(key, headers[key]);
            }
        }
    }
    if(typeof opts.data === "object") opts.data = encodeFormData(opts.data);
    xmlhttp.send(opts.data);

    return xmlhttp;
};

// xml to json
function extend(dist, source) {
    for (var p in source) {
        dist[p] = source[p];
    }
    return dist;
}

function each(arr, func) {
    for (var i=0, len=arr.length; i<len; i++) {
        func(i, arr[i]);
    }
}

function jsVar(s) {
    return String(s || '').replace(/-/g, "_");
}

function myArr(o) {
    if (Object.prototype.toString.call(o) !== "[object Array]") o = [o];
    o.length = o.length;
    return o;
}

// @util.xmltoJson
util.xmltoJson = function(xml) {
    function xml2json (xml, extended) {
        if (!xml) return;

        function parseXML(node, simple) {
            if (!node) return null;
            var txt = '',
                obj = null,
                att = null;
            var nt = node.nodeType,
                nn = jsVar(node.localName || node.nodeName);
            var nv = node.text || node.nodeValue || '';
            if (node.childNodes) {
                if (node.childNodes.length > 0) {
                    each(node.childNodes, function(n, cn) {
                        var cnt = cn.nodeType,
                            cnn = jsVar(cn.localName || cn.nodeName);
                        var cnv = cn.text || cn.nodeValue || '';
                        if (cnt === 8) {
                            return;
                        } else if (cnt === 3 || cnt === 4 || !cnn) {
                            if (cnv.match(/^\s+$/)) {
                                return;
                            }
                            txt += cnv.replace(/^\s+/, '').replace(/\s+$/, '');
                        } else {
                            obj = obj || {};
                            if (obj[cnn]) {
                                if (!obj[cnn].length) obj[cnn] = myArr(obj[cnn]);
                                obj[cnn] = myArr(obj[cnn]);

                                obj[cnn][obj[cnn].length] = parseXML(cn, true);
                                obj[cnn].length = obj[cnn].length;
                            } else {
                                obj[cnn] = parseXML(cn);
                            }
                        }
                    });
                }
            }
            if (node.attributes) {
                if (node.attributes.length > 0) {
                    att = {};
                    obj = obj || {};
                    each(node.attributes, function(a, at) {
                        var atn = jsVar(at.name),
                            atv = at.value;
                        att[atn] = atv;
                        if (obj[atn]) {
                            obj[cnn] = myArr(obj[cnn]);

                            obj[atn][obj[atn].length] = atv;
                            obj[atn].length = obj[atn].length;
                        } else {
                            obj[atn] = atv;
                        }
                    });
                }
            }
            if (obj) {
                obj = extend((txt !== '' ? txt.toString() : {}), obj || {});
                txt = (obj.text) ? (typeof(obj.text) == 'object' ? obj.text : [obj.text || '']).concat([txt]) : txt;
                if (txt) obj.text = txt;
                txt = '';
            }
            var out = obj || txt;
            if (extended) {
                if (txt) out = {};
                txt = out.text || txt || '';
                if (txt) out.text = txt;
                if (!simple) out = myArr(out);
            }
            return out;
        }


        if (typeof xml === 'string') xml = text2xml(xml);

        if (!xml.nodeType) return;
        if (xml.nodeType === 3 || xml.nodeType === 4) return xml.nodeValue;

        var root = (xml.nodeType === 9) ? xml.documentElement : xml;

        var out = parseXML(root, true);

        xml = null;
        root = null;

        return out;
    }

    function text2xml (str) {
        var out, xml = new DOMParser();

        try {
            xml.async = false;
        }catch(e) {
            throw new Error("XML Parser could not be instantiated");
        }

        try {
            out = xml.parseFromString(str, "text/xml");
        }catch(e){
            throw new Error("Error parsing XML string");
        }

        return out;
    }

    return xml2json(xml);
};

function encodeFormData(data){
    var pairs = [];
    var regexp = /%20/g;
    for(var name in data) {
        if(data.hasOwnProperty(name)) {
            var val = data[name].toString();
            var pair = encodeURIComponent(name).replace(regexp, "+")+"="+
                encodeURIComponent(val).replace(regexp, "+");
            pairs.push(pair);
        }
    }
    return pairs.join("&");
}
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
/**
 * Created by anjeonghu on 2016-05-17.
 */
// name - $tab
// version - dev_version
app_container.defineProvider("$tab", ["$ButtonHandler", function($BH){
    // align tab names
    var tab_head_list = [];
    var tab_ids = [];
    var tab_ctrl = null;
    
    var tab_callbacks = [];

    var getTabNames = function(){
        return tab_head_list;
    };

    var setTabArea = function(elem){
        //check tabctrl
        if(elem.nodeName !== "DIV") {
            throw new Error(elem + "is not a DIV element. You should define tab area with DIV");
        }
        tab_ctrl = elem;
    }

    var setTabNames = function(arr_name){
        if(!tab_ctrl){
            throw new Error("You should first define tab area");
        }
        this.tab_head_list = arr_name;
    };

    var makeTabHeadTemplate = function(){
        if(!tab_ctrl){
            throw new Error("You should first define tab area");
        }

        if(this.tab_head_list.constructor !== Array){
            throw new Error("You should make tab name in array form");
        }

        if(this.tab_head_list.length <= 0){
            throw new Error("You should define more than 1 tab name");
        }

        var len = this.tab_head_list.length;
        var li_tabs = "";
        for(var i=0; i<len; i++){
            li_tabs += "<li><a href='#" + "tabmenu" + i + "'>" + this.tab_head_list[i] + "</a></li>";
        }
        return li_tabs;
    };

    var makeTabBodyTemplate = function(){
        if(!tab_ctrl){
            throw new Error("You should first define tab area");
        }

        var len;
        this.tab_ids = getAllTabIds();
        len = this.tab_ids.length;
        if(len <= 0){
            throw new Error("There is no tab head");
        }

        var div_tabs = "";
        for(var i=0; i<len; i++){
            div_tabs += "<div class='tabContent' id='" + this.tab_ids[i] + "'></div>";
        }

        return div_tabs;
    };

    var defineTabCallbacks = function(callbacks){
        if(!tab_ctrl){
            throw new Error("You should first define tab area");
        }
        var func_names = Object.keys(callbacks);
        var len = func_names.length;
        for(var i=0; i<len; i++){
            tab_callbacks.push(callbacks[func_names[i]]);
        }
    };

    function getAllTabIds(){
        var tab_head_id;
        var arr_li, arr_li_len;
        var arr_tab_name = [];
        var name;

        tab_head_id = tab_ctrl.querySelector('.tabs_head');
        arr_li = tab_head_id.getElementsByTagName('li');
        arr_li_len = arr_li.length;

        for(var i=0; i<arr_li_len; i++){
            name = arr_li[i].firstElementChild.getAttribute('href');
            name = name.replace("#", "");
            arr_tab_name.push(name);
        }

        return arr_tab_name;
    }

    function getTabBodyId(obj_tab_ctrl, idx){
        var container = obj_tab_ctrl.querySelector('.tabs_body');
        if(container.children < 0){
            throw new Error("You should define tab name more than one");
        }

        return container.children[idx].getAttribute("id");
    };

    function bindTabHeadEvents(head_list){

        //Registering Button Click event
        var tab_head_list = head_list;
        var len = tab_head_list.children.length;

        for(var i=0; i<len; i++){
            // get event from tab head and register the event
            //(type, callback, elem)
            $BH.setButtonEvent('click', tab_callbacks[i], head_list.children[i]);
        }
    }

    //TBD implementation
    /*var setTabHeadSize = function(x, y){

     };

     var setTabBodySize = function(x, y){

     };*/

    var runInitTabPage = function(construct){
        //show the first element in the tab list
        var tab_body = tab_ctrl.querySelector('.tabs_body');
        var tab_head = tab_ctrl.querySelector('.tabs_head');
        tab_body.firstElementChild.classList.add('show');

        bindTabHeadEvents(tab_head);

        if(typeof construct === 'function'){
            construct();
        }
    };

    return {
        //for init phase
        setTabNames: setTabNames,
        makeTabHeadTemplate: makeTabHeadTemplate,
        setTabArea: setTabArea,
        $config: [function(){
            return {
                //for run phase
                setTabNames: setTabNames,
                makeTabBodyTemplate: makeTabBodyTemplate,
                makeTabHeadTemplate: makeTabHeadTemplate,
                defineTabCallbacks: defineTabCallbacks,
                getTabBodyId: getTabBodyId,
                setTabArea: setTabArea,
                run: runInitTabPage
            };
        }]
    };
}]);


/*


app_container.defineController("tab_main",function($ajax, $tab){
    var ctrl_tab = document.querySelector('#tab_main');
    var tab_name = ["밴드 홈", "밴드 찾기", "더보기"];
    var tab_callbacks = {};
    var tab_head_template, tab_body_template;
    var base_url = "https://wb-moim-test.briniclemobile.com:8111/";

    $tab.setTabArea(ctrl_tab);


    $tab.setTabNames(tab_name);

    tab_head_template = $tab.makeTabHeadTemplate();
    ctrl_tab.firstElementChild.innerHTML = tab_head_template;

    tab_body_template = $tab.makeTabBodyTemplate();
    ctrl_tab.lastElementChild.innerHTML = tab_body_template;

    tab_callbacks.bandHome = function(){
        var moim_post_url;
        var tab_body_id;
        var HOME_TAB_ID = 0;
        moim_post_url = base_url + "moims/212120435347686757/posts/";

        $ajax.request({
            url: moim_post_url,
            type:"POST",
            requestHeader: {Authorization: "Token 11004ea8b0ea004411e6b5f9ac162d8aa984"},
            data: {useridx:"1100" ,description: "show me that 1100 user post a message"},
            async: true,
            timeout: 10000,
            dataType: "text/html",
            success: function(result){
                var tab_body;
                var len;
                var tab_container = ctrl_tab.getElementsByClassName("tabs_body")[0];
                console.log(result);
                tab_body_id = $tab.getTabBodyId(ctrl_tab, HOME_TAB_ID);
                tab_body = ctrl_tab.querySelector("#" + tab_body_id);
                len = tab_container.children.length;
                for(var i=0;i<len; i++){
                    if(tab_container.children[i].classList.contains('show')){
                        tab_container.children[i].classList.remove("show");
                    }
                }
                tab_container.children[HOME_TAB_ID].classList.add("show");
                tab_body.innerHTML = result;
            },
            error: function(err, status, messsage){
                console.log("error status: " + status);
            }
        });
    };
    tab_callbacks.bandSearch = function(){
        var recommended_moim_url;
        var SEARCH_TAB_ID = 1;
        recommended_moim_url =  base_url + "/moims/recommend/?useridx=111";
        $ajax.request({
            url: recommended_moim_url,
            type:"GET",
            async: true,
            timeout: 10000,
            dataType: "text/html",
            success: function(result){
                var tab_body;
                var tab_container = ctrl_tab.getElementsByClassName("tabs_body")[0];
                var len;
                console.log(result);
                tab_body_id = $tab.getTabBodyId(ctrl_tab, SEARCH_TAB_ID);
                tab_body = ctrl_tab.querySelector("#" + tab_body_id);
                len = tab_container.children.length;
                for(var i=0;i<len; i++){
                    if(tab_container.children[i].classList.contains('show')){
                        tab_container.children[i].classList.remove("show");
                    }
                }
                tab_container.children[SEARCH_TAB_ID].classList.add("show");

                tab_body.innerHTML = result;
            },
            error: function(err, status, messsage){
                console.log("error status: " + status);
            }
        });
    };
    tab_callbacks.bandMore = function(){
        var tab_body;
        var MORE_TAB_ID = 2;
        var tab_container = ctrl_tab.getElementsByClassName("tabs_body")[0];
        tab_body_id = $tab.getTabBodyId(ctrl_tab, MORE_TAB_ID);
        tab_body = ctrl_tab.querySelector("#" + tab_body_id);
        len = tab_container.children.length;
        for(var i=0;i<len; i++){
            if(tab_container.children[i].classList.contains('show')){
                tab_container.children[i].classList.remove("show");
            }
        }
        tab_container.children[MORE_TAB_ID].classList.add("show");

        tab_body.innerHTML = "TBD";
    };

    $tab.defineTabCallbacks(tab_callbacks);
    $tab.run(tab_callbacks.bandHome);
    
});*/
