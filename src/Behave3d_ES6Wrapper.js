//---------------------------------------
// A quick and dirty ES6 module wrapper for the behave3d lib
//---------------------------------------

import './Behave3d_detectPrefixes';
import './Behave3d';

// Import common controllers
import './controllerActions';
import './controllerScene';
import './controllerOrigin';
import './controllerTransform';
import './controllerMove';
import './controllerRotate';
import './controllerScale';
import './controllerOpacity';
import './controllerProperty';

export default window.Behave3d;