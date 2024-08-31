class ChemicalInput extends HTMLInputElement {
    constructor() {
        super();
    }
    connectedCallback() {
        this.addEventListener("keydown", async function (e) {
            if (e.key == "Enter" && window.chemical.loaded && e.target.value) {
                let service = this.dataset.service || "uv";
                let autoHttps = this.dataset.autoHttps !== undefined ? true : false;
                let searchEngine = this.dataset.searchEngine;
                let action = this.dataset.action
                let target = this.dataset.target
                let frame = this.dataset.frame
                let encodedURL = await chemical.encode(e.target.value, {
                    service,
                    autoHttps,
                    searchEngine
                })

                if (frame) {
                    let forFrame = document.getElementById(frame)
                    forFrame.src = encodedURL;
                    forFrame.setAttribute("data-open", "true")
                }

                if (action) {
                    window[action](encodedURL)
                }

                if (target) {
                    if (target == "_self") {
                        window.location = encodedURL
                    } else if (target == "_blank") {
                        window.open(encodedURL)
                    }
                }
            }
        })
    }
}

class ChemicalButton extends HTMLButtonElement {
    constructor() {
        super();
    }
    connectedCallback() {
        this.addEventListener("click", function (e) {
            let forInput = document.getElementById(this.dataset.for)

            if (forInput) {
                forInput.dispatchEvent(new KeyboardEvent("keydown", {
                    key: "Enter"
                }))
            }
        })
    }
}

class ChemicalIFrame extends HTMLIFrameElement {
    static observedAttributes = ["data-open"];
    constructor() {
        super();
    }
    connectedCallback() {
        let open = this.dataset.open
        this.style.display = open == "true" ? "" : "none"
    }
    attributeChangedCallback(name, oldValue, newValue) {
        if (name == "data-open") {
            let open = this.dataset.open
            this.style.display = open == "true" ? "" : "none"

            let controls = document.getElementById(this.dataset.controls)

            if (controls) {
                controls.dataset.open = open
            }
        }
    }
}

class ChemicalControls extends HTMLElement {
    static observedAttributes = ["data-open"];
    constructor() {
        super();
    }
    connectedCallback() {
        let open = this.dataset.open
        this.style.display = open == "true" ? "" : "none"
    }
    attributeChangedCallback(name, oldValue, newValue) {
        if (name == "data-open") {
            let open = this.dataset.open
            this.style.display = open == "true" ? "" : "none"
        }
    }
}

class ChemicalLink extends HTMLAnchorElement {
    constructor() {
        super();
    }
    async connectedCallback() {
        let href = this.dataset.href;
        let service = this.dataset.service || "uv";
        let autoHttps = this.dataset.autoHttps !== undefined ? true : false;
        let searchEngine = this.dataset.searchEngine;
        this.dataset.chemicalLoading = "true";

        if (window.chemical.loaded) {
            this.setAttribute("href", await chemical.encode(href, {
                service,
                autoHttps,
                searchEngine
            }))
            this.dataset.chemicalLoading = "false";
        } else {
            window.addEventListener("chemicalLoaded", async () => {
                this.setAttribute("href", await chemical.encode(href, {
                    service,
                    autoHttps,
                    searchEngine
                }))
                this.dataset.chemicalLoading = "false";
            })
        }
    }
}

customElements.define("chemical-input", ChemicalInput, { extends: "input" });
customElements.define("chemical-button", ChemicalButton, { extends: "button" });
customElements.define("chemical-iframe", ChemicalIFrame, { extends: "iframe" });
customElements.define("chemical-controls", ChemicalControls, { extends: "section" });
customElements.define("chemical-link", ChemicalLink, { extends: "a" });

function chemicalAction(action, frameID) {
    let frame = document.getElementById(frameID)

    if (frame) {
        switch (action) {
            case "back":
                frame.contentWindow.history.back()
                break;
            case "forward":
                frame.contentWindow.history.forward()
                break;
            case "reload":
                frame.contentWindow.location.reload()
                break;
            case "close":
                frame.dataset.open = "false"
                frame.src = ""
        }
    }
}
