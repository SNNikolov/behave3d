"use strict";Behave3d.controllerFocusZoom=function(a){Behave3d.Controller.call(this,a)};Behave3d.controllerFocusZoom.prototype=Object.create(Behave3d.Controller.prototype);Behave3d.controllerFocusZoom.prototype.events=["focus","blur"];Behave3d.controllerFocusZoom.prototype.messages=["focus","blur"];Behave3d.controllerFocusZoom.prototype.default_params={scale:1.4,dz:30,dx:0,dy:0,target_id:"",speed_dampening:0.72,speed_acc:0.1};Behave3d.controllerFocusZoom.prototype.construct=function(a,b){if(b=="params"){this.is_focused=!1;this.current_pos=0;this.vpos=0;if(this.target_id!="")this.targets=[this.owner.getDOMElement(this.target_id)];this.makeTargetsDom3d(!0)}else if(b=="events"){this.set("focus on: @targets a focus_capture, blur on: @targets a blur_capture")}};Behave3d.controllerFocusZoom.prototype.message=function(a,b){if(this.handleCommonMessage(a,b))return this;b=this.setMessageParams(a,b);if(a=="focus"){if(!this.is_focused){this.is_focused=!0;this.fireEvent("focus")}}else if(a=="blur"){if(this.is_focused){this.is_focused=!1;this.fireEvent("blur")}}return this};Behave3d.controllerFocusZoom.prototype.update=function(){if(this.paramsHaveChanged()||!this.computed_params)this.computed_params=this.getComputedLengths(["dx"],["dy"],["dz"]);if(this.is_focused)this.vpos+=(1-this.current_pos)*this.speed_acc;else this.vpos-=this.current_pos*this.speed_acc;this.vpos=this.vpos*this.speed_dampening;if(!this.paused)this.current_pos+=this.vpos;var a=1+this.current_pos*(this.scale-1),b=Math.max(0,this.current_pos*this.computed_params.dz),c=this.current_pos*this.computed_params.dx,d=this.current_pos*this.computed_params.dy;this.addTransform({type:Behave3d.transforms.translate,dx:c,dy:d,dz:b});this.addTransform({type:Behave3d.transforms.scale,sx:a,sy:a,sz:1})};Behave3d.registerController("focusZoom",Behave3d.controllerFocusZoom);