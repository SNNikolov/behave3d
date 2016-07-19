//------------------------------------------------------------------------------------------------------------------------
//
//         behave3d - Dynamic 3D behavior of HTML elements
//
//------------------------------------------------------------------------------------------------------------------------
"use strict";

//---------------------------------------
// CONTROLLER: opacity
Behave3d.controllerOpacity = function(params)
{
	Behave3d.Controller.call(this, params);
};

Behave3d.controllerOpacity.prototype = Object.create(Behave3d.Controller.prototype);



//---------------------------------------
// Controller's message types, event types, parameters

Behave3d.controllerOpacity.prototype.events      = [
	"start_fade_in",  // Fired upon starting of fade-in transition
	"end_fade_in",    // Fired upon end of fade-in transition
	
	"start_fade_out", // Fired upon starting of fade-out transition
	"end_fade_out",   // Fired upon end of fade-out transition
	
	"show",           // Fired upon the immediate action of showing the element
	"hide"            // Fired upon the immediate action of hiding the element
];
Behave3d.controllerOpacity.prototype.messages       = [
	"fade_in",  // Start a transition from current opacity to 1 (or the value of param this.opacity if different than 1)
	"fade_out", // Start a transition from current opacity to 0
	
	"show",     // Immediately set opacity to 1 (or the value of param this.opacity if different than 1)
	"hide",     // Immediately set opacity to 0
];
Behave3d.controllerOpacity.prototype.default_params = {
	opacity          : 1,      // in [0 - 1]
	duration         : 1000,   // duration of fade-in and fade-out effects in milliseconds
	affect           : "",     // "" / "visibility" / "display" - whether to affect HTML element's visibility or display properties, default is not (i.e. only opacity)
	register_actions : false,  // Whether to handle element's actions "show", "hide", "show_immediately", "hide_immediately"; Values: false / true / "500" / "500 elm" - set event handlers with delay 500ms for HTML element #elm's actions
	ease_type        : "ease", // See Behave3d.ease()
	ease_amount      : 1,      // [0 , 1], see Behave3d.ease()
	ease_mirror      : false,  // If true, then the easing applied on backwards transition will be the "mirror" one of the forward easing (ease_in <-> ease_out)
};



//---------------------------------------
// Controller's methods

Behave3d.controllerOpacity.prototype.construct = function(params, stage)
{
	if (stage == "params") {
		this.current_action     = ""; // stores what action is currently performed (= last called message)
		this.total_frames       = 0;
		this.frames_left        = 0;
		this.current_opacity    = this.opacity;
		this.actions_registered = false;
	}
	else if (stage == "events") {
		this.setEventHandlers();
	}
};

//---------------------------------------
Behave3d.controllerOpacity.prototype.message = function(message, message_params)
{
	if (this.handleCommonMessage(message, message_params)) return this;	
	message_params = this.setMessageParams(message, message_params);
	
	var instantly        = (message == "show" || message == "hide");
	this.current_action  = message;
	this.target_opacity  = (message == "fade_out" || message == "hide") ? 0 : this.opacity;
	this.total_frames    = instantly ? 0 : Math.round(this.duration / Behave3d.vars.frameDuration);
	
	if (this.total_frames == 0) {
		this.total_frames = 1;
		instantly = true;
	}
	
	this.frames_left = this.total_frames;
	this.ostep       = (this.target_opacity - this.current_opacity) / this.total_frames;
	
	if (this.affect == "display" &&
		this.current_opacity != 0 &&
		this.target_opacity == 0) {
			// Remember display style before setting it to 'none'
			this.display_style = [];
			for (var i = 0; i < this.targets.length; i++) {
				var element_display_style = this.targets[i].style.display || window.getComputedStyle(this.targets[i], null).getPropertyValue("display");
				this.display_style.push(element_display_style);
			}
	}
	
	if (this.affect != "" &&
		this.current_opacity == 0 &&
		this.target_opacity != 0)
			// Make targets visible on start of transition
			for (var i = 0; i < this.targets.length; i++)
				if (this.affect == "visibility")
					this.targets[i].style.visibility = "visible";
				else if (this.affect == "display" && this.display_style)
					this.targets[i].style.display = this.display_style[i];
	
	if (instantly)
		this.update(true);
	
	return this;
};

//---------------------------------------
Behave3d.controllerOpacity.prototype.update = function(dont_do_transforms)
{
	if (!this.paused && this.frames_left > 0) {
		var instantly = (this.current_action == "show" || this.current_action == "hide");
		
		if (this.frames_left == this.total_frames) {
			if (instantly)		
				this.fireEvent(this.current_action);
			else
				this.fireEvent("start_" + this.current_action);
		}
		
		this.current_opacity += Behave3d.ease(this.ostep, this.ease_type, this.ease_amount, this.total_frames, this.total_frames - this.frames_left, "step");

		this.frames_left--;
		
		if (this.frames_left == 0) {
			if (!instantly)		
				this.fireEvent("end_" + this.current_action);
			
			this.current_opacity = this.target_opacity;
			this.current_action  = "";
			
			if (this.current_opacity == 0)
				for (var i = 0; i < this.targets.length; i++)
					if (this.affect == "visibility")
						this.targets[i].style.visibility = "hidden";
					else if (this.affect == "display")
						this.targets[i].style.display = "none";
		}
	}

	if (!dont_do_transforms)
		this.addTransform({
			type: Behave3d.transforms.opacity,
			opacity: this.current_opacity
		});
};

//---------------------------------------
// Sets event handlers through which this controller receives notifications of outside events
Behave3d.controllerOpacity.prototype.setEventHandlers = function()
{
	this.registerActions(this.register_actions, {
			show             : "fade_in",
			hide             : "fade_out",
			show_immediately : "show",
			hide_immediately : "hide",
		}, {
			show_start : ["show", "fade_in_start"],
			show_end   : ["show", "fade_in_end"],
			hide_start : ["hide", "fade_out_start"],
			hide_end   : ["hide", "fade_out_end"],
		});
};

Behave3d.registerController("opacity", Behave3d.controllerOpacity);


// ------------- EOF --------------



