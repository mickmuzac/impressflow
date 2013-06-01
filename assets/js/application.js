var self, isBeingEdited = null, previouslyBeingEdited = null, 
currentZoom = null, currentResizePosition = {top: 0, left: 0}, 
cachejQObj = null, ignoreZoomRecalibration = false;
var canvasHeight = $('#canvas').height();
var canvasWidth = $('#canvas').width();

var store = new actionStore();

//Take in generalized ID, jQuery object or slide, and returns KO object or slide
var getRealObject = function(obj){
	

	if(obj instanceof jQuery || typeof obj == "string"){
		
		var tempId = (typeof obj == "string")? obj : obj.attr("id");
		
		if(tempId[0] == "s"){
		
			var temp = tempId.split("-");
			var tempCurrentClickNow = self.allSlides()[temp[1]];
		}
		
		else{
			
			console.log("REAL OBJ");
			console.log(tempId);
			var temp = tempId.split("_");
			var tempCurrentClickNow = self.allSlides()[temp[2]].allObjects()[temp[1]];
		}
		
		return tempCurrentClickNow;
	}
	
	else return obj;
};

//This function copies the "edit" style from a main style
var saveAndReturnStyles = function(obj, isNewSlide){
	
	obj = getRealObject(obj);

	var id = (obj.type == "text") ? "#"+obj.id + "" : "#" + obj.id;
	var styleArr = ["font-size", "color", "line-height", "height", "width", "top", "left", "display"];
	var tempObjStyles = {};
	var length = styleArr.length;
	
	if(isNewSlide === true && currentZoom < 1){
	
		var pos = $(id).position();
		console.log("debug location zoom: ", pos);
		$(id).css({top:(pos.top * 1/currentZoom) + "px", left: (pos.left* 1/currentZoom) + "px"});
	}
	
	for(var i = 0; i < length; i++)
		tempObjStyles[styleArr[i]] = $(id).css(styleArr[i]);
	
	obj.style = tempObjStyles;
	loadAttributeStyle(tempObjStyles);
	return tempObjStyles;		
};

var handleFocus = function(event, _redoOrObject, jqObj){
	
	var me = $(this);
	me = _redoOrObject && _redoOrObject.id ? $('#'+_redoOrObject.id) : me;

	$(".draggable").css("border","#AAA solid 1px");
	
	if(event){
		event.stopPropagation();
	}
	
	//This makes it so that cachejQObj isn't reloaded during a drag
	if(!ignoreZoomRecalibration){
		cachejQObj = _redoOrObject === true ? jqObj : me;
		currentResizePosition = {left: parseInt(cachejQObj.css("left")), 
								top: parseInt(cachejQObj.css("top"))};			
	}
	
	else return;
	
	if(cachejQObj.attr("id")[0] == "o"){
		focusOn(cachejQObj);
		cachejQObj.typeOfObject = "object";
		$('#canvasContainer').scrollTo(currentResizePosition.left, currentResizePosition.top);
	}
	
	else if(cachejQObj.attr("id")[0] == "s"){
		
		var temp = cachejQObj.attr("id").split("-");
		cachejQObj.typeOfObject = "slide";
		self.focusOnSlide(self.allSlides()[temp[1]]);
	}
	
	else{
		cachejQObj.typeOfObject = "container";
	}
	
	
};


var loadAttributeStyle = function(style){


	var attrMap = {"top":"data-x", "left":"data-y", "data-scale": null, "data-rotate": "data-rotate",
				   "data-z":null};
	var attrObj = {};
	
	$.each(attrMap, function(key, value) {
	
	
      if(style[key] != undefined)
		attrObj[value] = parseInt(style[key]);
	});
	
	console.log("ATTR: ");
	console.log(attrObj);
	
	
};

//Content edit expects a contentObject and will go into "edit" mode depending on type
var objectClick = function(obj){
	
	$("#"+obj.id).zoomTarget();
	console.log(obj);
	
	//It's important to note that Knockout.js takes care of setting "obj" for us
	var styles = saveAndReturnStyles(obj);//(obj.style == null) ? saveAndReturnStyles(obj) : obj.style;

	console.log(styles);
	
	if(obj.type == "text"){
		
	
		$("#"+obj.id + " span").hide();
		$("#"+obj.id + " textarea").show();
		$("#"+obj.id + " textarea").focusToEnd();
		
		$("#"+obj.id).resizable('destroy');
		$("#"+obj.id + " textarea").css(styles);
		$("#"+obj.id + " textarea").focus();
	}
	
	
	
	//Another way to read obj, is "obj is being edited"
	isBeingEdited = obj;
};

//Stop click is also synonymous for stop edit!
var objectStopClick = function(obj){
	
	console.log("STOP: " + $("#"+obj.id));
	
	if(obj.type == "text"){
		
		handleNewObjectRefresh(obj, "object");
		
		$("#"+obj.id + " span").show();
		$("#"+obj.id + " textarea").hide();
	}
	
	previouslyBeingEdited = isBeingEdited;
	isBeingEdited = null;
};

var contentObject = function(obj){

	var me = this;
	me.type = obj.type;
	me.value = ko.observable(obj.value);
	
	//Read only! ... needs to be sanitized further
	this.readSanatizedValue = ko.computed(function(){
		me.value($.trim(me.value()));
		return me.value();
	});
	me.id = obj.id;
	me.slideId = self.allSlides()[self.currentSlide()].id;
	
	me.style = null;
	me.helper = null;
};

//Generate an object, push it to the correct slide, and assign it an ID
/*
	WARNING, IDs MUST NOT DEPEND ON THE LENGTH OF AN ARRAY!! PROBLEMS WILL OCCUR WITH DELETIONS! (unless observable)
	WARNING STILL APPLIES!! Random ID gen might be a solution here..
*/
var addObject = function(type, value){
	
	var temp = self.allSlides()[self.currentSlide()].allObjects;
	var tempObj = new contentObject({"type": type, "value": value, "id":"o_" + temp().length + "_" + self.currentSlide()});
	temp.push(tempObj);
		
	self.allSlides.valueHasMutated();
	handleNewObjectRefresh(tempObj, "object");
	saveAndReturnStyles(tempObj);
	
	return tempObj;
};

var addSlide = function(){
	
	var tempSlide = new slideObject(self.allSlides().length);
	self.allSlides.push(tempSlide);
	self.allSlides.valueHasMutated();
	
	handleNewObjectRefresh(tempSlide, "slide");
	self.focusOnSlide(tempSlide);
	saveAndReturnStyles(tempSlide, true);
	
	//console.log(tempSlide);
	generateCanvasScreen(tempSlide);
	return tempSlide;
};

var generateCanvasScreen = function(obj, override){

	obj = getRealObject(obj);
	var tempObj = (obj.type != "slide") ? getRealObject(obj.slideId) : obj;
	
	html2canvas($("#" + tempObj.id)[0], {
		onrendered: function(canvas) {
			// canvas is the final rendered <canvas> element
			console.log(canvas.toDataURL());
			tempObj.canvasScreen(canvas.toDataURL("image/png"));					
		}
	});
};

var slideObject = function(id){

	//A slide object on the canvas is defined here
	this.id = "s-" + id;
	this.sidebarId = "s_" + id;
	this.type = "slide";
	
	this.style = null;
	this.attributes = null;
	this.allObjects = ko.observableArray();
	this.canvasScreen = ko.observable();
};

var presentationModel = function() {
	
	self = this;
	
	/*
		Objects and functions in view model
	*/

	
	self.getSlideId = function(index){
		
		return "s_" + index();
	};
	
	
	/*
		Observables and other variables
	*/
    self.allSlides = ko.observableArray();	
	self.currentSlide = ko.observable(0);

	/*self.currentObjects = ko.computed(function(){

		return self.allSlides()[self.currentSlide()].allObjects();
	});*/
	
	self.focusOnSlide = function(slideObj){		
		
		$(".allSlides").css({"border-color":"black"});
		$(".slide").css({"border-color":"#AAA"});
		$("#" + slideObj.id).add("#"+slideObj.sidebarId).css({"border-color":"blue"});
	
		//Keeps track of the current slide
		self.currentSlide(slideObj.id.split("-")[1]);
		
		$('#canvasContainer').scrollTo(cachejQObj);
	};
};


/* 


	jQUERY 


*/

var handleZoomJumpFix = function(obj, ui, position){

	obj.css({
		top: position.top + "px",
		left: position.left + "px"
	});
	
	ui.originalPosition = position;
	ui.position = position;
};

var handleNewObjectRefresh = function(obj, objType){
	
	//Need to figure out how to handle refreshing all
	if(obj == null)
		return;
		
	if(objType == "object"){
		$("#" + obj.id).resizable({
		
			start: function(event, ui) {  
				ignoreZoomRecalibration = true;			
				handleZoomJumpFix(cachejQObj, ui, currentResizePosition);
			},
			
			resize: function(event, ui){
			
				handleZoomJumpFix(cachejQObj, ui, currentResizePosition);
			},
			
			stop: function(event, ui) {
				
				ignoreZoomRecalibration = false;
				event.stopPropagation();
			}
		});
	}
	
	$("#" + obj.id).draggable({
		
		 tempX: 0,
		 tempY: 0,
		 tParent: null,
		 width: null,
		 height: null,
		 tLeft: null,
		 tTop: null,
		 tempZoom: 1,
		 objectType: objType,
		 offsetCalc : 0,
		
		start: function(evt, ui){
			
			//When starting a drag, focus on object, and calculate initial CSS values
			
			//Stop refreshing location onHover
			//cachejQObj = $(this);
			ignoreZoomRecalibration = true;
			this.objectType = objType;
			
			this.tParent = cachejQObj.parent();
			
			this.width = cachejQObj.width();
			this.height = cachejQObj.height();		

			this.tempZoom = (currentZoom && this.tempZoom != currentZoom)? 1/currentZoom : 1;
			
			this.tempX = currentResizePosition.left - this.tempZoom*evt.clientX;
			this.tempY = currentResizePosition.top - this.tempZoom*evt.clientY;
			
			//Scaling while zoomed in is still incorrect, hide cursor
			$("#canvasContainer").add(cachejQObj).css("cursor", "none");
			

			
			handleZoomJumpFix(cachejQObj, ui, currentResizePosition);
			console.log(this.objectType, " ", cachejQObj);

			if(this.objectType == "object"){
				//MAKE THE FOLLOWING 2 LINES A FUNCTION! (Eventually)
				self.focusOnSlide(getRealObject(getRealObject($(this)).slideId));
				var temp = cachejQObj.attr("id").split("_");
				previouslyBeingEdited = self.allSlides()[temp[2]].allObjects()[temp[1]];
			}
			
			if(this.objectType != 'container')
				store.addAction(saveAndReturnStyles(cachejQObj), "move", cachejQObj.attr("id"));
		},
		
		drag: function(evt, ui){
			
			this.tTop = this.tempY+this.tempZoom*evt.clientY;
			this.tLeft = this.tempX+this.tempZoom*evt.clientX;
			
			//console.log(tTop + " " + tLeft);
			this.offsetCalc = (this.objectType == "container") ? -100000000 : 0;
			
			if(this.tTop < this.offsetCalc)
				this.tTop = this.offsetCalc;
			
			else if(this.tTop + this.height + this.offsetCalc > this.tParent.height())
				this.tTop = this.tParent.height()-this.height-1 - this.offsetCalc;
			
			if(this.tLeft < this.offsetCalc)
				this.tLeft = this.offsetCalc;
			
			else if(this.tLeft + this.width + this.offsetCalc > this.tParent.width())
				this.tLeft = this.tParent.width()-this.width-1 - this.offsetCalc;
			
			//console.log(this.tTop, this.tLeft);
			handleZoomJumpFix(cachejQObj, ui, {top: this.tTop, left: this.tLeft});
		},
		
		stop: function(evt, ui){
			
			ignoreZoomRecalibration = false;

			//Show cursor again
			$("#canvasContainer").css("cursor", "default");
			cachejQObj.css("cursor", "pointer");
			
			currentResizePosition = {left: parseInt(cachejQObj.css("left")), 
						top: parseInt(cachejQObj.css("top"))};
						
			if(this.objectType != "container")
				saveAndReturnStyles(cachejQObj);
		}
	});
	
};

var focusOn = function(obj){

	obj.css("border","red solid 1px");
};

var handleZoom = function(opt){
	
	/*
		TO-DO: Zoom in and out with respect to a SLIDE not OBJECT
	*/
	
	//var zoomOpt = {closeclick:false, root:$("#canvas"), debug:false};
	
	if(cachejQObj == null)
		return;

	currentZoom = (currentZoom == null) ? 1 : currentZoom;
	var canvas = $("#canvas");
	
	if(opt == "in"){
		
		currentZoom = (currentZoom < 1) ? currentZoom + .2: currentZoom;
		//zoomOpt.targetsize = currentZoom;
		//$(cachejQObj).zoomTo(zoomOpt);
	}
	
	else{
		
		currentZoom = (currentZoom - .01 > .2)? currentZoom - .2: currentZoom;
		//zoomOpt.targetsize = currentZoom;
		//$(cachejQObj).zoomTo(zoomOpt);
	}
	
	canvas.animate({"scale":currentZoom});
	console.log("Current Zoom: " + currentZoom);
};

$(function(){


	$(".droppable").droppable();
	
	$("#canvas").on("blur", "textarea", function(event){
		
		if(isBeingEdited == getRealObject($(this).parent())){
	
			objectStopClick(isBeingEdited);
		}
	});
	
	//Handle object AND full slide clicking
	$("#canvas").on("click", ".object", function(event){
		
		console.log(isBeingEdited);
		
		
		$(".draggable").css("border","#AAA solid 1px");
		var tempCurrentClickNow = getRealObject($(this));
		
		if(tempCurrentClickNow == isBeingEdited)
			return false;
		
		else{
		
			//These calls are only for objects that are being newly focused on..				
			if(isBeingEdited != null)
				objectStopClick(isBeingEdited);
			
			objectClick(tempCurrentClickNow);
		}		
	});
	
	$("#canvas").on("keyup", "textarea", function(event){
		
		if(event.keyCode == 46)
			this.style.height = 0; // this is necessary to make it shrink when deleting
		$(this).css("height", this.scrollHeight + 'px');
	});
	
	
	
	//Handle menu options
	$(".nav li").click(function(){
		
		var tempObj = null;
		switch($(this).attr("class")){
		
			case "addSlide":
				addSlide();
				break;
				
			case "addText":
				addObject("text", "Edit Me");
				break;
			
			case "addImage":
				addObject("image", "testImage.png");
				break;
				
			case "zoomIn":
				handleZoom("in");
				break;
			
			case "zoomOut":
				handleZoom("out");
				break;
				
			case "save":
				console.log(ko.toJSON(self));
				break;
		}
		
		
		console.log(self.currentSlide());
		console.log(self.allSlides());
	});
	
	//Handle mini slide clicking
	$("#canvasContainer").on("mousedown", ".object, .slide, #canvas", handleFocus);
});

(function($) {
    $.fn.focusToEnd = function() {
        return this.each(function() {
            var v = $(this).val();
            $(this).focus().val("").val(v);
        });
    };
})(jQuery);





/*!
 * jquery.scrollto.js 0.0.1 - https://github.com/yckart/jquery.scrollto.js
 * Scroll smooth to any element in your DOM.
 *
 * Copyright (c) 2012 Yannick Albert (http://yckart.com)
 * Licensed under the MIT license (http://www.opensource.org/licenses/mit-license.php).
 * 2013/02/17
 **/
(function ($) {
    $.scrollTo = $.fn.scrollTo = function(x, y, options){
        if (!(this instanceof $)) return $.fn.scrollTo.apply($('html, body'), arguments);

        options = $.extend({}, {
            gap: {
                x: parseInt($("#canvas").css("left"),10),
                y: parseInt($("#canvas").css("top"),10)
            },
            animation: {
                easing: 'swing',
                duration: 600,
                complete: $.noop,
                step: $.noop
            }
        }, options);

        return this.each(function(){
            var elem = $(this);
			if(isNaN(Number(x)) && isNaN(Number(y))){
				y = x;
				console.log($(x).offset());
			}
            elem.stop().animate({
                scrollLeft: !isNaN(Number(x)) ? x : parseInt($(x).css("left"),10) + options.gap.x,
                scrollTop: !isNaN(Number(y)) ? y : parseInt($(y).css("top"),10) + options.gap.y
            }, options.animation);
        });
    };
})(jQuery);





/*
 * based off of Louis-Rémi Babé rotate plugin (https://github.com/lrbabe/jquery.rotate.js)
 *
 * cssTransforms: jQuery cssHooks adding a cross browser, animatible transforms
 *
 * Author Bobby Schultz
 */
 //
(function($) {

    var div = document.createElement('div'),
      divStyle = div.style;

    //give props to those who dont have them
    $.cssProps.transform = 
        divStyle.MozTransform === '' ? 'MozTransform' :
        (divStyle.msTransform === '' ? 'msTransform' :
        (divStyle.WebkitTransform === '' ? 'WebkitTransform' :
        (divStyle.OTransform === '' ? 'OTransform' :
        (divStyle.Transform === '' ? 'Transform' :
        false))));
    $.cssProps.transformOrigin = 
        divStyle.MozTransformOrigin === '' ? 'MozTransformOrigin' :
        (divStyle.msTransformOrigin === '' ? 'msTransformOrigin' :
        (divStyle.WebkitTransformOrigin === '' ? 'WebkitTransformOrigin' :
        (divStyle.OTransformOrigin === '' ? 'OTransformOrigin' :
        (divStyle.TransformOrigin === '' ? 'TransformOrigin' :
        false))));
        
    //define supported or not
    $.support.transform = $.cssProps.transform !== false || divStyle.filter === '' ? true : false;
    $.support.transformOrigin = $.cssProps.transformOrigin !== false ? true : false;

    //if ONLY IE matrixes are supported (IE9 beta6 will use css3)
    $.support.matrixFilter = (divStyle.filter === '' && $.cssProps.transform === false) ?
        true : false;
    div = null;

    //stop if no form of transforms are supported
    if($.support.transform === false)
        return;

    //opt out of letting jquery handle the units for custom setters/getters 
    $.cssNumber.skew = 
    $.cssNumber.skewX = 
    $.cssNumber.skewY = 
    $.cssNumber.scale =
    $.cssNumber.scaleX =
    $.cssNumber.scaleY =
    $.cssNumber.rotate = 
    $.cssNumber.matrix = true;
    
    $.cssNumber.transformOrigin = 
    $.cssNumber.transformOriginX = 
    $.cssNumber.transformOriginY = true; 
    
    
    if($.support.matrixFilter) {
        $.cssNumber.transformOrigin = 
        $.cssNumber.transformOriginX = 
        $.cssNumber.transformOriginY = true; 
        
        $.cssProps.transformOrigin = 'matrixFilter';
    }

    $.cssHooks.transform = {
        set: function(elem, val, unit) {
            if($.support.matrixFilter) {
                elem.style.filter = [val].join('');
            } else {
                elem.style[$.cssProps.transform] = val+'%';
            }
        },
        get: function(elem, computed) {
            if($.support.matrixFilter) {
                return elem.style.filter;
            } else {
                return elem.style[$.cssProps.transform];
            }
        }
    };
    
    $.cssHooks.transformOrigin = {
        set: function(elem, val, unit) {
            if(!$.support.matrixFilter) {
                val = (typeof val === 'string') ? val : val+(unit || '%');
                elem.style[$.cssProps.transformOrigin] = val;
            } else {
                val = val.split(",");
                $.cssHooks.transformOriginX.set( elem, val[0] );
                if(val.length > 1) {
                    $.cssHooks.transformOriginY.set( elem, val[1] );
                }
            }
        },
        get: function(elem, computed) {
            if(!$.support.matrixFilter) {
                return elem.style[$.cssProps.transformOrigin];
            } else {
                var originX = $.data( elem, 'transformOriginX' );
                var originY = $.data( elem, 'transformOriginY' );
                return originX && originY && originX === originY ? originX : '50%';
            }
        }
    };
    
    $.fx.step.transformOrigin = function( fx ) {
        $.cssHooks.transformOrigin.set( fx.elem, fx.now, fx.unit);
     };
    
    $.cssHooks.transformOriginX = {
        set: function(elem, val, unit) {
            if(!$.support.matrixFilter) {
                val = (typeof val === 'string') ? val : val+(unit || '%');
                elem.style[$.cssProps.transformOrigin+'X'] = val;
            } else {
                $.data( elem, 'transformOriginX', unit ? val+unit : val );
                setIEMatrix(elem);
            }
        },
        get: function(elem, computed) {
            if(!$.support.matrixFilter) {
                return elem.style[$.cssProps.transformOrigin+'X'];
            } else {
                var originX = $.data( elem, 'transformOriginX' );
                switch(originX) {
                    case 'left': return '0%';
                    case 'center': return '50%';
                    case 'right': return '100%';
                }
                return originX ? originX : '50%';
            }
        }
    };
    
    $.fx.step.transformOriginX = function( fx ) {
        $.cssHooks.transformOriginX.set( fx.elem, fx.now, fx.unit);
     };
    
    $.cssHooks.transformOriginY = {
        set: function(elem, val, unit) {
            if(!$.support.matrixFilter) {
                val = (typeof val === 'string') ? val : val+(unit || '%');
                elem.style[$.cssProps.transformOrigin+'Y'] = val;
            } else {
                $.data( elem, 'transformOriginY', unit ? val+unit : val );
                setIEMatrix(elem);
            }
        },
        get: function(elem, computed) {
            if(!$.support.matrixFilter) {
                return elem.style[$.cssProps.transformOrigin+'Y'];
            } else {
                var originY = $.data( elem, 'transformOriginY' );
                switch(originY) {
                    case 'top': return '0%';
                    case 'center': return '50%';
                    case 'bottom': return '100%';
                }
                return originY ? originY : '50%';
            }
        }
    };
    
    $.fx.step.transformOriginY = function( fx ) {
        $.cssHooks.transformOriginY.set( fx.elem, fx.now, fx.unit);
     };

    //create hooks for css transforms
    var rtn = function(v){return v;};
    var xy = [['X','Y'],'X','Y'];
    var abcdxy = [['A','B','C','D','X','Y'],'A','B','C','D','X','Y']
    var props = [
        {prop: 'rotate', 
            matrix: [function(v){ return Math.cos(v); },
                function(v){ return -Math.sin(v); },
                function(v){ return Math.sin(v); },
                function(v){ return Math.cos(v); } ],
            unit: 'rad',
            subProps: [''],
            fnc: toRadian},
        {prop: 'scale',
            matrix: [[rtn,0,0,rtn],
                [rtn,0,0,1],
                [1,0,0,rtn]],
            unit: '',
            subProps: xy,
            fnc: parseFloat,
            _default:1},
        {prop: 'skew',
            matrix: [[1,rtn,rtn,1],
                [1,rtn,0,1],
                [1,0,rtn,1]],
            unit: 'rad',
            subProps: xy,
            fnc: toRadian},
        {prop: 'translate',
            matrix: [[1,0,0,1,rtn,rtn],
                [1,0,0,1,rtn,0],
                [1,0,0,1,0,rtn]],
            standardUnit: 'px',
            subProps: xy,
            fnc: parseFloat},
        {prop: 'matrix',
            matrix: [[rtn,rtn,rtn,rtn,rtn,rtn],
                [rtn,0,0,1,0,0],
                [1,rtn,0,1,0,0],
                [1,0,rtn,1,0,0],
                [1,0,0,rtn,0,0],
                [1,0,0,1,0,rtn]],
            subProps: abcdxy,
            fnc: parseFloat}
        ];

        jQuery.each(props, function(n,prop){
        jQuery.each(prop.subProps, function(num, sub){
            var _cssProp, _prop = prop;

            if( $.isArray(sub) ) {
                //composite transform
                _cssProp = _prop.prop;
                var _sub = sub;
                $.cssHooks[_cssProp] = {
                    set: function( elem, val, unit ) {
                        jQuery.each(_sub, function(num, x){
                            $.cssHooks[_cssProp+x].set(elem, val, unit);
                        });
                    },
                    get: function( elem, computed ) {
                        var val = [];
                        jQuery.each(_sub, function(num, x){
                            val.push( $.cssHooks[_cssProp+x].get(elem, val) );
                        });
                        //hack until jQuery supports animating multiple properties
                        return val[0] || val[1];
                    }
                }
            } else {
                //independent transfrom
                _cssProp = _prop.prop+sub;
                $.cssHooks[_cssProp] = {
                    set: function( elem, val, unit ) {
                        $.data( elem, _cssProp, unit ? val+unit : val);

                        setCSSTransform( elem, _prop.fnc(unit ? val+unit : val), _cssProp,
                         _prop.unit || unit || _prop.standardUnit);
                    },
                    get: function( elem, computed ) {
                        
                        var p = $.data( elem, _cssProp );
                        //console.log(_cssProp+'get:'+p);
                        return p && p !== undefined ? p : _prop._default || 0;
                    }
                };
            }

            $.fx.step[_cssProp] = function( fx ) {
                fx.unit = fx.unit === 'px' && $.cssNumber[_cssProp] ? _prop.standardUnit : fx.unit;
                var unit = ($.cssNumber[_cssProp] ? '' : fx.unit);
                $.cssHooks[_cssProp].set( fx.elem, fx.now, fx.unit);
             };
        })
    });

    function setCSSTransform( elem, val, prop, unit ){
        if($.support.matrixFilter) {
            return setIEMatrix(elem, val);
        }
        
        //parse css string
        var allProps = parseCSSTransform(elem);
        
        //check for value to be set
        var a = /[X|Y]/.exec(prop);
        a = (a === null ? '' : a[0] ? a[0] : a);
        prop = /.*[^XY]/.exec(prop)[0];
        unit = unit === undefined ? '' : unit;
        
        //create return string
        var result = '';
        var wasUpdated = false;
        var arr;
        if(allProps !== null) {
            for(var item in allProps) {
                arr = allProps[item];
                if(prop === item) {
                    //update parsed data with new value
                    if(prop !== 'matrix') {
                        result += prop+'(';
                        result += a === 'X' || a === '' ? val+unit : 
                            (arr[0] !== '' ? arr[0] : $.cssHooks[prop+'X'].get(elem)+unit);
                        result += a === 'Y' ? ', '+val+unit : 
                            (arr[1] !== '' ? ', '+arr[1] : 
                            (prop+'Y' in $.cssHooks ? 
                                ', '+$.cssHooks[prop+'Y'].get(elem)+unit : ''));
                        result += ') ';
                    } else { 
                        result += val+' ';
                    }
                    wasUpdated = true;
                } else {
                    //dump parsed data to string
                    result += item + '(';
                    for(var i=0; i<arr.length; i++) {
                        result += arr[i];
                        if(i < arr.length-1 && arr[i+1] !== '')
                            result += ', '
                        else 
                            break;
                    }
                    result += ') ';
                } 
            }
        }
        
        //if prop was not found to be updated, then dump data
        if(!wasUpdated)
            result += prop+a+'('+val+unit+ ') ';
        
        //set all transform properties
        elem.style[$.cssProps.transform] = result;
    }

    
    function parseCSSTransform( elem ) {
        var props, prop, name, transform;
        //break up into single transform calls
        $(elem.style[$.cssProps.transform].replace(/(?:\,\s|\)|\()/g,"|").split(" "))
        //read each data point for the transform call
        .each(function(i, item){
            if(item !== '') {
                if(props === undefined) props = {}
                prop = item.split("|");
                name = prop.shift();
                transform = /.*[^XY]/.exec(name)[0];
                if(!props[transform]) props[transform] = ['','','','','',''];
                if(!/Y/.test(name)) props[transform][0] = prop[0];
                if(!/X/.test(name)) props[transform][1] = prop[1];
                if(prop.length == 6) {
                    props[transform][2] = prop[2];
                    props[transform][3] = prop[3];
                    props[transform][4] = prop[4];
                    props[transform][5] = prop[5];
                }
            }
        });
        
        return props !== undefined ? props : null ;
    }
    
    function ieOrigin(o, n, percent) {
        return percent * (o - n);
    }
    
    function toRadian(value) {
        if(typeof value === 'number') {
            return parseFloat(value);
        }
        if(value.indexOf("deg") != -1) {
            return parseInt(value,10) * (Math.PI * 2 / 360);
        } else if (value.indexOf("grad") != -1) {
            return parseInt(value,10) * (Math.PI/200);
        }
    }

    $.rotate = {
      radToDeg: function radToDeg( rad ) {
          return rad * 180 / Math.PI;
      }
    };

    //special case for IE matrix
    function setIEMatrix( elem, mat ) {
        var inverse, current, ang, org, originX, originY,
        runTransform = $.cssProps.transformOrigin === 'matrixFilter' ? true : false;

        current = [$.cssHooks.scaleX.get(elem),
                    toRadian($.cssHooks.skewY.get(elem)),
                    toRadian($.cssHooks.skewX.get(elem)),
                    $.cssHooks.scaleY.get(elem),
                    $.cssHooks.translateX.get(elem),
                    $.cssHooks.translateY.get(elem)];

        //start by multiply inverse of transform origin by matrix
        if(runTransform) {
            elem.style.filter = [
                "progid:DXImageTransform.Microsoft.Matrix"
                +"(M11=1,M12=0,M21=0,M22=1,SizingMethod='auto expand')"
            ].join('');
            var Wp = $.cssHooks.transformOriginX.get(elem);
            var Hp = $.cssHooks.transformOriginY.get(elem);
            Wp = Wp.indexOf('%') > 0 ? 
                (/[\d]*/.exec(Wp) / 100) : Wp;
            Hp = Hp.indexOf('%') > 0 ? 
                (/[\d]*/.exec(Hp) / 100) : Hp;

            var Wb = elem.offsetWidth;
            var Hb = elem.offsetHeight;
        } 

        //multiply old matrix to new matrix
        if( typeof mat !== 'array' || mat.length !== 6 ) {
            mat = current;
        } else {
            mat = [ ( (current[0]*mat[0]) + (current[1]*mat[2]) ),
                    ( (current[0]*mat[1]) + (current[1]*mat[3]) ),
                    ( (current[2]*mat[0]) + (current[3]*mat[2]) ),
                    ( (current[2]*mat[1]) + (current[3]*mat[3]) ),
                    mat[4],
                    mat[5]
                    ];
        }

        //multiply the transform and rotation matrixes
        ang = $.data(elem, 'rotate');
        if(ang) {
            ang = toRadian(ang);
            var cos = Math.cos(ang);
            var sin = Math.sin(ang);

            ang = [cos, -sin, sin, cos];
            mat = [ ( (mat[0]*ang[0]) + (mat[1]*ang[2]) ),
                    ( (mat[0]*ang[1]) + (mat[1]*ang[3]) ),
                    ( (mat[2]*ang[0]) + (mat[3]*ang[2]) ),
                    ( (mat[2]*ang[1]) + (mat[3]*ang[3]) ),
                    mat[4],
                    mat[5]
                    ];
        }
        
        //apply the matrix as a IE filter
        elem.style.filter = [
            "progid:DXImageTransform.Microsoft.Matrix(",
            "M11="+mat[0]+", ",
            "M12="+mat[1]+", ",
            "M21="+mat[2]+", ",
            "M22="+mat[3]+", ",
            "SizingMethod='auto expand'",
            ")"
            ].join('');
            
        if (runTransform) {
            var Wo = elem.offsetWidth;
            var Ho = elem.offsetHeight;
            elem.style.position = 'relative';
            elem.style.left = Wp * (Wb - Wo) + (parseInt(mat[4]) || 0);
            elem.style.top  = Hp * (Hb - Ho) + (parseInt(mat[5]) || 0);
        }
            //$('#console').append('<div> trans:'+Wp+":"+Wb+":"+Wo+":"+mat[4]+":"+elem.style.left+'</div>');
        
        
    }

})(jQuery);
