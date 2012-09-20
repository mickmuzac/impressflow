var self;

var contentObject = function(type, value){

	this.type = type;
	this.value = value;
};

var addObject = function(type, value){

	self.allSlides()[self.currentSlide()].allObjects.push(new contentObject(type, value));
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