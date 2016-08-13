//------------------------------------------------------------------------------------------------------------------------
//
//         behave3d - Dynamic 3D behavior of HTML elements
//
//------------------------------------------------------------------------------------------------------------------------
"use strict";

//---------------------------------------
// CONTROLLER: scene

Behave3d.controllerScene = function (params) {
	Behave3d.Controller.call(this, params);
};

Behave3d.controllerScene.prototype = Object.create(Behave3d.Controller.prototype);

//---------------------------------------
// Controller's message types, event types, parameters

Behave3d.controllerScene.prototype.events = ["viewport_update"];
Behave3d.controllerScene.prototype.messages = ["params"];
Behave3d.controllerScene.prototype.default_params = {
	perspective: "100%v", // Distance from eye to z=0 plane
	perspective_origin_x: 50, // Perspective's vanishing point x position, in percents as part of the scene container; 50 = center
	perspective_origin_y: 50, // Perspective's vanishing point y position, in percents..
	update_perspective: true };

//---------------------------------------
// Controller's methods

Behave3d.controllerScene.prototype.construct = function (params, stage) {
	if (stage == "params") {
		this.needUpdate = false;
		this.windowScrollListener = this.windowScrollListener.bind(this);

		Behave3d.setScene(Behave3d.params.extendObject(this.default_params, params), this);
		this.updateViewport();
	} else if (stage == "events") {
		if (this.update_perspective) {
			window.addEventListener("scroll", this.windowScrollListener, true);
			window.addEventListener("resize", this.windowScrollListener, true);
		}
	}
};

//---------------------------------------
Behave3d.controllerScene.prototype.message = function (message, message_params) {
	if (this.handleCommonMessage(message, message_params)) return this;
	message_params = this.setMessageParams(message, message_params);

	if (message == "params") {
		Behave3d.setScene(message_params, this);
		this.updateViewport();
	}

	return this;
};

//---------------------------------------
Behave3d.controllerScene.prototype.update = function () {
	if (!this.paused && this.needUpdate) this.updateViewport();
};

//---------------------------------------
Behave3d.controllerScene.prototype.windowScrollListener = function () {
	this.needUpdate = true;
};

//---------------------------------------
Behave3d.controllerScene.prototype.updateViewport = function () {
	var percents_precision = 5;

	if (!this.update_perspective) return;

	var scene = {
		x: this.owner.element.clientLeft,
		y: this.owner.element.clientTop,
		w: this.owner.element.clientWidth,
		h: this.owner.element.clientHeight
	};

	// Viewport coordinates relative to scene container
	var viewport = {
		x: window.pageXOffset - scene.x,
		y: window.pageYOffset - scene.y,
		w: window.innerWidth,
		h: window.innerHeight
	};

	// Get current position of viewport's center
	this.perspective_origin_x = viewport.x + viewport.w / 2;
	this.perspective_origin_y = viewport.y + viewport.h / 2;

	//this.perspective_origin_x = Math.min(scene.w, Math.max(0, this.perspective_origin_x));
	//this.perspective_origin_y = Math.min(scene.h, Math.max(0, this.perspective_origin_y));

	this.perspective_origin_x = (this.perspective_origin_x / scene.w * 100).toFixed(percents_precision);
	this.perspective_origin_y = (this.perspective_origin_y / scene.h * 100).toFixed(percents_precision);

	Behave3d.setScene({
		perspective_origin_x: this.perspective_origin_x,
		perspective_origin_y: this.perspective_origin_y
	}, this);

	this.fireEvent("viewport_update");
	this.needUpdate = false;

	Behave3d.debugOut(this.debugName() + " sets perspectiveOrigin='" + this.perspective_origin_x + "% " + this.perspective_origin_y + "%', perspective=" + Behave3d.vars.sceneParams.perspective + " for viewport(x: " + viewport.x + ", y: " + viewport.y + ", w: " + viewport.w + ", h: " + viewport.h + ")");
};

Behave3d.registerController("scene", Behave3d.controllerScene);

// ------------- EOF --------------