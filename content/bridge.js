/*
 * T-PrimeRes bridge — isolated content script.
 * Relays requests between the extension and the MAIN-world probe.
 */
(function () {
  "use strict";

  if (window.__PRIMERES_BRIDGE_INSTALLED__) return;
  window.__PRIMERES_BRIDGE_INSTALLED__ = true;

  var TAG = "__primeres_v1__";
  var seq = 0;
  var waiting = Object.create(null);

  window.addEventListener("message", function (event) {
    if (event.source !== window) return;
    var data = event.data;
    if (!data || data.__primeres !== TAG + "_response") return;
    var resolve = waiting[data.id];
    if (!resolve) return;
    delete waiting[data.id];
    resolve(data.payload);
  });

  function askProbe() {
    return new Promise(function (resolve) {
      var id = ++seq;
      waiting[id] = resolve;
      window.postMessage({ __primeres: TAG + "_request", id: id }, "*");
      setTimeout(function () {
        if (waiting[id]) {
          delete waiting[id];
          resolve({ ok: false, reason: "timeout" });
        }
      }, 2500);
    });
  }

  chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message && message.type === "GET_RESOLUTION") {
      askProbe().then(function (payload) {
        sendResponse({
          ok: !!(payload && payload.ok),
          data: payload,
          injected: true
        });
      });
      return true;
    }
    if (message && message.type === "PING") {
      sendResponse({ ok: true, host: location.hostname, href: location.href });
      return true;
    }
  });

  /* Keep toolbar badge live without opening the popup. */
  setInterval(function () {
    askProbe().then(function (payload) {
      if (!payload || !payload.ok || !payload.video || !payload.video.height) return;
      try {
        chrome.runtime.sendMessage({
          type: "RESOLUTION_UPDATE",
          height: payload.video.height,
          short: payload.video.short,
          host: payload.host
        }, function () { /* receiver may be gone */ });
      } catch (e) {}
    });
  }, 2000);
})();
