var self, isBeingEdited = null, previouslyBeingEdited = null, 
currentZoom = null, currentResizePosition = {top: 0, left: 0}, 
cachejQObj = null, ignoreResizeHover = false;
var canvasHeight = $('#canvas').height();
var canvasWidth = $('#canvas').width();

//This function copies the "edit" style from a main style
var loadInitialStyle = function(obj){
	
	var id = (obj.type == "text") ? "#"+obj.id + "" : "#" + obj.id;
	var styleArr = ["font-size", "color", "line-height", "height", "width", "top", "left", "display"];
	var tempArr = {};
	var length = styleArr.length;
	
	for(var i = 0; i < length; i++)
		tempArr[styleArr[i]] = $(id).css(styleArr[i]);
	
	obj.style = tempArr;
	return tempArr;		
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
		
		handleNewObjectRefresh(obj);
		
		$("#"+obj.id + " span").show();
		$("#"+obj.id + " textarea").hide();
	}
	
	previouslyBeingEdited = isBeingEdited;
	isBeingEdited = null;
};

var contentObject = function(obj){

	var self = this;
	self.type = obj.type;
	self.value = ko.observable(obj.value);
	
	//Read only!
	this.readSanatizedValue = ko.computed(function(){
		self.value($.trim(self.value()));
		return self.value();
	});
	self.id = obj.id;
	
	self.style = null;
	self.helper = null;
};

//Generate an object, push it to the correct slide, and assign it an ID
var addObject = function(type, value){
	
	var temp = self.allSlides()[self.currentSlide()].allObjects;
	var tempObj = new contentObject({"type": type, "value": value, "id":"o_" + temp().length + "_" + self.currentSlide()});
	temp.push(tempObj);
		
	self.allSlides.valueHasMutated();
	
	return tempObj;
};

var addSlide = function(){

	self.allSlides.push(new slideObject());
	self.allSlides.valueHasMutated();
};

var slideObject = function(){
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
    self.allSlides = ko.observableArray([new slideObject()]);
	self.currentSlide = ko.observable(0);

	self.currentObjects = ko.computed(function(){

		//if(currentSlide > 0)
			return self.allSlides()[self.currentSlide()].allObjects();
		//else return [];
	});
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

var handleNewObjectRefresh = function(obj){
	
	//Need to figure out how to handle refreshing all
	if(obj == null)
		return;
	
	$("#" + obj.id).resizable({
		
		cacheThis: null,
	
		start: function(event, ui) {  
			ignoreResizeHover = true;
			cacheThis = $(this);
			
			focusOn(cacheThis);
			
			handleZoomJumpFix(cacheThis, ui, currentResizePosition);
		},
		
		resize: function(event, ui){
		
			handleZoomJumpFix(cacheThis, ui, currentResizePosition);
		},
		
		stop: function(event, ui) {
			
			ignoreResizeHover = false;
		}
	});

	$("#" + obj.id).draggable({
		
		 tempX: 0,
		 tempY: 0,
		 cacheThis: null,
		
		start: function(evt, ui){
			cacheThis = $(this);
			focusOn(cacheThis);
			
			//Scaling while zoomed in is still incorrect, hide cursor
			$("#canvas").add(this).css("cursor", "none");
			
			ignoreResizeHover = true;
			
			handleZoomJumpFix(cacheThis, ui, currentResizePosition);
			
			tempX = currentResizePosition.left - evt.clientX;
			tempY = currentResizePosition.top - evt.clientY;
			
			//MAKE THE FOLLOWING 2 LINES A FUNCTION!
			var temp = cacheThis.attr("id").split("_");
			previouslyBeingEdited = self.allSlides()[temp[2]].allObjects()[temp[1]];
		},
		
		drag: function(evt, ui){
			
			handleZoomJumpFix(cacheThis, ui, {top: tempY+evt.clientY, left: tempX+evt.clientX});
		},
		
		stop: function(evt, ui){
			
			ignoreResizeHover = false;

			//Show cursor again
			$("#canvas").css("cursor", "default");
			cacheThis.css("cursor", "pointer");
		}
	});
};

var focusOn = function(obj){

	$(".draggable").css("border","#AAA solid 1px");
	obj.css("border","red solid 1px");
};

var handleZoom = function(opt){
	
	
	
	var zoomOpt = {closeclick:false, root:$("#canvas"), debug:false};
	
	if(previouslyBeingEdited == null)
		return;
		
	currentZoom = (currentZoom == null) ? 0.4 : currentZoom;

	if(opt == "in"){
		
		currentZoom = (currentZoom < 1) ? currentZoom + .2: currentZoom;
		zoomOpt.targetsize = currentZoom;
		$("#"+previouslyBeingEdited.id).zoomTo(zoomOpt);
	}
	
	else{
		
		currentZoom = (currentZoom > .2)? currentZoom - .2: currentZoom;
		zoomOpt.targetsize = currentZoom;
		$("#"+previouslyBeingEdited.id).zoomTo(zoomOpt);
	}
	
	console.log("Current Zoom: " + currentZoom);
};

$(function(){


	$(".droppable").droppable();
	
	$("#canvas").on("blur", "textarea", function(event){
		
		
		var temp = $(this).parent().attr("id").split("_");
		if(isBeingEdited == self.allSlides()[temp[2]].allObjects()[temp[1]]){
			
			console.log("BLUR ");
			objectStopClick(isBeingEdited);
		}
	});
	
	//Handle object AND full slide clicking
	$("#canvas").on("click", ".object", function(event){
		
		console.log(isBeingEdited);
		
		$(".draggable").css("border","#AAA solid 1px");
		var temp = $(this).attr("id").split("_");
		var tempCurrentClickNow = self.allSlides()[temp[2]].allObjects()[temp[1]];
		
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
				tempObj = addObject("text", "Edit Me");
				break;
			
			case "addImage":
				tempObj = addObject("image", "Edit Me");
				break;
				
			case "zoomIn":
				handleZoom("in");
				break;
			
			case "zoomOut":
				handleZoom("out");
				break;
		}
		
		handleNewObjectRefresh(tempObj);
		console.log(self.currentSlide());
		console.log(self.allSlides());
	});
	
	//Handle mini slide clicking
	$("#canvas").on("mouseover", ".object", function(event){
		
		if(!ignoreResizeHover){
			cachejQObj = $(this);
			currentResizePosition = {left: parseInt(cachejQObj.css("left")), 
									top: parseInt(cachejQObj.css("top"))};
			
			console.log("current resize");
			console.log(currentResizePosition);
		}
	});
	
	//Handle mini slide clicking
	$("#sideSlides").on("click", ".slides", function(event){
		
		
		
		var temp = $(this).attr("id").split("_")[1];
		if(self.currentSlide() != temp){
		

			$("#s_"+self.currentSlide()).css({"border-color":"black"});
			$(this).css({"border-color":"red"});
			
			console.log("border red: " + self.currentSlide());
			
			self.currentSlide(temp);
		}
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



