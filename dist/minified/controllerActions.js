"use strict";Behave3d.controllerActions=function(a){Behave3d.Controller.call(this,a)};Behave3d.controllerActions.prototype=Object.create(Behave3d.Controller.prototype);Behave3d.controllerActions.prototype.events=[];Behave3d.controllerActions.prototype.messages=["remove_element","pause","unpause"];Behave3d.controllerActions.prototype.default_params={};Behave3d.controllerActions.prototype.DOMEvents=["click","dblclick","mouseover","mouseout","mousedown","mouseup","mousemove","dragstart","drag","dragenter","dragleave","dragover","dragend","drop","keydown","keypress","keyup","load","unload","abort","error","resize","scroll","focus","blur","focusin","focusout","select","change","submit","reset"];Behave3d.controllerActions.prototype.construct=function(a,b){if(b=="params"){this.handledDOMEvents=[];this.handledDOMEvents_useCapture=[];this.eventHandler=this.eventHandler.bind(this);this.eventHandler_useCapture=this.eventHandler_useCapture.bind(this);this.originalDisplay=window.getComputedStyle(this.owner.element,null).getPropertyValue("display");if(this.originalDisplay=="none")this.originalDisplay="block"}else if(b=="events"){}};Behave3d.controllerActions.prototype.message=function(a,b){if(a=="remove_element"){this.owner.removeFromPool();this.owner.element.parentNode.removeChild(this.owner.element)}else if(a=="pause"||a=="unpause"){var c=a=="pause";for(var i=0;i<this.owner.controllers.length;i++){this.owner.controllers[i].set({paused:c})}}var d=this.fireEvent(a,b);if(a=="show"&&!d)this.owner.element.style.display=this.originalDisplay;else if(a=="hide"&&!d){this.originalDisplay=window.getComputedStyle(this.owner.element,null).getPropertyValue("display");this.owner.element.style.display="none"}return this};Behave3d.controllerActions.prototype.addEventHandler=function(a,b){Behave3d.Controller.prototype.addEventHandler.call(this,a,b);var c=a.substr(-8)=="_capture";if(c)a=a.substr(0,a.length-8);var d=c?this.handledDOMEvents_useCapture:this.handledDOMEvents;if(this.DOMEvents.indexOf(a)>=0&&d.indexOf(a)==-1){var e=c?this.eventHandler_useCapture:this.eventHandler;this.owner.element.addEventListener(a,e,c);d.push(a)}};Behave3d.controllerActions.prototype.eventHandler=function(a){var b={event:a};this.fireEvent(a.type,b)};Behave3d.controllerActions.prototype.eventHandler_useCapture=function(a){var b={event:a};this.fireEvent(a.type+"_capture",b)};Behave3d.registerController("actions",Behave3d.controllerActions);