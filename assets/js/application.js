var self, isBeingEdited = null;

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
		
		$("#"+obj.id).resizable();
		
		$("#"+obj.id + " span").show();
		$("#"+obj.id + " textarea").hide();
	}
	
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
	temp.push(new contentObject({"type": type, "value": value, "id":"o_" + temp().length + "_" + self.currentSlide()}));
		
	self.allSlides.valueHasMutated();
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

var handleNewObjectRefresh = function(){

	$(".resizable").resizable({
		start: function(event, ui) {  
			console.log("RESIZE START "+$(this).offset());
			//$(this).css({
				//position: "relative !important",
				//top: $(this).position().top + " !important",
				//left: $(this).position().left + " !important"
			//});
		},
		stop: function(event, ui) {
			
		}
	});

	$(".draggable").draggable();
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
	
	//Handle slide clicking
	$("#canvas").on("click", ".object", function(event){
		
		console.log(isBeingEdited);
		
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
		
		
		switch($(this).attr("class")){
		
			case "addSlide":
				addSlide();
				break;
				
			case "addText":
				addObject("text", "Edit Me");
				break;
			
			case "addImage":
				addObject("image", "Edit Me");
				break;
		}
		
		handleNewObjectRefresh();
		console.log(self.currentSlide());
		console.log(self.allSlides());
	});
	
	//Handle slide clicking
	$("#sideSlides").on("click", ".slides", function(event){
		
		
		
		var temp = $(this).attr("id").split("_")[1];
		if(self.currentSlide() != temp){
		

			$("#s-"+self.currentSlide()).css({"border-color":"black"});
			$(this).css({"border-color":"red"});
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