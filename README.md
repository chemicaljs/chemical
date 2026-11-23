# Chemical

Easily create your own web proxy with no experience required. V3 has been simplified to just Scramjet and is now Svelte only.

## Docs

You can find documentation for Chemical on our website https://chemicaljs.github.io.

## Development

`nix develop` gives you Node 22 and pnpm; pnpm picks up the version pinned in `package.json` on
first use. You can also run `nix run .#pnpm -- install` directly. Nix flakes only see git-tracked
files, so `flake.nix` and `flake.lock` need to be added to git. See `test/README.md` for a minimal
example app.

## License

Chemical uses the AGPL 3.0 license.
