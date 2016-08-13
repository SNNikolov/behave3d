//------------------------------------------------------------------------------------------------------------------------
//
//         behave3d - Dynamic 3D behavior of HTML elements
//
//------------------------------------------------------------------------------------------------------------------------
"use strict";

//---------------------------------------
// CONTROLLER: gravitate

Behave3d.controllerGravitate = function (params) {
	Behave3d.Controller.call(this, params, true);
};

Behave3d.controllerGravitate.prototype = Object.create(Behave3d.Controller.prototype);

//---------------------------------------
// Controller's message types, event types, parameters

Behave3d.controllerGravitate.prototype.default_params = {
	strength: 1, // Gravity constant, 1 = default strength of gravity; 0 - no gravity; > 1 for stronger gravity
	scale: 0.1, // coordinates scale
	source_id: "", // id of DOM node that is the "source of gravity"
	paths: "" };

//---------------------------------------
// Controller's methods

Behave3d.controllerGravitate.prototype.construct = function (params, stage) {
	if (stage == "params") {
		// Get references to the path controllers, if such
		this.path_controllers = this.paths != "" ? this.paths.split(" ") : [];
		for (var i = 0; i < this.path_controllers.length; i++) {
			this.path_controllers[i] = this.getAnotherController(this.path_controllers[i]);
		}
	}
};

//---------------------------------------
Behave3d.controllerGravitate.prototype.update = function () {
	if (this.paused) return;

	if (this.path_controllers.length > 0) var dpos = this.getPathPos(this.path_controllers);else {
		var this_pos = Behave3d.getElementPos(this.owner.element, true);
		var source_pos = Behave3d.getElementPos(this.source_id, true);
		var pos = this.owner.pos;
		var dpos = {
			x: source_pos.x - this_pos.x + pos.x,
			y: source_pos.y - this_pos.y + pos.y,
			z: source_pos.z - this_pos.z + pos.z
		};
	}

	this.applyGravityForce(dpos, this.strength, this.scale, 0);
};

Behave3d.registerController("gravitate", Behave3d.controllerGravitate);

// ------------- EOF --------------