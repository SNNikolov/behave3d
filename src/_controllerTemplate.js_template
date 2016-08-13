//------------------------------------------------------------------------------------------------------------------------
//
//         behave3d - Dynamic 3D behavior of HTML elements
//
//------------------------------------------------------------------------------------------------------------------------
"use strict";

//---------------------------------------
// CONTROLLER: name
Behave3d.controllerName = function(params)
{
	Behave3d.Controller.call(this, params);
}

Behave3d.controllerName.prototype = Object.create(Behave3d.Controller.prototype);



//---------------------------------------
// Controller's message types, event types, parameters and constants

Behave3d.controllerName.prototype.requires       = { controllers: ["controllerMove", ...]};

Behave3d.controllerName.prototype.messages       = [
	"msg",  // Message description
	"msg2", // Orders...
];
Behave3d.controllerName.prototype.events         = [
	"ev",  // Event description
	"ev2", // Fired upon...
];
Behave3d.controllerName.prototype.default_params = {
	param_name : default_value, // Param description
};

// Controller constants
Behave3d.controllerName.prototype.someConstant = 100;



//---------------------------------------
// Controller's methods

Behave3d.controllerName.prototype.construct = function(params, stage)
{
	if (stage == "params") {
		// All params are already set by the engine as properties of this (i.e. this.param_name)
		// Initialize working variables
		this.working_var_z = 0;
		
		this.someListenerMethod = this.someListenerMethod.bind(this);
	}
	else if (stage == "events") {
		// Set event listeners for DOM and behave3d events
		this.owner.element.addEventListener("click", this.someListenerMethod);
		this.on("a click", this.someListenerMethod);		
	}
	else if (stage == "messages") {
		// Send initializing messages
		// After that, the engine will automatically send the user-supplied initializing messages
		this.message("reset_something");
	}
};

//---------------------------------------
Behave3d.controllerName.prototype.destruct = function() {
	// Clean event listeners, timers, etc.
	this.owner.element.removeEventListener("click", this.someListenerMethod);
};

//---------------------------------------
Behave3d.controllerName.prototype.message = function(message, message_params)
{
	if (this.handleCommonMessage(message, message_params)) return this;
	message_params = this.setMessageParams(message, message_params);
	
	if (message == "msg") {
		// Do stuff
		// All supplied message_params that are controller params have been set
		// by this.setMessageParams() as this.param_name = message_params.param_name
		this.working_var_z = this.param_name + 5;
	}
	
	return this;
};

//---------------------------------------
Behave3d.controllerName.prototype.update = function()
{
	if (!this.paused) {
		// Do update logics
		this.working_var_z = ++this.working_var_z % this.someConstant;
	}
	
	this.addTransform({
		type: Behave3d.transforms.translate,
		dx: 0, dy: 0, dz: this.working_var_z
	});
};

//---------------------------------------
Behave3d.controllerName.prototype.someListenerMethod = function(event, event_params)
{
	if (typeof event == "string")
		// Handle behave3d event
	else
		// Handle DOM event
};

Behave3d.registerController("name", Behave3d.controllerName);


// ------------- EOF --------------



