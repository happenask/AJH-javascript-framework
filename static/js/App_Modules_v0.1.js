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