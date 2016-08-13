//------------------------------------------------------------------------------------------------------------------------
//
//         behave3d - Dynamic 3D behavior of HTML elements
//
//------------------------------------------------------------------------------------------------------------------------
"use strict";

//---------------------------------------
// CONTROLLER: lookAt

Behave3d.controllerLookAt = function (params) {
	Behave3d.Controller.call(this, params);
};

Behave3d.controllerLookAt.prototype = Object.create(Behave3d.Controller.prototype);

//---------------------------------------
// Controller's message types, event types, parameters

Behave3d.controllerLookAt.prototype.events = ["start", // Fired when rotation is started after a period of rest
"end"];
Behave3d.controllerLookAt.prototype.messages = [];
Behave3d.controllerLookAt.prototype.default_params = {
	target_id: "", // ID of the target HTML element
	quickness: 0.2, // How quickly to turn towards the target (1 - instantly, 0 - indefinitely slowly)
	face_angle: 0, // Angle [0 - Behave3d.consts.ROTATE_ONE_TURN] defining which side of the element is its face (that should face the target); default face (angle = 0) is left side
	event_precision: 1, // Precision in rotation units to use when measuring if the target angle is reached
	target_dz: 0 };

//---------------------------------------
// Controller's methods

Behave3d.controllerLookAt.prototype.construct = function (params, stage) {
	if (stage == "params") {
		this.current_angle = 0;
		this.current_angle_z = 0;
	}
};

Behave3d.controllerLookAt.prototype.update = function () {
	if (this.paramsHaveChanged()) this.computed_params = this.getComputedLengths([], [], ['target_dz']);

	if (!this.paused) {
		var this_pos = Behave3d.getElementPos(this.owner.element, true);
		var target_pos = Behave3d.getElementPos(this.target_id, true);

		var angle_to_target = Behave3d.getAngle(this_pos, target_pos) + this.face_angle;
		var dangle = angle_to_target - this.current_angle;

		if (dangle < -Behave3d.consts.ROTATE_ONE_TURN / 2) dangle += Behave3d.consts.ROTATE_ONE_TURN;
		if (dangle > Behave3d.consts.ROTATE_ONE_TURN / 2) dangle -= Behave3d.consts.ROTATE_ONE_TURN;

		this.current_angle = (Behave3d.consts.ROTATE_ONE_TURN + this.current_angle + dangle * this.quickness) % Behave3d.consts.ROTATE_ONE_TURN;

		var now_in = Math.abs(angle_to_target - this.current_angle) < this.event_precision;
		var last_in = Math.abs(dangle) < this.event_precision;

		if (this.computed_params.target_dz != 0) {
			var dx = target_pos.x - this_pos.x;
			var dy = target_pos.y - this_pos.y;
			var distance2d = Math.sqrt(dx * dx + dy * dy);
			var angle_to_target = Behave3d.getAngle({ x: 0, y: 0 }, { x: this.computed_params.target_dz, y: distance2d });
			var dangle = angle_to_target - this.current_angle_z;

			if (dangle < -Behave3d.consts.ROTATE_ONE_TURN / 2) dangle += Behave3d.consts.ROTATE_ONE_TURN;
			if (dangle > Behave3d.consts.ROTATE_ONE_TURN / 2) dangle -= Behave3d.consts.ROTATE_ONE_TURN;

			this.current_angle_z = (Behave3d.consts.ROTATE_ONE_TURN + this.current_angle_z + dangle * this.quickness) % Behave3d.consts.ROTATE_ONE_TURN;

			now_in = now_in && Math.abs(angle_to_target - this.current_angle_z) < this.event_precision;
			last_in = last_in && Math.abs(dangle) < this.event_precision;
		}

		if (last_in && !now_in) this.fireEvent("start");else if (now_in && !last_in) this.fireEvent("end");
	}

	if (this.computed_params.target_dz != 0) this.addTransform({
		type: Behave3d.transforms.rotate,
		rx: -Math.sin(this.current_angle / Behave3d.consts.RADIANS_TO_UNITS),
		ry: Math.cos(this.current_angle / Behave3d.consts.RADIANS_TO_UNITS),
		rz: 0,
		ra: this.current_angle_z
	});else this.addTransform({
		type: Behave3d.transforms.rotate,
		rx: 0, ry: 0, rz: 1, ra: this.current_angle
	});
};

Behave3d.registerController("lookAt", Behave3d.controllerLookAt);

// ------------- EOF --------------