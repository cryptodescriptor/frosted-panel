// endsWith polyfill IE11
if (!String.prototype.endsWith) {
  String.prototype.endsWith = function(search, this_len) {
      if (this_len === undefined || this_len > this.length) {
          this_len = this.length;
      }
      return this.substring(this_len - search.length, this_len) === search;
  };
}

var frostedPanel = {
  e : {
    img : document.querySelector('image'),
    svg : document.querySelector('svg'),
    panel : document.querySelector('.frosted-panel'),
    content : document.querySelector('.content'),
    html : document.documentElement,
    loading : document.querySelector('.page-loading__icon')
  },

  config : {
    'breakpoints' : []
  },

  error : function(s) {
    console.log(s)
  },

  valid_num : function(str) {
    return (!isNaN(str) && str != "" && str != null);
  },

  validate_wh : function(val) {
    var val = val.toLowerCase();
    var num;

    if (val === 'auto') {
      return true;
    } else if (!val.endsWith('px') && !val.endsWith('%')) {
      return false;
    } else if (val.endsWith('px')) {
      num = this.valid_num(val.replace('px', ''));
    } else if (val.endsWith('%')) {
      num = this.valid_num(val.replace('%', ''));
    }

    return (!num) ? false : true;
  },

  ignoring_breakpoint_err : function(breakpoint) {
    this.error('Ignoring breakpoint: "' + breakpoint + '"');
  },

  invalid_breakpoint_err : function(breakpoint, val, i) {
    var joined = breakpoint.join(' ');

    this.error('Invalid value "' + val + '" at breakpoint: "' + 
      joined + '", index: ' + i);

    this.ignoring_breakpoint_err(joined);
  },

  valid_breakpoint : function(breakpoint) {
    // should be 3 in length
    if (breakpoint.length !== 3) {
      var joined = breakpoint.join(' ');
      this.error('Expected 3 values at breakpoint: "' + joined + '"');
      this.ignoring_breakpoint_err(joined);
      return false;
    }

    // validate actual breakpoint width
    var b = breakpoint[0].toLowerCase();

    // make sure breakpoint ends with px and is a number
    if (!b.endsWith('px') || !this.valid_num(b.replace('px', ''))) {
      this.invalid_breakpoint_err(breakpoint, b, 0);
      return false;
    }

    // validate width and height values
    var val;

    for (var i = 1; i < 3; i++) {
      val = breakpoint[i];

      if (!this.validate_wh(val)) {
        this.invalid_breakpoint_err(breakpoint, val, i);
        return false;
      }
    }
    return true;
  },

  load_breakpoints : function() {
    // check for breakpoint attr
    var panel_breakpoints = this.e.panel.getAttribute('breakpoints');

    // if attribute missing, return
    if (!panel_breakpoints) return;

    var breakpoints = panel_breakpoints.split(',');

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

    var self = this;

    // sort: ascending min-width, descending max-width
    this.config.breakpoints = this.config.breakpoints.sort(function(a, b) {
      return (self.config.maxWidth === true) ? (b[0] - a[0]) : (a[0] - b[0]);
    });
  },

  load_attributes : function() {
      var c = this.config;

      c['imageWidth'] = this.e.img.getAttribute('width');
      c['imageHeight'] = this.e.img.getAttribute('height');

      c['paddingTopBot'] = parseInt(
          document.body.getAttribute('space-top-bot')
        ) || 0;

      c['contentMargin'] = parseInt(
          this.e.content.getAttribute('content-margin')
        ) || 0;

      c['brType'] = this.e.panel.getAttribute('breakpoint-type') || 'min-width';

      c['maxWidth'] = this.config.brType.toLowerCase() === 'max-width';
  },

  load_config : function() {
    var attr = 'panel-dimensions';
    var panel_dimensions = this.e.panel.getAttribute(attr);

    // check attribute exists and isnt empty
    if (!panel_dimensions) {
      this.error('Empty/Missing required attr "'+attr+'"!');
      return false;
    }

    var wh = panel_dimensions.split(' ');

    // verify we have 2 values
    if (wh.length !== 2) {
      this.error('Unexpected length "' + wh.length + '" for "'+attr+'" attr!');
      return false;
    }

    // validate width and height values
    for (var i = 0; i < wh.length; i++) {
      if (!this.validate_wh(wh[i])) {
        this.error('Invalid value "' + wh[0] + '" for "'+attr+'" attr!');
        return false;
      }
    }

    this.config['width'] = wh[0];
    this.config['height'] = wh[1];

    // load the rest of the attributes
    this.load_attributes();

    // load breakpoints
    this.load_breakpoints();

    return true;
  },

  is_suitable_breakpoint : function(breakpoint, viewPortWidth) {
    var condition;

    if (this.config.maxWidth === true) {
      condition = viewPortWidth <= breakpoint[0];
    } else {
      condition = viewPortWidth >= breakpoint[0];
    }

    return (condition === true) ? true : false;
  },

  find_suitable_breakpoint : function(viewPortWidth) {
    var current, breakpoint = null;

    for (var i = 0; i < this.config.breakpoints.length; i++) {
      current = this.config.breakpoints[i];
      if (this.is_suitable_breakpoint(current, viewPortWidth)) {
        breakpoint = current;
        continue;
      }
      break;
    }
    return breakpoint;
  },

  fetch_breakpoint : function(viewPortWidth) {
    // if breakpoints are empty
    if (this.config.breakpoints.length === 0) return null;

    // if we don't currently need a breakpoint
    if (this.config.maxWidth === true) {
      if (viewPortWidth > this.config.breakpoints[0][0]) return null;
    } else {
      if (viewPortWidth < this.config.breakpoints[0][0]) return null;
    }

    return this.find_suitable_breakpoint(viewPortWidth);
  },

  auto : {
    'w' : null,
    'h' : null
  },

  toggle_auto : function(on, type, margin, viewPortWidthOrHeightPx) {
    // Toggles content div width/height between fixed and auto when appropriate
    // in order to be able to effectively calculate actual content 
    // width and preserve content margins
    var a = this.auto[type];
    // Set content width/height to auto before panel width/height is auto
    if (a === null && on === true || a === false && on === true) {
      this.e.content.style[(type === 'w') ? 'width' : 'height'] = 'auto';
      this.auto[type] = true;
    // Set content width/height to fixed before panel width/height is "fixed"
    } else {
      var contentWidthOrHeight = viewPortWidthOrHeightPx - margin;
      this.e.content.style[(type === 'w') ? 'width' : 'height'] = contentWidthOrHeight + 'px';
      this.auto[type] = false;
    }
  },

  get_pixel_val : function(val, viewPortWidthOrHeight, type, margin) {
    if (val.endsWith('%')) {
      var px = (viewPortWidthOrHeight/100)*val.replace('%', '');
      this.toggle_auto(false, type, margin, px);
      return px;
    } else if (val.endsWith('px')) {
      var px = parseInt(val.replace('px', ''));
      this.toggle_auto(false, type, margin, px);
      return px;
    } else if (val.toLowerCase() === 'auto') {
      this.toggle_auto(true, type, margin);
      return ((type === 'w') ? (this.e.content.clientWidth) : this.e.content.clientHeight)+margin;
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
        var scale = (coverHeight / height);
        var coverWidth = width * scale;
    } else {
        // The Width is our constant
        var coverWidth = object.offsetWidth;
        var scale = (coverWidth / width);
        var coverHeight = height * scale;
    }

    return [coverWidth, coverHeight, scale];
  },

  prepare_pan_and_zoom : function() {
    // Get viewport width and height
    var viewPortWidth = this.e.html.clientWidth;
    var viewPortHeight = this.e.html.clientHeight;

    // See if we hit a breakpoint
    var breakpoint = this.fetch_breakpoint(viewPortWidth);

    var w, h;

    if (breakpoint === null) {
      w = this.config.width;
      h = this.config.height;
    } else {
      w = breakpoint[1];
      h = breakpoint[2];
    }

    // Account for margins in width and height
    var m = (this.config.contentMargin*2);

    var divWidth = this.get_pixel_val(w, viewPortWidth, 'w', m);
    var divHeight = this.get_pixel_val(h, viewPortHeight, 'h', m);
    
    // Set panel size
    this.e.panel.style.minWidth = divWidth + 'px';
    this.e.panel.style.minHeight = divHeight + 'px';

    // Set svg size
    this.e.svg.style.minWidth = divWidth + 'px';
    this.e.svg.style.minHeight = divHeight + 'px';

    // Set body minHeight for padding effect
    document.body.style.minHeight = (divHeight + (this.config.paddingTopBot*2)) + 'px';

    // Get size of scaled background image
    var width_height_scale = this.calc_cover_size();
    var imageWidth = width_height_scale[0];
    var imageHeight = width_height_scale[1];

    // Make svg behave like a centered background image
    var cropX = (imageWidth-viewPortWidth)/2;
    var cropY = (imageHeight-viewPortHeight)/2;

    // Calculate how much we need to pan
    var panW = (-(viewPortWidth-divWidth)/2) - cropX;
    var panH = (-(viewPortHeight-divHeight)/2) - cropY;

    var scale = width_height_scale[2];

    return [panW, panH, scale];
  },

  pan_and_zoom : function() {
    var panW_panH_scale = this.prepare_pan_and_zoom();
    var panW = panW_panH_scale[0];
    var panH = panW_panH_scale[1];
    var scale = panW_panH_scale[2];
    this.e.img.setAttribute('transform', 'translate('+panW+' '+panH+') scale('+scale+')');
  },

  started : false,
  bg_img : null,

  ready : function(callback) {
    // Check the background image is loaded before starting frostedPanel
    var src = this.e.img.getAttribute('bg-img');

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

  init : function() {
    var bg = this.bg_img;

    // Set background image
    document.body.style.backgroundImage = 'url(' + bg + ')';

    var img = this.e.img;

    // Set svg image href
    img.setAttribute('href', bg);

    // Apply blur filter
    img.style.filter = 'url(#blurMe)';
    img.style.WebkitFilter = 'url(#blurMe)';

    // Set content margin
    this.e.content.style.margin = frostedPanel.config.contentMargin + 'px';

    // Start Resize Listener
    window.addEventListener("resize", function() {
      frostedPanel.pan_and_zoom();
    });

    // Do initial pan and zoom
    this.pan_and_zoom();

    // Hide loading and display panel
    this.e.loading.style.display = 'none';
    this.e.panel.style.visibility = 'visible';
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
