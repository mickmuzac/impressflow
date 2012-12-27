var self, isBeingEdited = null, previouslyBeingEdited = null, 
currentZoom = null, currentResizePosition = {top: 0, left: 0}, 
cachejQObj = null, ignoreZoomRecalibration = false;
var canvasHeight = $('#canvas').height();
var canvasWidth = $('#canvas').width();


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
var loadInitialStyle = function(obj){
	
	obj = getRealObject(obj);

	var id = (obj.type == "text") ? "#"+obj.id + "" : "#" + obj.id;
	var styleArr = ["font-size", "color", "line-height", "height", "width", "top", "left", "display"];
	var tempObj = {};
	var length = styleArr.length;
	
	for(var i = 0; i < length; i++)
		tempObj[styleArr[i]] = $(id).css(styleArr[i]);
	
	obj.style = tempObj;
	loadAttributeStyle(tempObj);
	return tempObj;		
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
	
	console.log(obj);
	
	//It's important to note that Knockout.js takes care of setting "obj" for us
	var styles = loadInitialStyle(obj);//(obj.style == null) ? loadInitialStyle(obj) : obj.style;

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
	
	return tempObj;
};

var addSlide = function(){
	
	var tempSlide = new slideObject(self.allSlides().length);
	self.allSlides.push(tempSlide);
	self.allSlides.valueHasMutated();
	
	handleNewObjectRefresh(tempSlide, "slide");
	self.focusOnSlide(tempSlide);
	//console.log(tempSlide);
	return tempSlide;
};

var slideObject = function(id){

		//A slide object on the canvas is defined here
		this.id = "s-" + id;
		this.sidebarId = "s_" + id;
		this.type = "slide";
		
		this.style = null;
		this.attributes = null;
		this.allObjects = ko.observableArray();
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

			this.tempZoom = (currentZoom == null || currentZoom >= 0.6 || currentZoom < 0.2 || this.objectType == "object")? 1 : .8/currentZoom;
			
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
		},
		
		drag: function(evt, ui){
			
			this.tTop = this.tempY+this.tempZoom*evt.clientY;
			this.tLeft = this.tempX+this.tempZoom*evt.clientX;
			
			//console.log(tTop + " " + tLeft);
			this.offsetCalc = (this.objectType == "container") ? -10000 : 0;
			
			if(this.tTop < this.offsetCalc)
				this.tTop = this.offsetCalc;
			
			else if(this.tTop + this.height + this.offsetCalc > this.tParent.height())
				this.tTop = this.tParent.height()-this.height-1 + this.offsetCalc;
			
			if(this.tLeft < this.offsetCalc)
				this.tLeft = this.offsetCalc;
			
			else if(this.tLeft + this.width + this.offsetCalc > this.tParent.width())
				this.tLeft = this.tParent.width()-this.width-1 + this.offsetCalc;
			
			handleZoomJumpFix(cachejQObj, ui, {top: this.tTop, left: this.tLeft});
		},
		
		stop: function(evt, ui){
			
			ignoreZoomRecalibration = false;

			//Show cursor again
			$("#canvasContainer").css("cursor", "default");
			cachejQObj.css("cursor", "pointer");
			
			currentResizePosition = {left: parseInt(cachejQObj.css("left")), 
						top: parseInt(cachejQObj.css("top"))};
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
	
	var zoomOpt = {closeclick:false, root:$("#canvas"), debug:false};
	
	if(cachejQObj == null)
		return;
		
	currentZoom = (currentZoom == null) ? 0.4 : currentZoom;

	if(opt == "in"){
		
		currentZoom = (currentZoom < 1) ? currentZoom + .2: currentZoom;
		zoomOpt.targetsize = currentZoom;
		$(cachejQObj).zoomTo(zoomOpt);
	}
	
	else{
		
		currentZoom = (currentZoom > .2)? currentZoom - .2: currentZoom;
		zoomOpt.targetsize = currentZoom;
		$(cachejQObj).zoomTo(zoomOpt);
	}
	
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
	$("#canvasContainer").on("mousedown", ".object, .slide, #canvas", function(event){
			
		$(".draggable").css("border","#AAA solid 1px");
		
		if(!ignoreZoomRecalibration){
			cachejQObj = $(this);
			currentResizePosition = {left: parseInt(cachejQObj.css("left")), 
									top: parseInt(cachejQObj.css("top"))};			
		}
		
		if(cachejQObj.attr("id")[0] == "o"){
			focusOn(cachejQObj);
			cachejQObj.typeOfObject = "object";
		}
		
		else if(cachejQObj.attr("id")[0] == "s"){
			
			var temp = cachejQObj.attr("id").split("-");
			cachejQObj.typeOfObject = "slide";
			self.focusOnSlide(self.allSlides()[temp[1]]);
		}
		
		else{
			cachejQObj.typeOfObject = "container";
		}
		
		event.stopPropagation();
	});
});

(function($) {
    $.fn.focusToEnd = function() {
        return this.each(function() {
            var v = $(this).val();
            $(this).focus().val("").val(v);
        });
    };
})(jQuery);



