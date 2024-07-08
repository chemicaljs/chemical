window.chemicalLoaded = false;

function chemicalEncode(url) {
    return window.location.origin + window.__uv$config.prefix + window.__uv$config.encodeUrl(url)
}

let wispURL = document.currentScript.getAttribute("wisp");

async function registerSW() {
    const connection = new window.BareMux.BareMuxConnection("/baremux/worker.js");
    await connection.setTransport("/epoxy/module.js", [{ wisp: wispURL || (location.protocol === "https:" ? "wss" : "ws") + "://" + location.host + "/wisp/" }]);

    if ("serviceWorker" in navigator) {
        await navigator.serviceWorker.register("/chemical.sw.js");
    } else {
        console.error("Service worker failed to register.")
    }
}

async function loadScript(src) {
    await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = src;
        script.onload = () => {
            resolve();
        };
        script.onerror = () => {
            reject();
        };
        document.head.appendChild(script);
    });
}

(async () => {
    await loadScript("/baremux/index.js");
    await loadScript("/uv/uv.bundle.js");
    await loadScript("/uv/uv.config.js");
    await registerSW();
    chemicalLoaded = true;
    window.dispatchEvent(new Event("chemicalLoaded"));
})();