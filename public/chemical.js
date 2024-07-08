window.chemicalLoaded = false;

function chemicalEncode(url) {
    return window.location.origin + window.__uv$config.prefix + window.__uv$config.encodeUrl(url)
}

let wispURL = document.currentScript.getAttribute("wisp");

async function registerSW() {
    if ("serviceWorker" in navigator) {
        await navigator.serviceWorker.register("/chemical.sw.js");

        await window.BareMux.SetTransport("CurlMod.LibcurlClient", {
            wisp: wispURL || (location.protocol === "https:" ? "wss" : "ws") + "://" + location.host + "/wisp/",
        });
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
    await loadScript("/baremux/bare.cjs");
    await loadScript("/libcurl/index.js");
    await loadScript("/epoxy/index.js");
    await loadScript("/uv/uv.bundle.js");
    await loadScript("/uv/uv.config.js");
    await registerSW();
    chemicalLoaded = true;
    window.dispatchEvent(new Event("chemicalLoaded"));
})();