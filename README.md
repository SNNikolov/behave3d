# behave3d

> behave3d is a fast and easy, yet powerful, way to animate HTML elements using the browser's 3D CSS transformations.

For information on how to get started and how to use behave3d, please see [behave3d's site](http://behave3d.net/).
For source files and issues, please visit the [behave3d repo](https://github.com/SNNikolov/behave3d).
The lib is also available as an [npm package](https://www.npmjs.com/package/behave3d).

## Including behave3d

Below are some of the most common ways to include behave3d.

### Script tag

```html
<script src="../node_modules/behave3d/dist/Behave3d_detectPrefixes.js"></script>
<script src="../node_modules/behave3d/dist/Behave3d.js"></script>
<script src="../node_modules/behave3d/dist/controllerActions.js"></script>
<script src="../node_modules/behave3d/dist/controllerScene.js"></script>
<!-- Should also include all controllers that will be used on the page --> 
```

### Babel

[Babel](http://babeljs.io/) is a next generation JavaScript compiler. One of the features is the ability to use ES6/ES2015 modules now, even though browsers do not yet support this feature natively.

```js
import Behave3d from "behave3d";
// This will import the engine and controllers actions(), scene(), origin(), transform(), move(), rotate(), scale(), opacity() and property()
// All other controllers should be imported explicitly like this:
import 'behave3d/dist/controllerTwoSides';
```

### Browserify/Webpack

There are several ways to use [Browserify](http://browserify.org/) and [Webpack](https://webpack.github.io/). For more information on using these tools, please refer to the corresponding project's documention. In the script, including jQuery will usually look like this...

```js
var Behave3d = require("behave3d");
// This will import the engine and controllers actions(), scene(), origin(), transform(), move(), rotate(), scale(), opacity() and property()
// All other controllers should be imported explicitly like this:
require('behave3d/dist/controllerTwoSides');
```
