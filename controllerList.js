//------------------------------------------------------------------------------------------------------------------------
//
//         behave3d - Dynamic 3D behavior of HTML elements
//
//------------------------------------------------------------------------------------------------------------------------
"use strict";

//---------------------------------------
// CONTROLLER: list
Behave3d.controllerList = function(params)
{
	Behave3d.Controller.call(this, params);
}

Behave3d.controllerList.prototype = Object.create(Behave3d.Controller.prototype);



//---------------------------------------
// Controller's message types, event types, parameters

Behave3d.controllerList.prototype.messages       = [
	"update",      // Reads the children of this element in the DOM tree and sets them as items
	"reset",       // Initializes focus and selection variables
	"insert",      // Inserts one or more elements in the list; message_params = {pos: index at which to insert, items: [ref_to_DOM_element, ...]}
	"remove",      // Removes one or more elements from the list; message_params = {pos: first index, length: number of items to remove}
	"focus_pos",   // Order focus of the item with the supplied index message_params.pos
	"focus_first", // Order focus of the first item
	"focus_last",  // Order focus of the last item
	"focus_next",  // Order focus of the next item
	"focus_prev",  // Order focus of the prev item
	"focus_step",  // Order focus of the item with index = index_of_current_focus + message_params.step
	"select",      // Select current item or item with supplied index if message_params.pos
	"unselect",    // Unselect current item or item with supplied index if message_params.pos
];
Behave3d.controllerList.prototype.events         = [
	"update",        // Triggered on message "update"; event_params = return object of setChildTargets()
	"reset",         // Triggered on message "reset"
	"focus",         // Triggered on changing focus (messages "focus_xxx") event_params = {focused: focused_item_index, step: size_of_focus_change}
	"select",        // Triggered on changing selection (messages "select"/"unselect"); event_params = {selected: selected_item_index or [array of indexes]}
	"first_reached", // Triggered on focusing the first item
	"last_reached",  // Triggered on focusing the last item
	"border_left",   // Triggered on the first or last item losing focus
	"no_prev",       // Triggered on trying to focus index < 0
	"no_next",       // Triggered on trying to focus after last item
];
Behave3d.controllerList.prototype.default_params = {
	items           : "children", // Where to take the items from; possible values: "children"
	circular        : true,       // Is the items list circular when navigating in it
	select_multiple : false,      // If true, then this.selected = [selected_index, ...] else this.selected = single_selected_index or -1 (if no item is selected)
};



//---------------------------------------
// Controller's methods

Behave3d.controllerList.prototype.construct = function(params, stage)
{
	if (stage == "params") {
		this.focused  = -1;
		this.selected = -1;
	}
};

//---------------------------------------
Behave3d.controllerList.prototype.destruct = function() { };

//---------------------------------------
Behave3d.controllerList.prototype.message = function(message, message_params)
{
	if (this.handleCommonMessage(message, message_params)) return this;	
	message_params = this.setMessageParams(message, message_params);
	
	if (message == "update") {
		var update_results = this.setItems();

		this.fireEvent("update", update_results);
		
		if (this.focused == -1)
			this.message("reset");
		
		if (!this.circular) {
			if (this.focused == 0)
				this.fireEvent("first_reached");
			else if (this.focused == this.targets.length - 1)
				this.fireEvent("last_reached");
		}
		
		return this;
	}
	else if (message == "reset") {
		this.focused  = (!this.targets || this.targets.length == 0 ? -1 : 0);
		this.selected = (this.select_multiple ? [] : -1);
		this.fireEvent("reset");
		return this;
	}
	else if (message.substr(0, 6) == "focus_") {
		var new_focus = this.focused;
		var step      = 0;
		
		if (this.targets.length == 0)      new_focus = -1;
		else if (message == "focus_pos")   new_focus = message_params.pos;
		else if (message == "focus_first") new_focus = 0;
		else if (message == "focus_last")  new_focus = this.targets.length - 1;
		else if (message == "focus_next")  step = 1;
		else if (message == "focus_prev")  step = -1;
		else if (message == "focus_step")  step = message_params.step;
		
		if (step != 0) {
			if (this.circular)
				new_focus = (new_focus + step + this.targets.length) % this.targets.length;
			else if (new_focus + step >= this.targets.length)
				this.fireEvent("no_next");
			else if (new_focus + step < 0)
				this.fireEvent("no_prev");
			else
				new_focus += step;
		}
		
		if (new_focus != this.focused && this.targets[new_focus]) {
			var old_focus = this.focused;
			this.focused = new_focus;
			this.fireEvent("focus", {focused: this.focused, step: step});
			
			if (!this.circular) {
				if (old_focus == 0 || old_focus == this.targets.length - 1)
					this.fireEvent("border_left");
				
				if (this.focused == 0)
					this.fireEvent("first_reached");
				else if (this.focused == this.targets.length - 1)
					this.fireEvent("last_reached");
			}
		}
		
		return this;
	}
	else if (message == "select" || message == "unselect") {
		var item_to_select  = (message_params.pos !== undefined ? message_params.pos : this.focused);
		var pos_in_selected = (this.select_multiple ? this.selected.indexOf(item_to_select) : (this.selected == item_to_select ? 0 : -1));
		
		if (item_to_select >= 0 && item_to_select < this.targets.length) {
			if (message == "select" && pos_in_selected == -1) {
				if (this.select_multiple)
					this.selected.push(item_to_select);
				else
					this.selected = item_to_select;
			}
			else if (message == "unselect" && pos_in_selected != -1) {
				if (this.select_multiple)
					this.selected.splice(pos_in_selected);
				else
					this.selected = -1;
			}
			this.fireEvent("select", {selected: this.selected});
		}
	}
	
	return this;
};

//---------------------------------------
// Sets all children of this HTML element as targets, i.e. items in the carousel
// Positions the elements in the center of the carousel
Behave3d.controllerList.prototype.setItems = function()
{
	var update_results;
	var focused_item = (this.focused != -1 ? this.targets[this.focused] : null);
	
	if (this.items == "children")
		update_results = this.setChildTargets();
	else
		Behave3d.debugExit("Behave3d.controllerList.setItems() cannot handle this.items = '" + this.items + "'");
	
	if (this.focused >= this.targets.length)
		this.focused = this.targets.length - 1;
	else if (this.focused < 0)
		this.focused = (this.targets.length > 0 ? 0 : -1);
	else if (this.targets[this.focused] !== focused_item) {
		var new_focused = this.targets.indexOf(focused_item);
		
		if (new_focused >= 0)
			this.focused = new_focused;
		else if (this.focused >= this.targets.length)
			this.focused = this.targets.length - 1;
		else if (this.focused < 0)
			this.focused = (this.targets.length > 0 ? 0 : -1);		
		else {
			// Try to find the closest to the old focused element
			new_focused = this.focused;
			
			for (var i = 0; i < update_results.removed.length; i++) {
				var removed_block = update_results.removed[i];
				
				new_focused -= removed_block.last_pos - removed_block.first_pos + 1;
				if (this.focused >= removed_block.first_pos &&
					this.focused <= removed_block.last_pos) {
					new_focused += removed_block.last_pos - this.focused;
					break;
				}
			}
			
			for (var i = 0; i < update_results.inserted.length; i++) {
				var inserted_block  = update_results.inserted[i];
				
				if (inserted_block.first_pos <= new_focused)
					new_focused += inserted_block.first_pos - inserted_block.last_pos + 1;
			}
			
			this.focused = new_focused;
		}
	}
	
	return update_results;
}

Behave3d.registerController("list", Behave3d.controllerList);


// ------------- EOF --------------



