if (uvEnabled) {
  importScripts("/uv/uv.bundle.js");
  importScripts("/uv/uv.config.js");
  importScripts(__uv$config.sw || "/uv/uv.sw.js");
}
if (aeroEnabled) {
  /**
   * @type {string}
   */
  const dirToAero = "/aero/";
  /**
   * @type {string}
   */
  pathToPatchedAerohandler = `${dirToAero}extras/handleWithExtras.js`;

  // configs
  importScripts(`${dirToAero}defaultConfig.aero.js`);
  importScripts(`${dirToAero}config.aero.js`);
  // Bare
  importScripts(aeroConfig.bundles["bare-mux"]);
  // aero handlers
  importScripts(aeroConfig.bundles.handle);
}
if (scramjetEnabled) {
  importScripts("/scramjet/scramjet.codecs.js");
  importScripts("/scramjet/scramjet.config.js");
  importScripts(__scramjet$config.bundle || "/scramjet/scramjet.bundle.js");
  importScripts(__scramjet$config.worker || "/scramjet/scramjet.worker.js");
}
if (meteorEnabled) {
  importScripts("/meteor/meteor.codecs.js");
  importScripts("/meteor/meteor.config.js");
  importScripts($meteor.config.files.bundle || "/meteor/meteor.bundle.js");
  importScripts($meteor.config.files.worker || "/meteor/meteor.worker.js");
}

Object.defineProperty(self, "crossOriginIsolated", { value: true }); // Firefox fix

let uv, aeroHandlerWithExtras, scramjet, meteor;

if (uvEnabled) {
  uv = new UVServiceWorker();
}
if (aeroEnabled) {
  aeroHandlerWithExtras = patchAeroHandler(aeroHandle);
}
if (scramjetEnabled) {
  scramjet = new ScramjetServiceWorker();
}
if (meteorEnabled) {
  meteor = new MeteorServiceWorker();
}

self.addEventListener("fetch", (event) => {
  event.respondWith(
    (async () => {
      if (uvEnabled && uv.route(event)) {
        return await uv.fetch(event);
      } else if (aeroEnabled && routeAero(event)) {
        return await aeroHandlerWithExtras(event);
      } else if (scramjetEnabled && scramjet.route(event)) {
        return await scramjet.fetch(event);
      } else if (meteorEnabled && meteor.shouldRoute(event)) {
        return meteor.handleFetch(event);
      }
      return await fetch(event.request);
    })(),
  );
});
