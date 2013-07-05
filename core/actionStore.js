function actionStore(){

	var globalStack = [];
	var globalRedoStack = [];
	var maxItems = 10;
	
	var typeToInverse = {
	
		move : function(styles){ return {left:styles.left, top:styles.top}},
		rotate: "rotate",
		add: "remove"
	};

	this.addAction = function(styles, kind, id, stackToAddTo){
		
		//Empty redo stack whenever a new action is performed
		if(stackToAddTo === undefined){
			//console.log("empty redo!!");
			globalRedoStack.length = 0;
		}
		
		stackToAddTo = stackToAddTo ? stackToAddTo : globalStack;
		stackToAddTo.push({currentState:typeToInverse[kind](styles), type:kind, id: id});
		
		//console.log(stackToAddTo);
	};
	
	this.performChange = function(undo){
		
		var mainStack = undo ? globalStack : globalRedoStack;
		var inverseStack = undo ? globalRedoStack : globalStack;
		
		if(mainStack.length == 0)
			return;
		
		var tempAction = mainStack.pop();
		handleFocus(false, true, $("#" + tempAction.id));
		this.addAction(saveAndReturnStyles(cachejQObj), "move", cachejQObj.attr("id"), inverseStack);
		
		
		$.each(tempAction.currentState, function(key, value){
		
			$("#" + tempAction.id).css(key, value);
		});
	};
};