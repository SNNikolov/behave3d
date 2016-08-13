//------------------------------------------------------------------------------------------------------------------------
//
//         behave3d - Dynamic 3D behavior of HTML elements
//
//------------------------------------------------------------------------------------------------------------------------
"use strict";

//---------------------------------------
// CONTROLLER: transform
Behave3d.controllerTransform = function(params)
{
	Behave3d.Controller.call(this, params);
};

Behave3d.controllerTransform.prototype = Object.create(Behave3d.Controller.prototype);



//---------------------------------------
// Controller's message types, event types, parameters

Behave3d.controllerTransform.prototype.events         = [];
Behave3d.controllerTransform.prototype.messages       = [];
Behave3d.controllerTransform.prototype.default_params = {
	dx: 0,   dy: 0,   dz: 0,        // Translate, values in pixels/%
	sx: 1,   sy: 1,   sz: 1,        // Scale, 1 = 100%
	rx: 0,   ry: 0,   rz: 0, ra: 0, // Rotate, rotation vector supplied by rx/ry/rz values [0 - 1], ra in Behave3d.consts.ROTATE_UNIT (angles)
	flatten: false,                 // Flag for 'flat' value of element's transform-style, vs. the default 'preserve-3d'
};



//---------------------------------------
// Controller's methods

Behave3d.controllerTransform.prototype.update = function()
{
	if (this.paramsHaveChanged() || !this.computed_params)
		this.computed_params = this.getComputedLengths(['dx'], ['dy'], ['dz']);
	
	if (this.dx != 0 || this.dy != 0 || this.dz != 0)
		this.addTransform({
			type: Behave3d.transforms.translate,
			dx: this.computed_params.dx,
			dy: this.computed_params.dy,
			dz: this.computed_params.dz
		});
		
	if (this.ra != 0)
		this.addTransform({
			type: Behave3d.transforms.rotate,
			rx: this.rx,
			ry: this.ry,
			rz: this.rz,
			ra: this.ra
		});
		
	if (this.sx != 1 || this.sy != 1 || this.sz != 1)
		this.addTransform({
			type: Behave3d.transforms.scale,
			sx: this.sx,
			sy: this.sy,
			sz: this.sz
		});
		
	if (this.flatten)
		this.addTransform({
			type: Behave3d.transforms.flatten,
			flatten: true
		});
};

Behave3d.registerController("transform", Behave3d.controllerTransform);


// ------------- EOF --------------



