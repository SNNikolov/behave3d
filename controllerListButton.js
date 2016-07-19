//------------------------------------------------------------------------------------------------------------------------
//
//         behave3d - Dynamic 3D behavior of HTML elements
//
//------------------------------------------------------------------------------------------------------------------------
"use strict";

//---------------------------------------
// CONTROLLER: listButton
Behave3d.controllerListButton = function(params)
{
	Behave3d.Controller.call(this, params);
};

Behave3d.controllerListButton.prototype = Object.create(Behave3d.Controller.prototype);



//---------------------------------------
// Controller's message types, event types, parameters

Behave3d.controllerListButton.prototype.requires       = { controllers: ["controllerList", "controllerMove", "controllerOpacity"]};

Behave3d.controllerListButton.prototype.messages       = [
	"update",  // Initializes the button, setting event listeners on the list
	"click",   // Calls the button's click handler
];
Behave3d.controllerListButton.prototype.events         = [
	"click",          // Fired when the button is clicked or being sent message "click"
	
	// Note that the following events are fired only when performing reaction when_xxxx which includes "fire"
	"border_reached", // Fired when the first or last item in the list is focused
	"border_left",    // Fired when the focus leaves the first or last item in the list
	"no_progress",    // Fired upon receiving "no_next" or "no_prev" events from the list (i.e. when trying to focus items outside the list boundaries)
];
Behave3d.controllerListButton.prototype.default_params = {
	list           : "", // id of the source list of items, to which messages are sent and from which events are received
	action         : "", // What message is sent to the list upon clicking the button
	action_pos     : -1, // If the message requires a message_params.pos parameter, here it is, or -1 if no .pos message param is needed 
	action_step    : 0,  // If the message requires a message_params.step parameter, here it is, or 0 if no .step message param is needed 
	
	// How should the button react on list events
	// Possible values, space-delimited in a single string: "change_class" / "fire" / "disable"
	when_no_progress  : "fire", // Reaction upon the list firing "no_prev" / "no_next" event
	when_on_border    : "fire", // Reaction upon the list firing "last_reached" / "first_reached" events
	when_clicked      : "fire", // Reaction upon clicking the button
	
	back_delay    : 200,    // Delay in ms before the restoration from "change_class" and "disable" is played for "click", "no_prev" and "no_next" events
	alt_class     : "",     // Name of style class to apply onto the element when "change_class" reaction is performed
};



//---------------------------------------
// Controller's methods

Behave3d.controllerListButton.prototype.construct = function(params, stage)
{
	if (stage == "params") {
		this.handlers_set_for_list = "";
	}
	else if (stage == "events") {
		this.setEventHandlers();
	}
};

//---------------------------------------
Behave3d.controllerListButton.prototype.destruct = function() {

};

//---------------------------------------
Behave3d.controllerListButton.prototype.message = function(message, message_params)
{
	if (this.handleCommonMessage(message, message_params)) return this;	
	message_params = this.setMessageParams(message, message_params);
	
	if (message == "update") {
		if (!this.list) Behave3d.debugExist(this.debugName() + " cannot update because its property 'list' is not set");
		this.setEventHandlers();
	}
	else if (message == "click") {
		if (this.action) {
			var action_params = {};
			if (this.action_pos != -1)
				action_params.pos = this.action_pos;
			if (this.action_step != 0)
				action_params.step = this.action_step;
			this.list_ref.message(this.action, action_params);
		}
		
		this.doReaction(this.when_clicked, "click");
	}
	
	return this;
};

//---------------------------------------
// Sets event handlers linking this button to its list's events
Behave3d.controllerListButton.prototype.setEventHandlers = function()
{
	if (this.list != this.handlers_set_for_list) {
		this.on(this.list + " all", this.handlerOfListEvents.bind(this));
		this.handlers_set_for_list = this.list;
		
		this.list_ref = this.getAnotherController(this.list);
	}
	
	if (!this.targets_events_handled) {
		this.targets_events_handled = true;
		var this_controller = this;
		
		for (var i = 0; i < this.targets.length; i++)
			this.targets[i].addEventListener("click", function() { this_controller.message("click"); });
	}
};

//---------------------------------------
// Performs the reactions supplied in do_what
// If do_back is true, then the backward animations are performed
Behave3d.controllerListButton.prototype.doReaction = function(do_what, event_type, do_back)
{
	if (!do_what) return;
	
	// Schedule backwards animation
	if (!do_back &&
		do_what != "fire" &&
		["click", "no_prev", "no_next"].indexOf(event_type) >= 0)
		setTimeout((function() {
			this.doReaction(do_what, true, event_type);
		}).bind(this), this.back_delay);	

	var do_what_parts = do_what.trim().split(" ");
	
	for (var i = 0; i < do_what_parts.length; i++)
		switch(do_what_parts[i]) {
			case "change_class":
				if (this.alt_class) {
					if (do_back) this.owner.element.classList.remove(this.alt_class);
					else         this.owner.element.classList.add(this.alt_class);
				}
				else Behave3d.debugExit(this.debugName() + " must perform 'change_class' but its param alt_class is not set");
				break;
			case "disable":
				this.owner.element.disabled = !do_back;
				break;
			case "fire":
				if (!do_back || event_type == "border_left")
					this.fireEvent(event_type);
				break;
		}
};

//---------------------------------------
// Receives events from the list and performs the respective reactions
Behave3d.controllerListButton.prototype.handlerOfListEvents = function(event_type, event_params)
{
	var do_what = "";
	var do_back = false;
	
	switch(event_type) {
		case "first_reached":
			if (this.action != "focus_next") this.doReaction(this.when_on_border, "border_reached");
			break;
		case "last_reached":
			if (this.action != "focus_prev") this.doReaction(this.when_on_border, "border_reached");
			break;
		case "border_left":
			this.doReaction(this.when_on_border, "border_left", true);
			break;
			
		case "no_prev":
		case "no_next":
			if (this.action != (event_type == "no_prev" ? "focus_next" : "focus_prev"))
				this.doReaction(this.when_no_progress, "no_progress");
			break;
	}
};

Behave3d.registerController("listButton", Behave3d.controllerListButton);


// ------------- EOF --------------



