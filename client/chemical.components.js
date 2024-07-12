class ChemicalInput extends HTMLInputElement {
    constructor() {
        super();
    }
    connectedCallback() {
        this.addEventListener("keydown", async function (e) {
            if (e.key == "Enter" && window.chemicalLoaded && e.target.value) {
                let encodedURL = await window.chemicalEncode(e.target.value)
                let action = this.getAttribute("action")
                let target = this.getAttribute("target")
                let frame = this.getAttribute("frame")

                if (frame) {
                    let forFrame = document.getElementById(this.getAttribute("frame"))
                    forFrame.src = encodedURL
                    forFrame.setAttribute("open", "true")
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
            let forInput = document.getElementById(this.getAttribute("for"))

            if (forInput) {
                forInput.dispatchEvent(new KeyboardEvent("keydown", {
                    key: "Enter"
                }))
            }
        })
    }
}

class ChemicalIFrame extends HTMLIFrameElement {
    static observedAttributes = ["open"];
    constructor() {
        super();
    }
    connectedCallback() {
        let open = this.getAttribute("open")
        this.style.display = open == "true" ? "" : "none"
    }
    attributeChangedCallback(name, oldValue, newValue) {
        if (name == "open") {
            let open = this.getAttribute("open")
            this.style.display = open == "true" ? "" : "none"

            let controls = document.getElementById(this.getAttribute("controls"))

            if (controls) {
                controls.setAttribute("open", open)
            }
        }
    }
}

class ChemicalControls extends HTMLElement {
    static observedAttributes = ["open"];
    constructor() {
        super();
    }
    connectedCallback() {
        let open = this.getAttribute("open")
        this.style.display = open == "true" ? "" : "none"
    }
    attributeChangedCallback(name, oldValue, newValue) {
        if (name == "open") {
            let open = this.getAttribute("open")
            this.style.display = open == "true" ? "" : "none"
        }
    }
}

customElements.define("chemical-input", ChemicalInput, { extends: "input" });
customElements.define("chemical-button", ChemicalButton, { extends: "button" });
customElements.define("chemical-iframe", ChemicalIFrame, { extends: "iframe" });
customElements.define("chemical-controls", ChemicalControls, { extends: "section" });

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
                frame.setAttribute("open", "false")
                frame.src = ""
        }
    }
}