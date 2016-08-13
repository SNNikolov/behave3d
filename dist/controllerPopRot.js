//------------------------------------------------------------------------------------------------------------------------
//
//         behave3d - Dynamic 3D behavior of HTML elements
//
//------------------------------------------------------------------------------------------------------------------------
"use strict";

//---------------------------------------
// CONTROLLER: popRot

Behave3d.controllerPopRot = function (params) {
	Behave3d.Controller.call(this, params);
};

Behave3d.controllerPopRot.prototype = Object.create(Behave3d.Controller.prototype);

//---------------------------------------
// Controller's message types, event types, parameters

Behave3d.controllerPopRot.prototype.requires = { controllers: ["controllerMove", "controllerOpacity", "controllerRotate"] };

Behave3d.controllerPopRot.prototype.messages = ["show", "show_immediately", "hide", "hide_immediately"];
Behave3d.controllerPopRot.prototype.events = ["show_start", "show_end", "hide_start", "hide_end"];
Behave3d.controllerPopRot.prototype.default_params = {
	duration: 700, // Duration in ms of show/hide transitions
	rotation: -720, // Rotation in degrees during show/hide transitions
	far_z: "-500%", // Z coordinate in pixels of the "far" point
	affect: "", // "" / "visibility" / "display" - whether the opacity() controller should affect HTML element's visibility or display properties, default is not (i.e. only opacity)
	register_actions: false };

//---------------------------------------
// Controller's methods

Behave3d.controllerPopRot.prototype.construct = function (params, stage) {
	if (stage == "params") {
		this.controller_move = this.owner.addController(Behave3d.controllerMove, { targets: this.targets, dz: this.far_z });
		this.controller_vis = this.owner.addController(Behave3d.controllerOpacity, { targets: this.targets, affect: this.affect, ease_type: "ease_out" });
		this.controller_rot = this.owner.addController(Behave3d.controllerRotate, { targets: this.targets, y: 1, angle: this.rotation, ease_type: "linear" });
		this.is_shown = true;
		this.actions_registered = false;
	} else if (stage == "events") {
		this.setEventHandlers();
	}
};

//---------------------------------------
Behave3d.controllerPopRot.prototype.destruct = function () {
	this.owner.removeController(this.controller_move);
	this.owner.removeController(this.controller_vis);
	this.owner.removeController(this.controller_rot);
};

//---------------------------------------
Behave3d.controllerPopRot.prototype.message = function (message, message_params) {
	if (this.handleCommonMessage(message, message_params)) return this;
	message_params = this.setMessageParams(message, message_params);

	var immediately;

	if (message == "show" || (immediately = message == "show_immediately")) {
		if (!this.is_shown) {
			this.is_shown = true;
			this.controller_vis.message(immediately ? 'show' : 'fade_in', { duration: this.duration * 0.7 });
			this.controller_move.message(immediately ? 'pos0' : 'start_back', { duration: this.duration, ease_type: "ease_out" });
			this.controller_rot.message('start_back', { duration: immediately ? 0 : this.duration });
		}
	} else if (message == "hide" || (immediately = message == "hide_immediately")) {
		if (this.is_shown) {
			this.is_shown = false;
			this.controller_vis.message(immediately ? 'hide' : 'fade_out', { duration: this.duration });
			this.controller_move.message(immediately ? 'pos1' : 'start', { duration: this.duration, ease_type: "ease_in" });
			this.controller_rot.message('start', { duration: immediately ? 0 : this.duration });
		}
	}

	return this;
};

//---------------------------------------
// Sets event handlers through which this controller receives notifications of outside events
Behave3d.controllerPopRot.prototype.setEventHandlers = function () {
	// Auto-update paused state of sub-controllers
	this.setSubcontrollersEvents([this.controller_move, this.controller_vis, this.controller_rot]);

	// Fire xx_start/xx_end events upon a sub-controller's start/end events
	this.controller_move.relayEvents(this, {
		start: "hide_start",
		end: "hide_end",
		start_back: "show_start",
		end_back: "show_end"
	});

	this.registerActions(this.register_actions, "showhide", "showhide");
};

Behave3d.registerController("popRot", Behave3d.controllerPopRot);

// ------------- EOF --------------