//------------------------------------------------------------------------------------------------------------------------
//
//         behave3d - Dynamic 3D behavior of HTML elements
//
//------------------------------------------------------------------------------------------------------------------------
"use strict";

//---------------------------------------
// CONTROLLER: property
Behave3d.controllerProperty = function(params)
{
	Behave3d.Controller.call(this, params);
}

Behave3d.controllerProperty.prototype = Object.create(Behave3d.Controller.prototype);



//---------------------------------------
// Controller's message types, event types, parameters

Behave3d.controllerProperty.prototype.events = [
	"start",      // Fired upon start of forward movement
	"half",       // Middle of forward movement
	"end",        // End of forward movement
	
	"start_back", // Fired upon start of backwards movement
	"half_back",  // Middle of backwards movement
	"end_back",   // End of backwards movement
	
	"pos0",       // Fired upon reaching the starting position (when moving backwards)
	"pos1",       // Fired upon reaching the end position (when moving forward)
];
Behave3d.controllerProperty.prototype.messages = [
	"start",          // Start or continue current forward movement
	"start_back",     // Start or continue current backward movement
	"start_reverse",  // Start moving in the reverse direction within the current movement
	"start_new",      // Start a new forward movement starting from the current position
	"start_new_back", // Start the backward motion (i.e. starting from the end position) of a new movement
	
	"pos0",           // Set the element in movement's starting position immediately
	"pos1",           // Set the element in movement's ending position immediately
];
Behave3d.controllerProperty.prototype.default_params = {
	name         : "",     // Name of HTML element property
	val          : "same", // Absolute target value, or "same"
	dval         : 0,      // Target value relative to current value (overrides absolute target value if != 0)
	init_val     : "same", // Initial X displacement
	is_v_coo     : false,  // How to interpret %s - as horizontal coordinate/length (default), or as vertical coordinate/length
	suffix       : "",     // String representing the units of the property, appended to the end of the value
	precision    : 0,      // How many digits after the float sign to round to when applying the value
	duration     : 1000,   // Duration of animation in ms

	half_step    : 1,    // If set to < 1, each frame the value of the property will step closer to the required value, where step = half_step * distance_to_required_value
	spring_acc   : 0,    // If bigger than 0, the value of the property will behave as if attached to a spring; the bigger the value, the stronger pulling of the "spring"
	spring_vdamp : 0.92, // Every frame the spring velocity will be multiplied (i.e. slowed) by this, acting like friction; Value of 1 means absolute elasticity of the spring	
	
	ease_type        : "ease", // See Behave3d.ease()
	ease_amount      : 1,      // [0 , 1], see Behave3d.ease()
	ease_mirror      : false,  // If true, then the easing applied on backwards transition will be the "mirror" one of the forward easing (ease_in <-> ease_out)

	read_on_start    : false, // If true, then on each starting message, the current value of the property will be read from the HTML element
	repeat_start_pos : false, // If true, then each new start or start_back will start from the same starting position as last start
	register_actions : false, // Whether to handle element's actions "show", "hide", "show_immediately", "hide_immediately", "move"; Values: false / true / "500" / "500 elm" - set event handlers with delay 500ms for HTML element #elm's actions
};



//---------------------------------------
// Controller's methods

Behave3d.controllerProperty.prototype.construct = function(params, stage)
{
	if (stage == "params") {
		this.property_container = this.targets[0];
		this.container_name     = "";
		
		var name_parts = this.name.split(".");
		if (name_parts.length == 2) {
			this.name               = name_parts[1];
			this.container_name     = name_parts[0];
			this.property_container = this.property_container[this.container_name];			
		}
		
		var init_val = Behave3d.params.getLength(this.init_val, this.is_v_coo ? "X" : "Y", this.owner.element, ["same"]);
		if (init_val === "same")
			init_val = this.readValue();
	
		this.stepper  = new Behave3d.StepEngine({val: init_val}, false, this, this);
		this.last_val = undefined;
	}
	else if (stage == "events") {
		this.setEventHandlers();
	}
	
};

//---------------------------------------
Behave3d.controllerProperty.prototype.message = function(message, message_params)
{
	var use_abs_val = (message_params.val !== undefined && message_params.dval === undefined);
	
	if (this.handleCommonMessage(message, message_params)) return this;	
	message_params = this.setMessageParams(message, message_params);
	
	this.direction  = (message == "start" || message == "start_new" || message == "pos1" || (message == "start_reverse" && this.direction != 1)) ? 1 : -1;
	var duration    = (message == "pos0" || message == "pos1") ? 0 : this.duration;
	var new_start   = (message == "start_new" || message == "start_new_back");
	
	if (this.read_on_start) {
		var dom_value        = this.readValue();
		var changed_by_other = (this.stepper.getVar("val") != dom_value);
		
		if (changed_by_other)
			this.stepper.setVar("val", dom_value);
	}
	
	var param_val  = Behave3d.params.getLength(this.val, this.is_v_coo ? "X" : "Y", this.owner.element, ["same"]);
	var param_dval = Behave3d.params.getLength(this.dval, this.is_v_coo ? "X" : "Y", this.owner.element);
	
	var movement_dval = (!use_abs_val && param_dval != 0) ? param_dval : (param_val === "same") ? 0 : param_val - this.stepper.getVar("val", true);

	this.stepper.start(this.direction, this.repeat_start_pos, new_start, {val: movement_dval}, duration);
	this.paused = false;
	
	return this;
};

//---------------------------------------
Behave3d.controllerProperty.prototype.update = function()
{
	this.stepper.update(this.paused);
	
	var new_val = this.stepper.getVar("val").toFixed(this.precision);
	if (new_val == -0) new_val = 0;

	if (new_val !== this.last_val) {
		for(var i = 0; i < this.targets.length; i++)
			(this.container_name ? this.targets[i][this.container_name] : this.targets[i])[this.name] = new_val + this.suffix;		

		this.last_val = new_val;
	}
};

//---------------------------------------
// Sets event handlers through which this controller receives notifications of outside events
Behave3d.controllerProperty.prototype.setEventHandlers = function()
{
	this.registerActions(this.register_actions, {
			show             : "start_back",
			hide             : "start",
			show_immediately : "pos0",
			hide_immediately : "pos1",
		}, {
			show_start : "start_back",
			show_end   : "end_back",
			hide_start : "start",
			hide_end   : "end",
			move_start : "start",
			move_end   : "end",
		});
}

//---------------------------------------
// Returns the current value of the property, read from the DOM. Returned value is without suffix.
Behave3d.controllerProperty.prototype.readValue = function()
{
	var value = this.property_container[this.name];

	if (value === "" && this.property_container == this.owner.element.style)
		value = window.getComputedStyle(this.owner.element, null).getPropertyValue(this.name);

	if (typeof value == "string" && this.suffix)
		value = value.substr(0, value.length - this.suffix.length);

	return Number(value);
}


Behave3d.registerController("property", Behave3d.controllerProperty);


// ------------- EOF --------------



