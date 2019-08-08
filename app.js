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
    body : document.body,
    html : document.documentElement,
    loading : document.querySelector('.page-loading__icon')
  },

  get imageWidth() {
    return this.e.img.getAttribute('width');
  },

  get imageHeight() {
    return this.e.img.getAttribute('height');
  },

  get paddingTopBot() {
    return parseInt(
      this.e.body.getAttribute('space-top-bot')
    ) || 0;
  },

  get content_margin()  { 
    return parseInt(
      this.e.content.getAttribute('content-margin')
    ) || 0;
  },

  get br_type() {
    return this.e.panel.getAttribute('breakpoint-type') || 'min-width';
  },

  get max_width() {
    return this.br_type.toLowerCase() === 'max-width';
  },

  config : {
    'width' : undefined,
    'height' : undefined,
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
      return (self.max_width === true) ? (b[0] - a[0]) : (a[0] - b[0]);
    });
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

    // load breakpoints
    this.load_breakpoints();

    return true;
  },

  is_suitable_breakpoint : function(breakpoint, viewPortWidth) {
    var condition;

    if (this.max_width === true) {
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
    if (this.max_width === true) {
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

  prepare_pan : function() {
    // get viewport width and height
    var viewPortWidth = this.e.html.clientWidth;
    var viewPortHeight = this.e.html.clientHeight;

    // Make svg behave like a background image
    var cropX = (this.imageWidth-viewPortWidth)/2;
    var cropY = (this.imageHeight-viewPortHeight)/2;

    // see if we hit a breakpoint
    var breakpoint = this.fetch_breakpoint(viewPortWidth);

    var w, h;

    if (breakpoint === null) {
      w = this.config.width;
      h = this.config.height;
    } else {
      w = breakpoint[1];
      h = breakpoint[2];
    }

    // account for margins in width and height
    var m = (this.content_margin*2);

    var divWidth = this.get_pixel_val(w, viewPortWidth, 'w', m);
    var divHeight = this.get_pixel_val(h, viewPortHeight, 'h', m);
    
    // set panel size
    this.e.panel.style.minWidth = divWidth + 'px';
    this.e.panel.style.minHeight = divHeight + 'px';

    // set svg size
    this.e.svg.style.minWidth = divWidth + 'px';
    this.e.svg.style.minHeight = divHeight + 'px';

    // set body minHeight for padding effect
    this.e.body.style.minHeight = (divHeight + (this.paddingTopBot*2)) + 'px';

    // calculate how much we need to pan
    var panW = (-(viewPortWidth-divWidth)/2) - cropX;
    var panH = (-(viewPortHeight-divHeight)/2) - cropY;

    return [panW, panH];
  },

  pan : function() {
    var pan_pxs = this.prepare_pan();
    var panW = pan_pxs[0];
    var panH = pan_pxs[1];
    this.e.img.setAttribute('transform', 'translate('+panW+' '+panH+')');
  },

  setViewportHeight : function() {
    // fix for android devices to set vh while
    // taking browser interface into account
    var vh = window.innerHeight * 0.01;
    this.e.body.style.setProperty('--vh', vh + 'px');
  },

  init : function() {
    // load config
    var loaded = this.load_config();

    console.log(this.config);

    if (!loaded) {
      this.error('Not loaded.');
      return;
    }

    // set content margin
    this.e.content.style.margin = this.content_margin + 'px';

    // do initial pan
    this.pan();
  },

  started : false,
  bg_img : null,

  ready : function(callback) {
    // Check the background image is loaded before starting frostedPanel
    var img = document.body,
    src = this.e.img.getAttribute('bg-img');

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
  }
}

frostedPanel.init();

frostedPanel.ready(function() {
  var bg_img = frostedPanel.bg_img;

  // Set background image
  document.body.style.backgroundImage = 'url(' + bg_img + ')';

  // Set svg image href
  var img = frostedPanel.e.img;
  img.setAttribute('href', bg_img);

  // Apply blur filter
  img.style.filter = 'url(#blurMe)';
  img.style.WebkitFilter = 'url(#blurMe)';

  // Hide loading and display panel
  frostedPanel.e.loading.style.display = 'none';
  frostedPanel.e.panel.style.display = 'block';
});

window.addEventListener("resize", function() {
  frostedPanel.setViewportHeight();
  frostedPanel.pan();
});
