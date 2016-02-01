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
}

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
	
	// How should the button react on list events
	// Possible values, space-delimited in a single string: "hide" / "change_class" / "move" / "fire" / "disable"
	when_no_progress  : "", // Reaction upon the list firing "no_prev" / "no_next" event
	when_on_border    : "", // Reaction upon the list firing "last_reached" / "first_reached" events
	when_clicked      : "", // Reaction upon clicking the button
	when_selection    : "", // Reaction upon the list firing "select" event
		
	duration      : 200,    // Duration in ms of all transitions
	ease_type     : "ease", // See Behave3d.ease()
	ease_amount   : 1,      // [0 , 1], see Behave3d.ease()
	ease_mirror   : false,  // If true, then the easing applied on backwards transition will be the "mirror" one of the forward easing (ease_in <-> ease_out)
	
	alt_class     : "",     // Name of style class to apply onto the element when "change_class" reaction is performed
	move_relative : true,   // Are the supplied move_x, move_y and move_z relative or absolute coordinates
	move_x        : 0,      // Movement target coordinates when "move" reaction is performed
	move_y        : 0,
	move_z        : 0,
};



//---------------------------------------
// Controller's methods

Behave3d.controllerListButton.prototype.construct = function(params, stage)
{
	if (stage == "params") {
		this.handlers_set_for_list = "";
		
		var computed_params = this.getComputedLengths(['move_x'], ['move_y'], ['move_z']);
		var move_params = this.move_relative ?
				{
					dx: computed_params.move_x,
					dy: computed_params.move_y,
					dz: computed_params.move_z
				} : {
					x: (computed_params.move_x != 0 ? computed_params.move_x : "same"),
					y: (computed_params.move_y != 0 ? computed_params.move_y : "same"),
					z: (computed_params.move_z != 0 ? computed_params.move_z : "same")
				};
		move_params.targets = this.targets;
		
		this.controller_move = this.owner.addController(Behave3d.controllerMove, move_params);
		this.controller_vis  = this.owner.addController(Behave3d.controllerOpacity, {targets: this.targets});
	}
	else if (stage == "events") {
		// Auto-update paused state of sub-controllers
		this.on(["paused", "unpaused"], function() {
			this.controller_move.set({paused: this.paused});
			this.controller_vis.set({paused: this.paused});
		});
		
		this.setEventHandlers();
	}
	else if (stage == "messages") {
		
	}
};

//---------------------------------------
Behave3d.controllerListButton.prototype.destruct = function() {
	this.owner.removeController(this.controller_move);
	this.owner.removeController(this.controller_vis);
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
			var action_params = (this.action_pos != -1) ? {pos: this.action_pos} : {};
			this.list_ref.message(this.action, action_params);
		}
		
		if (this.when_clicked) {
			this.doReaction(this.when_clicked);
			setTimeout((function() {this.doReaction(this.when_clicked, true)}).bind(this), this.duration);
		}
		
		this.fireEvent("click");
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
}

//---------------------------------------
// Performs the reactions supplied in do_what
// If do_back is true, then the backward animations are performed
Behave3d.controllerListButton.prototype.doReaction = function(do_what, do_back, event_type)
{
	do_what = do_what.trim().split(" ");
	for (var i = 0; i < do_what.length; i++)
		switch(do_what[i]) {
			case "hide":
				this.controller_vis.message(do_back ? "fade_in" : "fade_out", {duration: this.duration});
				break;
			case "move":
				this.controller_move.message(do_back ? "start_back" : "start", {duration: this.duration});
				break;
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
				this.fireEvent(event_type);
				break;
		}
}

//---------------------------------------
// Receives events from the list and performs the respective reactions
Behave3d.controllerListButton.prototype.handlerOfListEvents = function(event_type, event_params)
{
	var do_what = "";
	var do_back = false;
	
	switch(event_type) {
		case "first_reached":
			if (this.action != "focus_next") this.doReaction(this.when_on_border, false, "border_reached");
			break;
		case "last_reached":
			if (this.action != "focus_prev") this.doReaction(this.when_on_border, false, "border_reached");
			break;
		case "border_left":
			this.doReaction(this.when_on_border, true, "border_left");
			break;
			
		case "no_prev":
			if (this.action != "focus_next") {
				this.doReaction(this.when_no_progress, false, "no_progress");
				setTimeout((function() {this.doReaction(this.when_no_progress, true, "no_progress")}).bind(this), this.duration);
			}
			break;
		case "no_next":
			if (this.action != "focus_prev") {
				this.doReaction(this.when_no_progress, false, "no_progress");
				setTimeout((function() {this.doReaction(this.when_no_progress, true, "no_progress")}).bind(this), this.duration);
			}
			break;
	}
}

Behave3d.registerController("listButton", Behave3d.controllerListButton);


// ------------- EOF --------------



