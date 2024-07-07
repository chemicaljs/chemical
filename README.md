# Chemical
Create your own web proxy using Ultraviolet fast, easy, and no experience required.

## Setup

A simple example can be found in `/example/`.

### Server

Create a new Node.js project and create a script file for the server.

1. Install Chemical `npm install chemicaljs`.

2. Import `ChemicalServer` and create a new server.

```js
import { ChemicalServer } from "chemicaljs";

const chemical = new ChemicalServer();
```

3. Use `chemical.app` which is an express app. You may need to import express for certen APIs.

```js
chemical.app.get("/", function(req, res){
    res.send("Hello World");
});
```

4. Use `chemical.server` and listen on a port of your choosing.

```js
chemical.server.listen(3000);
```

Below is an example of a simple backend. This example will setup Chemical and serve the "public" folder along with the `index.html` file as `/` and `.html` files without the extension.

```js
import { ChemicalServer } from "chemicaljs";
import express from "express";

const chemical = new ChemicalServer();
const port = process.env.PORT || 3000;

chemical.app.use(express.static("public", {
    index: "index.html",
    extensions: ["html"]
}));

chemical.server.listen(port, () => {
    console.log(`Chemical demo listening on port ${port}`);
});
```

### Client

In your project create a folder to store your static assets. Create an index.html file which will be the homepage of your website.

1. Add the Chemical script to the top of your page. This will load all needed scripts for Ultraviolet and Chemical.

```html
<script src="/chemical.js"></script>
```

2. In a inline script or javascript file, encode a URL with Chemical using `window.chemicalEncode`.

```js
window.chemicalEncode("https://example.com")
```

3. You may want to check if Chemical has loaded before encoding a URL.

```js
if (window.chemicalLoaded) {
    //Chemical is loaded
}
```

```js
window.addEventListener("chemicalLoaded", function(e) {
    //Chemical has loaded
});
```

Below is a simple example of a simple input that redirects to the encoded URL when the user presses enter. It checks if there is any input and if Chemical has loaded before loading.

```html
<h1>Chemical Example</h1>
<input id="search" placeholder="Enter URL">

<script src="/chemical.js"></script>
<script>
    const search = document.getElementById("search");

    search.addEventListener("keydown", function (e) {
        if (e.key == "Enter" && window.chemicalLoaded && e.target.value) {
            window.location = window.chemicalEncode(e.target.value)
        }
    })
</script>
```

## Future Addition

Some features that may come in the future are:

- More proxy services.
- Easy client components.
- Easy tab cloaking components.

## License
Chemical Uses the MIT license.