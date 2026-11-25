(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var ui = {
    status: $("status"),
    statusText: $("statusText"),
    hero: $("hero"),
    heroLabel: $("heroLabel"),
    heroNumber: $("heroNumber"),
    heroUnit: $("heroUnit"),
    heroSub: $("heroSub"),
    gaugeValue: $("gaugeValue"),
    segments: $("segments"),
    vDimensions: $("vDimensions"),
    vMax: $("vMax"),
    vCodec: $("vCodec"),
    vFps: $("vFps"),
    vState: $("vState"),
    vSource: $("vSource"),
    notice: $("notice"),
    timestamp: $("timestamp"),
    refresh: $("refresh")
  };

  var PRIME_HOST = /(^|\.)primevideo\.com$|(^|\.)amazon\.[a-z.]+$/i;
  var started = false;
  var SEGMENTS = 20;
  var MIN_H = 480;
  var MAX_H = 2160;

  function setStatus(kind, text) {
    ui.status.className = "status" + (kind ? " is-" + kind : "");
    ui.statusText.textContent = text;
  }

  function setNotice(text) {
    if (!text) { ui.notice.hidden = true; ui.notice.textContent = ""; return; }
    ui.notice.hidden = false;
    ui.notice.textContent = text;
  }

  function setRow(node, value, tone) {
    node.textContent = value || "—";
    node.className = "row-value" + (tone ? " is-" + tone : "");
  }

  function fmtTime(seconds) {
    if (!seconds && seconds !== 0) return "";
    var s = Math.floor(seconds);
    var m = Math.floor(s / 60);
    return (m < 10 ? "0" : "") + m + ":" + (s % 60 < 10 ? "0" : "") + (s % 60);
  }

  function segmentIndex(height) {
    if (!height) return -1;
    return Math.max(0, Math.min(SEGMENTS - 1, Math.round((height - MIN_H) / (MAX_H - MIN_H) * (SEGMENTS - 1))));
  }

  function renderGauge(current, max) {
    var currentIdx = segmentIndex(current);
    var maxIdx = segmentIndex(max);
    if (maxIdx < currentIdx) maxIdx = currentIdx;
    ui.segments.innerHTML = "";
    for (var i = 0; i < SEGMENTS; i++) {
      var seg = document.createElement("span");
      if (i <= currentIdx) {
        seg.className = "is-current" + (current && current < 720 ? " is-sd" : "");
      } else if (i <= maxIdx) {
        seg.className = "is-available";
      }
      ui.segments.appendChild(seg);
    }
    ui.gaugeValue.textContent = (current ? current + "P" : "—") + " / " + (max ? max + "P" : "—");
  }

  function codecLabel(codecs, hdr) {
    var list = codecs || [];
    var c = list[0] || "";
    var name = "—";
    if (/hvc|hev/i.test(c)) name = "HEVC";
    else if (/avc/i.test(c)) name = "H.264";
    else if (/vp09|vp9/i.test(c)) name = "VP9";
    else if (/av01/i.test(c)) name = "AV1";
    else if (c) name = c.slice(0, 12);
    return name + (hdr ? " / HDR" : "");
  }

  function renderEmpty(headline, message, host) {
    setStatus("error", "NO SIGNAL");
    ui.hero.className = "hero is-empty";
    ui.heroLabel.textContent = headline;
    ui.heroNumber.textContent = "—";
    ui.heroUnit.textContent = "P";
    ui.heroSub.textContent = host || "PRIME VIDEO";
    renderGauge(0, 0);
    setRow(ui.vDimensions, "—");
    setRow(ui.vMax, "—");
    setRow(ui.vCodec, "—");
    setRow(ui.vFps, "—");
    setRow(ui.vState, "—");
    setRow(ui.vSource, host || "—");
    setNotice(message);
    ui.timestamp.textContent = "—";
  }

  function render(tab, result) {
    if (!result || !result.ok || !result.data || !result.data.video) {
      renderEmpty("NO SIGNAL", "[NO BRIDGE] SAYFAYI YENİLEYİP TEKRAR DENEYİN.", safeHost(tab));
      return;
    }

    var data = result.data;
    var v = data.video;
    var m = data.manifest;
    var rawHeight = v.height || 0;
    var height = v.effectiveHeight || rawHeight;
    var cropped = height !== rawHeight;

    ui.hero.className = "hero" + (height >= 1080 ? " is-high" : "");
    ui.heroLabel.textContent = v.label || "UNKNOWN";
    ui.heroNumber.textContent = height ? String(height) : "—";
    ui.heroUnit.textContent = height ? "P" : "";
    ui.heroSub.textContent = data.host || safeHost(tab);
    setStatus(height >= 720 ? "live" : "error", height >= 720 ? "LIVE" : "DEGRADED");

    renderGauge(height, m ? (m.effectiveMaxHeight || m.maxHeight) : 0);

    setRow(ui.vDimensions, rawHeight ? v.width + " × " + v.height : "—");
    setRow(ui.vMax, m ? (m.effectiveMaxHeight || m.maxHeight) + "P · " + m.representationCount + " REP" : "—");
    setRow(ui.vCodec, m ? codecLabel(m.codecs, m.hdr) : "—", m && m.hdr ? "is-good" : "");
    setRow(ui.vFps, m && m.fps ? m.fps + " FPS" : "—");
    setRow(ui.vState, v.paused ? "PAUSED" : "PLAYING" + (v.currentTime ? " · " + fmtTime(v.currentTime) : ""));
    setRow(ui.vSource, data.host || safeHost(tab));

    var notes = [];
    if (cropped) notes.push("[CROP] " + (v.width / rawHeight).toFixed(2) + ":1 KARE — GERÇEK PIKSEL " + v.width + " × " + v.height + ".");
    if (!m) notes.push("[NO MPD] OYNATMAYI BAŞLATIP TEKRAR TARA.");
    if (!height) notes.push("[NO VIDEO] OYNATICI BULUNAMADI.");
    if (height && height < 720) notes.push("[DEGRADED] ÇÖZÜNÜRLÜK DÜŞÜK.");
    setNotice(notes.join(" "));

    ui.timestamp.textContent = "SCAN " + new Date().toLocaleTimeString("tr-TR", { hour12: false });
  }

  function safeHost(tab) {
    if (!tab || !tab.url) return "";
    try { return new URL(tab.url).hostname; } catch (e) { return ""; }
  }

  function boot() {
    if (started) return;
    started = true;
    scan();
  }

  function scan() {
    setStatus("", "SCANNING");
    setNotice("");
    ui.refresh.disabled = true;

    chrome.tabs.query({ active: true, currentWindow: true }).then(function (tabs) {
      var tab = tabs && tabs[0];
      var host = safeHost(tab);
      if (!PRIME_HOST.test(host)) {
        renderEmpty("NO SIGNAL", "[NOT PRIME VIDEO] AKTİF SEKME PRIME VIDEO DEĞİL.", host);
        ui.refresh.disabled = false;
        return;
      }
      return chrome.tabs.sendMessage(tab.id, { type: "GET_RESOLUTION" }).then(function (result) {
        render(tab, result);
      }).catch(function () {
        renderEmpty("NO SIGNAL", "[NO BRIDGE] SAYFAYI YENİLEYİP TEKRAR DENEYİN.", host);
      }).then(function () {
        ui.refresh.disabled = false;
      });
    }).catch(function () {
      renderEmpty("NO SIGNAL", "[TAB ERROR] SEKMEYE ERİŞİLEMEDİ.", "");
      ui.refresh.disabled = false;
    });
  }

  ui.refresh.addEventListener("click", scan);
  document.addEventListener("DOMContentLoaded", boot);
  boot();
})();
