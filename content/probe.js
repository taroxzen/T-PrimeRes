/*
 * T-PrimeRes probe — runs in the page's MAIN world.
 * Job: capture the DASH MPD Prime Video loads, read the <video> element,
 * and answer resolution requests from the isolated bridge.
 */
(function () {
  "use strict";

  if (window.__PRIMERES_PROBE_INSTALLED__) return;
  window.__PRIMERES_PROBE_INSTALLED__ = true;

  var TAG = "__primeres_v1__";
  var state = {
    manifest: null,
    manifestUrl: null,
    seenAt: 0
  };

  function parseMpd(text, url) {
    try {
      if (typeof text !== "string" || text.indexOf("<MPD") === -1 && text.indexOf("<mpd") === -1) return null;
      var doc = new DOMParser().parseFromString(text, "application/xml");
      if (doc.getElementsByTagName("parsererror").length) return null;

      var videoReps = [];
      var audioReps = 0;
      var codecs = {};
      var fps = 0;
      var hdr = false;

      var sets = doc.getElementsByTagName("AdaptationSet");
      for (var s = 0; s < sets.length; s++) {
        var set = sets[s];
        var type = (set.getAttribute("contentType") || set.getAttribute("mimeType") || "").toLowerCase();
        var isVideo = type.indexOf("video") !== -1 || set.getElementsByTagName("Representation").length > 0 && set.getAttribute("contentType") === null && (set.getAttribute("mimeType") || "").indexOf("video") !== -1;
        var reps = set.getElementsByTagName("Representation");

        for (var r = 0; r < reps.length; r++) {
          var rep = reps[r];
          var w = parseInt(rep.getAttribute("width") || set.getAttribute("maxWidth") || "0", 10) || 0;
          var h = parseInt(rep.getAttribute("height") || set.getAttribute("maxHeight") || "0", 10) || 0;
          var bw = parseInt(rep.getAttribute("bandwidth") || "0", 10) || 0;
          var codec = rep.getAttribute("codecs") || set.getAttribute("codecs") || "";
          var frameRate = rep.getAttribute("frameRate") || "";

          if (codec) codecs[codec] = true;
          if (/hvc|hev1|dvh|vvc/i.test(codec)) hdr = true;

          var fr = frameRate.indexOf("/") !== -1
            ? frameRate.split("/").map(Number)
            : [parseFloat(frameRate) || 0, 1];
          if (fr[0] && fr[1]) fps = Math.max(fps, fr[0] / fr[1]);

          if (isVideo && h > 0) {
            videoReps.push({ w: w, h: h, bandwidth: bw, codecs: codec, fps: frameRate });
          } else if (!isVideo) {
            audioReps++;
          }
        }
      }

      if (!videoReps.length) return null;
      videoReps.sort(function (a, b) { return b.h - a.h || b.bandwidth - a.bandwidth; });

      var max = videoReps[0];
      var min = videoReps[videoReps.length - 1];
      return {
        url: url,
        maxHeight: max.h,
        maxWidth: max.w,
        maxBandwidth: max.bandwidth,
        minHeight: min.h,
        fps: Math.round(fps * 100) / 100,
        hdr: hdr,
        codecs: Object.keys(codecs),
        representationCount: videoReps.length,
        audioTracks: audioReps,
        capturedAt: Date.now()
      };
    } catch (e) {
      return null;
    }
  }

  function remember(text, url) {
    var parsed = parseMpd(text, url);
    if (parsed) {
      state.manifest = parsed;
      state.manifestUrl = url;
      state.seenAt = Date.now();
    }
  }

  function looksLikeMpd(url) {
    return typeof url === "string" && /\.mpd(\?|$)/i.test(url);
  }

  /* ---- XHR hook ---- */
  try {
    var nativeOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url) {
      if (looksLikeMpd(url)) {
        var xhr = this;
        ["responseText", "response"].forEach(function (prop) {
          var desc = Object.getOwnPropertyDescriptor(XMLHttpRequest.prototype, prop);
          if (!desc || !desc.get) return;
          Object.defineProperty(xhr, prop, {
            configurable: true,
            enumerable: desc.enumerable,
            get: function () {
              var value = desc.get.call(xhr);
              try {
                if (typeof value === "string" && value.indexOf("<MPD") !== -1) remember(value, xhr.responseURL || url);
                else if (value && typeof value === "object" && value.nodeType) remember(new XMLSerializer().serializeToString(value), xhr.responseURL || url);
              } catch (e) {}
              return value;
            }
          });
        });
      }
      return nativeOpen.apply(this, arguments);
    };
  } catch (e) {}

  /* ---- fetch hook ---- */
  try {
    var nativeFetch = window.fetch;
    window.fetch = function (input, init) {
      var url = typeof input === "string" ? input : input && input.url;
      var promise = nativeFetch.apply(this, arguments);
      if (looksLikeMpd(url)) {
        promise.then(function (res) {
          try {
            res.clone().text().then(function (text) { remember(text, res.url || url); }).catch(function () {});
          } catch (e) {}
          return res;
        }).catch(function () {});
      }
      return promise;
    };
  } catch (e) {}

  /* ---- recovery: MPD may have loaded before the probe ---- */
  function recoverFromPerformance() {
    if (state.manifest) return Promise.resolve(state.manifest);
    var urls = [];
    try {
      urls = performance.getEntriesByType("resource")
        .map(function (e) { return e.name; })
        .filter(looksLikeMpd)
        .slice(-4)
        .reverse();
    } catch (e) {}
    if (!urls.length) return Promise.resolve(null);

    return urls.reduce(function (chain, url) {
      return chain.then(function (found) {
        if (found) return found;
        return nativeFetch(url, { credentials: "omit" })
          .then(function (res) { return res.text(); })
          .then(function (text) { return parseMpd(text, url); })
          .catch(function () { return null; });
      });
    }, Promise.resolve(null)).then(function (found) {
      if (found) {
        state.manifest = found;
        state.manifestUrl = found.url;
        state.seenAt = Date.now();
      }
      return found;
    });
  }

  function pickVideo() {
    var videos = [];
    try { videos = Array.prototype.slice.call(document.querySelectorAll("video")); } catch (e) {}
    var best = null;
    var bestScore = -1;
    for (var i = 0; i < videos.length; i++) {
      var v = videos[i];
      var score = (v.videoWidth || 0) * (v.videoHeight || 0) + (v.readyState || 0) * 100;
      if (score > bestScore) { bestScore = score; best = v; }
    }
    return best;
  }

  /* Prime Video serves cinematic titles as cropped frames (e.g. 1920x872).
   * Recover the nominal 720p/1080p class from width before labeling. */
  function effectiveHeight(width, height) {
    if (!width || !height) return height || 0;
    if (width / height <= 1.9) return height;
    if (width >= 3840) return 2160;
    if (width >= 2560) return 1440;
    if (width >= 1920) return 1080;
    if (width >= 1280) return 720;
    if (width >= 960) return 540;
    if (width >= 854) return 480;
    return height;
  }

  function classify(height, width) {
    var h = effectiveHeight(width, height);
    if (!h) return { label: "UNKNOWN", tier: "unknown", short: "—", effective: 0 };
    if (h >= 2160) return { label: "4K UHD", tier: "uhd", short: "4K", effective: h };
    if (h >= 1440) return { label: "2K QHD", tier: "qhd", short: "2K", effective: h };
    if (h >= 1080) return { label: "FULL HD", tier: "hd", short: "1080P", effective: h };
    if (h >= 720) return { label: "HD", tier: "hd", short: "720P", effective: h };
    return { label: "STANDARD DEFINITION", tier: "sd", short: "SD", effective: h };
  }

  function buildPayload() {
    return recoverFromPerformance().then(function () {
      var v = pickVideo();
      var height = v ? v.videoHeight || 0 : 0;
      var width = v ? v.videoWidth || 0 : 0;
      var label = classify(height, width);
      var quality = null;
      try {
        if (v && v.getVideoPlaybackQuality) {
          var q = v.getVideoPlaybackQuality();
          quality = { dropped: q.droppedVideoFrames, total: q.totalVideoFrames };
        }
      } catch (e) {}

      return {
        ok: true,
        host: location.hostname,
        href: location.href,
        video: {
          width: width,
          height: height,
          width: width,
          effectiveHeight: label.effective,
          label: label.label,
          short: label.short,
          tier: label.tier,
          readyState: v ? v.readyState : 0,
          paused: v ? v.paused : null,
          currentTime: v ? Math.round(v.currentTime * 10) / 10 : 0,
          duration: v && isFinite(v.duration) ? Math.round(v.duration * 10) / 10 : 0,
          quality: quality
        },
        manifest: state.manifest ? {
          maxHeight: state.manifest.maxHeight,
          maxWidth: state.manifest.maxWidth,
          effectiveMaxHeight: effectiveHeight(state.manifest.maxWidth, state.manifest.maxHeight),
          maxBandwidth: state.manifest.maxBandwidth,
          minHeight: state.manifest.minHeight,
          fps: state.manifest.fps,
          hdr: state.manifest.hdr,
          codecs: state.manifest.codecs,
          representationCount: state.manifest.representationCount,
          audioTracks: state.manifest.audioTracks,
          url: state.manifest.url
        } : null,
        capturedAt: Date.now()
      };
    });
  }

  window.addEventListener("message", function (event) {
    if (event.source !== window) return;
    var data = event.data;
    if (!data || data.__primeres !== TAG + "_request") return;
    buildPayload().then(function (payload) {
      window.postMessage({ __primeres: TAG + "_response", id: data.id, payload: payload }, "*");
    }).catch(function () {
      window.postMessage({ __primeres: TAG + "_response", id: data.id, payload: { ok: false } }, "*");
    });
  });

  window.__PRIMERES_PROBE__ = { buildPayload: buildPayload, parseMpd: parseMpd, effectiveHeight: effectiveHeight };
})();
