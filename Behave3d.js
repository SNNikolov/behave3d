//------------------------------------------------------------------------------------------------------------------------
//
//         behave3d - Dynamic 3D behavior of HTML elements
//
//------------------------------------------------------------------------------------------------------------------------
"use strict";

function Behave3d(selector, auto_create_behave3d)
{
	if (auto_create_behave3d === undefined) auto_create_behave3d = true;
	return Behave3d.selector(selector, auto_create_behave3d);
}

Behave3d.controllers = {}; // Contains the definitions (constructors) of all registered controller types
Behave3d.params      = {}; // Contains functionality for reading parameters from strings/objects/arrays
Behave3d.ui          = {}; // Add-ons for UI elements

//---------------------------------------
Behave3d.consts = {
	VERSION            : 0.81,
	FRAME_RATE         : 60, // Engine fps used with setTimeout-measuring of framerate
	PHYSICS_FRAME_RATE : 600, // FPS for physics engine, where PHYSICS_FRAME_RATE/FRAME_RATE subframes are calculated each frame
	GRAVITY_CONSTANT   : 400, // Gravity strength in pixel scale
	BEHAVE3D_ATTRIB    : "behave3d", // Attribute of HTML elements that contains behave3d instructions
	BEHAVE3D_PROPERTY  : "behave3d", // Name of property of HTML elements where a Behave3d.Element is instantiated
	
	FRAME_TIMER_TYPE           : "st", // "st" = setTimeout() / "raf" = requestAnimationFrame
	SHORTTERM_FRAME_DURATION_M : 0.2,   // Short-term frame duration is counted as shortterm_frame_duration = new_frame_duration * SHORTTERM_FRAME_DURATION_M + shortterm_frame_duration * (1 - SHORTTERM_FRAME_DURATION_M)
	LONGTTERM_FRAME_DURATION_M : 0.01,  // Long-term frame rate is counted as longterm_frame_duration = new_frame_duration * LONGTTERM_FRAME_DURATION_M + longterm_frame_duration * (1 - LONGTTERM_FRAME_DURATION_M)
	MAX_SUBFRAMES_PER_FRAME    : 1,     // How many frames at most to run per 1 drawing frame in order to compensate slowness of the previous drawing frame; set to 1 and no compensations will be performed
	SUBFRAMES_PRECISION        : 0.2,   // Since measurement of frame time is inprecise, make adding subframes more conservative by requiring bigger lag; Number of subframes = Math.round(frame_duration / longterm_frame_duration - SUBFRAMES_PRECISION)
	
	ROTATE_UNIT        : "deg", // units used in rotate transforms
	ROTATE_ONE_TURN    : 360, // units of rotation for 1 turn
	RADIANS_TO_UNITS   : 360 / (2 * Math.PI), // multiply radians to this to get an angle in rotation units; radians are used by Math lib methods
	
	// The following precisions (i.e. digits behind .) are used in rounding the params supplied to css transforms, so that less redraws are required
	PRECISION_TRANSLATE    : 1, // Precision of the coordinates in translate transformations
	PRECISION_ROTATE       : 3, // Precision of the x, y and z components of rotation vector in rotate transformations
	PRECISION_ROTATE_ANGLE : 1, // Precision of the angle in rotate transformations
	PRECISION_SCALE        : 3, // Precision of the scaling multipliers in scale transformations
	PRECISION_OPACITY      : 2, // Precision of the opacity in opacity transformations

	CSS_TRANSFORMS_PREFIX  : "", // CSS prefix (camelCase w/o dashes) to be used for transform, transformStyle and transformOrigin

	DEBUG                  : !true,  // Set to true to activate debug checks and to see debug messages in console
	DEBUG_STATS_CONTAINER  : "",    // Supply a HTML element's ID (when Behave3d.consts.DEBUG) to have this element's innerHTML filled with debug statistics printed every frame
};

// Override constants with properties of object window.behave3dConstants
if (window.behave3dConstants)
	for(window.behave3dConstants.i in window.behave3dConstants)
		Behave3d.consts[window.behave3dConstants.i] = window.behave3dConstants[window.behave3dConstants.i];


// Transforms accepted by Behave3d.Element.applyTransforms()
Behave3d.transforms = {
	translate: { dx: 0,   dy: 0,   dz: 0 },        // translate, in pixels
	scale:     { sx: 1,   sy: 1,   sz: 1 },        // scale, multiplier of original scale 1
	rotate:    { rx: 0,   ry: 0,   rz: 0, ra: 0 }, // rotate, ra - in Behave3d.consts.ROTATE_UNIT, rx, ry and rz - normalized, [0 - 1]
	origin:    { ox: 0.5, oy: 0.5, oz: 0 },        // transform-origin (ox and oy in parts of size[0 - 1], oz in px)
	opacity:   { opacity: 1 },                     // opacity, [0 - 1]
	flatten:   { flatten: true },                  // If flatten is true, then the element's transform-style will be flat, preserve-3d otherwise
};


//---------------------------------------
Behave3d.vars = {
	engineIsPaused           : false, // If engine is paused, no controllers are updated and no transforms are applied
	frameDuration            : 1000 / Behave3d.consts.FRAME_RATE, // Engine update interval in ms
	frameTimerType           : "",    // Is set to Behave3d.consts.FRAME_TIMER_TYPE, and falls back from "raf" to "st" if requestAnimationFrame() is not supported
	frameTimerID             : null,  // Id for setTimeout(), which is used for frame rate
	sceneParams              : {},    // List of current scene's params (see Behave3d.controllerActions.default_params)
	elementsPool             : [],    // Pool of all HTML elements that have behave3d functionality
	elementsToRemove         : [],    // Elements to remove from the pool at the end of the frame
	sceneContainer           : null,  // Reference to the DOM node that contains the scene, it has the scene controller assigned
	sceneController          : null,  // Reference to the scene controller, which is assigned to the scene container
	uniqueIDCounter          : 0,     // Counter for generating unique IDs for controller instances
	delayedInits             : false, // A flag telling behave3d.Element.addController() whether to skip params with events and messages, so that they can be executed later when all elements have been created
	unitRem                  : 1,     // Size in pixels of the layout unit "rem"
	cssPropTransform         : "transform", // Used style property names (+ eventual prefixes)
	cssPropTransformStyle    : "transformStyle",
	cssPropTransformOrigin   : "transformOrigin",
	cssPropPerspective       : "perspective",
	cssPropPerspectiveOrigin : "perspectiveOrigin",
	lastFrameTimestamp       : 0,     // Timestamp of previous engine frame
	lastFrameSubframes       : 1,     // Number of frames actually processed on last engine frame in order to compensate framerate drop
	longTermFrameDuration    : 0,     // Average frame duration integrated with Behave3d.consts.LONGTERM_FRAME_DURATION_M
	shortTermFrameDuration   : 0,     // Average frame duration integrated with Behave3d.consts.SHORTTERM_FRAME_DURATION_M
	mousePosX                : 0,     // Current X position of mouse
	mousePosY                : 0,     // Current Y position of mouse
	debugInfo                : {}     // When debug is enabled, the engine will gather statistics here
};



//---------------------------------------
// behave3d methods:
//
// Behave3d(dom_element_or_id, auto_create_behave3d)
//
// Behave3d.registerController(title, constructor)
// Behave3d.startEngine()
// Behave3d.stopEngine()
// Behave3d.pauseEngine(is_paused)
// Behave3d.isEnginePaused()
// Behave3d.calculateUnits()
// Behave3d.setCSSPrefixes(transforms_prefix)
// Behave3d.runThisFrame()
// Behave3d.updatePool(skip_removal, behave3d_attribute)
// Behave3d.setScene(scene_params, scene_controller)
// Behave3d.updateViewport()
//
// Behave3d.selector(dom_element_or_id, create_behave3d)
// Behave3d.doDelayedInits()
// Behave3d.getDOMElement(element_or_id)
// Behave3d.getElementPos(element, get_center, without_transforms, relative_to_viewport)
// Behave3d.getAngle(pos1, pos2)
// Behave3d.getFunctionByName(function_name)
// Behave3d.getAccForDisplacement(displacement, time_step)
// Behave3d.getAccForSpeed(speed, time_step)
// Behave3d.ease(value_to_ease, ease_type, ease_amount, total_frames, current_frame, value_type)
// Behave3d.isAnglePassed(angle_to_pass, angle, prev_angle, cycle_len)
//
// Behave3d.debugOut(line_to_print)
// Behave3d.debugExit(line_to_print)
//
//---------------------------------------
// Behave3d.params.parseItemsString(items_with_params_str, return_as_named_properties)
// Behave3d.params.parseParamsString(params_str, return_as_named_properties)
// Behave3d.params.getParamsAsArray(params_object)
// Behave3d.params.getParamsAsObject(params_array)
// Behave3d.params.getItemsAsArray(items_object)
// Behave3d.params.getParam(params_array, param_name, do_remove)
// Behave3d.params.extendObject(params_object, new_params, only_existing)
// Behave3d.params.isNumber(value, only_integers)
// Behave3d.params.getLength(value, axis, dom_element, allow_non_lengths)
//
//---------------------------------------
// Behave3d.Element(element, add_to_pool, behave3d_attribute)
// Behave3d.Element.prototype.addToPool()
// Behave3d.Element.prototype.configureDOMParents()
// Behave3d.Element.prototype.removeFromPool()
// Behave3d.Element.prototype.updateControllers()
// Behave3d.Element.prototype.addController(controller_or_title, controller_params)
// Behave3d.Element.prototype.removeController(controller)
// Behave3d.Element.prototype.removeAllControllers()
// Behave3d.Element.prototype.add(controllers_defs, return_references)
// Behave3d.Element.prototype.getDOMElement(element_or_id, return_behave3d)
// Behave3d.Element.prototype.getControllerIndex(controller_instance)
// Behave3d.Element.prototype.getController(controller_id, get_index)
// Behave3d.Element.prototype.forEachController(each_own, each_parent, each_descendant, callback_function)
// Behave3d.Element.prototype.message(message, message_params, message_scope)
// Behave3d.Element.prototype.show(immediately)
// Behave3d.Element.prototype.hide(immediately)
// Behave3d.Element.prototype.addTransform(transform)
// Behave3d.Element.prototype.cleanTransforms()
// Behave3d.Element.prototype.applyTransforms()
// Behave3d.Element.prototype.calcPhysics(add_to_transforms, time_step)
// Behave3d.Element.prototype.getAccForSuddenStop(time_step)
// Behave3d.Element.prototype.fireEvent(event_type, event_params, event_scope)
// Behave3d.Element.prototype.makeChildOfScene()
// Behave3d.Element.prototype.debugName()
//
//---------------------------------------
// Behave3d.Controller(params, enable_physics)
// Behave3d.Controller.prototype.setParam(param_name, new_val, mode)
// Behave3d.Controller.prototype.set(new_params, mode)
// Behave3d.Controller.prototype.message(message, message_params)
// Behave3d.Controller.prototype.handleCommonMessage(message, message_params)
// Behave3d.Controller.prototype.on(event_to_wait_for, handler_function_or_message)
// Behave3d.Controller.prototype.off(event, handler_function)
// Behave3d.Controller.prototype.addEventHandler(event, handler_function)
// Behave3d.Controller.prototype.removeEventHandler(event, handler_function)
// Behave3d.Controller.prototype.fireEvent(event_type, event_params, event_scope)
// Behave3d.Controller.prototype.relayEvents(controller_to_relay_to, events_map)
// Behave3d.Controller.prototype.registerActions(actions_target, event_handling_list)
// Behave3d.Controller.prototype.setSubcontrollersEvents(sub_controllers)
// Behave3d.Controller.prototype.paramsHaveChanged(dont_clear_flag)
// Behave3d.Controller.prototype.getComputedLengths(x_params, y_params, z_params, allow_non_lengths)
// Behave3d.Controller.prototype.getAnotherController(controller_id)
// Behave3d.Controller.prototype.getTarget(target_index)
// Behave3d.Controller.prototype.makeTargetsDom3d(add_to_pool)
// Behave3d.Controller.prototype.setChildTargets(number_limit, add_to_pool)
// Behave3d.Controller.prototype.addTransform(transform, target_index)
// Behave3d.Controller.prototype.applySpringForce(attractor_pos, force_multiplier, max_len, target_index)
// Behave3d.Controller.prototype.applyGravityForce(attractor_pos, force_multiplier, scale_multiplier, target_index)
// Behave3d.Controller.prototype.applySpeedDamping(damping_factor, target_index)
// Behave3d.Controller.prototype.getPathPos(controllers)
// Behave3d.Controller.prototype.debugName()
//
//---------------------------------------
// Behave3d.StepEngine(vars, is_circular, events_controller, options)
// Behave3d.StepEngine.prototype.stop()
// Behave3d.StepEngine.prototype.getVar(var_name, without_lag)
// Behave3d.StepEngine.prototype.setVar(var_name, value, keep_lag)
// Behave3d.StepEngine.prototype.setMovement(movement, duration, is_new_movement)
// Behave3d.StepEngine.prototype.isMoving()
// Behave3d.StepEngine.prototype.start(movement_direction, from_beginning, is_new_movement, movement, duration)
// Behave3d.StepEngine.prototype.update(is_paused)
//
//
//---------------------------------------



//------------------------------------------------------------------------------------------------------------------------
// behave3d METHODS
//------------------------------------------------------------------------------------------------------------------------

//---------------------------------------
// Initializes the engine and starts the 60fps updating of the empty pool (no scanning of the DOM is performed)
// Can be called before the DOM is ready, but then the called Behave3d.calculateUnits() will not be able to measure "rem", etc.
Behave3d.startEngine = function()
{
	// Init behave3d elements pool
	Behave3d.vars.elementsPool = [];
	
	// Start frame timer
	Behave3d.vars.frameTimerType = Behave3d.consts.FRAME_TIMER_TYPE;
	if (Behave3d.vars.frameTimerType == "raf" && !window.requestAnimationFrame) {
		Behave3d.debugOut("startEngine() falls back to setTimeout() because requestAnimationFrame() is not supported");
		Behave3d.vars.frameTimerType = "st";
	}
	Behave3d.vars.frameTimerID = (Behave3d.vars.frameTimerType == "raf") ? 
				window.requestAnimationFrame(Behave3d.runThisFrame) :
				window.setTimeout(Behave3d.runThisFrame, Behave3d.vars.frameDuration);
	Behave3d.vars.engineIsPaused = false;
	
	Behave3d.calculateUnits();
	Behave3d.setCSSPrefixes(Behave3d.consts.CSS_TRANSFORMS_PREFIX);
	
	document.addEventListener("mousemove", Behave3d.mouseEventListener, true);
	document.addEventListener("touchmove", Behave3d.mouseEventListener, true);
};

//---------------------------------------
// Stops the 60fps update cycle
Behave3d.stopEngine = function()
{
	if (Behave3d.var.frameTimerType == "raf") {
		if (window.cancelAnimationFrame)
			window.cancelAnimationFrame(Behave3d.vars.frameTimerID);
	}
	else	
		window.clearTimeout(Behave3d.vars.frameTimerID);
};

//---------------------------------------
// @returns {Boolean} True if the engine is currently paused, false otherwise
Behave3d.isEnginePaused = function()
{
	return Behave3d.vars.engineIsPaused;
};

//---------------------------------------
// Pauses the engine, temporarily stopping the update cycle
// @param {Boolean} [is_paused] If not supplied, will make the engine toggle its state (go to running if paused, pause otherwise)
Behave3d.pauseEngine = function(is_paused)
{
	if (is_paused === undefined) is_paused = !Behave3d.vars.engineIsPaused;
	
	Behave3d.vars.engineIsPaused = is_paused;
	
	Behave3d.debugOut("behave3d engine is "+(is_paused ? "" : "un")+"paused");
};

//---------------------------------------
// Calculate sizes of units used in coordinate parameters, caches results in working vars
// Note that this method must be called after document.body is created
Behave3d.calculateUnits = function()
{
	if (!document.body) return; // Cannot create dummy elements to measure sizes
	
	var tempDiv = document.createElement('div');
	tempDiv.style.boxSizing = "border-box";
    tempDiv.style.width = '1000rem';
	
    document.body.appendChild(tempDiv);
	Behave3d.vars.unitRem = tempDiv.offsetWidth / 1000;
	document.body.removeChild(tempDiv);
};

//---------------------------------------
// Set what prefix to be used for CSS properties. Prefixes are supplied in camelCase without dashes.
// @param {String} transforms_prefix Gives the prefix to be used for transform, transformStyle, transformOrigin, perspective and perspectiveOrigin
Behave3d.setCSSPrefixes = function(transforms_prefix)
{
	function getPrefixed(prop_name, prefix) {
		return (prefix == "" ? prop_name : prefix + prop_name.substr(0, 1).toUpperCase() + prop_name.substr(1));
	}

	Behave3d.vars.cssPropTransform         = getPrefixed("transform" , transforms_prefix);
	Behave3d.vars.cssPropTransformStyle    = getPrefixed("transformStyle" , transforms_prefix);
	Behave3d.vars.cssPropTransformOrigin   = getPrefixed("transformOrigin" , transforms_prefix);
	Behave3d.vars.cssPropPerspective       = getPrefixed("perspective" , transforms_prefix);
	Behave3d.vars.cssPropPerspectiveOrigin = getPrefixed("perspectiveOrigin" , transforms_prefix);
};

//---------------------------------------
// Supply new values of some scene parameters and update scene container node's CSS properties perspective and perspective-origin
// @param {Object|Array} scene_params An object {param_name: value, ...} or array [[param_name, value], ...] containing the new values of parameters
// @param {Behave3d.Controller} scene_controller Reference to the scene() controller
Behave3d.setScene = function(scene_params, scene_controller)
{
	if (Array.isArray(scene_params))
		scene_params = Behave3d.params.getParamsAsObject(scene_params);

	Behave3d.vars.sceneParams     = Behave3d.params.extendObject(Behave3d.vars.sceneParams, scene_params);	
	Behave3d.vars.sceneController = scene_controller;
	Behave3d.vars.sceneContainer  = scene_controller.owner.element;

	Behave3d.vars.sceneParams.perspective = Behave3d.params.getLength(Behave3d.vars.sceneParams.perspective, "Z", Behave3d.vars.sceneContainer, false);

	// Apply scene parameters on HTML elements
	Behave3d.vars.sceneContainer.style[Behave3d.vars.cssPropPerspective]       = Behave3d.vars.sceneParams.perspective + "px";
	Behave3d.vars.sceneContainer.style[Behave3d.vars.cssPropPerspectiveOrigin] = Behave3d.vars.sceneParams.perspective_origin_x + "% " + Behave3d.vars.sceneParams.perspective_origin_y + "%";	
};

//---------------------------------------
// A shortcut to the scene controller's method updateViewport() which sets the scene container's perspective-origin to the center of the browser's viewport
// This method is automatically called upon window scrolling and resizing, but should be called manually upon resizing of the scene container
Behave3d.updateViewport = function()
{
	if (Behave3d.vars.sceneController)
		Behave3d.vars.sceneController.updateViewport();
};

//----------------------------------------------------------
// This handler updates Behave3d's variables containing the mouse/touch coordinates
Behave3d.mouseEventListener = function(e)
{
	if (e.type == "mousemove") {
		Behave3d.vars.mousePosX = e.pageX;
		Behave3d.vars.mousePosY = e.pageY;
	}
	else if (e.type == "touchmove") {
		Behave3d.vars.mousePosX = e.changedTouches[0].pageX;
		Behave3d.vars.mousePosY = e.changedTouches[0].pageY;
	}
};

//---------------------------------------
// Registers controller type for usage: adds its constructor to Behave3d.controllers
// @param {String} title Name(alias) of controller
// @param {Behave3d.Controller} constructor Class constructor that is a descendant of Behave3d.Controller
// @returns {Boolean} False if this controller has already been registered
Behave3d.registerController = function(title, constructor)
{
	if (Behave3d.controllers[title])
		Behave3d.debugOut("Controller with title '" + title + "' is registered again! Mind your references");
	
	if (constructor.prototype.requires) {
		if (constructor.prototype.requires.controllers) {
			var missing = [];
			for (var i = 0; i < constructor.prototype.requires.controllers.length; i++) {
				var controller_name = constructor.prototype.requires.controllers[i];
				if (!Behave3d[controller_name])
					missing.push(controller_name);
			}

			if (missing.length > 0)
				Behave3d.debugExit("behave3d controller '" + title + "' requires the following controllers: " + missing.join(", "));
		}
	}
	
	Behave3d.controllers[title] = constructor;
	constructor.prototype.title = title;
};

//---------------------------------------
// Query the scene container node for elements with 'behave3d' attribute and updates Behave3d.vars.elementsPool
// @param {Boolean} skip_removal If false, the current pool will be checked for elements deleted from the DOM tree and the found ones will be removed form the pool
// @param {String} [behave3d_attribute] Supply an overriding attribute name in behave3d_attribute (default is Behave3d.consts.BEHAVE3D_ATTRIB) or supply behave3d_attribute = "" for no search of new DOM nodes
Behave3d.updatePool = function(skip_removal, behave3d_attribute)
{
	if (behave3d_attribute === undefined)
		behave3d_attribute = Behave3d.consts.BEHAVE3D_ATTRIB;
	
	Behave3d.debugOut("Engine - updating pool...");

	var pool = Behave3d.vars.elementsPool;
	var all_behave3d_elements = document.querySelectorAll("["+behave3d_attribute+"]");

	// Remove obsolete entries
	for (var i = pool.length - 1; i >= 0; i--)
		if (pool[i].style && !document.contains(pool[i])) {
			// Element has been removed from DOM tree
			Behave3d.debugOut(pool[i][Behave3d.consts.BEHAVE3D_PROPERTY].debugName() + " is removed from pool");
			pool.splice(i, 1);
		}
		
	Behave3d.vars.delayedInits = [];

	// Add new entries
	for (var i = 0; i < all_behave3d_elements.length; i++)
		if (!all_behave3d_elements[i][Behave3d.consts.BEHAVE3D_PROPERTY])
			new Behave3d.Element(all_behave3d_elements[i], true, behave3d_attribute);
		
	Behave3d.doDelayedInits();

	// document.body is the default scene container, if no element with "scene" controller was found
	if (!Behave3d.vars.sceneContainer)
		Behave3d(document.body).add("scene");
};

//---------------------------------------
// Returns a reference to a HTML element's behave3d element or any of its controllers
// @param {HTMLElement|jQuery.m|String} dom_element_or_id Reference to an HTML element, jQuery object, or a string "<DOM id>" or "<DOM id> <controller id>"
// @param {Boolean} create_behave3d If true, then creates behave3d element if such is not present on the supplied HTML element
// @returns {Behave3d.Element|Behave3d.Controller|false} Reference to the found behave3d element/controller, or false if the selector fails 
Behave3d.selector = function(dom_element_or_id, create_behave3d)
{
	if (create_behave3d === undefined) create_behave3d = false;
	
	var selector_parts, return_controller_id = "";
	
	if (window.jQuery &&
		dom_element_or_id instanceof jQuery)
		dom_element_or_id = dom_element_or_id[0];
	else if (typeof dom_element_or_id == "string" &&
		(selector_parts = dom_element_or_id.split(" ")).length == 2) {
		dom_element_or_id    = selector_parts[0];
		return_controller_id = selector_parts[1];
	}
	else if (Array.isArray(dom_element_or_id)) {
		return_controller_id = dom_element_or_id[1];
		dom_element_or_id    = dom_element_or_id[0];		
	}
	
	var element = Behave3d.getDOMElement(dom_element_or_id);
	if (!element) return false;
	
	// Return controller
	if (return_controller_id != "") {
		if (!element[Behave3d.consts.BEHAVE3D_PROPERTY])
			Behave3d.debugExit("Cannot find controller '" + return_controller_id + "' in element " + dom_element_or_id + " - supplied element doesn't have Behave3d.Element");
		return element[Behave3d.consts.BEHAVE3D_PROPERTY].getController(return_controller_id)
			|| Behave3d.debugExit("Cannot find controller '" + return_controller_id + "' in element " + dom_element_or_id);
	}
	// Or return behave3d.Element
	else {	
		if (element[Behave3d.consts.BEHAVE3D_PROPERTY]) return element[Behave3d.consts.BEHAVE3D_PROPERTY];
		if (!create_behave3d)
			Behave3d.debugExit("Element " + dom_element_or_id + " doesn't have Behave3d.Element");
	
		return new Behave3d.Element(element);
	}
};

//---------------------------------------
// Perform initializations of controllers (adding of event listeners and sending of messages) delayed for after creation of all elements
Behave3d.doDelayedInits = function()
{
	if (!Behave3d.vars.delayedInits) return;
	
	["events", "messages"].forEach(function(mode) {
		for (var i = 0; i < Behave3d.vars.delayedInits.length; i++) {
			var delayed_inits = Behave3d.vars.delayedInits[i];
			
			if (delayed_inits.controller.construct)
				delayed_inits.controller.construct(delayed_inits.params, mode);
			delayed_inits.controller.set(delayed_inits.params, mode);
		}
	});
		
	Behave3d.vars.delayedInits = false;
};

//---------------------------------------
// Main function of the engine called every frame; updates all behave3d elements and controllers
Behave3d.runThisFrame = function()
{
	if (Behave3d.vars.engineIsPaused) return;
	
	//console.log("----------------- Entering frame " + (Behave3d.vars.frame_counter++ || 0));
	
	// Count framerate
	var frame_timestamp = Date.now();
	var frame_duration  = 0;
	var subframes_count = 1;
	
	if (Behave3d.vars.lastFrameTimestamp) {
		frame_duration = (frame_timestamp - Behave3d.vars.lastFrameTimestamp) / Behave3d.vars.lastFrameSubframes;
		
		if (!Behave3d.vars.shortTermFrameDuration) {
			Behave3d.vars.longTermFrameDuration = Behave3d.vars.shortTermFrameDuration = frame_duration;
		}
		else if (frame_duration / Behave3d.vars.shortTermFrameDuration <= 4) {
			Behave3d.vars.longTermFrameDuration  = frame_duration * Behave3d.consts.LONGTTERM_FRAME_DURATION_M + Behave3d.vars.longTermFrameDuration * (1 - Behave3d.consts.LONGTTERM_FRAME_DURATION_M);
			Behave3d.vars.shortTermFrameDuration = frame_duration * Behave3d.consts.SHORTTERM_FRAME_DURATION_M + Behave3d.vars.shortTermFrameDuration * (1 - Behave3d.consts.SHORTTERM_FRAME_DURATION_M);
		}
		
		subframes_count = Math.round(frame_duration / Behave3d.vars.longTermFrameDuration - Behave3d.consts.SUBFRAMES_PRECISION);
		subframes_count = Math.max(1, Math.min(Behave3d.consts.MAX_SUBFRAMES_PER_FRAME, subframes_count));
		
		if (subframes_count > 1) Behave3d.debugOut("Engine runs " + subframes_count + " frames at once - last frame's duration = " + frame_duration.toFixed(1) + "ms, average = " + Behave3d.vars.longTermFrameDuration.toFixed(1) + "ms");
	}
	
	Behave3d.vars.lastFrameTimestamp = frame_timestamp;
	Behave3d.vars.lastFrameSubframes = subframes_count;
	
	do {
		if (Behave3d.consts.DEBUG) {
			Behave3d.vars.debugInfo.count_behave3d_elements    = 0;
			Behave3d.vars.debugInfo.count_transformed_elements = 0;
			Behave3d.vars.debugInfo.count_translations         = 0;
			Behave3d.vars.debugInfo.count_rotations            = 0;
			Behave3d.vars.debugInfo.count_scalings             = 0;
			Behave3d.vars.debugInfo.count_origins              = 0;
			Behave3d.vars.debugInfo.count_opacities            = 0;
		}
		
		Behave3d.vars.elementsToRemove = [];

		// Clean transforms queues
		for (var i = 0; i < Behave3d.vars.elementsPool.length; i++)
			Behave3d.vars.elementsPool[i][Behave3d.consts.BEHAVE3D_PROPERTY].cleanTransforms();
		
		// Update each HTML element in the pool
		for (var i = 0; i < Behave3d.vars.elementsPool.length; i++)
			Behave3d.vars.elementsPool[i][Behave3d.consts.BEHAVE3D_PROPERTY].updateControllers();
		
		// Apply queued transforms
		for (var i = 0; i < Behave3d.vars.elementsPool.length; i++) {
			Behave3d.vars.elementsPool[i][Behave3d.consts.BEHAVE3D_PROPERTY].calcPhysics(true);
			
			//if (subframes_count == 1) // Apply the transforms only on the last subframe
				Behave3d.vars.elementsPool[i][Behave3d.consts.BEHAVE3D_PROPERTY].applyTransforms();
		}
		
		// Remove scheduled elements from pool
		for (var i = 0; i < Behave3d.vars.elementsToRemove.length; i++)
			Behave3d.vars.elementsPool.splice(Behave3d.vars.elementsPool.indexOf(Behave3d.vars.elementsToRemove[i]), 1);
	}
	while (--subframes_count > 0);
	
	// Schedule next frame
	Behave3d.vars.frameTimerID = (Behave3d.vars.frameTimerType == "raf") ? 
				window.requestAnimationFrame(Behave3d.runThisFrame) :
				window.setTimeout(Behave3d.runThisFrame, Behave3d.vars.frameDuration);
	
	// Show debug info
	if (Behave3d.consts.DEBUG &&
		Behave3d.consts.DEBUG_STATS_CONTAINER)
	{
		if (!Behave3d.vars.debug_box_ref) {
			Behave3d.vars.debug_box_ref = document.getElementById(Behave3d.consts.DEBUG_STATS_CONTAINER);
		
			if (Behave3d.vars.debug_box_ref)
				Behave3d.vars.debug_box_ref.style.visibility = "visible";
		}
		
		if (Behave3d.vars.debug_box_ref)
			Behave3d.vars.debug_box_ref.innerHTML = 
				"elements: "           + Behave3d.vars.debugInfo.count_behave3d_elements + "<br/>" +
				"transformed: "        + Behave3d.vars.debugInfo.count_transformed_elements + "<br/>" +
				"translations: "       + Behave3d.vars.debugInfo.count_translations + "<br/>" +
				"rotations: "          + Behave3d.vars.debugInfo.count_rotations + "<br/>" +
				"scalings: "           + Behave3d.vars.debugInfo.count_scalings + "<br/>" +
				"origins: "            + Behave3d.vars.debugInfo.count_origins + "<br/>" +
				"opacities: "          + Behave3d.vars.debugInfo.count_opacities + "<br/>" +
				"frame duration: "     + frame_duration.toFixed(1) + "<br/>" +
				"framerate long-term:  " + Behave3d.vars.longTermFrameDuration.toFixed(1) + "<br/>" +
				"framerate short-term: " + Behave3d.vars.shortTermFrameDuration.toFixed(1);
			else Behave3d.debugExit("!");
	}
};

//---------------------------------------
// Parses strings in the format "item_name(param: value, ...) | item2_name..." and returns an array containing the parsed items & params
// @param {String} items_with_params_str String to parse, format: "item_name(param1, param2: value, ...) | item2_name | ..."
// @param {Boolean} return_as_named_properties If true, then returns object in the format {
//      item_name  : {param1: true, param2: value, ...},
//      item2_name : {}
// }
// @returns {Array|Object} Array in the format [
//      {title: item_name, params: [["param1", true], ["param2", value], ...]},
//      {title: item2_name, params: []}, ...
// ]
// No regExes, pure cycle power
// ToDo: validations
Behave3d.params.parseItemsString = function(items_with_params_str, return_as_named_properties)
{
	if (return_as_named_properties === undefined) return_as_named_properties = false;

	var items   = return_as_named_properties ? {} : [];
	
	if (items_with_params_str.trim() == "") return items;	
	items_with_params_str = items_with_params_str.split("|");
	
	// For every item
	for (var item_i = 0; item_i < items_with_params_str.length; item_i++) {
		var item_str    = items_with_params_str[item_i].trim();
		var item_title  = item_str;
		var item_params = return_as_named_properties ? {} : [];
		
		// If item has parameters: item(parameters)
		if (item_str.trim().substr(-1) == ")") {
			var bracket_pos = item_str.indexOf("(");
			if (bracket_pos != -1) {
				item_title       = item_str.substr(0, bracket_pos).trim();
				item_params      = Behave3d.params.parseParamsString(item_str.substring(bracket_pos + 1, item_str.length - 1), return_as_named_properties);
			}
		}
		
		// Add current item to list
		if (return_as_named_properties)
			items[item_title] = item_params;
		else
			items.push({
				title  : item_title,
				params : item_params
			});
	}
	
	return items;
};

//---------------------------------------
// Parses strings in the format "param1, param2: value, ..." and returns an array containing the parsed params
// @param {String} params_str String to parse, format: "param1, param2: value, ..."
// @param {Boolean} return_as_named_properties If true, then returns object in the format {param1: true, param2: value, ...}
// @returns {Array|Object} Array in the format [["param1", true], ["param2", value], ...]
// No regExes, pure cycle power
// ToDo: validations
Behave3d.params.parseParamsString = function(params_str, return_as_named_properties)
{
	var item_params_strs = params_str.split(",");
	var item_params      = return_as_named_properties ? {} : [];

	// For every parameter
	for (var param_i = 0; param_i < item_params_strs.length; param_i++) {
		var param_str  = item_params_strs[param_i].trim();
		var param_name = param_str;
		var param_val  = true;
		
		if (param_name == "") continue;
		
		var param_name_delim_pos = item_params_strs[param_i].indexOf(":");
		
		// If parameter has value, param_name: param_value
		if (param_name_delim_pos != -1) {
			param_name = item_params_strs[param_i].substr(0, param_name_delim_pos).trim();
			param_val  = item_params_strs[param_i].substr(param_name_delim_pos + 1).trim();
			
			if (Behave3d.params.isNumber(param_val)) param_val = Number(param_val);
			else if (param_val.toLowerCase() == "true") param_val = true;
			else if (param_val.toLowerCase() == "false") param_val = false;
		}
		
		if (return_as_named_properties)
			item_params[param_name] = param_val;
		else
			item_params.push([param_name, param_val]);
	}
	
	return item_params;
};

//---------------------------------------
// Takes an object containing property-value pairs and returns an array containing these pairs
// @param {Object} params_object Object containing property-value pairs: {param1: true, param2: value, ...}
// @returns {Array} Array in the format: [["param1", true], ["param2", value], ...]
Behave3d.params.getParamsAsArray = function(params_object)
{
	var result_array = [];
	for (var param_name in params_object)
		result_array.push([param_name, params_object[param_name]]);
	
	return result_array;
};

//---------------------------------------
// Takes an array containing property-value pairs and returns an object containing these pairs
// @param {Array} params_array Array in the format: [["param1", true], ["param2", value], ...]
// @returns {Object} Object containing property-value pairs: {param1: true, param2: value, ...}
Behave3d.params.getParamsAsObject = function(params_array)
{
	var result_object = {};
	for (var i = 0; i < params_array.length; i++)
		result_object[params_array[i][0]] = params_array[i][1];
	
	return result_object;
};

//---------------------------------------
// Takes an object containing items and their properties and returns an array containing these items & properties
// @param {Object} items_object Object in the following format: {
//      item_name  : {param1: true, param2: value, ...},
//      item2_name : {}
// }
// @returns {Array} Array in the format: [
//      {title: item_name, params: [["param1", true], ["param2", value], ...}},
//      {title: item2_name, params: []}, ...
// ]
Behave3d.params.getItemsAsArray = function(items_object)
{
	var result_array = [];
	
	for (var item_name in items_object)
		result_array.push({
			title:  item_name,
			params: Behave3d.params.getParamsAsArray(items_object[item_name])
		});
	
	return result_array;
};

//---------------------------------------
// Finds and returns a param from a params array, and removes it from the array if do_remove is true
// Notice that when several params with the same name exist, the method will return(+remove) only the first occurance
// @param {Array} params_array Array in format: [[param_name, value], ...]
// @param {String} param_name Name of param to look for
// @param {Boolean} do_remove If true, the found param will be removed from the array
// @returns {Number|String} Param value or undefined if no param with the supplied param_name is found in the params array
Behave3d.params.getParam = function(params_array, param_name, do_remove)
{
	if (do_remove === undefined) do_remove = false;
	
	for (var i = 0; i < params_array.length; i++)
		if (params_array[i][0] == param_name) {
			var param_val = params_array[i][1];
			
			if (do_remove)
				params_array.splice(i, 1);
			
			return param_val;
		}
	
	return undefined;
};

//---------------------------------------
// Returns an extended version of object with params, where new params are added and existing params overwritten
// @param {Object} params_object Object containing property-value pairs: {param_name: value, ...}
// @param {Object} new_params Another object containing property-value pairs: {param_name: value, new_param_name: value, ...}
// @param {Boolean} only_existing If true, only the already-existing params will be overwritten and no new params will be added
// @returns {Object} Object containing property-value pairs: {param_name: value, new_param_name: value, ...}
Behave3d.params.extendObject = function(params_object, new_params, only_existing)
{
	if (only_existing === undefined) only_existing = false;
	
	var result_object = {};
	
	for (var param_name in params_object)
		result_object[param_name] = params_object[param_name];
	
	for (var param_name in new_params)
		if (!only_existing || result_object.hasOwnProperty(param_name))
			result_object[param_name] = new_params[param_name];
	
	return result_object;
};

//---------------------------------------
// Checks if the supplied value is a number (or string containing a number)
// @param value Value to evaluate
// @param {Boolean} only_integers If true, then the check will return positive only if the value contains an integer
// @returns {Boolean} True if the supplied value is a number, false otherwise
Behave3d.params.isNumber = function(value, only_integers)
{
	return Number(only_integers ? parseInt(value) : parseFloat(value)) == value;
};

//---------------------------------------
// Returns the value in pixels of the supplied string representing length/distance
// @param {String|Number} value The value to evaluate
// @param {String} axis Can be "X" / "Y" / "Z" and tells what are we measuring (width, height or depth)
// @param {HTMLElement} dom_element A reference to a DOM element whose lengths/percentages are calculated
// @param {Boolean|Array} allow_non_lengths If true, then the value is allowed to contain any string; can also be an array containing all allowed non-length string values
// @returns {Number} Number of pixels
//
// Supported formats of value:
//    <number>    - number without dimensions is value in pixels
//    <number>o   - same as above
//    <number>p   - coordinate relative to parent element's origin; result is relative to dom_element (reads dom_element's position via offsets)
//    <number>d   - coordinate relative to document's origin; result is relative to dom_element (reads dom_element's position via offsets) if such is supplied
//    <number>v   - coordinate relative to viewport's origin; result is relative to dom_element (reads dom_element's position via offsets) if such is supplied
//    <number>rem - value in CSS rem units
//    <number>%   - percentage of parent's width/height, or percentige of scene's perspective property (i.e. the distance between the camera and the layout plane z=0) when axis == "z"
//    <number>%p  - percentage of parent's width/height
//    <number>%o  - percentage of own width/height
//    <number>%d  - percentage of document's width/height
//    <number>%v  - percentage of viewport's width/height
//    <number>%Z  - forces returning of depth value (overrides value of axis)
//    <number><any of above>X - an 'X' in the end of the string forces returning of horizontal value (overrides value of axis)
//    <number><any of above>Y - an 'Y' in the end of the string forces returning of vertical value (overrides value of axis)
Behave3d.params.getLength = function(value, axis, dom_element, allow_non_lengths)
{
	if (Behave3d.params.isNumber(value)) return Number(value);
	
	var invalid_notification = "Invalid length parameter '" + value + "' - ";
	if (typeof value != "string") Behave3d.debugExit(invalid_notification + "not a string, nor number");
	
	if (allow_non_lengths && Array.isArray(allow_non_lengths) && allow_non_lengths.indexOf(value) >= 0)
		return value;
	
	var total       = 100,
		zero        = 0,
		suffix_len  = 2,
		value_last1 = value.substr(-1);		
	
	if (value_last1 == "X" || value_last1 == "Y" || value_last1 == "Z") {
		axis        = value_last1;
		value       = value.substr(0, value.length - 1);
		value_last1 = value.substr(-1);
	}
	else if (!axis)
		Behave3d.debugExit(invalid_notification + "no axis");
	
	var value_last2 = value.substr(-2),
		value_last3 = value.substr(-3);
	
	if (value_last3 == "rem") {
		suffix_len = 3;
		total      = Behave3d.vars.unitRem * 100;
	}
	else if (value_last1 == "%") {
		suffix_len = 1;
		total      = (axis == "X") ? dom_element.parentNode.clientWidth :
						(axis == "Y") ? dom_element.parentNode.clientHeight :
							Behave3d.vars.sceneParams.perspective;
	}
	else if (value_last2 == "%p")
		total = (axis == "Y") ? dom_element.parentNode.clientHeight : dom_element.parentNode.clientWidth;
	else if (value_last2 == "%o")
		total = (axis == "Y") ? dom_element.clientHeight : dom_element.clientWidth;
	else if (value_last2 == "%d")
		total = (axis == "Y") ? document.documentElement.clientHeight : document.documentElement.clientWidth;
	else if (value_last2 == "%v")
		total = (axis == "Y") ? window.top.innerHeight : window.top.innerWidth;
	else if (value_last1 == "o") {
		// Nothing to do
		suffix_len = 1;
	}
	else if (value_last1 == "p") {
		suffix_len = 1;
		zero       = -(axis == "Y" ? dom_element.offsetTop : dom_element.offsetLeft);
	}
	else if (value_last1 == "d") {
		suffix_len = 1;
		if (dom_element)
			zero = -Behave3d.getElementPos(dom_element, false, true)[axis.toLowerCase()];
	}
	else if (value_last1 == "v") {
		suffix_len = 1;
		zero       = (dom_element) ?
					-Behave3d.getElementPos(dom_element, false, true, true)[axis.toLowerCase()] :
					(axis == "Y" ? window.pageYOffset : window.pageXOffset);
	}
	else if (allow_non_lengths && !Array.isArray(allow_non_lengths))
		return value;
	else
		Behave3d.debugExit(invalid_notification + "unknown format");
	
	var number = zero + Number(value.substr(0, value.length - suffix_len));
	
	if (!Behave3d.params.isNumber(number))
		Behave3d.debugExit(invalid_notification + "not a number");

	return (number * total / 100);
};

//---------------------------------------
// Returns a reference to the element supplied either by id or reference
// @param {HTMLElement|String} element_or_id Reference to a DOM element, or string containing a DOM id
// @returns {HTMLElement} Reference to a DOM element
Behave3d.getDOMElement = function(element_or_id)
{
	var element = (typeof element_or_id == "string") ?
		document.getElementById(element_or_id) : element_or_id;
	
	if (!element)
		Behave3d.debugExit("Cannot find HTML element '"+element_or_id+"'");
	else if (!element.nodeName && !(element instanceof Window) &&  !(element instanceof Document))
		Behave3d.debugExit("HTML element expected, another object type received");
	
	return element;	
};

//---------------------------------------
// Returns the current coordinates of an HTML element as {x: x_coordinate, y: y_coordinate, z: z_coordinate}
// @param {HTMLElement|String} element Can be a reference to a DOM element, a DOM id, or "@mouse"
// @param {Boolean} get_center If false (default), then the zero(i.e. top-left corner) coordinates of the element will be returned
// @param {Boolean} without_transforms If false (default), then coordinates are aquired via getBoundingClientRect(), otherwise - via adding offsets
// @param {Boolean} relative_to_viewport If true, then the returned position is relative to the browser viewport
// @returns {Object} An object {x: x_coordinate, y: y_coordinate, z: z_coordinate}, or false if the element is not found
Behave3d.getElementPos = function(element, get_center, without_transforms, relative_to_viewport)
{
	if (get_center === undefined) get_center = false;
	
	if (element === "@mouse")
		return {
			x: Behave3d.vars.mousePosX - (relative_to_viewport ? window.pageXOffset : 0),
			y: Behave3d.vars.mousePosY - (relative_to_viewport ? window.pageYOffset : 0),
			z: 0
		};
		
	if (!(element = Behave3d.getDOMElement(element))) return false;
	
	var element_pos = {x: 0, y: 0, z: 0};
	
	if (without_transforms) {
		var w = element.offsetWidth,
			h = element.offsetHeight;
		var element2  = element;
		
		do {
			element_pos.x += element.offsetLeft - element.scrollLeft;
			element_pos.y += element.offsetTop - element.scrollTop;
			
			element  = element.offsetParent;
			element2 = element2.parentNode;
			
			while (element2 != element) {
				element_pos.x -= element2.scrollLeft;
				element_pos.y -= element2.scrollTop;
				element2 = element2.parentNode;
			}			
		}
		while(element.offsetParent);
		
		if (relative_to_viewport) {
			element_pos.x -= window.pageXOffset;
			element_pos.y -= window.pageYOffset;
		}
		
		if (get_center) {
			element_pos.x += w / 2;
			element_pos.y += h / 2;
		}
	}
	else {
		var bounding_rect = element.getBoundingClientRect();
		element_pos.x = bounding_rect.left;
		element_pos.y = bounding_rect.top;
		
		if (!relative_to_viewport) {
			element_pos.x += window.pageXOffset;
			element_pos.y += window.pageYOffset;
		}
		
		if (get_center) {
			element_pos.x += bounding_rect.width / 2;
			element_pos.y += bounding_rect.height / 2;
		}
	}
	
	return element_pos;
};

//---------------------------------------
// Returns the angle formed by the vector from pos1 to pos2 and the X coordinate axis in the 2D space
// @param {Object} pos1 Object with format {x: x_coordinate, y: y_coordinate} 
// @param {Object} pos2 Object with format {x: x_coordinate, y: y_coordinate}
// @returns {Number} The angle in units Behave3d.consts.ROTATE_UNIT (default is degrees)
Behave3d.getAngle = function(pos1, pos2)
{
	var dx = pos2.x - pos1.x;
	var dy = pos2.y - pos1.y;

	var angle = Math.atan2(dy, dx) * Behave3d.consts.RADIANS_TO_UNITS;
	if (angle < 0) angle += Behave3d.consts.ROTATE_ONE_TURN;
	
	return angle;
};

//---------------------------------------
// Returns a function with a supplied name or null if no such function is found
// @param {Function|String} function_name Can be a simple "function_name" or namespaced "ns1.ns2.function_name" where window is the root
// @returns {Function} The found function or null
Behave3d.getFunctionByName = function(function_name)
{
	if (typeof function_name == "function") return function_name; // parameter is already a function
	if (!function_name) return null;
	
	var namespaces = function_name.split(".");
    var func       = namespaces.pop();
	var context    = window;
    
	for (var i = 0; i < namespaces.length; i++)
		if (!context[namespaces[i]])
			return null;
        else
			context = context[namespaces[i]];

    return (typeof context[func] == "function" ? context[func] : null);
};

//---------------------------------------
// Returns acceleration {x, y, z} needed to be applied for 1 engine frame in order for an element to be moved to relative point (displacement)
// @param {Object} displacement An object of format {x: displacement_x, y: displacement_y, z: displacement_z}, where the units are pixels
// @param {Number} [time_step] Optionally supply the time_step (i.e. the frame duration) in seconds
// @returns {Object} An object {x: acc_x, y: acc_y, z: acc_z}
Behave3d.getAccForDisplacement = function(displacement, time_step)
{
	if (time_step === undefined) time_step = 1 / Behave3d.consts.FRAME_RATE;
	
	var acc_factor  = time_step * time_step / 2;
	return {
		x: displacement.x / acc_factor,
		y: displacement.y / acc_factor,
		z: displacement.z / acc_factor,
	};
};

//---------------------------------------
// Returns acceleration {x, y, z} needed to be applied for 1 engine frame in order for an element to gain the required speed
// @param {Object} speed An object of format {x: speed_x, y: speed_y, z: speed_z}, where the units are pixels
// @param {Number} [time_step] Optionally supply the time_step (i.e. the frame duration) in seconds
// @returns {Object} An object {x: acc_x, y: acc_y, z: acc_z}
Behave3d.getAccForSpeed = function(speed, time_step)
{
	if (time_step === undefined) time_step = 1 / Behave3d.consts.FRAME_RATE;

	return {
		x: speed.x / time_step,
		y: speed.y / time_step,
		z: speed.z / time_step,
	};
};

//---------------------------------------
// Returns true if the supplied angle_to_pass is just passed by angle (where prev_angle was the previous value of angle)
// @param {Number} angle_to_pass The angle that is checked if passed
// @param {Number} angle Current value of the moving "angle"
// @param {Number} prev_angle Previous value of the moving "angle" 
// @param {Number} cycle_len Value in the same angle units showing how much is a complete cycle (360*)
// @returns {Boolean} True if angle_to_pass has just been passed, false otherwise 
Behave3d.isAnglePassed = function(angle_to_pass, angle, prev_angle, cycle_len)
{
	var diff      = (angle - angle_to_pass) % cycle_len;
	var diff_prev = (prev_angle - angle_to_pass) % cycle_len;
	
	if ((angle - prev_angle) * diff < 0) return false;
	
	if (diff >= 0 && (diff_prev < 0 || diff_prev > diff)) return true;
	if (diff <= 0 && (diff_prev > 0 || diff_prev < diff)) return true;
		
	return false;
};

//---------------------------------------
// Returns a value supplied each frame "enveloped" in a shape depending on ease_type
// @param {Number} value_to_ease Value to envelope
// @param {String} ease_type Can be "ease" / "ease_in" / "ease_out" or "linear" for no easing
// @param {Number} ease_amount A number between 0 (no easing) and 1 (strong easing); values > 1 are also possible
// @param {Number} total_frames Total number of frames of the eased animation
// @param {Number} current_frame Index of the current frame within the eased animation
// @param {String} value_type Can be
//     "step"    - supplied value is the average step for the movement; returns an enveloped step
//     "total"   - supplied value is the total amount of movement; returns the current amount of movement (on this frame)
//     "current" - supplied value is the current value (on this frame) of a variable; this value is simply enveloped
// @returns {Number} Enveloped value 
Behave3d.ease = function(value_to_ease, ease_type, ease_amount, total_frames, current_frame, value_type)
{
	function get_ease_factor(ease_pos, ease_type)
	{
		switch(ease_type) {
			case "ease"     : return 0.5 - 0.5 * Math.cos(Math.PI * ease_pos);
			case "ease_in"  : return 1 - Math.cos(0.5 * Math.PI * ease_pos);
			case "ease_out" : return -Math.cos(0.5 * Math.PI * (1 + ease_pos));
			default: Behave3d.debugExit("Unknown ease type '" + ease_type + "' supplied to Behave3d.ease()");
		}
	}
	
	if (value_type === undefined) value_type = "total";
	
	if (total_frames == 0)     return value_to_ease;
	if (value_to_ease == 0)    return value_to_ease;
	
	if (ease_type == "linear" || ease_amount == 0)
		return (value_type == "total") ?
			value_to_ease * (current_frame + 1) / total_frames :
			value_to_ease;
	
	var ease_pos    = (current_frame + 1) / total_frames;
	var ease_factor = get_ease_factor(ease_pos, ease_type);
	
	if (value_type == "current")
		return value_to_ease * (1 + (ease_factor - 1) * ease_amount); 
	
	var cache_label = total_frames + ease_type;
	var steps_list;
		
	if (!Behave3d.ease.steps_cache) Behave3d.ease.steps_cache = {};
	
	if (!(steps_list = Behave3d.ease.steps_cache[cache_label])) {
		// Calculate step of ease_factor on each frame and counts the sum of these steps over all total_frames
		// Cache the results
		steps_list            = { steps: [], sums: [] };
		var counter           = 0;
		var prev_ease_factor  = get_ease_factor(0, ease_type);
		
		for (var i = 0; i < total_frames; i++) {
			var step         = get_ease_factor((i + 1) / total_frames, ease_type) - prev_ease_factor;
			prev_ease_factor = prev_ease_factor + step;
			
			counter += step;
			
			steps_list.steps.push(step);
			steps_list.sums.push(counter);
		}
		steps_list.steps.push(counter);

		Behave3d.ease.steps_cache[cache_label] = steps_list;
	}
	
	if (value_type == "step") {
		var value_to_ease_sum = value_to_ease * total_frames;
		var step              = value_to_ease_sum * steps_list.steps[current_frame] / steps_list.steps[total_frames];
		
		return value_to_ease * (1 + (step / value_to_ease - 1) * ease_amount);
	}
	else // value_type == "total"
	 {
		var current_pos = value_to_ease * steps_list.sums[current_frame] / steps_list.steps[total_frames];
		var uneased_pos = value_to_ease * ease_pos;
		
		return uneased_pos * (1 + (current_pos / uneased_pos - 1) * ease_amount);
	}
};

//---------------------------------------
Behave3d.ease.easeTypes = [ "linear", "ease", "ease_in", "ease_out" ];
Behave3d.ease.mirrorMap = {
	linear   : "linear",
	ease     : "ease",
	ease_in  : "ease_out",
	ease_out : "ease_in"
};


//---------------------------------------
// Wrapper for the debug console
Behave3d.debugOut = function(line_to_print)
{
	if (Behave3d.consts.DEBUG) console.log("behave3d:  " + line_to_print);
};

//---------------------------------------
// Wrapper for halting on error
Behave3d.debugExit = function(line_to_print)
{
	throw "behave3d:  " + line_to_print;
};








//------------------------------------------------------------------------------------------------------------------------
// Behave3d.Element
//------------------------------------------------------------------------------------------------------------------------
// A behave3d element contains all behave3d functionality (inc. all controllers) for the DOM element it is attached to 
// This constructor instantiates a behave3d element and attaches to the supplied DOM element
// @param {HTMLElement|String} element Reference to a DOM element, or a string containing its id
// @param {Boolean} [add_to_pool] Whether the element should be added to the behave3d pool (default: true)
// @param {String} [behave3d_attribute] Name of DOM attribute contaning the controller definitions for the element
Behave3d.Element = function(element, add_to_pool, behave3d_attribute)
{
	if (add_to_pool        === undefined) add_to_pool        = true;
	if (behave3d_attribute === undefined) behave3d_attribute = Behave3d.consts.BEHAVE3D_ATTRIB;
	
	if (!(element = Behave3d.getDOMElement(element))) return false;
	
	element[Behave3d.consts.BEHAVE3D_PROPERTY] = this;
	
	this.element            = element; // Keep a short-cut reference to the HTML element here
	this.is_pooled          = false;
	this.controllers        = [];
	this.transforms         = [];
	this.last_transform_str = ""; // Transforms that were last applied onto the element
	this.last_origin_str    = ""; // Transform-origin that was last applied onto the element
	this.last_style_str     = ""; // Transform-style that was last applied onto the element
	this.last_opacity_str   = ""; // Opacity that was last applied onto the element
	this.pos                = {x: 0, y: 0, z: 0};
	this.velocity           = {x: 0, y: 0, z: 0};
	this.acc                = {x: 0, y: 0, z: 0};
	this.physics_enabled    = false;
	
	if (add_to_pool)
		this.addToPool();
	
	// Create default actions controller
	this.actions_controller = this.addController(Behave3d.controllerActions, {id: "a"});
	
	// Add controllers with definitions from DOM attribute
	if (element.getAttribute && behave3d_attribute)
		this.add(element.getAttribute(behave3d_attribute));
	
	this.configureDOMParents();
}
;
//---------------------------------------
Behave3d.Element.required_core_controllers = ["actions", "scene"];

//---------------------------------------
Behave3d.Element.prototype = {};

//---------------------------------------
// Configure all DOM parents up to the scene node, preparing perspective, etc.
// @returns {Behave3d.Element} Returns this for method chaining
Behave3d.Element.prototype.configureDOMParents = function()
{
	var parent = this.element;
	while (parent = parent.parentNode) {
		if (parent === Behave3d.vars.sceneContainer ||
			parent === document.body ||
			!parent.style) break;
		
		if (!parent.style[Behave3d.vars.cssPropTransformStyle])
			parent.style[Behave3d.vars.cssPropTransformStyle] = "preserve-3d";
	}

	return this;
};

//---------------------------------------
// Add this element to behave3d's pool of elements
// @returns {Behave3d.Element} Returns this for method chaining
Behave3d.Element.prototype.addToPool = function()
{
	Behave3d.debugOut("Element - add to pool: " + this.debugName());
	
	if (Behave3d.vars.elementsPool.indexOf(this.element) >= 0) {
		Behave3d.debugOut("Skipped adding element to pool because its already there: " + this.debugName());
		return this;
	}
	
	// Add element to pool
	Behave3d.vars.elementsPool.push(this.element);
	this.is_pooled = true;

	return this;
};

//---------------------------------------
// Remove element from behave3d's pool of elements
// @returns {Behave3d.Element} Returns this for method chaining
Behave3d.Element.prototype.removeFromPool = function()
{
	Behave3d.debugOut("Element - remove from pool: "+this.debugName());
	
	var index_in_pool = Behave3d.vars.elementsPool.indexOf(this.element);
	if (index_in_pool < 0 || !this.is_pooled)
		Behave3d.debugExit(this.debugName() + ".removeFromPool() fails because element is not in the pool");
	
	// Remove all controllers from element
	this.removeAllControllers();

	// Remove element from pool
	Behave3d.vars.elementsToRemove.push(this.element);
	this.is_pooled = false;
	
	return this;
};

//---------------------------------------
// Attaches the specified controllers to this element
// @param {String|Array} controllers_defs A string with controllers definitions, for ex. "rotate(y: 1, turn_time: 1500) | back_surface()"
//                                        or array [{title: "rotate", params: {y: 1, turn_time: 1500}}, {title: "back_surface", params: {}}]
// @param {Boolean} return_references If true, then an array of references to the added controllers will be returned; otherwise, this is returned
// @returns {Behave3d.Element|Array} Returns this for chain methods, or if return_references, returns an array with references to the added controllers
Behave3d.Element.prototype.add = function(controllers_defs, return_references)
{
	if (!controllers_defs)
		return (return_references ? [] : this);
	
	var defs_array = (typeof controllers_defs == "string") ? Behave3d.params.parseItemsString(controllers_defs) : controllers_defs;
	if (!defs_array) Behave3d.debugExit("Error in controllers definition for " + this.debugName() + ": '" + controllers_defs + "'");
	
	var do_events_and_messages = (Behave3d.vars.delayedInits === false);
	Behave3d.vars.delayedInits = Behave3d.vars.delayedInits || [];
	
	var references = [];

	// Add controllers to element
	for (var ci = 0; ci < defs_array.length; ci++) {
		var added_controller = this.addController(defs_array[ci].title, defs_array[ci].params);
		if (return_references)
			references.push(added_controller);
	}
	
	if (do_events_and_messages)
		Behave3d.doDelayedInits();
	
	return (return_references ? references : this);
};

//---------------------------------------
// Creates an instance of a controller and attaches it to a behave3d element
// @param {String|Behave3d.Controller} controller_or_title Reference to a controller constructor or a string containing the name of a controller
// @param {Object|Array} controller_params An object {param_name: value, ...} or array [[param_name, value], ...]
// @returns {Behave3d.Controller} A reference to the newly-created controller
Behave3d.Element.prototype.addController = function(controller_or_title, controller_params)
{
	if (controller_params === undefined) controller_params = [];
	
	if (!Array.isArray(controller_params))
		controller_params = Behave3d.params.getParamsAsArray(controller_params);
	
	var controller;
	
	// Do not allow more than one actions controller on an element; set parameters to the existing actions controller instead
	if ((controller_or_title === "actions" || controller_or_title === Behave3d.controllerActions) &&
		this.controllers.length > 0)
	{
		controller = this.actions_controller;
	}
	else {	
		var targets_supplied = false;
		var owner_supplied   = false;
			
		for (var i = 0; i < controller_params.length; i++)
			if (controller_params[i][0] == "targets")
				targets_supplied = true;
			else if (controller_params[i][0] == "owner")
				owner_supplied = true;
		
		// Add "owner" param if not supplied
		if (!owner_supplied)
			controller_params.unshift(["owner", this]);
		
		// Add "targets" param if not supplied
		if (!targets_supplied)
			controller_params.unshift(["targets", [this.element]]);
		
		if (typeof controller_or_title == "string" && !Behave3d.controllers[controller_or_title]) {
			var error_msg = "behave3d is attempting to instantiate unregistered controller '" + controller_or_title + "'";
			if (Behave3d.Element.required_core_controllers.indexOf(controller_or_title) >= 0)
				error_msg += "\nPlease make sure the definition files for the following controllers are included in your project as they are always used: " + Behave3d.Element.required_core_controllers.join(", ");
			Behave3d.debugExit(error_msg);
		}
		
		var controller_constructor = (typeof controller_or_title == "string") ? Behave3d.controllers[controller_or_title] : controller_or_title;
		controller = new controller_constructor(controller_params);
		
		this.controllers.push(controller);
	}
	
	if (Behave3d.vars.delayedInits === false) {
		if (controller.construct)
			controller.construct(controller_params, "events");
		controller.set(controller_params, "events");
		
		if (controller.construct)
			controller.construct(controller_params, "messages");
		controller.set(controller_params, "messages");
	}
	else
		Behave3d.vars.delayedInits.push({controller : controller, params : controller_params});

	return controller;
};

//---------------------------------------
// Removes all controllers from an element
Behave3d.Element.prototype.removeAllControllers = function()
{
	for (var ci = this.controllers.length - 1; ci >= 0; ci--)
		this.removeController(ci);
};

//---------------------------------------
// Removes a controller from an element
// @param {Behave3d.Controller|String|Number} controller Can be a reference / controller id / controller index in the element's controllers list
// @returns {Behave3d.Element} Returns this for method chaining
Behave3d.Element.prototype.removeController = function(controller)
{
	var controller_index;
	
	if (typeof controller == "object")
		controller_index = this.getControllerIndex(controller);
	else if (Behave3d.params.isNumber(controller))
		controller_index = controller;
	else
		controller_index = this.getController(controller, true);
	
	if (!this.controllers[controller_index])
		Behave3d.debugExit(this.debugName() + ".removeController(" + (typeof controller == "object" ? controller.debugName() : controller) + ") - cannot find controller in controllers list! controller_index="+controller_index);
	
	controller = this.controllers[controller_index];
	Behave3d.debugOut("Controller - remove: " + controller.debugName());
	
	controller.fireEvent("remove");
	
	// Remove controller from element[BEHAVE3D_PROPERTY].controllers
	this.controllers.splice(controller_index, 1);
	
	// Call controller's destructor
	if (controller.destruct)
		controller.destruct.call(controller);
	controller.disabled = true;
	
	return this;
};

//---------------------------------------
// Returns the index of the supplied controller in element's .controllers array
// @param {Behave3d.Controller} controller_instance Reference to controller
// @returns {Number} Index of controller in element's list of controllers, or -1 if the controller was not found
Behave3d.Element.prototype.getControllerIndex = function(controller_instance)
{
	for (var index = 0; index < this.controllers.length; index++)
		if (this.controllers[index] === controller_instance) return index;
	
	return -1;
};

//---------------------------------------
// Returns a reference to the HTML element supplied either by id or reference
// @param {HTMLElement|String} element_or_id Can be a reference to a DOM element, or a string containing its id,
//                                           or one of the special strings "@this" / "@parent" / "@ancestor"
// @param {Boolean} return_behave3d If true, then the HTML element's behave3d property is returned
// @returns {HTMLElement|Behave3d.Element} A DOM element or its behave3d element (when return_behave3d is true)
Behave3d.Element.prototype.getDOMElement = function(element_or_id, return_behave3d)
{
	var dom_element;
	
	if (typeof element_or_id == "string")
		element_or_id = element_or_id.toLowerCase();
		
	if (element_or_id === "@this")
		dom_element = this.element;
	else if (element_or_id === "@parent")
		// Set target element to the parentNode in the DOM
		dom_element = this.element.parentNode;
	else if (element_or_id === "@ancestor") {
		// Find the closest parentNode in the DOM that is behave3d 
		dom_element = this.element.parentNode;
		while (dom_element && !Behave3d(dom_element, false))
			dom_element = dom_element.parentNode;
	}
	else
		dom_element = Behave3d.getDOMElement(element_or_id);

	return (return_behave3d ? dom_element[Behave3d.consts.BEHAVE3D_PROPERTY] : dom_element);
};

//---------------------------------------
// Calls the supplied function with this = each of the element's controllers
// @param {Boolean} each_own If true, the function will be called for each of the element's own controllers
// @param {Boolean} each_parent If true, the function will be called for each of the element's DOM-parents' controllers
// @param {Boolean} each_descendant If true, the function will be called for each of the element's DOM-descendants' controllers
// @param {Function} callback_function The callback to call for each controller; within the callback, this will point to the controller
Behave3d.Element.prototype.forEachController = function(each_own, each_parent, each_descendant, callback_function)
{
	if (each_own)
		for (var ci = 0; ci < this.controllers.length; ci++)
			callback_function.call(this.controllers[ci]);
	
	if (each_parent) {
		var current_parent;
		while ((current_parent = this.element.parentNode) && current_parent != document)
			if (current_parent[Behave3d.consts.BEHAVE3D_PROPERTY])
				current_parent[Behave3d.consts.BEHAVE3D_PROPERTY].forEachController(true, false, false, callback_function);
	}
	
	if (each_descendant) {
		var child_nodes = this.childNodes ? this.childNodes : this.element.childNodes;
		for (var child_index = 0; child_index < child_nodes.length; child_index++) {
			var child = child_nodes[child_index];
				if (child[Behave3d.consts.BEHAVE3D_PROPERTY])
					child[Behave3d.consts.BEHAVE3D_PROPERTY].forEachController(true, false, true, callback_function);
				else
					Behave3d.Element.prototype.forEachController.call(child, false, false, true, callback_function);
		}
	}
};

//---------------------------------------
// Returns a reference to element's controller that has the supplied controller_id
// @param {String} controller_id String containing the searched-for controller id
// @param {Boolean} get_index If true, then instead of a reference to the controller its index in the element's list of controllers is returned
// @returns {Behave3d.Controller|Number} Reference to the found controller, or its index (if get_index), or false if controller with such id is not found
Behave3d.Element.prototype.getController = function(controller_id, get_index)
{
	if (get_index === undefined) get_index = false;
	
	for (var ci = 0; ci < this.controllers.length; ci++)
		if (this.controllers[ci].id == controller_id)
			return get_index ?
				ci :
				this.controllers[ci];
		
	return false;
};

//---------------------------------------
// Main update function for the element called every engine frame
Behave3d.Element.prototype.updateControllers = function()
{
	if (Behave3d.consts.DEBUG)
		Behave3d.vars.debugInfo.count_behave3d_elements++;
	
	// Set flag to_be_updated of all controllers
	for (var ci = 0; ci < this.controllers.length; ci++)
		this.controllers[ci].to_be_updated = true;
	
	var controllers_list_changed = true;
	
	// Update controllers
	while (controllers_list_changed) {
		controllers_list_changed = false;
		
		for (var ci = 0; ci < this.controllers.length; ci++) {
			var controller      = this.controllers[ci];
			var controllers_len = this.controllers.length;
			
			// Skip controller if it has already been updated
			if (!controller.to_be_updated) continue;
			
			if (controller.event_handlers.frame)
				controller.fireEvent("frame", {}, "controller");

			if (!controller.disabled && controller.update)
				controller.update.call(controller);
			
			controller.to_be_updated = false;

			// Check if controllers have been added/removed during the update of this controller
			if (controllers_list_changed = (controllers_len != this.controllers.length))
				break;
		}
	}
};

//---------------------------------------
// Receives a message to this behave3d element and sends it to the respective elements and controllers
// @param {String} message A string containing the (usually one-word) message
// @param {Object|Array} message_params An object {param_name: value...} or array [[param_name, value], ...] containing the message params
// @param {String} message_scope Can be "local"(is default) / "global" / "parents" / "children" / "p_and_c"
// @returns {Number} The number of elements that received the message
Behave3d.Element.prototype.message = function(message, message_params, message_scope)
{
	if (message_scope === undefined) message_scope = "local";
	
	var send_to_global     = (message_scope == "global");
	var send_to_parents    = (message_scope == "parents" || message_scope == "p_and_c");
	var send_to_children   = (message_scope == "children" || message_scope == "p_and_c");
	var send_to_local      = (message_scope == "local");
	
	var sent_messages_counter = 0;

	if (send_to_local) {
		this.actions_controller.message(message, message_params);
		sent_messages_counter++;
	}
		
	if (send_to_global)
		for (var ei = 0; ei < Behave3d.vars.elementsPool.length; ei++)
			sent_messages_counter += Behave3d.vars.elementsPool[ei][Behave3d.consts.BEHAVE3D_PROPERTY].message(message, message_params, "local");
		
	if (send_to_parents) {
		var current_parent;
		while ((current_parent = this.element.parentNode) && current_parent != document)
			if (current_parent[Behave3d.consts.BEHAVE3D_PROPERTY])
				sent_messages_counter += current_parent[Behave3d.consts.BEHAVE3D_PROPERTY].message(message, message_params, "local");
	}
	
	if (send_to_children) {
		var child_nodes = this.childNodes ? this.childNodes : this.element.childNodes;
		for (var child_index = 0; child_index < child_nodes.length; child_index++) {
			var child = child_nodes[child_index];
			if (child[Behave3d.consts.BEHAVE3D_PROPERTY]) {
				sent_messages_counter += child[Behave3d.consts.BEHAVE3D_PROPERTY].message(message, message_params, "local");
				sent_messages_counter += child[Behave3d.consts.BEHAVE3D_PROPERTY].message(message, message_params, "children");
			}
			else
				sent_messages_counter += Behave3d.Element.prototype.message.call(child, message, message_params, "children");
		}
	}
	
	return sent_messages_counter;
};

//---------------------------------------
// Shortcut for sending show/show_immediately message to this element
// @param {Boolean} immediately Whether to append "_immediately" to the sent action
// @returns {Behave3d.Element} Returns this for method chaining
Behave3d.Element.prototype.show = function(immediately)
{
	this.message(immediately ? "show_immediately" : "show");
	return this;
};

//---------------------------------------
// Shortcut for sending hide/hide_immediately message to this element
// @param {Boolean} immediately Whether to append "_immediately" to the sent action
// @returns {Behave3d.Element} Returns this for method chaining
Behave3d.Element.prototype.hide = function(immediately)
{
	this.message(immediately ? "hide_immediately" : "hide");
	return this;
};

//---------------------------------------
// Adds the supplied transform to the list of transforms that should be applied to this element this frame
// @param {Object} transform - For format, see Behave3d.transforms
// @returns {Behave3d.Element} Returns this for method chaining
Behave3d.Element.prototype.addTransform = function(transform)
{
	this.transforms.push(transform);
	return this;
};

//---------------------------------------
// Removes all queued transforms from the element
// @returns {Behave3d.Element} Returns this for method chaining
Behave3d.Element.prototype.cleanTransforms = function()
{
	this.transforms.length = 0;
	
	if (this.physics_enabled)
		this.acc.x = this.acc.y = this.acc.z = 0;
	
	return this;
};

//---------------------------------------
// Applies the accumulated queue of transforms onto the element
Behave3d.Element.prototype.applyTransforms = function()
{
	if (!this.element.style) return;
	
	var transform_parts   = [];
	var transform_origin  = false;
	var transform_flatten = false;
	var opacity           = "";
	var count_translate   = 0;
	var count_rotate      = 0;
	var count_scale       = 0;
	var count_origin      = 0;
	
	// Check if the new transforms are different than the last ones and construct css strings
	// Values of parameters are rounded in order to minimize changes in values (and so re-applying of transforms)
	for (var i = 0; i < this.transforms.length; i++) {
		var transform = this.transforms[i];
		
		if (transform.type === Behave3d.transforms.translate) {
			transform.dx = transform.dx.toFixed(Behave3d.consts.PRECISION_TRANSLATE);
			transform.dy = transform.dy.toFixed(Behave3d.consts.PRECISION_TRANSLATE);
			transform.dz = transform.dz.toFixed(Behave3d.consts.PRECISION_TRANSLATE);
			transform_parts.push("translate3d("+transform.dx+"px, "+transform.dy+"px, "+transform.dz+"px)");
			count_translate++;
		}		
		else if (transform.type === Behave3d.transforms.rotate) {
			transform.rx = transform.rx.toFixed(Behave3d.consts.PRECISION_ROTATE);
			transform.ry = transform.ry.toFixed(Behave3d.consts.PRECISION_ROTATE);
			transform.rz = transform.rz.toFixed(Behave3d.consts.PRECISION_ROTATE);
			transform.ra = transform.ra.toFixed(Behave3d.consts.PRECISION_ROTATE_ANGLE);
			transform_parts.push("rotate3d(" + transform.rx + ", " + transform.ry + ", " + transform.rz + ", " + transform.ra + Behave3d.consts.ROTATE_UNIT + ")");
			count_rotate++;
		}		
		else if (transform.type === Behave3d.transforms.scale) {
			transform.sx = transform.sx.toFixed(Behave3d.consts.PRECISION_SCALE);
			transform.sy = transform.sy.toFixed(Behave3d.consts.PRECISION_SCALE);
			transform.sz = transform.sz.toFixed(Behave3d.consts.PRECISION_SCALE);
			transform_parts.push("scale3d("+transform.sx+", "+transform.sy+", "+transform.sz+")");
			count_scale++;
		}	
		else if (transform.type === Behave3d.transforms.origin) {
			transform.ox = transform.ox.toFixed(Behave3d.consts.PRECISION_SCALE);
			transform.oy = transform.oy.toFixed(Behave3d.consts.PRECISION_SCALE);
			transform.oz = transform.oz.toFixed(Behave3d.consts.PRECISION_TRANSLATE);
			transform_origin = transform;
		}	
		else if (transform.type === Behave3d.transforms.flatten) {
			transform_flatten = transform;
		}
		else if (transform.type === Behave3d.transforms.opacity) {
			transform.opacity = transform.opacity.toFixed(Behave3d.consts.PRECISION_OPACITY);
			if (opacity === "") opacity = 1;
			opacity *= transform.opacity;
		}
	}
	
	// Apply transforms if different than last transforms string
	var new_transforms_str = transform_parts.join(" ");
	if (new_transforms_str != this.last_transform_str) {
		this.element.style[Behave3d.vars.cssPropTransform] = this.last_transform_str = new_transforms_str;
		
		if (Behave3d.consts.DEBUG) {
			Behave3d.vars.debugInfo.count_transformed_elements++;
			Behave3d.vars.debugInfo.count_translations += count_translate;
			Behave3d.vars.debugInfo.count_rotations    += count_rotate;
			Behave3d.vars.debugInfo.count_scalings     += count_scale;
		}
	}
	
	// Apply transform-origin
	var new_origin_str = (transform_origin ? transform_origin.ox * 100 + "% " + transform_origin.oy * 100 + "% " + transform_origin.oz + "px" : "");
	if (new_origin_str != this.last_origin_str)
		this.element.style[Behave3d.vars.cssPropTransformOrigin] = this.last_origin_str = new_origin_str;
	
	// Apply transform-style
	var new_style_str = (transform_flatten && transform_flatten.flatten ? "flat" : "preserve-3d");
	if (new_style_str != this.last_style_str)
		this.element.style[Behave3d.vars.cssPropTransformStyle] = this.last_style_str = new_style_str;

	// Apply opacity
	if (opacity !== this.last_opacity_str) {
		this.element.style.opacity = this.last_opacity_str = opacity;
		
		if (Behave3d.consts.DEBUG)
			Behave3d.vars.debugInfo.count_opacities++;		
	}
};

//---------------------------------------
// Returns acceleration {x, y, z} needed to be applied for 1 engine frame in order for the element to stop
// @param {Number} [time_step] Optionally supply the time_step (i.e. the frame duration) in seconds
// @returns {Object} An object {x: acc_x, y: acc_y, z: acc_z}
Behave3d.Element.prototype.getAccForSuddenStop = function(time_step)
{
	if (time_step === undefined) time_step = 1 / Behave3d.consts.FRAME_RATE;
	
	var v           = this.velocity;
	var acc         = this.acc;
	var dt          = time_step;
	
	return {
		x: -acc.x - v.x / dt,
		y: -acc.y - v.y / dt,
		z: -acc.z - v.z / dt,
	};
};

//---------------------------------------
// Calculates and updates physics properties
// @param {Boolean} add_to_transforms If true, then the calculated physics transforms are added to the element's transforms queue; if false, then the engine just updates the simulation
// @param {Number} [time_step] Optionally supply the time_step (i.e. the frame duration) in seconds
Behave3d.Element.prototype.calcPhysics = function(add_to_transforms, time_step)
{
	if (!this.physics_enabled) return;
	
	if (time_step === undefined) time_step = 1 / Behave3d.consts.FRAME_RATE;
	
	var pos         = this.pos;
	var v           = this.velocity;
	var acc         = this.acc;
	var dt          = time_step;
	var acc_factor  = dt * dt / 2;
	
	if (!this.actions_controller.paused) {
		var dx = v.x * dt + acc.x * acc_factor;
		var dy = v.y * dt + acc.y * acc_factor;
		var dz = v.z * dt + acc.z * acc_factor;
		
		pos.x += dx;
		pos.y += dy;
		pos.z += dz;
		
		v.x += acc.x * dt;
		v.y += acc.y * dt;
		v.z += acc.z * dt;
	}
	
	if (add_to_transforms)
		this.transforms.unshift({
			type: Behave3d.transforms.translate,
			dx  : pos.x,
			dy  : pos.y,
			dz  : pos.z,
		});
};

//---------------------------------------
// Moves the HTML element from its current position in the DOM tree to the scene container and positions it absolutely at the same place
// Useful for making nested elements work on old versions of IE which don't support the preserve-3d transform-style property
Behave3d.Element.prototype.makeChildOfScene = function()
{
	// Remember position
	var element_pos = Behave3d.getElementPos(this.element);
	
	// Move element
	Behave3d.vars.sceneContainer.appendChild(this.element);
	
	// Set absolute position and top&left properties
	this.element.style.position = "absolute";
	this.element.style.left     = element_pos.x + "px";
	this.element.style.top      = element_pos.y + "px";
};

//---------------------------------------
// Fires an event and calls all respective callbacks
// @param {String} event_type Name of event
// @param {String} event_scope Can be "local" (is default) / "global" / "parents" / "children" / "p_and_c"
// @param {Object|Array} event_params An object {param_name: value...} or array [[param_name, value], ...] containing the event params
// @returns {Number} The number of callbacks called
Behave3d.Element.prototype.fireEvent = function(event_type, event_params, event_scope)
{
	if (event_scope === undefined) event_scope = "local";
	
	var fire_global     = (event_scope == "global");
	var fire_parents    = (event_scope == "parents" || event_scope == "p_and_c");
	var fire_children   = (event_scope == "children" || event_scope == "p_and_c");
	var fire_local      = (event_scope == "local");
	
	var callbacks_called = 0;

	if (fire_local && !fire_global)
		for (var ci = 0; ci < this.controllers.length; ci++)
			callbacks_called += this.controllers[ci].fireEvent(event_type, event_params, "controller");
		
	if (fire_global)
		for (var ei = 0; ei < Behave3d.vars.elementsPool.length; ei++)
			callbacks_called += Behave3d.vars.elementsPool[ei][Behave3d.consts.BEHAVE3D_PROPERTY].fireEvent(event_type, event_params, "local");
		
	if (fire_parents) {
		var current_parent;
		while ((current_parent = this.element.parentNode) && current_parent != document)
			if (current_parent[Behave3d.consts.BEHAVE3D_PROPERTY])
				callbacks_called += current_parent[Behave3d.consts.BEHAVE3D_PROPERTY].fireEvent(event_type, event_params, "local");
	}
	
	if (fire_children) {
		var child_nodes = this.childNodes ? this.childNodes : this.element.childNodes;
		for (var child_index = 0; child_index < child_nodes.length; child_index++) {
			var child = child_nodes[child_index];
			if (child[Behave3d.consts.BEHAVE3D_PROPERTY]) {
				callbacks_called += child[Behave3d.consts.BEHAVE3D_PROPERTY].fireEvent(event_type, event_params, "local");
				callbacks_called += child[Behave3d.consts.BEHAVE3D_PROPERTY].fireEvent(event_type, event_params, "children");
			}
			else
				callbacks_called += Behave3d.Element.prototype.fireEvent.call(child, event_type, event_params, "children");
		}
	}
	
	return callbacks_called;
};

//---------------------------------------
// Returns a string with the element's name, useful for debug
Behave3d.Element.prototype.debugName = function()
{
	return this.element.nodeName+("#"+this.element.id);
};







//------------------------------------------------------------------------------------------------------------------------
// Behave3d.Controller
//------------------------------------------------------------------------------------------------------------------------
// Instantiates a controller and attaches it to the behave3d element supplied via params.owner
// @param {Object|Array} params An object {param_name: value...} or array [[param_name, value], ...] containing the controller params
// @param {Boolean} enable_physics Whether to enable the physics_enabled flag on the owner behave3d element
Behave3d.Controller = function(params, enable_physics)
{
	if (params  === undefined) params  = {};
	
	// Set instance properties
	this.unique_id      = (Behave3d.vars.uniqueIDCounter++);
	this.id             = "";
	this.disabled       = false;
	this.paused         = false;
	this.params_changed = false;
	this.targets        = [];
	this.event_handlers = {};
	this.owner          = null;
	
	// Set params
	if (this.default_params)
		for (var param_name in this.default_params)
			this[param_name] = this.default_params[param_name];
	
	this.set(params, "params");	
	if (enable_physics) this.owner.physics_enabled = true;
	
	Behave3d.debugOut("Controller - create: "+this.debugName());
	
	if (this.construct)
		this.construct(params, "params");
};

//---------------------------------------
Behave3d.Controller.common_messages = ["pause", "unpause", "enable", "disable", "params", "remove"];

//---------------------------------------
Behave3d.Controller.prototype = {};

//---------------------------------------
// Sets a new value to a controller param
// @param {String} param_name Name of parameter
// @param {String|Number} new_val New value of the parameter
// @param {String} mode Can be:
//    ""          - all params are set as given (including event handlers and messages)
//    "params"    - only set params, no firing of events, setting event handlers and sending of messages
//    "events"    - only add event listeners
//    "messages"  - only send messages
//    "message"   - like mode "", but no errors on unknown parameters - these unknown parameters are supposed to be handled by the controller's message()
// @returns {Behave3d.Controller} Returns this for method chaining
Behave3d.Controller.prototype.setParam = function(param_name, new_val, mode)
{
	if (mode === undefined) mode = "";

	if (typeof new_val == "string" &&
		new_val.toLowerCase() == "toggle" &&
		this.hasOwnProperty(param_name) &&
		typeof this[param_name] == "boolean")
		new_val = (this[param_name]) ? false : true;
	
	var do_all            = (mode == "" || mode == "message");
	var do_auto_handlers  = (do_all || mode == "events");
	var do_messages       = (do_all || mode == "messages");
	var do_params         = (do_all || mode == "params");
	var do_fire_events    = do_all;
	var unknown_params_ok = (mode == "message");
	
	if ((param_name == "paused" || param_name == "disabled")) {
		var old_val = this[param_name];
		if (do_params) this[param_name] = new_val;
		
		// Fire "paused" and "disabled" events on changing these element params
		if (do_fire_events && new_val != old_val)
			this.fireEvent(new_val == 1 ? param_name : (param_name == "paused" ? "unpaused" : "enabled"));
		
		return true;
	}
	else if (param_name.substr(-3) == " on") {				
		// Create auto-event handler for "xxxx on" param
		if (do_auto_handlers)
			this.on(new_val, param_name.substr(0, param_name.length - 3).trim());
		return this;
	}
	else if ((Behave3d.Controller.common_messages.indexOf(param_name) >= 0) ||
			(this.messages && this.messages.indexOf(param_name) >= 0)) {
		// Send message for params with names that are messages
		if (do_messages)
			this.message(param_name, new_val);
		return this;
	}
	else if (this instanceof Behave3d.controllerActions &&
			!this.hasOwnProperty(param_name)) {
		// Actions() controller accepts any messages
		if (do_messages)
			this.message(param_name, new_val);
		return this;
	}
	
	if (do_params) {
		if (["construct", "destruct", "message", "update"].indexOf(param_name) >= 0) {
			// Override controller method
			var func_ref = (typeof new_val == "string") ? Behave3d.getFunctionByName(new_val) : new_val;			
			if (typeof func_ref == "function")
				this[param_name] = func_ref;
			else
				Behave3d.debugExit("Controller " + this.debugName() + " received invalid param (" + new_val + ") that cannot override method " + param_name + "(), function or function name is expected.");					
		}
		else if (this.hasOwnProperty(param_name)) {
			if (this instanceof Behave3d.controllerActions &&
				param_name == "id" &&
				new_val != "a")
			{
				Behave3d.debugExit("Controller " + this.debugName() + " is not allowed to have its id changed to " + new_val);
			}
			this[param_name]    = new_val;
			this.params_changed = true;
		}
		else if (!unknown_params_ok)
			Behave3d.debugExit("Controller " + this.debugName() + " received unknown param '" + param_name + "'");
	}
	
	return this;
};

//---------------------------------------
// Sets new values to controller params
// @param {Object|Array} new_params An object {param_name: value...} or array [[param_name, value], ...] containing the new values of the params
// @param {String} mode See comments on setParams()
// @returns {Behave3d.Controller} Returns this for method chaining
Behave3d.Controller.prototype.set = function(new_params, mode)
{
	// Overwrite controller's params with supplied params
	if (Array.isArray(new_params))
		for (var i = 0; i < new_params.length; i++)
			this.setParam(new_params[i][0], new_params[i][1], mode);
	else {
		if (typeof new_params == "string")
			new_params = Behave3d.params.parseParamsString(new_params, true);

		for (var param_name in new_params)
			this.setParam(param_name, new_params[param_name], mode);
	}
	
	return this;
};

//---------------------------------------
// Returns the value of the flag this.params_changed and sets it to false
// @param {Boolean} dont_clear_flag If true, the flag is not cleared (set to false)
// @returns {Boolean} The value of the flag before clearing it
Behave3d.Controller.prototype.paramsHaveChanged = function(dont_clear_flag)
{
	return this.params_changed && (dont_clear_flag || !(this.params_changed = false));
};

//---------------------------------------
// Sets new values to controller params supplied in message_params
// @param {String} message A string containing the (usually one-word) message
// @param {Object|Array} message_params An object {param_name: value...} or array [[param_name, value], ...] containing the message params
// @returns {Object} Returns the parameter message_params but fixed to {} if undefined
Behave3d.Controller.prototype.setMessageParams = function(message, message_params)
{
	if (message_params === undefined)
		message_params = {};
	else if (typeof message_params == "object")
		this.set(message_params, "message");
		
	return message_params;
};

//---------------------------------------
// Default message handler (is usually overloaded by the descendant class)
// @param {String} message A string containing the (usually one-word) message
// @param {Object|Array} message_params An object {param_name: value...} or array [[param_name, value], ...] containing the message params
// @returns {Behave3d.Controller} Returns this for method chaining
Behave3d.Controller.prototype.message = function(message, message_params)
{
	this.handleCommonMessage(message, message_params);
	return this;
};

//---------------------------------------
// Handles the messages common to all controllers (listed in Behave3d.Controller.common_messages)
// @param {String} message A string containing the (usually one-word) message
// @param {Object|Array} message_params An object {param_name: value...} or array [[param_name, value], ...] containing the message params
// @returns {Boolean} True if message has been handled (and hense should not be handled by the controller's message()), false otherwise
Behave3d.Controller.prototype.handleCommonMessage = function(message, message_params)
{
	Behave3d.debugOut("Message received: '" + message + "' by " + this.debugName());
	
	// Disabled controllers can't receive messages other than 'enable'
	if (this.disabled && ["enable", "remove", "params"].indexOf(message) == -1) return true;
	
	if (this.messages &&
		this.messages.indexOf(message) >= 0)
		// Tell that this is a controller-specific message
		return false;
		
	this.setMessageParams(message, message_params);
	
	// Handle common messages
	if (message == "pause" || message == "unpause")
		this.set({paused: (message == "pause")});
	else if (message == "enable" || message == "disable")
		this.set({disabled: (message == "disable")});
	else if (message == "params")
		this.set(message_params);
	else if (message == "remove")
		this.owner.removeController(this);
	else
		Behave3d.debugExit(this.debugName() + " received unknown message '" + message + "'");
		
	return true;
};

//---------------------------------------
// Creates an event listener to this controller or another controller
// @param {String|Array|Number} event_to_wait_for Array of, or single value in the format: "[[milliseconds] after] [DOM id or "@targets"] [controller id] event_name", or [milliseconds]
// @param {Function|String} handler_function_or_message A handler function(event_type, event_params) or "message" to receive upon the event
// @param {Boolean} return_targets If false, returns this for method chaining,
//                                 else returns an object (or array of such objects if event_to_wait_for is array) with the resolved target of the created event listener {element: target_element, controller: target_controller, event: name_of_event}
// @returns {Behave3d.Controller|Object|Array} See param return_targets
Behave3d.Controller.prototype.on = function(event_to_wait_for, handler_function_or_message, return_targets)
{
	var target = {
		element    : this.owner,
		controller : this,
		event      : ""
	};
	var targets = [];
	
	if (Array.isArray(event_to_wait_for)) {
		for(var i = 0; i < event_to_wait_for.length; i++)
			targets.push(this.on(event_to_wait_for[i], handler_function_or_message), true);
		
		return (return_targets ? targets : this);
	}
	
	var target_path           = (typeof event_to_wait_for == "string" ? event_to_wait_for : "" + event_to_wait_for).split(" ");
	var delay                 = 0;
	var debug_header          = this.debugName() + ".on('" + event_to_wait_for + "', " + (typeof handler_function_or_message == "string" ? "'" + handler_function_or_message + "'" : "function()") + ")";
	
	if (target_path.length > 2 && target_path[1] == "after") {
		delay = Number(target_path[0]);
		target_path.splice(0, 2);
	}
	
	if (target_path.length == 1) {
		if (Behave3d.params.isNumber(target_path[0])) {
			delay        = Number(target_path[0]);
			target.event = true;
		}
		else
			target.event = target_path[0];
	}
	else if (target_path.length == 2) {
		target.controller = this.owner.getController(target_path[0]);
		if (!target.controller) Behave3d.debugExit(debug_header + ": cannot find controller '" + target_path[0] + "'");
		
		target.event      = target_path[1];
	}
	else if (target_path.length == 3) {
		var target_elements = [];
		
		if (target_path[0] == "@targets")
			for(var i = 0; i < this.targets.length; i++)
				target_elements.push(this.getTarget(i));
		else
			target_elements.push(this.owner.getDOMElement(target_path[0], true));
		
		for(var i = 0; i < target_elements.length; i++)
			targets.push({
				element    : target_elements[i],
				controller : target_elements[i].getController(target_path[1]) || Behave3d.debugExit(debug_header + ": cannot find controller '" + target_path[1] + "'"),
				event      : target_path[2],
			});
	}
	
	if (targets.length == 0)
		targets.push(target);
	
	var handler_function = (typeof handler_function_or_message == "string") ?
			function(event_type, event_params) {
				this.message(handler_function_or_message, event_params);
			}.bind(this) :
			handler_function_or_message.bind(this);
			
	var delayed_handler_function = delay ?
			function(event_type, event_params) { window.setTimeout(function() {handler_function(event_type, event_params);}, delay);} :
			handler_function;
	
	for(var i = 0; i < targets.length; i++)
		if (targets[i].event === true) {
			delayed_handler_function();
			Behave3d.debugOut("Delay trigger created: " + debug_header);
		}
		else
			targets[i].controller.addEventHandler(targets[i].event, delayed_handler_function);

	if (return_targets)
		return (targets.length > 1) ? targets : targets[0];
	else
		return this;
};

//---------------------------------------
// Removes event listeners to this controller
// @param {String|Array} event Array of, or single name of event
// @param {Function} handler_function If supplied, only this listener will be removed; if not supplied - all listeners for the event will be removed
// @returns {Behave3d.Controller} Returns this for method chaining
Behave3d.Controller.prototype.off = function(event, handler_function)
{
	if (Array.isArray(event))
		for(var i = 0; i < event.length; i++)
			this.off(event[i], handler_function);

	if (handler_function)
		this.removeEventHandler(event, handler_function);
	else
		// Remove all handlers for this event
		delete this.event_handlers[event];	
	
	return this;
};

//---------------------------------------
// Creates an event listener to this controller
// @param {String} event Name of event
// @param {Function} handler_function A handler function(event_type, event_params) to call upon the event
Behave3d.Controller.prototype.addEventHandler = function(event, handler_function)
{
	if (!this.event_handlers[event]) this.event_handlers[event] = [];
	this.event_handlers[event].push(handler_function);
	
	Behave3d.debugOut("Handler created: '" + event + "' on " + this.debugName());
};

//---------------------------------------
// Removes an event listener from this controller
// @param {String|Array} event Array of, or single name of event
// @param {Function} handler_function All instances of this listener will be removed
Behave3d.Controller.prototype.removeEventHandler = function(event, handler_function)
{
	if (!this.event_handlers[event]) return;
	var handlers = this.event_handlers[event];	

	// Remove all occurances of the handler in the list of handlers
	if (handlers.indexOf(handler_function) >= 0) {
		for (var i = handlers.length - 1; i >= 0; i--)
			if (handlers[i] === handler_function)
				handlers.splice(i, 1);
		Behave3d.debugOut("Handler removed: '" + event + "' on " + this.debugName());
	}
};

//---------------------------------------
// Creates event handlers on this controller that fire events on another controller upon firing on this controller
// @param {Behave3d.Controller} controller_to_relay_to Reference to another controller
// @param {Object} events_map Object of format: { event_name: "event_name_on_controller_to_relay_to", ...}
Behave3d.Controller.prototype.relayEvents = function(controller_to_relay_to, events_map)
{
	for(var event in events_map)
		(function(event, relay_event, controller_to_relay_to) {
			this.on(event, function(event_params) {
				controller_to_relay_to.fireEvent(events_map[event], event_params);
			});
		}).bind(this)(event, events_map[event], controller_to_relay_to);
};

//---------------------------------------
// Fires an event and calls all respective callbacks
// @param {String} event_type Name of event
// @param {Object|Array} event_params An object {param_name: value...} or array [[param_name, value], ...] containing the event params
// @param {String} event_scope Can be "controller"(is default) / "local" / "global" / "parents" / "children" / "p_and_c"
// @returns {Number} The number of callbacks called
Behave3d.Controller.prototype.fireEvent = function(event_type, event_params, event_scope)
{
	if (event_scope === undefined) event_scope = "controller";

	if (event_scope == "controller") {
		var handlers = (this.event_handlers[event_type] ? this.event_handlers[event_type] : [])
						.concat(this.event_handlers["all"] ? this.event_handlers["all"] : []);

		//if (handlers.length > 0 && event_type != "frame")
		//	Behave3d.debugOut("Event handled: '" + event_type + "' by " + this.debugName());
		
		for (var handler_i = 0; handler_i < handlers.length; handler_i++)
			handlers[handler_i].call(this, event_type, event_params);
		
		return handlers.length;
	}
	else
		return this.owner.fireEvent(event_type, event_params, event_scope);
};

//---------------------------------------
// Returns a reference to another controller supplied by its id
// @param {String} controller_id Controller id or a space-separated 2-items string "dom_element_id controller_id"
// @returns {Behave3d.Controller} Reference to the required controller
Behave3d.Controller.prototype.getAnotherController = function(controller_id)
{
	var controller_path = controller_id.split(" ");
	if (controller_path.length == 1)
		return this.owner.getController(controller_id) || Behave3d.debugExit(this.debugName + " cannot find another controller with id = '" + controller_id + "'");
	else
		return Behave3d(controller_id, false);
};

//---------------------------------------
// Returns an object with the computed values of the supplied length params
// @param {Array} x_params Array with names of properties of this controller containing X sizes/lengths/etc.
// @param {Array} y_params Array with names of properties of this controller containing Y sizes/lengths/etc.
// @param {Array} z_params Array with names of properties of this controller containing Z sizes/lengths/etc.
// @param {Boolean|Array} allow_non_lengths If true, then the params are allowed to have any string value; allow_non_lengths can also be an array containing all allowed non-length string values
// @returns {Object} Object of format {param_name: computed_value, ...}
Behave3d.Controller.prototype.getComputedLengths = function(x_params, y_params, z_params, allow_non_lengths)
{
	var params = {};	
	
	for(var i = 0; i < x_params.length; i++)
		params[x_params[i]] = Behave3d.params.getLength(this[x_params[i]], "X", this.owner.element, allow_non_lengths);
	
	if (y_params)
		for(var i = 0; i < y_params.length; i++)
			params[y_params[i]] = Behave3d.params.getLength(this[y_params[i]], "Y", this.owner.element, allow_non_lengths);
	
	if (z_params)
		for(var i = 0; i < z_params.length; i++)
			params[z_params[i]] = Behave3d.params.getLength(this[z_params[i]], "Z", this.owner.element, allow_non_lengths);
	
	return params;
};

//---------------------------------------
// Returns a reference to the controller's target behave3d element with index target_index in the list of controller's targets
// @param {Number} target_index Index of target in the list of the controller's targets
// @param {Behave3d.Element} A reference to the target DOM element's behave3d element
Behave3d.Controller.prototype.getTarget = function(target_index)
{
	return this.targets[target_index][Behave3d.consts.BEHAVE3D_PROPERTY];
};

//---------------------------------------
// Checks if the controller's targets are behave3d-initialized, and creates their behave3d elements if they are not
// @param {Boolean} [add_to_pool] Whether to add the eventual newly-created behave3d elements to the behave3d pool of elements (defaults to true)
// @returns {Behave3d.Controller} Returns this for method chaining
Behave3d.Controller.prototype.makeTargetsDom3d = function(add_to_pool)
{
	if (add_to_pool === undefined) add_to_pool = true;
	
	for (var target_index = 0; target_index < this.targets.length; target_index++) {
		var target = this.targets[target_index];
		if (!target[Behave3d.consts.BEHAVE3D_PROPERTY])
			new Behave3d.Element(target, add_to_pool);
	}
	
	return this;
};

//---------------------------------------
// Adds event handlers (listed in action_handles) that send messages to this controller upon behave3d element actions_target's actions
// Also adds event handlers (listed in event_handles) that fire actions events for this element upon events of this controller
// Sets flag this.actions_registered = true
// @param {Boolean|String|Number} actions_target Can be: false / true / "reverse" / "500" / "500 dom_element_id" - give delay in milliseconds (default is 0) and id of action target (default is this element)
// @param {Object|String} action_handles Object of format { show: "show", hide: "hide", ...}, or "showhide"
// @param {Object|String} event_handles Object of format { show_start: "fade_in_start", show_end: ["fade_in_end", "another_end"], ...}, or "showhide"
// @returns {Behave3d.Controller} Returns this for method chaining
Behave3d.Controller.prototype.registerActions = function(actions_target, action_handles, event_handles)
{
	function swap_props(object, prop1, prop2) {
		var val1 = object[prop1];
		object[prop1] = object[prop2];
		object[prop2] = val1;
	}
	
	if (!actions_target) return this;
	
	var delay   = 0;
	var element = "";
	var reverse = false;
	
	if (typeof actions_target == "string" &&
		actions_target.length > 0)
	{
		var at_parts = actions_target.split(" ");
		if (at_parts[0] == "reverse") {
			reverse = true;
			at_parts = at_parts.splice(1);
		}
		delay = Number(at_parts[0]);
		element = at_parts[1] || "";
	}
	else if (typeof actions_target == "number")
		delay = actions_target;	
	
	var prefix_immediate = (element ? element + " " : "");
	var prefix           = (delay ? delay + " after " : "") + prefix_immediate;
	
	if (typeof action_handles == "string") {
		var which_actions = action_handles.split(" ");
		var actions_list = [];
		
		if (which_actions.indexOf("showhide") >= 0)
			actions_list = actions_list.concat(["show", "hide", "show_immediately", "hide_immediately"]);
		
		action_handles = {};
		for(var i = 0; i < actions_list.length; i++)
			action_handles[actions_list[i]] = actions_list[i];
	}

	// Swap all show & hide actions and event handles
	if (reverse) {		
		for (var action in action_handles)
			if (action == "show")
				swap_props(action_handles, "show", "hide");
			else if (action == "show_immediately")
				swap_props(action_handles, "show_immediately", "hide_immediately");

		for (var action_event in event_handles)
			if (action_event == "show_start")
				swap_props(event_handles, "show_start", "hide_start");
			else if (action_event == "show_end")
				swap_props(event_handles, "show_end", "hide_end");
	}
	
	for (var action in action_handles) {
		var is_immediate = (action.substr(-12) == "_immediately");
		this.on((is_immediate ? prefix_immediate : prefix) + "a " + action, action_handles[action]);
	}
	
	if (typeof event_handles == "string") {
		var which_events = event_handles.split(" ");
		var events_list = [];
		
		if (which_events.indexOf("showhide") >= 0)
			events_list = events_list.concat(["show_start", "show_end", "hide_start", "hide_end"]);
		
		event_handles = {};
		for(var i = 0; i < events_list.length; i++)
			event_handles[events_list[i]] = events_list[i];
	}
	
	var actions_controller = (element ? this.owner.getDOMElement(element, true) : this.owner).actions_controller;
	
	for (var action_event in event_handles)
		(function(action_event, events, actions_controller) {
			if (!Array.isArray(events)) events = [events];
			
			for(var i = 0; i < events.length; i++)
				this.on(events[i], function(event_params) {
					actions_controller.fireEvent(action_event, event_params);
				});
		}).bind(this)(action_event, event_handles[action_event], actions_controller);
	
	this.actions_registered = true;
	return this;
};

//---------------------------------------
// Registers event handlers on this controller that make its sub-controllers get paused/ect. whenever this controller is paused/etc.
// @param {Array} sub_controllers Array of references to other controllers
Behave3d.Controller.prototype.setSubcontrollersEvents = function(sub_controllers)
{
	var this_controller = this;
	
	// Set "paused" event handlers
	this.on("paused", function() {
		for(var i = 0; i < sub_controllers.length; i++)
			sub_controllers[i].set({paused: this.paused});
	});
};

//---------------------------------------
// Checks if the controller targets are behave3d-initialized, and creates their behave3d elements if they are not
// @param {Number} number_limit Limits the number of targets (defaults to -1, i.e. no limit)
// @param {Boolean} [add_to_pool] Whether to add the newly-created behave3d elements to the behave3d pool of elements (defaults to true)
// @returns {Object} An object with information which targets are added and which are removed, compared with current targets, format:
// {
//   removed: [
//      {first_pos: index of first removed element, last_pos: index of last removed element, elements: [DOM_element, ...]},
//      ...
//   ],
//   inserted: [
//      {first_pos: index of first inserted element, last_pos: index of last inserted element, elements: [DOM_element, ...]},
//      ...
//   ]
// }
Behave3d.Controller.prototype.setChildTargets = function(number_limit, add_to_pool)
{
	if (number_limit === undefined) number_limit = -1;
	if (add_to_pool === undefined) add_to_pool = true;
	
	var removed_targets  = [];
	var inserted_targets = [];
	var diff = {removed: [], inserted: []};
	
	// Read children from DOM tree
	var new_targets = [];
	for (var i = 0; i < this.owner.element.childNodes.length; i++) {
		if (number_limit != -1 && new_targets.length >= number_limit) break;
			
		var child = this.owner.element.childNodes[i];
		if (child.nodeType == Node.ELEMENT_NODE)
			new_targets.push(child);
	}
	
	// Remove old targets which are not among new_targets
	for (var i = 0; i < this.targets.length; i++)
		if (this.targets[i] != this.owner.element &&
			new_targets.indexOf(this.targets[i]) == -1)
		{
			removed_targets.push([i,this.targets[i]]);
			Behave3d(this.targets[i]).removeFromPool();		
		}
	
	this.targets = new_targets;

	// behave3d initialize previously-uninitialized targets
	for (var i = 0; i < this.targets.length; i++)
		if (!this.targets[i][Behave3d.consts.BEHAVE3D_PROPERTY])
		{
			new Behave3d.Element(this.targets[i], add_to_pool);
			inserted_targets.push([i, this.targets[i]]);
		}

	// Compact removed_targets
	for (var i = 0; i < removed_targets.length; i++) {
		var sequence_items = [removed_targets[i][1]];
		var k = i + 1;
		while (removed_targets[k] && removed_targets[k][0] == removed_targets[i][0] + k - i) {
			sequence_items.push(removed_targets[k][1]);
			k++;
		}
		
		diff.removed.push({
			first_pos : i,
			last_pos  : k - 1,
			elements  : sequence_items,
		});
		i = k - 1;
	}
	
	// Compact inserted_targets
	for (var i = 0; i < inserted_targets.length; i++) {
		var sequence_items = [inserted_targets[i][1]];
		var k = i + 1;
		while (inserted_targets[k] && inserted_targets[k][0] == inserted_targets[i][0] + k - i) {
			sequence_items.push(inserted_targets[k][1]);
			k++;
		}
		
		diff.inserted.push({
			first_pos : i,
			last_pos  : k - 1,
			elements  : sequence_items,
		});
		i = k - 1;
	}
	
	return diff;
};

//---------------------------------------
// Adds a transform to the controller's target
// @param {Object} transform See Behave3d.transforms for details
// @param {Number} [target_index] Index of target to apply the transform to;
//                                If not supplied, then the transform will be added to each of the controller targets
// @returns {Behave3d.Controller} Returns this for method chaining
Behave3d.Controller.prototype.addTransform = function(transform, target_index)
{
	if (target_index === undefined)
		for (var ti = 0; ti < this.targets.length; ti++)
			this.getTarget(ti).addTransform(transform);
	else
		this.getTarget(target_index).addTransform(transform);
		
	return this;
};

//---------------------------------------
// Apply "elastic" acceleration to this element's target proportional to distance from attractor_pos
// @param {Object} attractor_pos An object {x: pos_x, y: pox_y, z: pos_z} containing the attractor position relative to the target's pivot point (position before transforms)
// @param {Number} force_multiplier Spring parameter (higher values -> faster springing)
// @param {Number} max_len If > 0, then the spring force becomes very strong as the "spring" stretches close to max_len
// @param {Number} [target_index] Index of target to apply the physical force to;
//                                If not supplied, then the physical force will be applied to each of the controller targets
Behave3d.Controller.prototype.applySpringForce = function(attractor_pos, force_multiplier, max_len, target_index)
{
	if (force_multiplier == 0) return;
	if (target_index === undefined || target_index == -1) {
		for (var i = 0; i < this.targets.length; i++)
			this.applySpringForce(attractor_pos, force_multiplier, max_len, i);
		return;
	}
	
	var target = this.getTarget(target_index);
	var pos    = target.pos;
	var v      = target.velocity;
	var acc    = target.acc;
	
	var dx = attractor_pos.x - pos.x;
	var dy = attractor_pos.y - pos.y;
	var dz = attractor_pos.z - pos.z;
	
	if (max_len != 0) {
		var spring_len    = Math.sqrt((dx * dx) + (dy * dy) + (dz * dz));
		var stretch       = spring_len / max_len;
		var stop_acc      = target.getAccForSuddenStop();
		var stop_acc_size = Math.sqrt(stop_acc.x*stop_acc.x + stop_acc.y*stop_acc.y + stop_acc.z*stop_acc.z);
		
		var spring_strength  = Math.min(1, stretch * stretch * stretch * stretch);
		acc.x += stop_acc.x * spring_strength;
		acc.y += stop_acc.y * spring_strength;
		acc.z += stop_acc.z * spring_strength;
	}
	
	acc.x += dx * force_multiplier;
	acc.y += dy * force_multiplier;
	acc.z += dz * force_multiplier;
};

//---------------------------------------
// Apply acceleration to this element's target proportional to the inverse square of the distance to attractor_pos
// @param {Object} attractor_pos An object {x: pos_x, y: pox_y, z: pos_z} containing the attractor position relative to the target's pivot point (position before transforms)
// @param {Number} force_multiplier Spring parameter (higher values -> faster springing)
// @param {Number} scale_multiplier Spring parameter (higher values -> slower springing)
// @param {Number} [target_index] Index of target to apply the physical force to;
//                                If not supplied, then the physical force will be applied to each of the controller targets
Behave3d.Controller.prototype.applyGravityForce = function(attractor_pos, force_multiplier, scale_multiplier, target_index)
{
	if (force_multiplier == 0) return;
	if (target_index === undefined || target_index == -1) {
		for(var i = 0; i < this.targets.length; i++)
			this.applyGravityForce(attractor_pos, force_multiplier, scale_multiplier, i);
		return;
	}
	
	force_multiplier *= Behave3d.consts.GRAVITY_CONSTANT;
	
	var target = this.getTarget(target_index);
	var pos    = target.pos;
	var v      = target.velocity;
	var acc    = target.acc;
	
	var dx = (attractor_pos.x - pos.x) * scale_multiplier;
	var dy = (attractor_pos.y - pos.y) * scale_multiplier;
	var dz = (attractor_pos.z - pos.z) * scale_multiplier;
	
	var distance         = Math.sqrt((dx * dx) + (dy * dy) + (dz * dz));
	var gravity_strength = force_multiplier / distance;

	if (distance >= 5 * scale_multiplier) {
		acc.x += gravity_strength * dx / distance;
		acc.y += gravity_strength * dy / distance;
		acc.z += gravity_strength * dz / distance;
	}
};

//---------------------------------------
// Reduces the speed of the supplied target by multiplying it to damping_factor
// @param {Number} damping_factor A number between 0 and 1 to multiply the target's velocity to (lower values -> quicker damping of speed)
// @param {Number} [target_index] Index of target to apply the damping to;
//                                If not supplied, then the damping will be applied to each of the controller targets
Behave3d.Controller.prototype.applySpeedDamping = function(damping_factor, target_index)
{
	if (damping_factor == 1) return;
	if (target_index === undefined || target_index == -1) {
		for(var i = 0; i < this.targets.length; i++)
			this.applySpeedDamping(damping_factor, i);
		return;
	}

	var target = this.getTarget(target_index);
	var v      = target.velocity;
	
	v.x *= this.damping_factor;
	v.y *= this.damping_factor;
	v.z *= this.damping_factor;
};


//---------------------------------------
// Returns a coordinates object {x, y, z} that contains the summed coordinates of the supplied controllers' .path_pos properties
// @param {Array} controllers An array of controller references
// @returns {Object} An object of format {x: pos_x, y: pos_y, z: pos_z}
Behave3d.Controller.prototype.getPathPos = function(controllers)
{
	var path_pos = { x: 0, y: 0, z: 0 };
	for(var i = 0; i < controllers.length; i++) {
		if (controllers[i].disabled) continue;
		//if (!controllers[i].path_enabled) continue;
		
		path_pos.x += controllers[i].path_pos.x;
		path_pos.y += controllers[i].path_pos.y;
		path_pos.z += controllers[i].path_pos.z;
	}
	
	return path_pos;
};

//---------------------------------------
// Returns a string with the controller's name, useful for debug
// @returns {String} String with this controller's debug "name"
Behave3d.Controller.prototype.debugName = function()
{
	return (this.owner ? this.owner.debugName() : "UnassignedController") +
			":" + this.id + "(#" + this.unique_id + " " + this.title + ")";
};










//------------------------------------------------------------------------------------------------------------------------
// Behave3d.StepEngine
//------------------------------------------------------------------------------------------------------------------------
// A StepEngine is responsible for incrementing its variables on every frame, so that their values move towards a set destination
// Creates a new step engine used by events_controller
// @param {Object} vars An object containing variable_name-value pairs {var_name: initial_value, ...}
// @param {Boolean} is_circular Whether the coordinate space of the variables is circular; in such case the cycle size is supplied via options.cycle_len (it defaults to Behave3d.consts.ROTATE_ONE_TURN)
// @param {Behave3d.Controller} events_controller The controller using this step engine; the step engine will fire events on behalf of the controller
// @param {Object|Behave3d.Controller} options An object containg the values of the step engine options; in most cases this is the controller's instance itself;
//                                             See Behave3d.StepEngine.default_options for a list of all options and their default values
Behave3d.StepEngine = function(vars, is_circular, events_controller, options)
{
	this.is_circular       = is_circular;
	this.events_controller = events_controller || null;
	this.options           = options || {};	
	this.var_names         = Object.keys(vars);	
	this.vars              = {};
	this.lagged_vars       = {};
	this.vars_speeds       = {};	
	
	for(var var_name in vars) {
		this.vars[var_name]        = vars[var_name];
		this.lagged_vars[var_name] = vars[var_name];
		this.vars_speeds[var_name] = 0;
	}
	
	if (this.var_names.length == 0) Behave3d.debugExit("Behave3d.StepEngine() contructor received empty 'vars' object");
	
	// Set default values of missing options
	for (var option_name in Behave3d.StepEngine.default_options)
		if (this.options[option_name] === undefined)
			this.options[option_name] = Behave3d.StepEngine.default_options[option_name];
	
	if (this.is_circular) {
		if (this.options.marked_angle === undefined) this.options.marked_angle = -1;
		if (this.options.cycle_len    === undefined) this.options.cycle_len    = Behave3d.consts.ROTATE_ONE_TURN;
	}
	
	this.stop();
};

//---------------------------------------
Behave3d.StepEngine.events = [
	"start", "half", "end",
	"start_back", "half_back", "end_back",
	"pos0", "pos1",
	"cycle", "mark",
	"cycle_back", "mark_back"
];

Behave3d.StepEngine.default_options = {
	ease_type             : "linear",
	ease_amount           : 1,
	ease_mirror           : false,
	half_step             : 1,
	spring_acc            : 0,
	spring_vdamp          : 1,
	always_fire_start_end : true
};

//---------------------------------------
Behave3d.StepEngine.prototype = {};


//---------------------------------------
// Returns the current value of a stepper variable
// @param {String} var_name Name of variable
// @param {Boolean} without_lag Whether to return the current value of the variable without lagging
// @returns {Number} Current value of the stepper variable
Behave3d.StepEngine.prototype.getVar = function(var_name, without_lag)
{
	return (without_lag ? this.vars[var_name] : this.lagged_vars[var_name]);
};

//---------------------------------------
// Sets a new value to a stepper variable
// @param {String} var_name Name of variable
// @param {Number} value New value of the stepper variable
// @param {Boolean} keep_lag If set to true, then the current values for the variable's inertia are kept
Behave3d.StepEngine.prototype.setVar = function(var_name, value, keep_lag)
{
	this.vars[var_name]        = value;
	
	if (!keep_lag) {
		this.lagged_vars[var_name] = value;
		this.vars_speeds[var_name] = 0;
	}
};

//---------------------------------------
// Stops any current movement
Behave3d.StepEngine.prototype.stop = function()
{
	this.direction = 0;
	this.pos       = 0;
};

//---------------------------------------
// Starts a new movement (with supplied duration) from current position to relative target = current position + movement
// @param {Object} movement Object containing target positions for the variables relative to their current positions, format: {var_name1: dval, ...}
// @param {Number} duration Duration in milliseconds of the movement
// @param {Boolean} [is_new_movement] The movement is set only if this param is true or there is no currently-set movement; defaults to true
Behave3d.StepEngine.prototype.setMovement = function(movement, duration, is_new_movement)
{
	if (is_new_movement === undefined) is_new_movement = true;
	
	this.direction      = 0;
	this.duration       = duration;
	
	if (is_new_movement || !this.movement_start) {
		this.movement_start = {};
		this.movement_end   = {};
		this.pos            = 0;
		this.starting_angle = this.vars[this.var_names[0]];
		
		for (var var_name in this.vars) {
			this.movement_start[var_name] = this.vars[var_name];
			this.movement_end[var_name]   = this.vars[var_name] + movement[var_name];
		}
	}

	return true;
};

//---------------------------------------
// Returns true if the stepper is currently in movement
// @returns {Boolean} Whether is currently moving (forward or backward)
Behave3d.StepEngine.prototype.isMoving = function()
{
	return (this.direction != 0);
};

//---------------------------------------
// Initializes variables for start of movement in the supplied direction.
// If already moving in this direction, then current movement continues.
// @param {Number} movement_direction Can be 1 (forward direction) or -1 (backward direction)
// @param {Boolean} from_beginning If true, then movement will not be continued, but new movement will start from the direction's starting position
// @param {Boolean} is_new_movement If true, then current movement will not be continued
// @param {Object} movement Object containing target positions for the variables relative to their current positions, format: {var_name1: dval, ...}
// @param {Number} duration Duration in milliseconds of the movement
Behave3d.StepEngine.prototype.start = function(movement_direction, from_beginning, is_new_movement, movement, duration)
{
	if (movement_direction === undefined) movement_direction = 1;
	if (from_beginning === undefined)     from_beginning     = false;
	if (is_new_movement === undefined)    is_new_movement    = true;
	
	// Set movement parameters
	if (movement)
		this.setMovement(movement, duration, is_new_movement);
	
	var start_pos = (movement_direction == 1) ? this.movement_start : this.movement_end;
	var end_pos   = (movement_direction == 1) ? this.movement_end : this.movement_start;
	
	// Restore last start position if from_beginning == true
	if (from_beginning && this.movement_start)
		for (var var_name in this.vars)
			this.vars[var_name] = start_pos[var_name];	
	
	this.current_movement = {};
	this.current_start    = {};
	for (var var_name in this.vars) {
		this.current_movement[var_name] = end_pos[var_name] - this.vars[var_name];
		this.current_start[var_name]    = this.vars[var_name];
	}
	
	if (this.pos < 0) this.pos = 0;
	else if (this.pos > 1) this.pos = 1;
	
	this.movement_dpos = (from_beginning || is_new_movement) ? 1 : (movement_direction == 1 ? 1 - this.pos : this.pos);
	if (this.movement_dpos > 0 || this.options.always_fire_start_end) {
		this.total_frames  = Math.round(this.duration * this.movement_dpos / Behave3d.vars.frameDuration);
		this.frames_left   = this.total_frames;
		this.direction     = movement_direction;
		this.events_suffix = (this.direction == -1 ? "_back" : "");
		this.current_ease  = (this.ease_mirror && this.direction == -1 ? Behave3d.ease.mirrorMap[this.options.ease_type] : this.options.ease_type);
	
		if (this.total_frames == 0)
			this.update(false);
	}
	else
		this.direction = 0;

	return true;
};

//---------------------------------------
// Called on every frame, this method updates the vars and fires events
// @param {Boolean} is_paused Whether the stepper is currently paused; when paused it processes only the lag, but does not progress the current movement
// @returns {Boolean} Returns true upon finishing the current movement, false in all other cases (no movement or during movement)
Behave3d.StepEngine.prototype.update = function(is_paused)
{
	var is_end_of_movement = false;
	
	if (!is_paused && this.direction != 0) {
		var prev_vars = {};
		for (var var_name in this.vars)
			prev_vars[var_name] = this.vars[var_name];
		
		for (var var_name in this.vars)
			this.vars[var_name] = this.current_start[var_name] +
								Behave3d.ease(this.current_movement[var_name], this.current_ease, this.options.ease_amount, this.total_frames, this.total_frames - this.frames_left, "total");
		
		if (this.events_controller &&
			this.frames_left == this.total_frames)
				this.events_controller.fireEvent("start" + this.events_suffix);
		
		if (this.events_controller &&
			this.frames_left == Math.floor(this.total_frames / 2))
				this.events_controller.fireEvent("half" + this.events_suffix);

		if (this.is_circular) {
			if (this.options.cycle_len > 0 &&
				this.frames_left < this.total_frames)
			{
				var var_name = this.var_names[0];
				if (Behave3d.isAnglePassed(this.starting_angle, this.vars[var_name], prev_vars[var_name], this.options.cycle_len))
					this.events_controller.fireEvent("cycle" + this.events_suffix);
			}
		
			if (this.options.marked_angle != -1)
			{
				var var_name = this.var_names[0];
				if (Behave3d.isAnglePassed(this.options.marked_angle, this.vars[var_name], prev_vars[var_name], this.options.cycle_len))
					this.events_controller.fireEvent("mark" + this.events_suffix);
			}
		}
		
		if (this.frames_left > 0) {
			this.frames_left--;
			this.pos += this.direction * this.movement_dpos / this.total_frames;
		}
		
		if (this.frames_left == 0) {
			for (var var_name in this.vars)
				this.vars[var_name] = (this.direction == 1) ? this.movement_end[var_name] : this.movement_start[var_name];
			
			this.pos       = (this.direction == 1) ? 1 : 0;
			this.direction = 0;
			
			if (this.events_controller) {
				this.events_controller.fireEvent("end" + this.events_suffix);
				this.events_controller.fireEvent("pos" + this.pos);
			}
			
			is_end_of_movement = true;
		}
	}
	
	if (this.options.half_step != 1)
		for (var var_name in this.vars)
			this.lagged_vars[var_name] += (this.vars[var_name] - this.lagged_vars[var_name]) * this.options.half_step;
	
	if (this.options.spring_acc != 0) {
		for (var var_name in this.vars) {
			this.vars_speeds[var_name] += (this.vars[var_name] - this.lagged_vars[var_name]) * this.options.spring_acc;
			this.vars_speeds[var_name] *= this.options.spring_vdamp;
			this.lagged_vars[var_name] += this.vars_speeds[var_name];
		}
	}

	if (this.options.half_step == 1 && this.options.spring_acc == 0)
		for (var var_name in this.vars)
			this.lagged_vars[var_name] = this.vars[var_name];
	
	return is_end_of_movement;
};


//---------------------------------------
Behave3d.startEngine();


// ------------- EOF --------------


