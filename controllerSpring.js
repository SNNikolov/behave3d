//------------------------------------------------------------------------------------------------------------------------
//
//         behave3d - Dynamic 3D behavior of HTML elements
//
//------------------------------------------------------------------------------------------------------------------------
"use strict";

//---------------------------------------
// CONTROLLER: spring
Behave3d.controllerSpring = function(params)
{
	Behave3d.Controller.call(this, params, true);
}

Behave3d.controllerSpring.prototype = Object.create(Behave3d.Controller.prototype);



//---------------------------------------
// Controller's message types, event types, parameters

Behave3d.controllerSpring.prototype.default_params = {
	strength        : 1, // Strength of spring force; the bigger value, the faster the spring moves
	max_len         : 0,   // Max length (in pixels) of the "spring"; If = 0, then no max length
	fixed_point_id  : "",  // ID of DOM node that is the attractor point, if no paths are supplied; If = "" then the attractor point is the initial position of this element
	paths           : "",  // A space-delimited list of controller ids; the sum of these controllers' current coordinates makes the attractor point
};



//---------------------------------------
// Controller's methods

Behave3d.controllerSpring.prototype.construct = function(params, stage)
{
	if (stage == "params") {
		this.setFixedPoint(this.fixed_point_id);
		
		// Get references to the path controllers, if such
		this.path_controllers = (this.paths != "" ? this.paths.split(" ") : []);
		for(var i = 0; i < this.path_controllers.length; i++)
			this.path_controllers[i] = this.getAnotherController(this.path_controllers[i]);
	}
};

//---------------------------------------
Behave3d.controllerSpring.prototype.update = function()
{
	if (this.paused) return;
	
	var target   = this.getTarget(0);
	var this_pos = Behave3d.getElementPos(target.element, true);
	var pos      = target.pos;
	
	// Update fixed point position
	if (this.fixed_point_id != "") this.setFixedPoint(this.fixed_point_id);
	
	if (this.paramsHaveChanged() || !this.computed_params)
		this.computed_params = this.getComputedLengths(['max_len']);
	
	var dpos = (this.path_controllers.length > 0) ?
		this.getPathPos(this.path_controllers)
		: {
			x : this.fixed_point.x - this_pos.x + pos.x,
			y : this.fixed_point.y - this_pos.y + pos.y,
			z : this.fixed_point.z - this_pos.z + pos.z
		};
	
	this.applySpringForce(dpos, this.strength, this.computed_params.max_len, 0);
};

//---------------------------------------
Behave3d.controllerSpring.prototype.setFixedPoint = function(fixed_point_id)
{
	if (!this.zero_point)
		this.zero_point = Behave3d.getElementPos(this.owner.element, true);
	
	this.fixed_point    = fixed_point_id ? Behave3d.getElementPos(fixed_point_id, true) : this.zero_point;
	this.fixed_point_id = fixed_point_id;
};

Behave3d.registerController("spring", Behave3d.controllerSpring);


// ------------- EOF --------------



