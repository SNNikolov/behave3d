//------------------------------------------------------------------------------------------------------------------------
//
//         behave3d - Dynamic 3D behavior of HTML elements
//
//------------------------------------------------------------------------------------------------------------------------
"use strict";

//---------------------------------------
// CONTROLLER: scrollSpring
Behave3d.controllerScrollSpring = function(params)
{
	Behave3d.Controller.call(this, params, true);
};

Behave3d.controllerScrollSpring.prototype = Object.create(Behave3d.Controller.prototype);



//---------------------------------------
// Controller's message types, event types, parameters

Behave3d.controllerScrollSpring.prototype.default_params = {
	spring_acc   : 0.1,  // If bigger than 0, the element will behave as if attached to its position by a spring, stretched by viewport's movements; the bigger the value, the stronger pulling of the "spring"
	spring_vdamp : 0.8, // Every frame the spring velocity will be multiplied (i.e. slowed) by this, acting like friction; Value of 1 means absolute elasticity of the spring
	strength     : 1,    // Multiplier for the strength of "pulling"
};



//---------------------------------------
// Controller's methods

Behave3d.controllerScrollSpring.prototype.construct = function(params, stage)
{
	if (stage == "params") {
		this.prevScroll = this.getScrollPos();
		this.x          = 0;
		this.y          = 0;
		this.vx         = 0;
		this.vy         = 0;
	}
};

//---------------------------------------
Behave3d.controllerScrollSpring.prototype.update = function()
{
	if (!this.paused) {
		var current_scroll = this.getScrollPos();
		var dx = current_scroll.x - this.prevScroll.x;
		var dy = current_scroll.y - this.prevScroll.y;
		
		this.vx -= dx * this.strength;
		this.vy -= dy * this.strength;
		
		this.vx -= this.x * this.spring_acc;
		this.vy -= this.y * this.spring_acc;
			
		this.vx *= this.spring_vdamp;
		this.vy *= this.spring_vdamp;
			
		this.x += this.vx;
		this.y += this.vy;
	}
	
	this.prevScroll = current_scroll;

	this.addTransform({
			type: Behave3d.transforms.translate,
			dx: this.x,
			dy: this.y,
			dz: 0
		});
};

//---------------------------------------
Behave3d.controllerScrollSpring.prototype.getScrollPos = function()
{
	return {
		x: window.pageXOffset,
		y: window.pageYOffset
	};
};

Behave3d.registerController("scrollSpring", Behave3d.controllerScrollSpring);


// ------------- EOF --------------



