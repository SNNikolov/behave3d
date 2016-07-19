(function(consts, $, undefined) {

	var doc_style = document.documentElement.style;

	if (doc_style.transform !== undefined)
		consts.CSS_TRANSFORMS_PREFIX = "";
	else if (doc_style.webkitTransform !== undefined)
		consts.CSS_TRANSFORMS_PREFIX = "webkit";
	else if (doc_style.mozTransform !== undefined)
		consts.CSS_TRANSFORMS_PREFIX = "moz";

})((window.behave3dConstants = window.behave3dConstants || {}), jQuery);
