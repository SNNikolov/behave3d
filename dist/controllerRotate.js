//------------------------------------------------------------------------------------------------------------------------
//
//         behave3d - Dynamic 3D behavior of HTML elements
//
//------------------------------------------------------------------------------------------------------------------------
"use strict";

//---------------------------------------
// CONTROLLER: rotate

Behave3d.controllerRotate = function (params) {
	Behave3d.Controller.call(this, params);
};

Behave3d.controllerRotate.prototype = Object.create(Behave3d.Controller.prototype);

//---------------------------------------
// Controller's message types, event types, parameters

Behave3d.controllerRotate.prototype.events = ["start", // Fired upon start of forward movement
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
Behave3d.controllerRotate.prototype.messages = ["start", // Start or continue current forward movement
"start_back", // Start or continue current backward movement
"start_reverse", // Start moving in the reverse direction within the current movement
"start_new", // Start a new forward movement starting from the current position
"start_new_back", // Start the backward motion (i.e. starting from the end position) of a new movement

"pos0", // Set the element in movement's starting position immediately
"pos1"];
Behave3d.controllerRotate.prototype.default_params = {
	duration: 1000, // in ms
	init_angle: 0, // Initial angle at which to orientate the element
	angle: 0, // How much to rotate (relative to current angle)
	x: 0, // X component of rotation speed (will be normalized)
	y: 0, // Y component of rotation speed (will be normalized)
	z: 0, // Z component of rotation speed (will be normalized)
	marked_angle: -1, // [0 - Behave3d.consts.ROTATE_ONE_TURN] - the controller will fire event "mark" each time the rotation passes through this absolute angle

	half_step: 1, // If set to < 1, each frame the position will step closer to the required position, where step = half_step * distance_to_required_position
	spring_acc: 0, // If bigger than 0, the position will behave as if attached to a spring; the bigger the value, the stronger pulling of the "spring"
	spring_vdamp: 0.92, // Every frame the spring velocity will be multiplied (i.e. slowed) by this, acting like friction; Value of 1 means absolute elasticity of the spring	

	register_actions: false, // Whether to handle element's actions "show", "hide", "show_immediately", "hide_immediately"; Values: false / true / "500" / "500 elm" - set event handlers with delay 500ms for HTML element #elm's actions
	repeat_start_pos: false, // If true, then each new start or start_back will start from the same starting position as last start
	ease_type: "ease", // See Behave3d.ease()
	ease_amount: 1, // [0 , 1], see Behave3d.ease()
	ease_mirror: false };

//---------------------------------------
// Controller's methods

Behave3d.controllerRotate.prototype.construct = function (params, stage) {
	if (stage == "params") {
		this.stepper = new Behave3d.StepEngine({ angle: this.init_angle }, true, this, this);
	} else if (stage == "events") {
		this.setEventHandlers();
	}
};

//---------------------------------------
Behave3d.controllerRotate.prototype.message = function (message, message_params) {
	if (this.handleCommonMessage(message, message_params)) return this;
	message_params = this.setMessageParams(message, message_params);

	this.direction = message == "start" || message == "start_new" || message == "pos1" || message == "start_reverse" && this.direction != 1 ? 1 : -1;
	var duration = message == "pos0" || message == "pos1" ? 0 : this.duration;
	var new_start = message == "start_new" || message == "start_new_back";

	this.stepper.start(this.direction, this.repeat_start_pos, new_start, { angle: this.angle }, duration);
	this.paused = false;

	return this;
};

//---------------------------------------
Behave3d.controllerRotate.prototype.update = function () {
	this.stepper.update(this.paused);

	this.addTransform({
		type: Behave3d.transforms.rotate,
		rx: this.x,
		ry: this.y,
		rz: this.z,
		ra: this.stepper.getVar("angle")
	});
};

//---------------------------------------
// Sets event handlers through which this controller receives notifications of outside events
Behave3d.controllerRotate.prototype.setEventHandlers = function () {
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

Behave3d.registerController("rotate", Behave3d.controllerRotate);

// ------------- EOF --------------