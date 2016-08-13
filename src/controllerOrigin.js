//------------------------------------------------------------------------------------------------------------------------
//
//         behave3d - Dynamic 3D behavior of HTML elements
//
//------------------------------------------------------------------------------------------------------------------------
"use strict";

//---------------------------------------
// CONTROLLER: origin
Behave3d.controllerOrigin = function(params)
{
	Behave3d.Controller.call(this, params);
};

Behave3d.controllerOrigin.prototype = Object.create(Behave3d.Controller.prototype);



//---------------------------------------
// Controller's message types, event types, parameters

Behave3d.controllerOrigin.prototype.events         = [];
Behave3d.controllerOrigin.prototype.messages       = [];
Behave3d.controllerOrigin.prototype.default_params = {
	x : 0.5, // coordinate in element's X axis, [0 - 1] as part of element's X size
	y : 0.5, // coordinate in element's Y axis, [0 - 1] as part of element's Y size
	z : 0,   // coordinate in element's Z axis in pixels
};



//---------------------------------------
// Controller's methods

Behave3d.controllerOrigin.prototype.update = function()
{
	this.addTransform({
		type: Behave3d.transforms.origin,
		ox: this.x,
		oy: this.y,
		oz: this.z
	});
};

Behave3d.registerController("origin", Behave3d.controllerOrigin);


// ------------- EOF --------------



