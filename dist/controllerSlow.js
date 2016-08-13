//------------------------------------------------------------------------------------------------------------------------
//
//         behave3d - Dynamic 3D behavior of HTML elements
//
//------------------------------------------------------------------------------------------------------------------------
"use strict";

//---------------------------------------
// CONTROLLER: slow

Behave3d.controllerSlow = function (params) {
	Behave3d.Controller.call(this, params, true);
};

Behave3d.controllerSlow.prototype = Object.create(Behave3d.Controller.prototype);

//---------------------------------------
// Controller's message types, event types, parameters

Behave3d.controllerSlow.prototype.default_params = {
	damping_factor: 0.95
};

//---------------------------------------
// Controller's methods

Behave3d.controllerSlow.prototype.construct = function (params, stage) {
	if (stage == "params") {}
};

Behave3d.controllerSlow.prototype.update = function () {
	if (this.paused) return;

	this.applySpeedDamping(this.damping_factor);
};

Behave3d.registerController("slow", Behave3d.controllerSlow);

// ------------- EOF --------------