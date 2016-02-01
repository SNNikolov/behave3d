//------------------------------------------------------------------------------------------------------------------------
//
//         behave3d - Dynamic 3D behavior of HTML elements
//
//------------------------------------------------------------------------------------------------------------------------
"use strict";

//---------------------------------------
// CONTROLLER: focusZoom
Behave3d.controllerFocusZoom = function(params)
{
	Behave3d.Controller.call(this, params);
}

Behave3d.controllerFocusZoom.prototype = Object.create(Behave3d.Controller.prototype);



//---------------------------------------
// Controller's message types, event types, parameters

Behave3d.controllerFocusZoom.prototype.events       = [
	"focus", // Fired upon message "focus"
	"blur",  // Fired upon message "blur"
];
Behave3d.controllerFocusZoom.prototype.messages       = [
	"focus", // Tell the element is focused
	"blur",  // Tell the element is no longer focused
];
Behave3d.controllerFocusZoom.prototype.default_params = {
	scale      : 1.4, // Scaling of focused element, in times
	dz         : 30,  // Z displacement of the focused element
	dx         : 0,   // X displacement of the focused element
	dy         : 0,   // Y displacement of the focused element
	
	target_id       : "", // If another DOM node (ex., a parent) should be zoomed instead of this element
	speed_dampening : 0.72, // Dampening multiplier for speed
	speed_acc       : 0.1, // How fast the element pops up [0 - indefinitely slowly, 1 - immediately]
};



//---------------------------------------
// Controller's methods

Behave3d.controllerFocusZoom.prototype.construct = function(params, stage)
{
	if (stage == "params") {
		this.is_focused   = false; // Is element currently focused
		this.current_pos  = 0; // curent position in popup
		this.vpos         = 0; // speed of change of position
		
		// Set the transformation target if such is supplied
		if (this.target_id != "")
			this.targets = [this.owner.getDOMElement(this.target_id)];

		this.makeTargetsDom3d(true);
	}
	else if (stage == "events") {
		// Attach focus/blur event handlers on each controller target
		this.set("focus on: @targets a focus_capture, blur on: @targets a blur_capture");
	}
};

//---------------------------------------
Behave3d.controllerFocusZoom.prototype.message = function(message, message_params)
{
	if (this.handleCommonMessage(message, message_params)) return this;	
	message_params = this.setMessageParams(message, message_params);
	
	if (message == "focus") {
		if (!this.is_focused) {
			this.is_focused = true;
			this.fireEvent("focus");
		}
		
	}
	else if (message == "blur") {
		if (this.is_focused) {
			this.is_focused = false;
			this.fireEvent("blur");
		}
	}
	
	return this;
};

//---------------------------------------
Behave3d.controllerFocusZoom.prototype.update = function()
{
	if (this.paramsHaveChanged() || !this.computed_params)
		this.computed_params = this.getComputedLengths(['dx'], ['dy'], ['dz']);
	
	if (this.is_focused)
		this.vpos += (1 - this.current_pos) * this.speed_acc;
	else
		this.vpos -= this.current_pos * this.speed_acc;
	
	this.vpos = this.vpos * this.speed_dampening; // Dampening of spring motion

	if (!this.paused)
		this.current_pos += this.vpos;
	
	var scale = 1 + this.current_pos * (this.scale - 1);
	var dz    = Math.max(0, this.current_pos * this.computed_params.dz);
	var dx    = this.current_pos * this.computed_params.dx;
	var dy    = this.current_pos * this.computed_params.dy;

	this.addTransform({
		type: Behave3d.transforms.translate,
		dx: dx,
		dy: dy,
		dz: dz
	});
	
	this.addTransform({
		type: Behave3d.transforms.scale,
		sx: scale,
		sy: scale,
		sz: 1
	});
};

Behave3d.registerController("focusZoom", Behave3d.controllerFocusZoom);


// ------------- EOF --------------



