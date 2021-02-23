// endsWith polyfill IE11
if (!String.prototype.endsWith) {
  String.prototype.endsWith = function(search, this_len) {
      if (this_len === undefined || this_len > this.length) {
          this_len = this.length;
      }
      return this.substring(this_len - search.length, this_len) === search;
  };
}

/* Frosted Panel - sourced from https://github.com/cryptodescriptor/frosted-panel */

var frostedPanel = {
  e : {
    img : document.querySelector('image'),
    svg : document.querySelector('svg'),
    panel : document.querySelector('.frosted-panel'),
    content : document.querySelector('.content'),
    html : document.documentElement
  },

  config : {
    'breakpoints' : []
  },

  error : function(s) {
    console.log(s);
    return false;
  },

  valid_num : function(str) {
    return (!isNaN(str) && str != "" && str != null);
  },

  validate_wh : function(val) {
    var val = val.toLowerCase();
    var valid_num = false;

    if (val === 'auto') {
      return true;
    } else if (!val.endsWith('px') && !val.endsWith('%')) {
      return false;
    } else if (val.endsWith('px')) {
      valid_num = this.valid_num(val.replace('px', ''));
    } else if (val.endsWith('%')) {
      valid_num = this.valid_num(val.replace('%', ''));
    }

    return valid_num;
  },

  ignoring_breakpoint_err : function(breakpoint) {
    return this.error('Ignoring breakpoint: "' + breakpoint + '"');
  },

  invalid_breakpoint_err : function(breakpoint, val, i) {
    var joined = breakpoint.join(' ');
    this.error('Invalid value "' + val + '" at breakpoint: "' + joined + '", index: ' + i);
    return this.ignoring_breakpoint_err(joined);
  },

  valid_breakpoint_arg_length : function(breakpoint) {
    if (breakpoint.length !== 3) {
      var joined = breakpoint.join(' ');
      this.error('Expected 3 values at breakpoint: "' + joined + '"');
      return this.ignoring_breakpoint_err(joined);
    }
    return true;
  },

  valid_breakpoint_property : function(breakpoint) {
    var b = breakpoint[0].toLowerCase();
    // make sure breakpoint ends with px and is a number
    if (!b.endsWith('px') || !this.valid_num(b.replace('px', ''))) {
      return this.invalid_breakpoint_err(breakpoint, b, 0);
    }
    return true;
  },

  valid_breakpoint_values : function(breakpoint) {
    // validate width and height values
    var val;

    for (var i = 1; i < 3; i++) {
      val = breakpoint[i];

      if (!this.validate_wh(val)) {
        return this.invalid_breakpoint_err(breakpoint, val, i);
      }
    }
    return true;
  },

  valid_breakpoint : function(breakpoint) {
    if (
        !this.valid_breakpoint_arg_length(breakpoint) ||
        !this.valid_breakpoint_property(breakpoint) ||
        !this.valid_breakpoint_values(breakpoint)
      ) {
      return false;
    }
    return true;
  },

  store_valid_breakpoints : function(breakpoints) {
    var breakpoint;

    for (var i = 0; i < breakpoints.length; i++) {
      // breakpoint, width, height
      breakpoint = breakpoints[i].trim().split(' ');

      // store breakpoint as a number
      if (this.valid_breakpoint(breakpoint)) {
        breakpoint[0] = parseInt(breakpoint[0]);
        this.config.breakpoints.push(breakpoint);
      }
    }
  },

  load_breakpoints : function() {
    // check for breakpoint attr
    var panel_breakpoints = this.e.panel.getAttribute('breakpoints');

    // if attribute missing, return
    if (!panel_breakpoints) return;

    // parse and store valid breakpoints
    var breakpoints = panel_breakpoints.split(',');
    this.store_valid_breakpoints(breakpoints);

    // sort: ascending min-width, descending max-width
    this.config.breakpoints = this.config.breakpoints.sort(function(a, b) {
      return (frostedPanel.config.brType === 'max-width') ? (b[0] - a[0]) : (a[0] - b[0]);
    });
  },

  valid_breakpoint_type : function(brType) {
    var brTypes = ['min-width', 'max-width'];

    if (brTypes.indexOf(brType.toLowerCase()) === -1) {
      return this.error('Invalid breakpoint-type attribute!');
    }

    return true;
  },

  load_attributes : function() {
      var c = this.config;

      c['imageWidth'] = this.e.img.getAttribute('width');
      c['imageHeight'] = this.e.img.getAttribute('height');
      c['spaceTopBot'] = parseInt(document.body.getAttribute('space-top-bot')) || 0;
      c['contentMargin'] = parseInt(this.e.content.getAttribute('content-margin')) || 0;

      var brType = this.e.panel.getAttribute('breakpoint-type') || 'min-width';

      if (!this.valid_breakpoint_type(brType)) return false;

      c['brType'] = brType;

      return true;
  },

  attribute_exists : function(attr) {
    return (!attr) ? this.error('Empty/Missing required attr "' + attr + '"!') : true;
  },

  valid_attribute_length : function(attr, wh) {
    if (wh.length !== 2) {
      return this.error('Unexpected length "' + wh.length + '" for "' + attr + '" attr!');
    }
    return true;
  },

  valid_panel_wh_values(attr, wh) {
    for (var i = 0; i < wh.length; i++) {
      if (!this.validate_wh(wh[i])) {
        return this.error('Invalid value "' + wh[0] + '" for "' + attr + '" attr!');
      }
    }
    return true;
  },

  load_config : function() {
    var attr = 'panel-dimensions';
    var panel_dimensions = this.e.panel.getAttribute(attr);

    if (!this.attribute_exists(panel_dimensions)) return false;

    var wh = panel_dimensions.split(' ');

    if (!this.valid_attribute_length(attr, wh) || !this.valid_panel_wh_values(attr, wh)) {
      return false;
    }

    this.config['width'] = wh[0];
    this.config['height'] = wh[1];

    // load the rest of the attributes
    if (!this.load_attributes()) return false;

    // load breakpoints
    this.load_breakpoints();

    return true;
  },

  is_suitable_breakpoint : function(breakpoint) {
    return window.matchMedia('('+this.config.brType+': '+breakpoint[0]+'px)').matches;
  },

  find_suitable_breakpoint : function() {
    var breakpoint = null;

    for (var i = this.config.breakpoints.length-1; i >= 0; i--) {
      if (this.is_suitable_breakpoint(this.config.breakpoints[i])) {
        breakpoint = this.config.breakpoints[i];
        break;
      }
    }

    return breakpoint;
  },

  fetch_breakpoint : function() {
    // if breakpoints are empty
    if (this.config.breakpoints.length === 0) return null;

    // if we don't currently need a breakpoint
    if (!this.is_suitable_breakpoint(this.config.breakpoints[0])) {
      return null;
    }

    return this.find_suitable_breakpoint();
  },

  auto : {
    'w' : null,
    'h' : null
  },

  toggle_auto : function(type, w_or_h) {
    this.e.content.style[w_or_h] = 'auto';
    this.e.panel.style[w_or_h] = 'auto';
    this.auto[type] = true;
  },

  toggle_fixed : function(w_or_h, type, panelWidthOrHeightPx) {
    this.e.content.style[w_or_h] = panelWidthOrHeightPx - (this.config.contentMargin*2) + 'px';
    this.e.panel.style[w_or_h] = panelWidthOrHeightPx + 'px';
    this.auto[type] = false;
  },

  toggle_auto_or_fixed : function(toggle_auto, type, panelWidthOrHeightPx) {
    var w_or_h = (type === 'w') ? 'width' : 'height';

    if ((toggle_auto === true) && (this.auto[type] === false || this.auto[type] === null)) {
      this.toggle_auto(type, w_or_h);
    } else if (toggle_auto === false) {
      this.toggle_fixed(w_or_h, type, panelWidthOrHeightPx);
    }
  },

  set_percentage : function(viewportWidthOrHeight, val, type) {
    var px = (viewportWidthOrHeight/100)*val.replace('%', '');
    this.toggle_auto_or_fixed(false, type, px);
    return px;
  },

  set_fixed : function(val, type) {
    var px = parseInt(val.replace('px', ''));
    this.toggle_auto_or_fixed(false, type, px);
    return px;
  },

  set_auto : function(type) {
    var m = (this.config.contentMargin*2);
    this.toggle_auto_or_fixed(true, type);
    return ((type === 'w') ? (this.e.content.clientWidth+m) : (this.e.content.clientHeight+m));
  },

  set_pixel_val : function(val, viewportWidthOrHeight, type) {
    if (val.endsWith('%')) {
      return this.set_percentage(viewportWidthOrHeight, val, type);
    } else if (val.endsWith('px')) {
      return this.set_fixed(val, type);
    } else if (val.toLowerCase() === 'auto') {
      return this.set_auto(type);
    }
  },

  calc_cover_size : function() {
    // calculate the size of the scaled bg image
    var width = this.config.imageWidth;
    var height = this.config.imageHeight;

    var object = document.body;

    // Step 1 - Get the ratio of the div + the image
    var imageRatio = width/height;
    var coverRatio = object.offsetWidth/object.offsetHeight;

    // Step 2 - Work out which ratio is greater
    if (imageRatio >= coverRatio) {
      // The Height is our constant
      var coverHeight = object.offsetHeight;
      var scale = coverHeight / height;
      var coverWidth = width * scale;
    } else {
      // The Width is our constant
      var coverWidth = object.offsetWidth;
      var scale = coverWidth / width;
      var coverHeight = height * scale;
    }

    return [coverWidth, coverHeight, scale];
  },

  set_panel_width_and_height : function(viewportWidth, viewportHeight) {
    // See if we hit a breakpoint
    var breakpoint = this.fetch_breakpoint();

    if (breakpoint === null) {
      var w = this.config.width;
      var h = this.config.height;
    } else {
      var w = breakpoint[1];
      var h = breakpoint[2];
    }

    // Convert to pixels and set width + height
    var w = this.set_pixel_val(w, viewportWidth, 'w');
    var h = this.set_pixel_val(h, viewportHeight, 'h');

    // Return w,h so we can calc pan + zoom values
    return [w, h];
  },
  
  previous_viewport_w : null,
  previous_viewport_h : null,

  viewport_size_not_changed : function(viewportWidth, viewportHeight) {
    return (
        this.previous_viewport_w === viewportWidth &&
        this.previous_viewport_h === viewportHeight
      );
  },

  get_device_width_and_height : function() {
    return [
      (window.innerWidth) ? window.innerWidth : document.documentElement.clientWidth,
      (window.innerHeight) ? window.innerHeight : document.documentElement.clientHeight
    ];
  },

  prepare_pan_and_zoom : function() {
    // Get viewport width and height
    var viewPortWH = this.get_device_width_and_height();
    var viewportWidth = viewPortWH[0];
    var viewportHeight = viewPortWH[1];
    
    // Don't need to do anything if viewport size didn't change
    if (this.viewport_size_not_changed(viewportWidth, viewportHeight)) {
      return null;
    }

    this.previous_viewport_w = viewportWidth;
    this.previous_viewport_h = viewportWidth;

    // Set Panel width and height
    var wh = this.set_panel_width_and_height(viewportWidth, viewportHeight);
    var panelW = wh[0];
    var panelH = wh[1];

    // Set html minHeight for padding effect
    this.e.html.style.minHeight = (panelH + (this.config.spaceTopBot*2)) + 'px';

    // Get size of scaled background image
    var width_height_scale = this.calc_cover_size();
    var imageWidth = width_height_scale[0];
    var imageHeight = width_height_scale[1];

    // Make svg behave like a centered background image
    var cropX = (imageWidth-viewportWidth)/2;
    var cropY = (imageHeight-viewportHeight)/2;

    // Calculate how much we need to pan
    var panW = -(viewportWidth-panelW)/2 - cropX;
    var panH = -(viewportHeight-panelH)/2 - cropY;

    var scale = width_height_scale[2];

    return [panW, panH, scale];
  },

  pan_and_zoom : function() {
    var panW_panH_scale = this.prepare_pan_and_zoom();
    if (panW_panH_scale === null) return;
    var panW = panW_panH_scale[0];
    var panH = panW_panH_scale[1];
    var scale = panW_panH_scale[2];
    this.e.img.setAttribute('transform', 'translate('+panW+' '+panH+') scale('+scale+')');
  },

  started : false,
  bg_img : null,

  ready : function(callback) {
    // Check the background image is loaded before starting frostedPanel
    var src = this.e.img.getAttribute('xlink:href');

    this.bg_img = src;
    
    var img = new Image();

    img.onload = function() {
      if (!this.started) { 
        this.started = true;
        callback();
      }
    }

    img.src = src;

    if (img.complete) img.onload();
  },
  
  start_panel : function() {
    // Start Resize Listener
    window.addEventListener("resize", function() {
      frostedPanel.pan_and_zoom();
    });

    // Do initial pan and zoom
    this.pan_and_zoom();

    // Hide loading and display panel
    window.parent.postMessage('hideLoad', '*');
    this.e.panel.style.visibility = 'visible';
  },

  init : function() {
    var bg = this.bg_img;

    // Set background image
    document.body.style.backgroundImage = 'url(' + bg + ')';

    // Set content margin
    this.e.content.style.margin = frostedPanel.config.contentMargin + 'px';

    window.onload = function() {
      frostedPanel.start_panel();
    };
  }
}

var loaded = frostedPanel.load_config();

if (loaded) {
  frostedPanel.ready(function() {
    frostedPanel.init();
  });
} else {
  frostedPanel.error('frostedPanel aborted!');
}