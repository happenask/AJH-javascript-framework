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
