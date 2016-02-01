//------------------------------------------------------------------------------------------------------------------------
//
//         behave3d - Dynamic 3D behavior of HTML elements
//
//------------------------------------------------------------------------------------------------------------------------
"use strict";

//---------------------------------------
// CONTROLLER: scale
Behave3d.controllerScale = function(params)
{
	Behave3d.Controller.call(this, params);
}

Behave3d.controllerScale.prototype = Object.create(Behave3d.Controller.prototype);



//---------------------------------------
// Controller's message types, event types, parameters

Behave3d.controllerScale.prototype.events         = [
	"start",      // Fired upon start of forward movement
	"half",       // Middle of forward movement
	"end",        // End of forward movement
	
	"start_back", // Fired upon start of backwards movement
	"half_back",  // Middle of backwards movement
	"end_back",   // End of backwards movement
	
	"pos0",       // Fired upon reaching the starting position (when moving backwards)
	"pos1",       // Fired upon reaching the end position (when moving forward)
];
Behave3d.controllerScale.prototype.messages       = [
	"start",          // Start or continue current forward movement
	"start_back",     // Start or continue current backward movement
	"start_reverse",  // Start moving in the reverse direction within the current movement
	"start_new",      // Start a new forward movement
	"start_new_back", // Start a new backward movement
	"pos0",           // Set the element in movement's starting position immediately
	"pos1",           // Set the element in movement's ending position immediately
];
Behave3d.controllerScale.prototype.default_params = {
	duration  : 1000, // in ms

	init_sx   : 1, // Initial X scaling
	init_sy   : 1, // Initial Y scaling
	init_sz   : 1, // Initial Z scaling

	sx        : 1, // Target X scaling
	sy        : 1, // Target Y scaling
	sz        : 1, // Target Z scaling
	
	half_step    : 1,    // If set to < 1, each frame the scale will step closer to the required scale, where step = half_step * distance_to_required_scale
	spring_acc   : 0,    // If bigger than 0, the scale factor will behave as if attached to a spring; the bigger the value, the stronger pulling of the "spring"
	spring_vdamp : 0.92, // Every frame the spring velocity will be multiplied (i.e. slowed) by this, acting like friction; Value of 1 means absolute elasticity of the spring	
	
	register_actions : false,  // Whether to handle element's actions "show", "hide", "show_immediately", "hide_immediately"; Values: false / true / "500" / "500 elm" - set event handlers with delay 500ms for HTML element #elm's actions
	repeat_start_pos : false,  // If true, then each new start or start_back will start from the same starting position as last start
	ease_type        : "ease", // See Behave3d.ease()
	ease_amount      : 1,      // [0 , 1], see Behave3d.ease()
	ease_mirror      : false,  // If true, then the easing applied on backwards transition will be the "mirror" one of the forward easing (ease_in <-> ease_out)
};



//---------------------------------------
// Controller's methods

Behave3d.controllerScale.prototype.construct = function(params, stage)
{
	if (stage == "params") {
		this.stepper = new Behave3d.StepEngine({
				sx: this.init_sx,
				sy: this.init_sy,
				sz: this.init_sz
			}, false, this, this);
	}
	else if (stage == "events") {
		this.setEventHandlers();
	}
};

//---------------------------------------
Behave3d.controllerScale.prototype.message = function(message, message_params)
{
	if (this.handleCommonMessage(message, message_params)) return this;	
	message_params = this.setMessageParams(message, message_params);
	
	if (this.angle == 0) {
		this.stepper.stop();
		return this;
	}
	
	this.direction  = (message == "start" || message == "start_new" || message == "pos1" || (message == "start_reverse" && this.direction != 1)) ? 1 : -1;
	var duration    = (message == "pos0" || message == "pos1") ? 0 : this.duration;
	var new_start   = (message == "start_new" || message == "start_new_back");
	
	var dsx = this.sx - this.stepper.getVar("sx", true);
	var dsy = this.sy - this.stepper.getVar("sy", true);
	var dsz = this.sz - this.stepper.getVar("sz", true);
	
	this.stepper.start(this.direction, this.repeat_start_pos, new_start, {sx: dsx, sy: dsy, sz: dsz}, duration);
	
	this.paused = false;	
	
	return this;
};

//---------------------------------------
Behave3d.controllerScale.prototype.update = function()
{
	this.stepper.update(this.paused);

	this.addTransform({
		type: Behave3d.transforms.scale,
		sx: this.stepper.getVar("sx"),
		sy: this.stepper.getVar("sy"),
		sz: this.stepper.getVar("sz")
	});
};

//---------------------------------------
// Sets event handlers through which this controller receives notifications of outside events
Behave3d.controllerScale.prototype.setEventHandlers = function()
{
	this.registerActions(this.register_actions, {
			show             : "start_back",
			hide             : "start",
			show_immediately : "pos0",
			hide_immediately : "pos1",
		}, {
			show_start : "start_back",
			show_end   : "end_back",
			hide_start : "start",
			hide_end   : "end",
		});
}

Behave3d.registerController("scale", Behave3d.controllerScale);


// ------------- EOF --------------



