var self, isBeingEdited = null;

var loadInitialStyle = function(obj){

	
	var styleArr = ["font-size", "color"];
	var tempArr = {};
	var length = 2;
	
	for(var i = 0; i < length; i++)
		tempArr[styleArr[i]] = $("#"+obj.id).css(styleArr[i]);
		
	return tempArr;		
};

//Content edit expects a contentObject and will go into "edit" mode depending on type
var objectClick = function(obj){
	
	//It's important to note that Knockout.js takes care of setting "obj" for us
	var styles = (obj.style == null) ? loadInitialStyle(obj) : obj.styles;


	if(obj.type == "text")
		$("#"+obj.id).replaceWith("<input id='"+obj.id+"' type='text' value='"+obj.value+"' />");
	
	$("#"+obj.id).css(styles);
	
	//Another way to read obj, is "obj is being edited"
	isBeingEdited = obj;
};

var objectStopClick = function(obj){
	
	//Do I have to re-add a data-bind? Check when necessary...
	if(obj.type == "text")
		$("#"+obj.id).replaceWith("<span id='"+obj.id+"' class='object' data-bind='text:value'>"+obj.value+"</span>");
		
	$("#"+obj.id).css(obj.styles);
	console.log(obj.styles);
	
	isBeingEdited = null;
};

var contentObject = function(obj){

	this.type = obj.type;
	this.value = obj.value;
	this.id = obj.id;
	
	this.style = null;
	this.helper = null;
};

//Generate an object, push it to the correct slide, and assign it an ID
var addObject = function(type, value){
	
	var temp = self.allSlides()[self.currentSlide()].allObjects;
	temp.push(new contentObject({"type": type, "value": value, "id":"o-" + temp().length + "-" + self.currentSlide()}));
		
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
		
		return "s-" + index();
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