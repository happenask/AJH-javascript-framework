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