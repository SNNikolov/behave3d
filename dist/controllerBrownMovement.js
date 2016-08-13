//------------------------------------------------------------------------------------------------------------------------
//
//         behave3d - Dynamic 3D behavior of HTML elements
//
//------------------------------------------------------------------------------------------------------------------------
"use strict";

//---------------------------------------
// CONTROLLER: brownMovement

Behave3d.controllerBrownMovement = function (params) {
	Behave3d.Controller.call(this, params);
};

Behave3d.controllerBrownMovement.prototype = Object.create(Behave3d.Controller.prototype);

//---------------------------------------
// Controller's message types, event types, parameters

Behave3d.controllerBrownMovement.prototype.default_params = {
	position: 2, // Max displacement in pixels
	rotation: Behave3d.consts.ROTATE_ONE_TURN / 18, // Max rotation in Behave3d.consts.ROTATE_UNIT
	opacity: 0 };

//---------------------------------------
// Controller's methods

Behave3d.controllerBrownMovement.prototype.update = function () {
	if (this.paused) return;

	if (this.paramsHaveChanged() || !this.computed_params) this.computed_params = this.getComputedLengths(['position']);

	if (this.position > 0) this.addTransform({
		type: Behave3d.transforms.translate,
		dx: (2 * Math.random() - 1) * this.computed_params.position,
		dy: (2 * Math.random() - 1) * this.computed_params.position,
		dz: (2 * Math.random() - 1) * this.computed_params.position
	});

	if (this.rotation > 0) this.addTransform({
		type: Behave3d.transforms.rotate,
		rx: 2 * Math.random() - 1,
		ry: 2 * Math.random() - 1,
		rz: 2 * Math.random() - 1,
		ra: Math.random() * this.rotation
	});

	if (this.opacity > 0) this.addTransform({
		type: Behave3d.transforms.opacity,
		opacity: 1 + Math.random() * this.opacity - this.opacity
	});
};

Behave3d.registerController("brownMovement", Behave3d.controllerBrownMovement);

// ------------- EOF --------------