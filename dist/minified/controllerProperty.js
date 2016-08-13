"use strict";Behave3d.controllerProperty=function(a){Behave3d.Controller.call(this,a)};Behave3d.controllerProperty.prototype=Object.create(Behave3d.Controller.prototype);Behave3d.controllerProperty.prototype.events=["start","half","end","start_back","half_back","end_back","pos0","pos1"];Behave3d.controllerProperty.prototype.messages=["start","start_back","start_reverse","start_new","start_new_back","pos0","pos1"];Behave3d.controllerProperty.prototype.default_params={name:"",val:"same",dval:0,init_val:"same",is_v_coo:!1,suffix:"",precision:0,duration:1000,half_step:1,spring_acc:0,spring_vdamp:0.92,ease_type:"ease",ease_amount:1,ease_mirror:!1,read_on_start:!1,repeat_start_pos:!1,register_actions:!1};Behave3d.controllerProperty.prototype.construct=function(a,b){if(b=="params"){this.property_container=this.targets[0];this.container_name="";var c=this.name.split(".");if(c.length==2){this.name=c[1];this.container_name=c[0];this.property_container=this.property_container[this.container_name]}if(this.suffix=="#"){var d=this.init_val==="same"?this.readValue():this.getColorObject(this.init_val)}else{var e=this.init_val==="same"?this.readValue():Behave3d.params.getLength(this.init_val,this.is_v_coo?"Y":"X",this.owner.element,["same"]),d={val:e}}this.stepper=new Behave3d.StepEngine(d,!1,this,this);this.last_val=void 0}else if(b=="events"){this.setEventHandlers()}};Behave3d.controllerProperty.prototype.message=function(a,b){if(this.handleCommonMessage(a,b))return this;b=this.setMessageParams(a,b);this.direction=a=="start"||a=="start_new"||a=="pos1"||a=="start_reverse"&&this.direction!=1?1:-1;var c=a=="pos0"||a=="pos1"?0:this.duration,d=a=="start_new"||a=="start_new_back";if(this.read_on_start){var e=this.readValue();if(this.suffix=="#"){var f=this.stepper.getVar("colR")!=e.colR||this.stepper.getVar("colG")!=e.colG||this.stepper.getVar("colB")!=e.colB;if(f){this.stepper.setVar("colR",e.colR);this.stepper.setVar("colG",e.colG);this.stepper.setVar("colB",e.colB)}}else{var f=this.stepper.getVar("val")!=e;if(f)this.stepper.setVar("val",e)}}var g=b.val!==void 0&&b.dval===void 0;if(this.suffix=="#"){var h=this.val==="same"?this.val:this.getColorObject(this.val),j=this.dval===0?this.dval:this.getColorObject(this.dval),k={colR:!g&&j!==0?j.colR:h==="same"?0:h.colR-this.stepper.getVar("colR",!0),colG:!g&&j!==0?j.colG:h==="same"?0:h.colG-this.stepper.getVar("colG",!0),colB:!g&&j!==0?j.colB:h==="same"?0:h.colB-this.stepper.getVar("colB",!0)}}else{var h=Behave3d.params.getLength(this.val,this.is_v_coo?"Y":"X",this.owner.element,["same"]),j=Behave3d.params.getLength(this.dval,this.is_v_coo?"Y":"X",this.owner.element),k={val:!g&&j!=0?j:h==="same"?0:h-this.stepper.getVar("val",!0)}}this.stepper.start(this.direction,this.repeat_start_pos,d,k,c);this.paused=!1;return this};Behave3d.controllerProperty.prototype.update=function(){this.stepper.update(this.paused);if(this.suffix=="#"){var a=this.getColorHex({colR:this.stepper.getVar("colR").toFixed(0),colG:this.stepper.getVar("colG").toFixed(0),colB:this.stepper.getVar("colB").toFixed(0)})}else{var a=this.stepper.getVar("val").toFixed(this.precision);if(a==-0)a=0;a+=this.suffix}if(a!==this.last_val){for(var i=0;i<this.targets.length;i++){(this.container_name?this.targets[i][this.container_name]:this.targets[i])[this.name]=a}this.last_val=a}};Behave3d.controllerProperty.prototype.setEventHandlers=function(){this.registerActions(this.register_actions,{show:"start_back",hide:"start",show_immediately:"pos0",hide_immediately:"pos1"},{show_start:"start_back",show_end:"end_back",hide_start:"start",hide_end:"end",move_start:"start",move_end:"end"})};Behave3d.controllerProperty.prototype.readValue=function(){var a=this.property_container[this.name];if(a===""&&this.property_container==this.owner.element.style)a=window.getComputedStyle(this.owner.element,null).getPropertyValue(this.name);if(this.suffix=="#")return this.getColorObject(a.substr(1));if(typeof a=="string"&&this.suffix)a=a.substr(0,a.length-this.suffix.length);return Number(a)};Behave3d.controllerProperty.prototype.getColorObject=a=>{var b=parseInt(a.substr(1,2),16),c=parseInt(a.substr(3,2),16),d=parseInt(a.substr(5,2),16);return{colR:b,colG:c,colB:d}};Behave3d.controllerProperty.prototype.getColorHex=a=>{var b=Number(Math.max(0,Math.min(a.colR,255))).toString(16),c=Number(Math.max(0,Math.min(a.colG,255))).toString(16),d=Number(Math.max(0,Math.min(a.colB,255))).toString(16);if(b.length==1)b="0"+b;if(c.length==1)c="0"+c;if(d.length==1)d="0"+d;return"#"+b+c+d};Behave3d.registerController("property",Behave3d.controllerProperty);