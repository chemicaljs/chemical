class ChemicalTitle extends HTMLTitleElement {
  constructor() {
    super();
  }
  connectedCallback() {
    setTimeout(() => {
      this.setAttribute("data-title", this.innerText);

      const title =
        this.dataset.titleStore !== undefined
          ? localStorage.getItem("@chemical/title") ||
            this.getAttribute("data-title")
          : this.getAttribute("data-title");

      this.innerText = title;
    });
  }
}

class ChemicalIcon extends HTMLLinkElement {
  constructor() {
    super();
  }
  connectedCallback() {
    setTimeout(() => {
      this.setAttribute("data-icon", this.getAttribute("href"));

      const icon =
        this.dataset.iconStore !== undefined
          ? localStorage.getItem("@chemical/icon") ||
            this.getAttribute("data-icon")
          : this.getAttribute("data-icon");

      this.setAttribute("href", icon);
    });
  }
}

customElements.define("chemical-title", ChemicalTitle, { extends: "title" });
customElements.define("chemical-icon", ChemicalIcon, { extends: "link" });

window.chemical.aboutBlank = function (url) {
  var page = window.open();
  page.document.body.innerHTML =
    `<iframe style="height:100%; width: 100%; border: none; position: fixed; top: 0; right: 0; left: 0; bottom: 0; border: none" sandbox="allow-forms allow-modals allow-orientation-lock allow-pointer-lock allow-popups allow-popups-to-escape-sandbox allow-presentation allow-same-origin allow-scripts allow-top-navigation allow-top-navigation-by-user-activation" src="` +
    url +
    `"></iframe>`;
};
