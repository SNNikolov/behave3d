//------------------------------------------------------------------------------------------------------------------------
//
//         behave3d - Dynamic 3D behavior of HTML elements
//
//------------------------------------------------------------------------------------------------------------------------
"use strict";

//---------------------------------------
// CONTROLLER: carousel
Behave3d.controllerCarousel = function(params)
{
	Behave3d.Controller.call(this, params);
}

Behave3d.controllerCarousel.prototype = Object.create(Behave3d.Controller.prototype);



//---------------------------------------
// Controller's message types, event types, parameters

Behave3d.controllerCarousel.prototype.requires       = { controllers: ["controllerList"]};

Behave3d.controllerCarousel.prototype.messages       = [
	"update",      // Initializes items of the list
	"reset",       // Initializes rotation variables
	"focus",       // Sets the focus on the supplied item, params = {focused: item_index}
];
Behave3d.controllerCarousel.prototype.events         = [
	"start",  // Triggered on start of rotation animation
	"end",    // Triggered on end of rotation animation
	"change", // Triggered on end of animation, callback receives event params = {pos: index_of_selected_item, item: reference_to_DOM_element}
];
Behave3d.controllerCarousel.prototype.default_params = {
	list           : "",   // id of the source list of items
	radius         : 200,  // Radius in pixels of the carousel ring
	radius_z       : -1,   // Radius of the ring in Z direction (making it elliptical), -1 for the same as radius
	dz             : -1,   // Z displacement of the carousel; -1 = radius_z is default in order to make sure the items behind z=0 plane are not overlapped by container's background
	plane_angle    : 0,    // Angle between the carousel ring plane and axis X
	back_scale     : 1,    // If different than 1, then the items are scaled the further back they are, so that their scale is multiplied by back_scale when they are at the most back position
	back_opacity   : 1,    // [0 - 1] - opacity of items at back position
	middle_opacity : 1,    // [0 - 1] - opacity of items at middle position
	
	duration       : 700, // Duration in milliseconds of the rotating animation for changing the current item
	ease_type      : "ease", // See Behave3d.ease()
	ease_amount    : 1,      // [0 , 1], see Behave3d.ease()
	
	use_spring     : true, // If true then the items' motion will be accomplished via spring accelerations, otherwise - via fixed trajectories
	acc            : 30,   // Amount of acceleration applied for moving the items; bigger value == faster movement
	damping_factor : 0.9,  // Speed damping constantly applied to moving items
};



//---------------------------------------
// Controller's methods

Behave3d.controllerCarousel.prototype.construct = function(params, stage)
{
	if (stage == "params") {
		this.stepper = new Behave3d.StepEngine({angle: 0}, true, this, this);
		this.message("reset");
	}
	else if (stage == "events") {
		this.handlers_set_for_list = "";
		this.setEventHandlers();
	}
};

//---------------------------------------
Behave3d.controllerCarousel.prototype.destruct = function() { };

//---------------------------------------
Behave3d.controllerCarousel.prototype.message = function(message, message_params)
{
	if (this.handleCommonMessage(message, message_params)) return this;	
	message_params = this.setMessageParams(message, message_params);
	
	if (message == "update") {
		if (!this.list) Behave3d.debugExist(this.debugName() + " cannot update because its property 'list' is not set");
		this.setEventHandlers();
		
		var diff = this.setItems(message_params);
		this.stepper.setVar("angle", this.target_angle = this.items_dangle * this.current_item);
	}
	else if (message == "reset") {
		this.current_item  = 0;
		this.target_item   = 0;
		this.target_angle  = 0;
	}
	else if (message == "focus") {
		this.target_item  = message_params.focused;
		this.target_angle = this.target_angle + this.items_dangle * message_params.step;
		this.stepper.setMovement({angle: this.target_angle - this.stepper.getVar("angle", true)}, this.duration);
		this.stepper.start();
	}
	
	return this;
};

//---------------------------------------
Behave3d.controllerCarousel.prototype.update = function()
{
	if (this.stepper.update(this.paused)) {
		// Rotation has just finished
		this.current_item = this.target_item;
		this.fireEvent("change", {
			pos  : this.current_item,
			item : this.targets[this.current_item]
		});
	}
	
	if (this.paramsHaveChanged() || !this.computed_params)
		this.computed_params = this.getComputedLengths(['radius'], [], ['radius_z', 'dz']);
	
	var radius_z    = (this.computed_params.radius_z == -1 ? this.computed_params.radius : this.computed_params.radius_z);
	var carousel_dz = (this.computed_params.dz == -1 ? radius_z : this.computed_params.dz);

	for (var i = 0; i < this.targets.length; i++) {
		var item_pos  = this.getItemPos(i, this.stepper.getVar("angle"));
		var effects_z = item_pos.z;
		
		item_pos.z += carousel_dz;		
		
		if (this.use_spring) {
			this.applySpringForce(item_pos, this.acc, 0, i);
			this.applySpeedDamping(this.damping_factor, i);
			
			var pos = this.getTarget(i).pos;
			effects_z  = pos.z - carousel_dz;
		}
		else {		
			this.addTransform({
				type: Behave3d.transforms.translate,
				dx: item_pos.x,
				dy: item_pos.y,
				dz: item_pos.z,
			}, i);
		}
		
		if (this.back_scale != 1) {
			var item_scale = 1 - (1 - this.back_scale) * (radius_z - effects_z) / (2 * radius_z);
			this.addTransform({
				type: Behave3d.transforms.scale,
				sx: item_scale,
				sy: item_scale,
				sz: 1,
			}, i);
		}
		
		if (this.back_opacity != 1 || this.middle_opacity != 1) {
			var item_opacity = (effects_z >= 0) ?
				1 - (1 - this.middle_opacity) * (radius_z - effects_z) / radius_z :
				this.middle_opacity - (this.middle_opacity - this.back_opacity) * - effects_z / radius_z;
			
			this.addTransform({
				type: Behave3d.transforms.opacity,
				opacity: item_opacity,
			}, i);
		}
	}
}

//---------------------------------------
// Sets event handlers linking this carousel to its list's events
Behave3d.controllerCarousel.prototype.setEventHandlers = function()
{
	if (this.list != this.handlers_set_for_list) {
		this.on(this.list + " update", "update");
		this.on(this.list + " reset", "reset");
		this.on(this.list + " focus", "focus");
		
		this.handlers_set_for_list = this.list;		
		this.list_ref = this.getAnotherController(this.list);
	}
}


//---------------------------------------
// Initializes all items of the carousel
Behave3d.controllerCarousel.prototype.setItems = function()
{
	this.targets      = this.list_ref.targets;
	this.items_dangle = Behave3d.consts.ROTATE_ONE_TURN / this.targets.length;
	
	var carousel_center_x = this.owner.element.clientWidth / 2;
	var carousel_center_y = this.owner.element.clientHeight / 2;
	
	// Position each item in the center of the carousel
	for (var i = 0; i < this.targets.length; i++) {
		var target = this.getTarget(i);
		
		target.element.style.position = "absolute";
		target.element.style.left     = (carousel_center_x - this.targets[i].clientWidth / 2) + "px";
		target.element.style.top      = (carousel_center_y - this.targets[i].clientHeight / 2) + "px";
		
		if (this.use_spring)
			target.physics_enabled = true;
	}
}

//---------------------------------------
// Calculates and returns the current position (as {x, y, z}) in 3D space of a carousel item
Behave3d.controllerCarousel.prototype.getItemPos = function(item_index, carousel_angle)
{
	var item_angle = -carousel_angle + item_index * this.items_dangle;
	var radius_z   = (this.computed_params.radius_z == -1 ? this.computed_params.radius : this.computed_params.radius_z);

	var pos = {
		x : Math.sin(item_angle / Behave3d.consts.RADIANS_TO_UNITS) * this.computed_params.radius,
		y : 0,
		z : Math.cos(item_angle / Behave3d.consts.RADIANS_TO_UNITS) * radius_z,
	};
	
	if (this.plane_angle != 0) {
		pos.y = pos.x * Math.sin(this.plane_angle / Behave3d.consts.RADIANS_TO_UNITS);
		pos.x = pos.x * Math.cos(this.plane_angle / Behave3d.consts.RADIANS_TO_UNITS);
	}
	
	return pos;
}

Behave3d.registerController("carousel", Behave3d.controllerCarousel);


// ------------- EOF --------------



