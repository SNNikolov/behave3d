"use strict";Behave3d.controllerSlow=function(a){Behave3d.Controller.call(this,a,!0)};Behave3d.controllerSlow.prototype=Object.create(Behave3d.Controller.prototype);Behave3d.controllerSlow.prototype.default_params={damping_factor:0.95};Behave3d.controllerSlow.prototype.construct=(a,b)=>{if(b=="params"){}};Behave3d.controllerSlow.prototype.update=function(){if(this.paused)return;this.applySpeedDamping(this.damping_factor)};Behave3d.registerController("slow",Behave3d.controllerSlow);