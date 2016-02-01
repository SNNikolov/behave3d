//------------------------------------------------------------------------------------------------------------------------
//
//         behave3d - Dynamic 3D behavior of HTML elements
//
//------------------------------------------------------------------------------------------------------------------------
"use strict";

//---------------------------------------
// CONTROLLER: actions
Behave3d.controllerActions = function(params)
{
	Behave3d.Controller.call(this, params);
}

Behave3d.controllerActions.prototype = Object.create(Behave3d.Controller.prototype);



//---------------------------------------
// Controller's message types, event types, parameters

Behave3d.controllerActions.prototype.events         = [];
Behave3d.controllerActions.prototype.messages       = [
	"remove_element", // Remove HTML element from DOM tree; uses Element.removeChild()
	"pause",          // Pause all controllers of this element
	"unpause",        // Unpause all controllers of this element
];
Behave3d.controllerActions.prototype.default_params = {};

Behave3d.controllerActions.prototype.DOMEvents = ["focus", "blur", "click", "mouseover", "mouseout"];



//---------------------------------------
// Controller's methods

Behave3d.controllerActions.prototype.construct = function(params, stage)
{
	if (stage == "params") {
		this.handledDOMEvents            = [];
		this.handledDOMEvents_useCapture = [];
		this.eventHandler            = this.eventHandler.bind(this);
		this.eventHandler_useCapture = this.eventHandler_useCapture.bind(this);
	}
	else if (stage == "events") {

	}	
};

//---------------------------------------
Behave3d.controllerActions.prototype.message = function(message, message_params)
{
	if (message == "remove_element") {
		this.owner.removeFromPool();
		this.owner.element.parentNode.removeChild(this.owner.element);
	}
	else if (message == "pause" || message == "unpause") {
		var paused_val = (message == "pause");
		for(var i = 0; i < this.owner.controllers.length; i++)
			this.owner.controllers[i].set({paused: paused_val});
	}
	
	var catches = this.fireEvent(message, message_params);
	
	if (message == "show" && !catches)
		this.owner.element.style.display = "block";
	else if (message == "hide" && !catches)
		this.owner.element.style.display = "none";
	
	return this;
}

//---------------------------------------
Behave3d.controllerActions.prototype.addEventHandler = function(event, handler_function)
{
	Behave3d.Controller.prototype.addEventHandler.call(this, event, handler_function);
	
	var use_capture = (event.substr(-8) == "_capture");
	if (use_capture)
		event = event.substr(0, event.length - 8);
	
	var handled_events = (use_capture ? this.handledDOMEvents_useCapture : this.handledDOMEvents);

	if (this.DOMEvents.indexOf(event) >= 0 &&
		handled_events.indexOf(event) == -1)
	{
		var handler = (use_capture ? this.eventHandler_useCapture : this.eventHandler);
		this.owner.element.addEventListener(event, handler, use_capture);
		handled_events.push(event);
	}	
}

//---------------------------------------
Behave3d.controllerActions.prototype.eventHandler = function(event)
{
	var event_params = {event: event};
	this.fireEvent(event.type, event_params);
}

//---------------------------------------
Behave3d.controllerActions.prototype.eventHandler_useCapture = function(event)
{
	var event_params = {event: event};
	this.fireEvent(event.type + "_capture", event_params);
}


Behave3d.registerController("actions", Behave3d.controllerActions);


// ------------- EOF --------------



