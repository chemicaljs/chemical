importScripts("/libcurl/index.js");
importScripts("/uv/uv.bundle.js");
importScripts("/uv/uv.config.js");
importScripts(__uv$config.sw || "/uv/uv.sw.js");

Object.defineProperty(self, "crossOriginIsolated", { value: true }); // Firefox fix

const uv = new UVServiceWorker();

self.addEventListener("fetch", (event) => {
    event.respondWith(
        (async () => {
            if (uv.route(event)) {
                return await uv.fetch(event);
            }
            return await fetch(event.request);
        })(),
    );
});
