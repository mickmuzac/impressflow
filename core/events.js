$(function(){
	$(".droppable").droppable();
	
	$("#canvas").on("blur", "textarea", function(event){
		
		if(isBeingEdited == getRealObject($(this).parent())){
	
			objectStopClick(isBeingEdited);
		}
	});
	
	//Handle object AND full slide clicking
	
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
		
		generateCanvasScreen(self.allSlides()[self.currentSlide()]);
		console.log(self.currentSlide());
		console.log(self.allSlides());
	});
	
	//Handle mini slide clicking
	$("#canvasContainer").on("mousedown", ".object, .slide, #canvas", handleFocus);
	$("#canvasContainer").on("click", ".object, .slide, #canvas", handleFocus);
	$("#canvasContainer").on("dblclick", ".object, .slide, #canvas", handleFocus);
});