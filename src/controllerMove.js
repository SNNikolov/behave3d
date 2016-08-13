//------------------------------------------------------------------------------------------------------------------------
//
//         behave3d - Dynamic 3D behavior of HTML elements
//
//------------------------------------------------------------------------------------------------------------------------
"use strict";

//---------------------------------------
// CONTROLLER: move
Behave3d.controllerMove = function(params)
{
	Behave3d.Controller.call(this, params);
};

Behave3d.controllerMove.prototype = Object.create(Behave3d.Controller.prototype);



//---------------------------------------
// Controller's message types, event types, parameters

Behave3d.controllerMove.prototype.events         = [
	"start",      // Fired upon start of forward movement
	"half",       // Middle of forward movement
	"end",        // End of forward movement
	
	"start_back", // Fired upon start of backwards movement
	"half_back",  // Middle of backwards movement
	"end_back",   // End of backwards movement
	
	"pos0",       // Fired upon reaching the starting position (when moving backwards)
	"pos1",       // Fired upon reaching the end position (when moving forward)
];
Behave3d.controllerMove.prototype.messages       = [
	"start",          // Start or continue current forward movement
	"start_back",     // Start or continue current backward movement
	"start_reverse",  // Start moving in the reverse direction within the current movement
	"start_new",      // Start a new forward movement starting from the current position
	"start_new_back", // Start the backward motion (i.e. starting from the end position) of a new movement
	
	"pos0",           // Set the element in movement's starting position immediately
	"pos1",           // Set the element in movement's ending position immediately
];
Behave3d.controllerMove.prototype.default_params = {
	duration     : 1000, // in ms
	
	// Set target position in absolute coordinates
	x            : "same", // Absolute X coordinate of target position in pixels, or "same"
	y            : "same", // Absolute Y coordinate of target position in pixels, or "same"
	z            : "same", // Absolute Z coordinate of target position in pixels, or "same"
	// Or in coordinates relative to current position
	dx           : 0,      // X displacement relative to current position
	dy           : 0,      // Y displacement relative to current position
	dz           : 0,      // Z displacement relative to current position
	
	init_x       : 0,      // Initial X displacement
	init_y       : 0,      // Initial Y displacement
	init_z       : 0,      // Initial Z displacement

	anti_perspective : 0,  // [0 - 1] Neutralizes perspective; When value is 1, Z axis points towards the camera
	
	is_path      : false,  // If true, then the controller will not generate transforms, but its coordinates will be used by other controllers
	
	half_step    : 1,    // If set to < 1, each frame the position will step closer to the required position, where step = half_step * distance_to_required_position
	spring_acc   : 0,    // If bigger than 0, the position will behave as if attached to a spring; the bigger the value, the stronger pulling of the "spring"
	spring_vdamp : 0.92, // Every frame the spring velocity will be multiplied (i.e. slowed) by this, acting like friction; Value of 1 means absolute elasticity of the spring	
	
	ease_type        : "ease", // See Behave3d.ease()
	ease_amount      : 1,      // [0 , 1], see Behave3d.ease()
	ease_mirror      : false,  // If true, then the easing applied on backwards movement will be the "mirror" one of the forward easing (ease_in <-> ease_out)
	
	repeat_start_pos : false, // If true, then each new start or start_back will start from the same starting position as last start
	register_actions : false,  // Whether to handle element's actions "show", "hide", "show_immediately", "hide_immediately", "move"; Values: false / true / "500" / "500 elm" - set event handlers with delay 500ms for HTML element #elm's actions
};



//---------------------------------------
// Controller's methods

Behave3d.controllerMove.prototype.construct = function(params, stage)
{
	if (stage == "params") {
		var computed = this.getComputedLengths(['init_x'], ['init_y'], ['init_z']);
		
		this.stepper      = new Behave3d.StepEngine({x: computed.init_x, y: computed.init_y, z: computed.init_z}, false, this, this);
		this.path_pos     = {x: computed.init_x, y: computed.init_y, z: computed.init_z};
		this.path_enabled = false;
	}
	else if (stage == "events") {
		this.setEventHandlers();
	}
	
};

//---------------------------------------
Behave3d.controllerMove.prototype.message = function(message, message_params)
{
	if (this.handleCommonMessage(message, message_params)) return this;	
	message_params = this.setMessageParams(message, message_params);
	
	this.direction  = (message == "start" || message == "start_new" || message == "pos1" || (message == "start_reverse" && this.direction != 1)) ? 1 : -1;
	var duration    = (message == "pos0" || message == "pos1") ? 0 : this.duration;
	var new_start   = (message == "start_new" || message == "start_new_back");	
	
	var aval_supplied = (message_params.x !== undefined || message_params.y !== undefined || message_params.z !== undefined);
	var dval_supplied = (message_params.dx !== undefined || message_params.dy !== undefined || message_params.dz !== undefined);	
	var use_abs_val   = (aval_supplied && !dval_supplied);
	var use_dval      = (!aval_supplied && dval_supplied);
	
	var params_d    = this.getComputedLengths(['dx'], ['dy'], ['dz']);
	var params_abs  = this.getComputedLengths(['x'], ['y'], ['z'], ["same"]);
	
	var dx = (!use_abs_val && (params_d.dx != 0 || !use_dval)) ? params_d.dx : (params_abs.x === "same") ? 0 : params_abs.x - this.stepper.getVar("x", true);
	var dy = (!use_abs_val && (params_d.dy != 0 || !use_dval)) ? params_d.dy : (params_abs.y === "same") ? 0 : params_abs.y - this.stepper.getVar("y", true);
	var dz = (!use_abs_val && (params_d.dz != 0 || !use_dval)) ? params_d.dz : (params_abs.z === "same") ? 0 : params_abs.z - this.stepper.getVar("z", true);

	this.stepper.start(this.direction, this.repeat_start_pos, new_start, {x: dx, y: dy, z: dz}, duration);
	this.paused = false;

	return this;
};

//---------------------------------------
Behave3d.controllerMove.prototype.update = function()
{
	this.stepper.update(this.paused);
	
	this.path_pos.x = this.stepper.getVar("x");
	this.path_pos.y = this.stepper.getVar("y");
	this.path_pos.z = this.stepper.getVar("z");
	this.path_enabled = this.stepper.isMoving();

	if (this.anti_perspective != 0 && this.path_pos.z != 0 && this.owner.element.offsetParent) {
		var z_factor       = this.anti_perspective * this.path_pos.z / Behave3d.vars.sceneParams.perspective;
		var viewport_pos   = Behave3d.getElementPos(this.owner.element, true, true, true);
		var viewport_pos_x = -viewport_pos.x + Behave3d.params.getLength("50%v", "X");
		var viewport_pos_y = -viewport_pos.y + Behave3d.params.getLength("50%v", "Y");

		this.path_pos.x += (viewport_pos_x - this.path_pos.x) * z_factor;
		this.path_pos.y += (viewport_pos_y - this.path_pos.y) * z_factor;
	}
	
	if (!this.is_path)
		this.addTransform({
			type: Behave3d.transforms.translate,
			dx: this.path_pos.x,
			dy: this.path_pos.y,
			dz: this.path_pos.z
		});
};

//---------------------------------------
// Sets event handlers through which this controller receives notifications of outside events
Behave3d.controllerMove.prototype.setEventHandlers = function()
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
			move_start : "start",
			move_end   : "end",
		});
};

Behave3d.registerController("move", Behave3d.controllerMove);


// ------------- EOF --------------



