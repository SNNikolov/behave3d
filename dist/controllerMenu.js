//------------------------------------------------------------------------------------------------------------------------
//
//         behave3d - Dynamic 3D behavior of HTML elements
//
//------------------------------------------------------------------------------------------------------------------------
"use strict";

//---------------------------------------
// CONTROLLER: menu

Behave3d.controllerMenu = function (params) {
	Behave3d.Controller.call(this, params);
};

Behave3d.controllerMenu.prototype = Object.create(Behave3d.Controller.prototype);

//---------------------------------------
// Controller's message types, event types, parameters

Behave3d.controllerMenu.prototype.requires = { controllers: [] };

Behave3d.controllerMenu.prototype.messages = ["show", // Show the menu
"show_immediately", // Show the menu without transitions
"hide", // Hide the menu
"hide_immediately", // Hide the menu without transitions
"button_clicked"];
Behave3d.controllerMenu.prototype.events = ["focus", // Triggered on the menu receiving focus
"blur", // Triggered on the menu losing focus
"mousein", // Triggered on the pointing device entering the menu
"mouseout", // Triggered on the pointing device leaving the menu
"button_clicked", // Triggered on clicking the button opening the menu
"item_clicked", // Triggered on clicking a menu item; event params = {pos: index_of_selected_item, item: reference_to_DOM_element}
"inner_item_clicked"];
Behave3d.controllerMenu.prototype.default_params = {
	parent_menu: null, // Reference to parent menu controller
	show_button: null, // Reference to HTML element which opens this menu upon clicking
	collapse_subs: true, // If true, then all-submenus will be ordered to hide upon hiding of this one
	hide_on_blur: true, // If true, then the menu will hide when focus is lost
	align: "rltt", // Alignment of menu relative to its show button; see Behave3d.controllerMenu.prototype.alignMenu
	submenus_align: "same", // Value of 'align' that will be applied onto submenus upon their creation; "same" for same value as this.align
	highlight_class: "", // Style class to be applied on active menu items
	for_each_item: "", // Name of or reference to a callback function to be called for each item of this menu and its submenus; callback(parent_menu, item_index, item_link, sub_menu), where parent_menu = this menu, item_index = index of item within menu, item_link = reference to first child of item's HTML element, this = item's HTML element, sub_menu = reference to submenu controller if this item opens a submenu
	for_each_menu: "" };

Behave3d.controllerMenu.prototype.highlight_class_attribute = "highlight_class";

//---------------------------------------
// Controller's methods

Behave3d.controllerMenu.prototype.construct = function (params, stage) {
	if (stage == "params") {
		this.menu_shown = true;
		this.pointer_is_in_menu = false;
		this.show_operation_id = 1;
		this.mouse_operation_id = 1;
		this.active_event_listeners = [];
		this.top_menu = this.parent_menu ? this.parent_menu.top_menu : this;
		this.submenus = [];
		this.menu_items = [];

		this.createMenuStructure(this, null);
	} else if (stage == "events") {
		this.setEventHandlers();
	} else if (stage == "messages") {}
};

//---------------------------------------
Behave3d.controllerMenu.prototype.destruct = function () {
	for (var i = 0; i < this.active_event_listeners.length; i++) {
		var listener = this.active_event_listeners[i];
		if (listener.condition) listener.element.removeEventListener(listener.type, listener.handle, listener.useCapture);
	}
};

//---------------------------------------
Behave3d.controllerMenu.prototype.message = function (message, message_params) {
	if (this.handleCommonMessage(message, message_params)) return this;
	message_params = this.setMessageParams(message, message_params);

	if (message == "update") {} else if (message == "reset") {} else if ((message == "show" || message == "show_immediately") && !this.menu_shown) {
		if (message_params.show_op_id !== undefined) if (this.show_operation_id != message_params.show_op_id) return; // Skip if there have been other show/hide operations meanwhile

		this.menu_shown = true;

		// Start transition or change display style if no transition
		if (this.owner.actions_controller.fireEvent(message) == 0) if (this.display_style) this.owner.element.style.display = this.display_style;

		// Focus menu for accesibility
		this.owner.element.focus();
		this.owner.element.style.pointerEvents = "auto";

		// Align menu relative to its show button
		this.alignMenu(this.show_button, this.align);

		// Change style of show button
		this.applyShowButtonStyle();

		this.show_operation_id++;
	} else if ((message == "hide" || message == "hide_immediately") && this.menu_shown) {
		if (message_params.show_op_id !== undefined) if (this.show_operation_id != message_params.show_op_id) return; // Skip if there have been other show/hide operations meanwhile

		if (message_params.mouse_op_id !== undefined) if (this.mouse_operation_id != message_params.mouse_op_id) return; // Skip if there have been other mouse operations meanwhile

		// Remember display style of menu element
		var element_display_style = this.owner.element.style.display || window.getComputedStyle(this.owner.element, null).getPropertyValue("display");
		this.display_style = element_display_style == "none" ? "block" : element_display_style;

		this.menu_shown = false;

		// Make menu transparent to clicks (pointer events)
		this.owner.element.style.pointerEvents = "none";

		// Hide sub-menus
		if (this.collapse_subs) for (var i = 0; i < this.submenus.length; i++) {
			this.submenus[i].message(message);
		} // Start transition or change display style if no transition
		if (this.owner.actions_controller.fireEvent(message) == 0) this.owner.element.style.display = "none";

		// Change style of show button
		this.applyShowButtonStyle();

		this.show_operation_id++;
	} else if (message == "button_clicked") {
		this.fireEvent("button_clicked");
		this.message(this.menu_shown ? "hide" : "show");
	}

	return this;
};

//---------------------------------------
Behave3d.controllerMenu.prototype.update = function () {};

//---------------------------------------
// Creates all needed controllers on this element and its children (menu items, sub-menus and their items)
Behave3d.controllerMenu.prototype.createMenuStructure = function (menu_controller, parent_menu) {
	this.for_each_item = Behave3d.getFunctionByName(this.for_each_item);
	this.for_each_menu = Behave3d.getFunctionByName(this.for_each_menu);

	if (this.for_each_menu) this.for_each_menu.bind(this)();

	this.submenus = [];
	this.menu_items = [];
	var item_index = 0;

	for (var child_index = 0; child_index < menu_controller.owner.element.childNodes.length; child_index++) {
		var child = menu_controller.owner.element.childNodes[child_index];

		if (child.nodeType != Node.ELEMENT_NODE) continue;

		var first_node = null;
		var submenu = null;

		for (var i = 0; i < child.childNodes.length; i++) {
			var child_node = child.childNodes[i];

			if (child_node.nodeType != Node.ELEMENT_NODE) continue;

			if (!first_node) {
				first_node = child_node;
				this.menu_items.push(first_node);
			} else {
				submenu = Behave3d(child_node).addController(Behave3d.controllerMenu, {
					id: this.id,
					parent_menu: menu_controller,
					show_button: first_node,
					align: this.submenus_align == "same" ? this.align : this.submenus_align,
					for_each_item: this.for_each_item,
					for_each_menu: this.for_each_menu
				});
				this.submenus.push(submenu);
				break;
			}
		}

		if (this.for_each_item) this.for_each_item.call(child, this, item_index, first_node, submenu);

		item_index++;
	}
};

//---------------------------------------
// Sets event handlers linking this carousel to its list's events
Behave3d.controllerMenu.prototype.setEventHandlers = function () {
	// Make element focusable
	this.owner.element.tabIndex = -1;

	// Set callbacks on all menu items that fire the "item_clicked" and "inner_item_clicked" events
	var sub_start = 0;
	for (var i = 0; i < this.menu_items.length; i++) {
		var menu_item = this.menu_items[i];
		var item_is_submenu_button = false;

		for (var sub_i = sub_start; sub_i < this.submenus.length; sub_i++) {
			if (this.submenus[sub_i].show_button === menu_item) {
				item_is_submenu_button = true;
				sub_start = sub_i + 1;
				break;
			}
		}if (!item_is_submenu_button) (function (menu_item, i) {
			menu_item.addEventListener("click", function (event) {
				this.fireEvent("item_clicked", { pos: i, item: menu_item });

				var parent_menu = this;
				while (parent_menu) {
					parent_menu.fireEvent("inner_item_clicked", { menu: this, pos: i, item: menu_item });
					parent_menu = parent_menu.parent_menu;
				}
			}.bind(this), true);
		}).call(this, menu_item, i);
	}

	// Set callback on menu's "show button" that sends the "button_clicked" message to the menu (which opens the menu)
	// Note: the callback calls the click's preventDefault()
	if (this.show_button) {
		this.show_button = this.owner.getDOMElement(this.show_button);
		this.show_button.addEventListener("click", function (event) {
			this.message("button_clicked");
			event.stopPropagation();
			event.preventDefault();
		}.bind(this), true);
	}

	// Delegate all focus/click events to the top menu
	if (!this.parent_menu) {
		var focus_handler = this.focusEventListener.bind(this);

		this.active_event_listeners = [{ element: document, type: "mouseover", handle: focus_handler, useCapture: true, condition: true },
		//{element: this.owner.element, type: "mouseover", handle: focus_handler, useCapture: false, condition: true},
		//{element: this.owner.element, type: "mouseout",  handle: focus_handler, useCapture: false, condition: true},
		//{element: this.owner.element, type: "focusin",   handle: focus_handler, useCapture: false, condition: true},
		//{element: this.owner.element, type: "focusout",  handle: focus_handler, useCapture: false, condition: true},
		//{element: this.owner.element, type: "focus",     handle: focus_handler, useCapture: true, condition: true},
		//{element: this.owner.element, type: "blur",      handle: focus_handler, useCapture: true, condition: true},
		{ element: document, type: "focus", handle: focus_handler, useCapture: true, condition: true }, { element: document, type: "click", handle: focus_handler, useCapture: true, condition: true }];

		for (var i = 0; i < this.active_event_listeners.length; i++) {
			var listener = this.active_event_listeners[i];
			if (listener.condition) listener.element.addEventListener(listener.type, listener.handle, listener.useCapture);
		}
	}
};

//---------------------------------------
// Hides/shows this menu based on where the user clicks & focuses
// is_delegated is true for sub-menus which receive their events from the top menu
Behave3d.controllerMenu.prototype.focusEventListener = function (event, is_delegated) {
	var activated_element = null;
	var notify_submenus = true;

	if (event.type == "mouseover") {
		var mouse_is_in = this.isElementPartOfMenu(event.target);

		if (mouse_is_in && !this.pointer_is_in_menu) {
			this.mouse_operation_id++;
			this.pointer_is_in_menu = true;
			this.fireEvent("mousein", {
				mouse_op_id: this.mouse_operation_id,
				show_op_id: this.show_operation_id
			});
		} else if (!mouse_is_in && this.pointer_is_in_menu) {
			this.mouse_operation_id++;
			this.pointer_is_in_menu = false;
			this.fireEvent("mouseout", {
				mouse_op_id: this.mouse_operation_id,
				show_op_id: this.show_operation_id
			});
		}
	} else if (event.type == "click") activated_element = event.target;else if (event.type == "focus") activated_element = document.activeElement;

	if (false && !is_delegated) console.log("--- event ---- " + this.debugName() + " - type = " + event.type + " - " + (activated_element ? " -- activated_element = " + activated_element + "#" + activated_element.id : "") + ",   menu_is_focused = " + menu_is_focused + ",  target = " + event.target + "#" + event.target.id);

	if (activated_element) {
		if (activated_element === this.show_button) return;

		var menu_is_focused = this.isElementPartOfMenu(activated_element);

		// Capture focusing/clicking on an iframe
		if (menu_is_focused) menu_is_focused = !(document.activeElement && document.activeElement.tagName == 'IFRAME');

		if (menu_is_focused && !this.menu_shown) {
			this.fireEvent("focus", { show_op_id: this.show_operation_id });
			this.message("show");
		} else if (!menu_is_focused && this.menu_shown) {
			this.fireEvent("blur", { show_op_id: this.show_operation_id });
			if (this.hide_on_blur) this.message("hide");
		}
	}

	if (notify_submenus) for (var i = 0; i < this.submenus.length; i++) {
		this.submenus[i].focusEventListener(event, true);
	}
};

//---------------------------------------
// Returns true if the supplied HTML element is a child of this menu, or is the HTML element of this menu
Behave3d.controllerMenu.prototype.isElementPartOfMenu = function (element) {
	return element == this.owner.element || this.owner.element.contains(element);
};

//---------------------------------------
// Positions the menu relative to the supplied HTML element (align_to_element)
// Format of align_type: "hhvv", where h can be l/m/r, and v can be t/m/b
Behave3d.controllerMenu.prototype.applyShowButtonStyle = function () {
	if (!this.show_button) return;

	var highlight_class = this.show_button.getAttribute(this.highlight_class_attribute);

	if (!highlight_class && this.parent_menu) highlight_class = this.parent_menu.highlight_class;

	if (!highlight_class && this.parent_menu && this.parent_menu.owner.element.hasAttribute(this.highlight_class_attribute)) highlight_class = this.parent_menu.owner.element.getAttribute(this.highlight_class_attribute);

	if (!highlight_class) return;

	if (this.menu_shown) this.show_button.classList.add(highlight_class);else this.show_button.classList.remove(highlight_class);
};

//---------------------------------------
// Positions the menu relative to the supplied HTML element (align_to_element)
// Format of align_type: "none" / "hhvv", where h can be l/c/r, and v can be t/m/b
Behave3d.controllerMenu.prototype.alignMenu = function (align_to_element, align_type) {
	if (align_type == "" || align_type == "none" || !align_to_element) return false;

	if (align_type.length != 4) Behave3d.debugExit(this.debugName() + " is assigned invalid param 'align' = " + align_type);

	var halign = align_type.substr(0, 2);
	var valign = align_type.substr(2, 2);
	var hf = { l: 0, c: 0.5, r: 1 };
	var vf = { t: 0, m: 0.5, b: 1 };
	var rect_a = align_to_element.getBoundingClientRect();
	//var rect_b = this.owner.element.getBoundingClientRect();
	var rect_p = this.owner.element.parentNode.getBoundingClientRect();

	//this.owner.element.style.position = "absolute";

	var pos_x = rect_a.left;
	pos_x += (rect_a.right - rect_a.left) * hf[halign[0]];
	pos_x -= this.owner.element.clientWidth * hf[halign[1]];
	pos_x -= rect_p.left;

	var pos_y = rect_a.top;
	pos_y += (rect_a.bottom - rect_a.top) * vf[valign[0]];
	pos_y -= this.owner.element.clientHeight * vf[valign[1]];
	pos_y -= rect_p.top;

	this.owner.element.style.left = Math.round(pos_x) + "px";
	this.owner.element.style.top = Math.round(pos_y) + "px";

	return true;
};

Behave3d.registerController("menu", Behave3d.controllerMenu);

// ------------- EOF --------------