if (uvEnabled) {
  importScripts(`/${uvRandomPath}/${uvRandomPath}.bundle.js`);
  importScripts(`/${uvRandomPath}/${uvRandomPath}.config.js`);
  importScripts(__uv$config.sw || `/${uvRandomPath}/${uvRandomPath}.sw.js`);
}
if (scramjetEnabled) {
  importScripts("/scramjet/scramjet.wasm.js");
  importScripts("/scramjet/scramjet.shared.js");
  importScripts("/scramjet/scramjet.worker.js");
}

if (navigator.userAgent.includes("Firefox")) {
  Object.defineProperty(globalThis, "crossOriginIsolated", {
    value: true,
    writable: false,
  });
}

let uv, scramjet;

if (uvEnabled) {
  uv = new UVServiceWorker();
}
if (scramjetEnabled) {
  scramjet = new ScramjetServiceWorker();
}

self.addEventListener("fetch", (event) => {
  event.respondWith(
    (async () => {
      if (scramjetEnabled) {
        await scramjet.loadConfig();
      }

      if (uvEnabled && uv.route(event)) {
        return await uv.fetch(event);
      } else if (scramjetEnabled && scramjet.route(event)) {
        return await scramjet.fetch(event);
      }
      return await fetch(event.request);
    })()
  );
});
