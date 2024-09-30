const currentScript = document.currentScript;

window.chemical = {
  loaded: false,
  transport:
    currentScript.dataset.transportStore !== undefined
      ? localStorage.getItem("@chemical/transport") ||
        currentScript.dataset.transport ||
        "libcurl"
      : currentScript.dataset.transport || "libcurl",
  wisp:
    currentScript.dataset.wispStore !== undefined
      ? localStorage.getItem("@chemical/wisp") ||
        currentScript.dataset.wisp ||
        (location.protocol === "https:" ? "wss" : "ws") +
          "://" +
          location.host +
          "/wisp/"
      : currentScript.dataset.wisp ||
        (location.protocol === "https:" ? "wss" : "ws") +
          "://" +
          location.host +
          "/wisp/",
};

function rammerheadEncode(baseUrl, decode = false) {
  const mod = (n, m) => ((n % m) + m) % m;
  const baseDictionary =
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz~-";
  const shuffledIndicator = "_rhs";

  const generateDictionary = function () {
    let str = "";
    const split = baseDictionary.split("");
    while (split.length > 0) {
      str += split.splice(Math.floor(Math.random() * split.length), 1)[0];
    }
    return str;
  };

  class StrShuffler {
    constructor(dictionary = generateDictionary()) {
      this.dictionary = dictionary;
    }

    shuffle(str) {
      if (str.startsWith(shuffledIndicator)) {
        return str;
      }
      let shuffledStr = "";
      for (let i = 0; i < str.length; i++) {
        const char = str.charAt(i);
        const idx = baseDictionary.indexOf(char);
        if (char === "%" && str.length - i >= 3) {
          shuffledStr += char;
          shuffledStr += str.charAt(++i);
          shuffledStr += str.charAt(++i);
        } else if (idx === -1) {
          shuffledStr += char;
        } else {
          shuffledStr += this.dictionary.charAt(
            mod(idx + i, baseDictionary.length)
          );
        }
      }
      return shuffledIndicator + shuffledStr;
    }

    unshuffle(str) {
      if (!str.startsWith(shuffledIndicator)) {
        return str;
      }

      str = str.slice(shuffledIndicator.length);

      let unshuffledStr = "";
      for (let i = 0; i < str.length; i++) {
        const char = str.charAt(i);
        const idx = this.dictionary.indexOf(char);
        if (char === "%" && str.length - i >= 3) {
          unshuffledStr += char;
          unshuffledStr += str.charAt(++i);
          unshuffledStr += str.charAt(++i);
        } else if (idx === -1) {
          unshuffledStr += char;
        } else {
          unshuffledStr += baseDictionary.charAt(
            mod(idx - i, baseDictionary.length)
          );
        }
      }
      return unshuffledStr;
    }
  }

  function get(url, callback, shush = false) {
    var request = new XMLHttpRequest();
    request.open("GET", url, true);
    request.send();

    request.onerror = function () {
      if (!shush) console.log("Cannot communicate with the server");
    };
    request.onload = function () {
      if (request.status === 200) {
        callback(request.responseText);
      } else {
        if (!shush)
          console.log(
            'unexpected server response to not match "200". Server says "' +
              request.responseText +
              '"'
          );
      }
    };
  }

  var api = {
    newsession(callback) {
      get("/newsession", callback);
    },
    sessionexists(id, callback) {
      get("/sessionexists?id=" + encodeURIComponent(id), function (res) {
        if (res === "exists") return callback(true);
        if (res === "not found") return callback(false);
        console.log("unexpected response from server. received" + res);
      });
    },
    shuffleDict(id, callback) {
      console.log("Shuffling", id);
      get("/api/shuffleDict?id=" + encodeURIComponent(id), function (res) {
        callback(JSON.parse(res));
      });
    },
  };

  var localStorageKey = "rammerhead_sessionids";
  var localStorageKeyDefault = "rammerhead_default_sessionid";
  var sessionIdsStore = {
    get() {
      var rawData = localStorage.getItem(localStorageKey);
      if (!rawData) return [];
      try {
        var data = JSON.parse(rawData);
        if (!Array.isArray(data)) throw "getout";
        return data;
      } catch (e) {
        return [];
      }
    },
    set(data) {
      if (!data || !Array.isArray(data)) throw new TypeError("must be array");
      localStorage.setItem(localStorageKey, JSON.stringify(data));
    },
    getDefault() {
      var sessionId = localStorage.getItem(localStorageKeyDefault);
      if (sessionId) {
        var data = sessionIdsStore.get();
        data.filter(function (e) {
          return e.id === sessionId;
        });
        if (data.length) return data[0];
      }
      return null;
    },
    setDefault(id) {
      localStorage.setItem(localStorageKeyDefault, id);
    },
  };

  function addSession(id) {
    var data = sessionIdsStore.get();
    data.unshift({ id: id, createdOn: new Date().toLocaleString() });
    sessionIdsStore.set(data);
  }

  function getSessionId() {
    return new Promise((resolve) => {
      var id = localStorage.getItem("session-string");
      api.sessionexists(id, function (value) {
        if (!value) {
          console.log("Session validation failed");
          api.newsession(function (id) {
            addSession(id);
            localStorage.setItem("session-string", id);
            console.log(id);
            console.log("^ new id");
            resolve(id);
          });
        } else {
          resolve(id);
        }
      });
    });
  }

  var ProxyHref;

  return getSessionId().then((id) => {
    return new Promise((resolve) => {
      api.shuffleDict(id, function (shuffleDict) {
        var shuffler = new StrShuffler(shuffleDict);
        if (decode) {
          ProxyHref = shuffler.unshuffle(baseUrl.split(id + "/")[1]);
        } else {
          ProxyHref = "/" + id + "/" + shuffler.shuffle(baseUrl);
        }
        resolve(ProxyHref);
      });
    });
  });
}

async function encodeService(url, service) {
  switch (service) {
    case "uv":
      if (uvEnabled) {
        return (
          window.location.origin +
          __uv$config.prefix +
          __uv$config.encodeUrl(url)
        );
      }
      break;
    case "rammerhead":
      if (rammerheadEnabled) {
        return window.location.origin + (await rammerheadEncode(url));
      }
      break;
    case "scramjet":
      if (scramjetEnabled) {
        return (
          window.location.origin +
          __scramjet$config.prefix +
          __scramjet$config.codec.encode(url)
        );
      }
      break;
    case "meteor":
      if (meteorEnabled) {
        return (
          window.location.origin +
          $meteor_config.prefix +
          $meteor_config.codec.encode(url)
        );
      }
      break;
  }
}

window.chemical.encode = async function (url, config) {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    config = {
      service: defaultService,
      autoHttps: false,
    };
  }

  if (config.service === undefined) {
    config.service = defaultService;
  }

  if (config.autoHttps === undefined) {
    config.autoHttps = false;
  }

  if (url.match(/^https?:\/\//)) {
    return await encodeService(url, config.service);
  } else if (
    config.autoHttps === true &&
    url.includes(".") &&
    !url.includes(" ")
  ) {
    return await encodeService("https://" + url, config.service);
  } else if (config.searchEngine) {
    return await encodeService(
      config.searchEngine.replace("%s", encodeURIComponent(url)),
      config.service
    );
  } else {
    return await encodeService(url, config.service);
  }
};

window.chemical.decode = async function (url, config) {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    config = {
      service: defaultService,
    };
  }

  switch (config.service) {
    case "uv":
      if (uvEnabled) {
        return __uv$config.decodeUrl(url.split(__uv$config.prefix)[1]);
      }
      break;
    case "rammerhead":
      if (rammerheadEnabled) {
        return await rammerheadEncode(
          url.split(window.location.origin)[1],
          true
        );
      }
      break;
    case "scramjet":
      if (scramjetEnabled) {
        return __scramjet$config.codec.decode(
          url.split(__scramjet$config.prefix)[1]
        );
      }
      break;
    case "meteor":
      if (meteorEnabled) {
        return $meteor_config.codec.decode(url.split($meteor_config.prefix)[1]);
      }
      break;
  }
};

window.chemical.setStore = function (key, value) {
  const allowed = ["transport", "wisp", "service", "autoHttps", "searchEngine"];

  if (allowed.includes(key)) {
    localStorage.setItem("@chemical/" + key, String(value));
    if (key === "transport") {
      window.chemical.setTransport(value);
    }
    if (key === "wisp") {
      window.chemical.setWisp(value);
    }
    window.dispatchEvent(
      new CustomEvent("chemicalStoreChange", {
        detail: { key, value },
      })
    );
  }
};

window.chemical.getStore = function (key) {
  const value =
    key === "autoHttps"
      ? localStorage.getItem("@chemical/" + key) === "true"
      : localStorage.getItem("@chemical/" + key);

  const defaults = {
    transport: window.chemical.transport,
    wisp: window.chemical.wisp,
    service: "uv",
    autoHttps: false,
  };

  return value || defaults[key];
};

function getTransport(transport) {
  switch (transport) {
    default:
    case "libcurl":
      return "/libcurl/index.mjs";
      break;
    case "epoxy":
      return "/epoxy/index.mjs";
      break;
  }
}

window.chemical.setTransport = async function (newTransport) {
  newTransport = newTransport || currentScript.dataset.transport || "libcurl";
  await window.chemical.connection.setTransport(getTransport(newTransport), [
    { wisp: window.chemical.wisp },
  ]);
  window.chemical.transport = newTransport;
};

window.chemical.setWisp = async function (wisp) {
  wisp =
    wisp ||
    currentScript.dataset.wisp ||
    (location.protocol === "https:" ? "wss" : "ws") +
      "://" +
      location.host +
      "/wisp/";
  await window.chemical.connection.setTransport(
    getTransport(window.chemical.transport),
    [{ wisp: wisp }]
  );
  window.chemical.wisp = wisp;
};

async function registerSW() {
  if ("serviceWorker" in navigator) {
    await navigator.serviceWorker.register("/chemical.sw.js");
  } else {
    console.error("Service worker failed to register.");
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

function setupFetch() {
  const client = new window.BareMux.BareClient();
  window.chemical.fetch = client.fetch.bind(client);

  window.chemical.getSuggestions = async function (query) {
    if (!query) {
      return [];
    }

    try {
      const DDGSuggestions = await window.chemical.fetch(
        "https://duckduckgo.com/ac/?q=" + query + "&type=list"
      );
      const suggestions = await DDGSuggestions.json();
      return suggestions[1].slice(0, 9);
    } catch (err) {
      console.error(err);
      return [];
    }
  };

  window.chemical.createDataURL = async function (url) {
    return new Promise(async (resolve, reject) => {
      try {
        const response = await window.chemical.fetch(url);
        const blob = await response.blob();
        const reader = new FileReader();

        reader.onloadend = function () {
          resolve(reader.result);
        };

        reader.readAsDataURL(blob);
      } catch {
        resolve(undefined);
      }
    });
  };
}

await loadScript("/baremux/index.js");
if (uvEnabled) {
  await loadScript("/uv/uv.bundle.js");
  await loadScript("/uv/uv.config.js");
}
if (scramjetEnabled) {
  await loadScript("/scramjet/scramjet.codecs.js");
  await loadScript("/scramjet/scramjet.config.js");
}
if (meteorEnabled) {
  await loadScript("/meteor/meteor.codecs.js");
  await loadScript("/meteor/meteor.config.js");
}
window.chemical.connection = new window.BareMux.BareMuxConnection(
  "/baremux/worker.js"
);
await window.chemical.setTransport(window.chemical.transport);
setupFetch();
await registerSW();
window.chemical.loaded = true;
window.dispatchEvent(new Event("chemicalLoaded"));
