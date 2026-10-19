/* ============================================================
   About page: featured carousel + live collage.
   Reads the ABOUT_MEDIA list from js/AboutMediaList.js, which is built
   automatically from the files in Assets/About/Media/. You shouldn't
   need to edit this file or that list.
   ============================================================ */
(function () {
  "use strict";

  // Empty media folder: hide the carousel and collage instead of showing blank boxes.
  if (typeof ABOUT_MEDIA === "undefined" || !ABOUT_MEDIA.length) {
    var hide = document.querySelectorAll(".about-media");
    for (var h = 0; h < hide.length; h++) hide[h].hidden = true;
    return;
  }

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function pad(n) { return n < 10 ? "0" + n : String(n); }

  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }

  function shuffle(list) {
    for (var i = list.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = list[i]; list[i] = list[j]; list[j] = t;
    }
    return list;
  }

  /* Build an <img> or muted looping <video> for one media item. */
  function buildMedia(item, opts) {
    opts = opts || {};
    var label = item.alt || item.caption || "From the Beaverton MFG shop";

    if (item.type === "video") {
      var v = document.createElement("video");
      v.muted = true;
      v.loop = true;
      v.playsInline = true;
      v.setAttribute("muted", "");
      v.setAttribute("playsinline", "");
      v.setAttribute("aria-label", label);
      v.preload = "metadata";
      if (item.poster) v.poster = item.poster;
      // With reduced motion we never play, so make sure a frame is visible.
      v.src = (reduceMotion && !item.poster) ? item.src + "#t=0.1" : item.src;
      return v;
    }

    var img = document.createElement("img");
    img.alt = label;
    img.decoding = "async";
    img.loading = opts.lazy ? "lazy" : "eager";
    img.src = item.src;
    return img;
  }

  function playVideo(v) {
    if (!v || reduceMotion) return;
    var p = v.play();
    if (p && p.catch) p.catch(function () {});
  }

  /* ---------------------------------------------------------
     Carousel
     --------------------------------------------------------- */
  function initCarousel() {
    var viewport = document.getElementById("aboutCarouselViewport");
    if (!viewport) return;

    var captionEl = document.getElementById("aboutCarouselCaption");
    var countEl = document.getElementById("aboutCarouselCount");
    var prevBtn = document.getElementById("aboutCarouselPrev");
    var nextBtn = document.getElementById("aboutCarouselNext");
    var pauseBtn = document.getElementById("aboutCarouselPause");

    var items = ABOUT_MEDIA.filter(function (m) { return m.featured; });
    if (!items.length) items = ABOUT_MEDIA.slice(0, 6);

    var slides = items.map(function (item, i) {
      var s = document.createElement("div");
      s.className = "about-slide";
      s.setAttribute("role", "group");
      s.setAttribute("aria-roledescription", "slide");
      s.setAttribute("aria-label", (i + 1) + " of " + items.length);
      s.appendChild(buildMedia(item, { lazy: i > 0 }));
      viewport.appendChild(s);
      return s;
    });

    var index = 0;
    var timer = null;
    var userPaused = false;
    var hovering = false;
    var focused = false;
    var lock = false;
    var lockTimer = null;
    var ticking = false;

    if (items.length < 2) {
      prevBtn.hidden = true;
      nextBtn.hidden = true;
      pauseBtn.hidden = true;
      countEl.hidden = true;
    }
    if (reduceMotion) pauseBtn.hidden = true;

    function update() {
      captionEl.textContent = items[index].caption || "";
      countEl.textContent = pad(index + 1) + " / " + pad(items.length);
      slides.forEach(function (s, i) {
        var v = s.querySelector("video");
        if (!v) return;
        if (i === index) playVideo(v); else v.pause();
      });
    }

    function goTo(i, instant) {
      index = (i + items.length) % items.length;
      lock = true;
      clearTimeout(lockTimer);
      lockTimer = setTimeout(function () { lock = false; }, 700);
      viewport.scrollTo({
        left: index * viewport.clientWidth,
        behavior: (instant || reduceMotion) ? "auto" : "smooth"
      });
      update();
    }

    // Keep the index in sync when the person swipes or scrolls.
    viewport.addEventListener("scroll", function () {
      if (lock || ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        var w = viewport.clientWidth || 1;
        var i = Math.round(viewport.scrollLeft / w);
        if (i !== index && i >= 0 && i < items.length) {
          index = i;
          update();
        }
      });
    });

    prevBtn.addEventListener("click", function () { goTo(index - 1); });
    nextBtn.addEventListener("click", function () { goTo(index + 1); });

    viewport.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { e.preventDefault(); goTo(index - 1); }
      if (e.key === "ArrowRight") { e.preventDefault(); goTo(index + 1); }
    });

    window.addEventListener("resize", function () { goTo(index, true); });

    // Autoplay: pauses on hover, keyboard focus, hidden tab, or the Pause button.
    function canAutoplay() {
      return !reduceMotion && !userPaused && !hovering && !focused && !document.hidden && items.length > 1;
    }
    function startTimer() {
      if (reduceMotion || items.length < 2) return;
      clearInterval(timer);
      timer = setInterval(function () {
        if (canAutoplay()) goTo(index + 1);
      }, 6000);
    }

    var carousel = document.getElementById("aboutCarousel");
    carousel.addEventListener("mouseenter", function () { hovering = true; });
    carousel.addEventListener("mouseleave", function () { hovering = false; });
    carousel.addEventListener("focusin", function () { focused = true; });
    carousel.addEventListener("focusout", function () { focused = false; });

    pauseBtn.addEventListener("click", function () {
      userPaused = !userPaused;
      pauseBtn.setAttribute("aria-pressed", userPaused ? "true" : "false");
      pauseBtn.textContent = userPaused ? "Play" : "Pause";
    });

    update();
    startTimer();
  }

  /* ---------------------------------------------------------
     Collage: tiles crossfade to new items every couple seconds
     --------------------------------------------------------- */
  function initCollage() {
    var root = document.getElementById("aboutCollage");
    if (!root) return;

    var toggle = document.getElementById("aboutCollageToggle");
    var TILE_COUNT = 8;
    var SWAP_EVERY_MS = 2200;
    var FADE_MS = 900;

    var count = Math.min(TILE_COUNT, ABOUT_MEDIA.length);
    var tiles = [];
    var shown = new Set();
    var failed = new Set();   // files that would not load (missing, unsupported)
    var paused = false;
    var visible = true;
    var lastTile = null;

    for (var i = 0; i < count; i++) {
      var el = document.createElement("div");
      el.className = "about-tile";
      root.appendChild(el);
      tiles.push({ el: el, item: null, layer: null });
    }

    function isShown(tile) { return tile.el.offsetParent !== null; }

    // Resolves true when the media is ready to fade in, false if it failed.
    function ready(media) {
      return new Promise(function (resolve) {
        if (media.tagName === "IMG") {
          if (media.complete && media.naturalWidth) return resolve(true);
          media.addEventListener("load", function () { resolve(true); }, { once: true });
          media.addEventListener("error", function () { resolve(false); }, { once: true });
        } else {
          var done = false;
          var finish = function (ok) { if (!done) { done = true; resolve(ok); } };
          // Metadata is enough: a poster (or the first frame) shows right away.
          media.addEventListener("loadedmetadata", function () { finish(true); }, { once: true });
          media.addEventListener("loadeddata", function () { finish(true); }, { once: true });
          media.addEventListener("error", function () { finish(false); }, { once: true });
          setTimeout(function () { finish(media.readyState >= 1); }, 4000);
        }
      });
    }

    function swap(tile, item, attempt) {
      var prevLayer = tile.layer;
      var prevItem = tile.item;

      var layer = document.createElement("div");
      layer.className = "about-layer";
      var media = buildMedia(item, { lazy: false });
      layer.appendChild(media);
      tile.el.appendChild(layer);

      shown.add(item);
      tile.item = item;
      tile.layer = layer;

      ready(media).then(function (ok) {
        if (!ok) {
          layer.remove();
          shown.delete(item);
          failed.add(item);
          tile.item = prevItem;
          tile.layer = prevLayer;
          // An empty tile gets another file instead of staying blank.
          if (!prevLayer && (attempt || 0) < 6) {
            var spare = ABOUT_MEDIA.filter(function (m) { return !shown.has(m) && !failed.has(m); });
            if (spare.length) swap(tile, pick(spare), (attempt || 0) + 1);
          }
          return;
        }
        void layer.offsetWidth; // make sure the fade starts from opacity 0
        layer.classList.add("is-in");
        if (media.tagName === "VIDEO" && !paused && visible) playVideo(media);

        if (prevLayer) {
          setTimeout(function () {
            var pv = prevLayer.querySelector("video");
            if (pv) pv.pause();
            prevLayer.remove();
            shown.delete(prevItem);
          }, FADE_MS + 80);
        }
      });
    }

    function syncVideos() {
      var shouldPlay = !paused && visible && !document.hidden && !reduceMotion;
      root.querySelectorAll("video").forEach(function (v) {
        if (shouldPlay) playVideo(v); else v.pause();
      });
    }

    // Initial fill: only tiles that are actually visible (small screens hide a few).
    var order = shuffle(ABOUT_MEDIA.slice());
    var next = 0;
    tiles.forEach(function (tile, idx) {
      if (!isShown(tile)) return;
      var item = order[next++];
      if (!item) return;
      setTimeout(function () { swap(tile, item); }, reduceMotion ? 0 : idx * 80);
    });

    function tick() {
      if (paused || document.hidden || !visible || reduceMotion) return;

      var pool = ABOUT_MEDIA.filter(function (m) { return !shown.has(m) && !failed.has(m); });
      if (!pool.length) return;

      var showing = tiles.filter(isShown);
      if (!showing.length) return;

      // Fill any empty tile first (e.g. after the window was resized).
      var empty = showing.filter(function (t) { return !t.item; });
      var candidates = empty.length ? empty : showing.filter(function (t) {
        return t !== lastTile && !t.el.matches(":hover");
      });
      if (!candidates.length) return;

      var tile = pick(candidates);
      lastTile = tile;
      swap(tile, pick(pool));
    }

    if (reduceMotion) {
      toggle.hidden = true; // nothing moves, so nothing to pause
    } else {
      setInterval(tick, SWAP_EVERY_MS);

      toggle.addEventListener("click", function () {
        paused = !paused;
        toggle.setAttribute("aria-pressed", paused ? "true" : "false");
        toggle.textContent = paused ? "Play" : "Pause";
        syncVideos();
      });

      document.addEventListener("visibilitychange", syncVideos);

      if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (entries) {
          visible = entries[0].isIntersecting;
          syncVideos();
        }, { threshold: 0.05 }).observe(root);
      }
    }
  }

  initCarousel();
  initCollage();
})();
