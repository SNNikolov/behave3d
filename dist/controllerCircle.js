//------------------------------------------------------------------------------------------------------------------------
//
//         behave3d - Dynamic 3D behavior of HTML elements
//
//------------------------------------------------------------------------------------------------------------------------
"use strict";

//---------------------------------------
// CONTROLLER: circle

Behave3d.controllerCircle = function (params) {
	Behave3d.Controller.call(this, params);
};

Behave3d.controllerCircle.prototype = Object.create(Behave3d.Controller.prototype);

//---------------------------------------
// Controller's message types, event types, parameters

Behave3d.controllerCircle.prototype.events = ["start", // Fired upon start of forward movement
"half", // Middle of forward movement
"end", // End of forward movement
"cycle", // Each full turn from start in forward movement
"mark", // Each time the angle supplied in param 'marked_angle' is passed in forward movement

"start_back", // Fired upon start of backwards movement
"half_back", // Middle of backwards movement
"end_back", // End of backwards movement
"cycle_back", // Each full turn from start in backwards movement
"mark_back", // Each time the angle supplied in param 'marked_angle' is passed in backwards movement

"pos0", // Fired upon reaching the starting position (when moving backwards)
"pos1"];
Behave3d.controllerCircle.prototype.messages = ["start", // Start or continue current forward movement
"start_back", // Start or continue current backward movement
"start_reverse", // Start moving in the reverse direction within the current movement
"start_new", // Start a new forward movement
"start_new_back", // Start a new backward movement
"pos0", // Set the element in movement's starting position immediately
"pos1"];
Behave3d.controllerCircle.prototype.default_params = {
	x_radius: 50, // Radius of elipse in pixels
	y_radius: 50, // Radius of elipse in pixels
	x_center: 0, // X position of center of circle
	y_center: 0, // Y position of center of circle
	duration: 1000, // in ms
	init_angle: 0, // Initial angle at which to position the element
	angle: 0, // How much to rotate (relative to current angle)
	marked_angle: -1, // [0 - Behave3d.consts.ROTATE_ONE_TURN] - the controller will fire event "mark" each time the rotation passes through this absolute angle 

	is_path: false, // If true, then the controller will not generate transforms, but its coordinates will be used by other controllers

	half_step: 1, // If set to < 1, each frame the position will step closer to the required position, where step = half_step * distance_to_required_position
	spring_acc: 0, // If bigger than 0, the position will behave as if attached to a spring; the bigger the value, the stronger pulling of the "spring"
	spring_vdamp: 0.92, // Every frame the spring velocity will be multiplied (i.e. slowed) by this, acting like friction; Value of 1 means absolute elasticity of the spring	

	ease_type: "ease", // See Behave3d.ease()
	ease_amount: 1, // [0 , 1], see Behave3d.ease()
	ease_mirror: false, // If true, then the easing applied on backwards transition will be the "mirror" one of the forward easing (ease_in <-> ease_out)

	register_actions: false, // Whether to handle element's actions "show", "hide", "show_immediately", "hide_immediately"; Values: false / true / "500" / "500 elm" - set event handlers with delay 500ms for HTML element #elm's actions
	repeat_start_pos: false };

//---------------------------------------
// Controller's methods

Behave3d.controllerCircle.prototype.construct = function (params, stage) {
	if (stage == "params") {
		this.stepper = new Behave3d.StepEngine({ angle: this.init_angle }, true, this, this);
		this.path_pos = { x: 0, y: 0, z: 0 };
		this.path_enabled = true;
	} else if (stage == "events") {
		this.setEventHandlers();
	}
};

Behave3d.controllerCircle.prototype.message = function (message, message_params) {
	if (this.handleCommonMessage(message, message_params)) return this;
	message_params = this.setMessageParams(message, message_params);

	this.direction = message == "start" || message == "start_new" || message == "pos1" || message == "start_reverse" && this.direction != 1 ? 1 : -1;
	var duration = message == "pos0" || message == "pos1" ? 0 : this.duration;
	var new_start = message == "start_new" || message == "start_new_back";

	this.stepper.start(this.direction, this.repeat_start_pos, new_start, { angle: this.angle }, duration);

	this.paused = false;

	return this;
};

Behave3d.controllerCircle.prototype.update = function () {
	this.stepper.update(this.paused);

	if (this.paramsHaveChanged() || !this.computed_params) this.computed_params = this.getComputedLengths(['x_radius', 'x_center'], ['y_radius', 'y_center']);

	this.path_pos.x = this.computed_params.x_center + this.computed_params.x_radius * Math.cos(this.stepper.getVar("angle") / Behave3d.consts.RADIANS_TO_UNITS);
	this.path_pos.y = this.computed_params.y_center + this.computed_params.y_radius * Math.sin(this.stepper.getVar("angle") / Behave3d.consts.RADIANS_TO_UNITS);

	this.path_enabled = this.stepper.isMoving();

	if (!this.is_path) this.addTransform({
		type: Behave3d.transforms.translate,
		dx: this.path_pos.x,
		dy: this.path_pos.y,
		dz: this.path_pos.z
	});
};

//---------------------------------------
// Sets event handlers through which this controller receives notifications of outside events
Behave3d.controllerCircle.prototype.setEventHandlers = function () {
	this.registerActions(this.register_actions, {
		show: "start_back",
		hide: "start",
		show_immediately: "pos0",
		hide_immediately: "pos1"
	}, {
		show_start: "start_back",
		show_end: "end_back",
		hide_start: "start",
		hide_end: "end"
	});
};

Behave3d.registerController("circle", Behave3d.controllerCircle);

// ------------- EOF --------------