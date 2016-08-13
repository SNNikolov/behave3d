"use strict";Behave3d.controllerRotate=function(a){Behave3d.Controller.call(this,a)};Behave3d.controllerRotate.prototype=Object.create(Behave3d.Controller.prototype);Behave3d.controllerRotate.prototype.events=["start","half","end","cycle","mark","start_back","half_back","end_back","cycle_back","mark_back","pos0","pos1"];Behave3d.controllerRotate.prototype.messages=["start","start_back","start_reverse","start_new","start_new_back","pos0","pos1"];Behave3d.controllerRotate.prototype.default_params={duration:1000,init_angle:0,angle:0,x:0,y:0,z:0,marked_angle:-1,half_step:1,spring_acc:0,spring_vdamp:0.92,register_actions:!1,repeat_start_pos:!1,ease_type:"ease",ease_amount:1,ease_mirror:!1};Behave3d.controllerRotate.prototype.construct=function(a,b){if(b=="params"){this.stepper=new Behave3d.StepEngine({angle:this.init_angle},!0,this,this)}else if(b=="events"){this.setEventHandlers()}};Behave3d.controllerRotate.prototype.message=function(a,b){if(this.handleCommonMessage(a,b))return this;b=this.setMessageParams(a,b);this.direction=a=="start"||a=="start_new"||a=="pos1"||a=="start_reverse"&&this.direction!=1?1:-1;var c=a=="pos0"||a=="pos1"?0:this.duration,d=a=="start_new"||a=="start_new_back";this.stepper.start(this.direction,this.repeat_start_pos,d,{angle:this.angle},c);this.paused=!1;return this};Behave3d.controllerRotate.prototype.update=function(){this.stepper.update(this.paused);this.addTransform({type:Behave3d.transforms.rotate,rx:this.x,ry:this.y,rz:this.z,ra:this.stepper.getVar("angle")})};Behave3d.controllerRotate.prototype.setEventHandlers=function(){this.registerActions(this.register_actions,{show:"start_back",hide:"start",show_immediately:"pos0",hide_immediately:"pos1"},{show_start:"start_back",show_end:"end_back",hide_start:"start",hide_end:"end"})};Behave3d.registerController("rotate",Behave3d.controllerRotate);