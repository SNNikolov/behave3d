//------------------------------------------------------------------------------------------------------------------------
//
//         behave3d - Dynamic 3D behavior of HTML elements
//
//------------------------------------------------------------------------------------------------------------------------
"use strict";

//---------------------------------------
// CONTROLLER: twoSides

Behave3d.controllerTwoSides = function (params) {
	Behave3d.Controller.call(this, params);
};

Behave3d.controllerTwoSides.prototype = Object.create(Behave3d.Controller.prototype);

//---------------------------------------
// Controller's message types, event types, parameters

Behave3d.controllerTwoSides.prototype.messages = ["update"];
Behave3d.controllerTwoSides.prototype.events = [];
Behave3d.controllerTwoSides.prototype.default_params = {
	thickness: 0, // Thickness of the "surface" (i.e. distance between front and back planes) in pixels
	flip_x: false };

//---------------------------------------
// Controller's methods

Behave3d.controllerTwoSides.prototype.construct = function (params, stage) {
	if (stage == "params") {
		this.setSides();
	}
};

//---------------------------------------
Behave3d.controllerTwoSides.prototype.message = function (message, message_params) {
	if (this.handleCommonMessage(message, message_params)) return this;
	message_params = this.setMessageParams(message, message_params);

	if (message == "update") {
		this.setSides();
	}

	return this;
};

//---------------------------------------
Behave3d.controllerTwoSides.prototype.update = function () {
	if (this.targets.length != 2) return;

	if (this.thickness != 0) this.addTransform({
		type: Behave3d.transforms.translate,
		dx: 0, dy: 0, dz: this.thickness / 2
	}, 0);

	this.addTransform({
		type: Behave3d.transforms.rotate,
		rx: this.flip_x ? 1 : 0,
		ry: this.flip_x ? 0 : 1,
		rz: 0,
		ra: Behave3d.consts.ROTATE_ONE_TURN / 2
	}, 1);

	if (this.thickness != 0) this.addTransform({
		type: Behave3d.transforms.translate,
		dx: 0, dy: 0, dz: this.thickness / 2
	}, 1);
};

//---------------------------------------
// Sets sides' sizes
Behave3d.controllerTwoSides.prototype.setSides = function () {
	this.setChildTargets(2);

	if (this.targets.length != 2) Behave3d.debugExit("controllerTwoSides requires 2 child HTML elements which will become the sides of the plane");

	for (var i = 0; i < 2; i++) {
		this.targets[i].style.position = "absolute";
		this.targets[i].style.backfaceVisibility = "hidden";
	}
};

Behave3d.registerController("twoSides", Behave3d.controllerTwoSides);

// ------------- EOF --------------