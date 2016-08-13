//------------------------------------------------------------------------------------------------------------------------
//
//         behave3d - Dynamic 3D behavior of HTML elements
//
//------------------------------------------------------------------------------------------------------------------------
"use strict";

//---------------------------------------
// CONTROLLER: box

Behave3d.controllerBox = function (params) {
	Behave3d.Controller.call(this, params);
};

Behave3d.controllerBox.prototype = Object.create(Behave3d.Controller.prototype);

//---------------------------------------
// Controller's message types, event types, parameters

Behave3d.controllerBox.prototype.messages = ["update"];
Behave3d.controllerBox.prototype.events = [];
Behave3d.controllerBox.prototype.default_params = {
	x_size: "100%o", // Size in pixels of the box's sides
	y_size: "100%o",
	z_size: "30%oX"
};

Behave3d.controllerBox.prototype.sides_orientation = [{ rx: 0, ry: 0 }, { rx: 2, ry: 0 }, { rx: 0, ry: 1 }, { rx: 0, ry: -1 }, { rx: 1, ry: 0 }, { rx: -1, ry: 0 }];

//---------------------------------------
// Controller's methods

Behave3d.controllerBox.prototype.construct = function (params, stage) {
	if (stage == "params") {
		this.setSides();
	}
};

//---------------------------------------
Behave3d.controllerBox.prototype.message = function (message, message_params) {
	if (this.handleCommonMessage(message, message_params)) return this;
	message_params = this.setMessageParams(message, message_params);

	if (message == "update") {
		this.setSides();
	}

	return this;
};

//---------------------------------------
Behave3d.controllerBox.prototype.update = function () {
	if (this.targets.length == 6) {
		if (this.paramsHaveChanged()) this.setSides();

		for (var i = 0; i < 6; i++) {
			this.addTransform({
				type: Behave3d.transforms.rotate,
				rx: this.sides_orientation[i].rx && this.sides_orientation[i].rx / this.sides_orientation[i].rx,
				ry: this.sides_orientation[i].ry && this.sides_orientation[i].ry / this.sides_orientation[i].ry,
				rz: 0,
				ra: (this.sides_orientation[i].rx + this.sides_orientation[i].ry) * 0.25 * Behave3d.consts.ROTATE_ONE_TURN
			}, i);

			var r;
			if (i == 0) r = this.computed_params.z_size / 2;else if (i == 1) r = this.computed_params.z_size / 2;else if (i == 2) r = -this.computed_params.z_size / 2;else if (i == 3) r = -this.computed_params.x_size + this.computed_params.z_size / 2;else if (i == 4) r = this.computed_params.z_size / 2;else r = this.computed_params.y_size - this.computed_params.z_size / 2;

			this.addTransform({
				type: Behave3d.transforms.translate,
				dx: 0, dy: 0, dz: r
			}, i);
		}
	}
};

//---------------------------------------
// Sets sides' sizes
Behave3d.controllerBox.prototype.setSides = function () {
	this.setChildTargets(6);

	if (this.targets.length < 6) Behave3d.debugExit("controllerBox requires 6 child HTML elements which will become the sides of the box");

	this.computed_params = this.getComputedLengths(['x_size'], ['y_size'], ['z_size']);

	// Set each side's sizes
	for (var i = 0; i < 6; i++) {
		this.targets[i].style.position = "absolute";

		if (i == 0 || i == 1) {
			this.targets[i].style.width = this.computed_params.x_size + "px";
			this.targets[i].style.height = this.computed_params.y_size + "px";
		} else if (i == 2 || i == 3) {
			this.targets[i].style.width = this.computed_params.z_size + "px";
			this.targets[i].style.height = this.computed_params.y_size + "px";
		} else {
			this.targets[i].style.width = this.computed_params.x_size + "px";
			this.targets[i].style.height = this.computed_params.z_size + "px";
		}
	}

	// Set width and height of this element to match the box size
	this.owner.element.style.width = this.computed_params.x_size + "px";
	this.owner.element.style.height = this.computed_params.y_size + "px";
};

Behave3d.registerController("box", Behave3d.controllerBox);

// ------------- EOF --------------