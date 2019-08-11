// Color Cycling in HTML5 Canvas
// BlendShift Technology conceived, designed and coded by Joseph Huckaby
// Copyright (c) 2001-2002, 2010 Joseph Huckaby.
// Released under the LGPL v3.0: http://www.opensource.org/licenses/lgpl-3.0.html

FrameCount.visible = false;

var CanvasCycle = {
  cookie: new CookieTree(),
  query: parseQueryString(location.href),
  ctx: null,
  imageData: null,
  clock: 0,
  inGame: false,
  bmp: null,
  globalTimeStart: new Date().getTime(),
  inited: false,
  optTween: null,
  winSize: null,
  globalBrightness: 1.0,
  transitionDuration: 512,
  lastBrightness: 0,
  sceneIdx: 7,
  highlightColor: -1,
  defaultMaxVolume: 0.5,

  TL_WIDTH: 80,
  TL_MARGIN: 15,
  OPT_WIDTH: 150,
  OPT_MARGIN: 15,

  settings: {
    showOptions: false,
    targetFPS: 60,
    zoomFull: false,
    blendShiftEnabled: true,
    speedAdjust: 1.0,
    sound: false
  },

  contentSize: {
    width: 640,
    optionsWidth: 0,
    height: 480 + 40,
    scale: 1.0
  },

  init: function() {
    // called when DOM is ready
    if (!this.inited) {
      this.inited = true;

      FrameCount.init();

      // pick starting scene
      var initialSceneIdx = Math.floor(Math.random() * scenes.length);
      if (!scenes[initialSceneIdx].path) {
        initialSceneIdx = 0;
      }

      // read prefs from cookie
      var prefs = this.cookie.get("settings");
      if (!prefs)
        prefs = {
          showOptions: false,
          targetFPS: 60,
          zoomFull: false,
          blendShiftEnabled: true,
          speedAdjust: 1.0,
          sound: false
        };

      // allow query to override prefs
      for (var key in this.query) {
        prefs[key] = this.query[key];
      }

      if (prefs) {
        this.setRate(prefs.targetFPS);
        this.setSpeed(prefs.speedAdjust);
        this.setBlendShift(prefs.blendShiftEnabled);
      }

      // start synced to local time
      var now = new Date();
      this.timeOffset =
        now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

      // load initial scene
      this.sceneIdx = initialSceneIdx;
      var path = require("path");
      var scenePath = path.join(__dirname + scenes[initialSceneIdx].path);
      var sceneToLoad = require(scenePath);
      this.initScene(sceneToLoad);

      // Start 30 sec scene shuffle interval
      this.startShuffle();
    }
  },

  switchScene: function(sceneIndex) {
    // Switch to new scene
    this.sceneIdx = sceneIndex;

    TweenManager.removeAll({ category: "scenefade" });
    TweenManager.tween({
      target: { value: this.globalBrightness, newSceneIdx: this.sceneIdx },
      duration: this.transitionDuration,
      mode: "EaseInOut",
      algo: "Quadratic",
      props: { value: 0.0 },
      onTweenUpdate: function(tween) {
        CanvasCycle.globalBrightness = tween.target.value;
      },
      onTweenComplete: function(tween) {
        var path = require("path");
        var scenePath = path.join(
          __dirname + scenes[tween.target.newSceneIdx].path
        );
        var sceneToLoad = require(scenePath);
        CanvasCycle.initScene(sceneToLoad);
      },
      category: "scenefade"
    });
  },

  loadScene: function(idx) {
    this.stop();
    var scene = scenes[idx];
    var url =
      "scene.php?file=" +
      scene.name +
      "&month=" +
      scene.month +
      "&script=" +
      scene.scpt +
      "&callback=CanvasCycle.initScene";
    var scr = document.createElement("SCRIPT");
    scr.type = "text/javascript";
    scr.src = url;
    document.getElementsByTagName("HEAD")[0].appendChild(scr);
  },

  initScene: function(scene) {
    // initialize, receive image data from server
    this.initPalettes(scene.palettes);
    this.initTimeline(scene.timeline);

    // force a full palette and pixel refresh for first frame
    this.oldTimeOffset = -1;

    // create an intermediate palette that will hold the time-of-day colors
    this.todPalette = new Palette(scene.base.colors, scene.base.cycles);

    // process base scene image
    this.bmp = new Bitmap(scene.base);
    this.bmp.optimize();

    var canvas = document.getElementById("mycanvas");
    if (!canvas.getContext) return; // no canvas support

    if (!this.ctx) this.ctx = canvas.getContext("2d");
    this.ctx.clearRect(0, 0, this.bmp.width, this.bmp.height);
    this.ctx.fillStyle = "rgb(0,0,0)";
    this.ctx.fillRect(0, 0, this.bmp.width, this.bmp.height);

    if (!this.imageData) {
      if (this.ctx.createImageData) {
        this.imageData = this.ctx.createImageData(
          this.bmp.width,
          this.bmp.height
        );
      } else if (this.ctx.getImageData) {
        this.imageData = this.ctx.getImageData(
          0,
          0,
          this.bmp.width,
          this.bmp.height
        );
      } else return; // no canvas data support
    }
    this.bmp.clear(this.imageData);

    if (ua.mobile) {
      // no transition on mobile devices
      this.globalBrightness = 1.0;
    } else {
      this.globalBrightness = 0.0;
      TweenManager.removeAll({ category: "scenefade" });
      TweenManager.tween({
        target: { value: 0 },
        duration: this.transitionDuration,
        mode: "EaseInOut",
        algo: "Quadratic",
        props: { value: 1.0 },
        onTweenUpdate: function(tween) {
          CanvasCycle.globalBrightness = tween.target.value;
        },
        category: "scenefade"
      });
    }

    this.run();
  },

  initPalettes: function(pals) {
    // create palette objects for each raw time-based palette
    var scene = scenes[this.sceneIdx];

    this.palettes = {};
    for (var key in pals) {
      var pal = pals[key];

      if (scene.remap) {
        for (var idx in scene.remap) {
          pal.colors[idx][0] = scene.remap[idx][0];
          pal.colors[idx][1] = scene.remap[idx][1];
          pal.colors[idx][2] = scene.remap[idx][2];
        }
      }

      var palette = (this.palettes[key] = new Palette(pal.colors, pal.cycles));
      palette.copyColors(palette.baseColors, palette.colors);
    }
  },

  initTimeline: function(entries) {
    // create timeline with pointers to each palette
    this.timeline = {};
    for (var offset in entries) {
      var palette = this.palettes[entries[offset]];
      if (!palette)
        return alert(
          "ERROR: Could not locate palette for timeline entry: " +
            entries[offset]
        );
      this.timeline[offset] = palette;
    }
  },

  run: function() {
    // start main loop
    if (!this.inGame) {
      this.inGame = true;
      this.animate();
    }
  },

  stop: function() {
    // stop main loop
    this.inGame = false;
  },

  animate: function() {
    // animate one frame. and schedule next
    if (this.inGame) {
      var colors = this.bmp.palette.colors;

      if (this.settings.showOptions) {
        for (var idx = 0, len = colors.length; idx < len; idx++) {
          var clr = colors[idx];
          var div = $("pal_" + idx);
          div.style.backgroundColor =
            "rgb(" + clr.red + "," + clr.green + "," + clr.blue + ")";
        }

        // if (this.clock % this.settings.targetFPS == 0) $('d_debug').innerHTML = 'FPS: ' + FrameCount.current;
        $("d_debug").innerHTML =
          "FPS: " +
          FrameCount.current +
          (this.highlightColor != -1 ? " - Color #" + this.highlightColor : "");
      }

      var optimize = true;
      var newSec = FrameCount.count();

      if (newSec) {
        // advance time
        this.timeOffset++;
        if (this.timeOffset >= 86400) this.timeOffset = 0;
      }

      if (this.timeOffset != this.oldTimeOffset) {
        // calculate time-of-day base colors
        this.setTimeOfDayPalette();
        optimize = false;
      }
      if (this.lastBrightness != this.globalBrightness) optimize = false;
      if (this.highlightColor != this.lastHighlightColor) optimize = false;

      // cycle palette
      this.bmp.palette.cycle(
        this.bmp.palette.baseColors,
        GetTickCount(),
        this.settings.speedAdjust,
        this.settings.blendShiftEnabled
      );

      if (this.highlightColor > -1) {
        this.bmp.palette.colors[this.highlightColor] = new Color(0, 0, 0);
      }
      if (this.globalBrightness < 1.0) {
        // bmp.palette.fadeToColor( pureBlack, 1.0 - globalBrightness, 1.0 );
        this.bmp.palette.burnOut(1.0 - this.globalBrightness, 1.0);
      }

      // render pixels
      this.bmp.render(this.imageData, optimize);
      this.ctx.putImageData(this.imageData, 0, 0);

      this.lastBrightness = this.globalBrightness;
      this.lastHighlightColor = this.highlightColor;
      this.oldTimeOffset = this.timeOffset;

      TweenManager.logic(this.clock);
      this.clock++;

      if (this.inGame) {
        // setTimeout( function() { CanvasCycle.animate(); }, 1 );
        requestAnimationFrame(function() {
          CanvasCycle.animate();
        });
      }
    }
  },

  setTimeOfDayPalette: function() {
    // fade palette to proper time-of-day

    // locate nearest timeline palette before, and after current time
    // auto-wrap to find nearest out-of-bounds events (i.e. tomorrow and yesterday)
    var before = {
      palette: null,
      dist: 86400,
      offset: 0
    };
    for (var offset in this.timeline) {
      if (offset <= this.timeOffset && this.timeOffset - offset < before.dist) {
        before.dist = this.timeOffset - offset;
        before.palette = this.timeline[offset];
        before.offset = offset;
      }
    }
    if (!before.palette) {
      // no palette found, so wrap around and grab one with highest offset
      var temp = 0;
      for (var offset in this.timeline) {
        if (offset > temp) temp = offset;
      }
      before.palette = this.timeline[temp];
      before.offset = temp - 86400; // adjust timestamp for day before
    }

    var after = {
      palette: null,
      dist: 86400,
      offset: 0
    };
    for (var offset in this.timeline) {
      if (offset >= this.timeOffset && offset - this.timeOffset < after.dist) {
        after.dist = offset - this.timeOffset;
        after.palette = this.timeline[offset];
        after.offset = offset;
      }
    }
    if (!after.palette) {
      // no palette found, so wrap around and grab one with lowest offset
      var temp = 86400;
      for (var offset in this.timeline) {
        if (offset < temp) temp = offset;
      }
      after.palette = this.timeline[temp];
      after.offset = temp + 86400; // adjust timestamp for day after
    }

    // copy the 'before' palette colors into our intermediate palette
    this.todPalette.copyColors(
      before.palette.baseColors,
      this.todPalette.colors
    );

    // now, fade to the 'after' palette, but calculate the correct 'tween' time
    this.todPalette.fade(
      after.palette,
      this.timeOffset - before.offset,
      after.offset - before.offset
    );

    // finally, copy the final colors back to the bitmap palette for cycling and rendering
    this.bmp.palette.importColors(this.todPalette.colors);
  },

  saveSettings: function() {
    // save settings in cookie
    this.cookie.set("settings", this.settings);
    this.cookie.save();
  },

  setRate: function(rate) {
    this.settings.targetFPS = rate;
    this.saveSettings();
  },

  setSpeed: function(speed) {
    this.settings.speedAdjust = speed;
    this.saveSettings();
  },

  setBlendShift: function(enabled) {
    this.settings.blendShiftEnabled = enabled;
    this.saveSettings();
  },

  startShuffle: function() {
    var interval = 1000 * 30;
    setInterval(function() {
      CanvasCycle.switchScene(Math.floor(Math.random() * scenes.length));
    }, interval);
  }
};

var CC = CanvasCycle; // shortcut
