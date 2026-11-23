{
  description = "Chemical development environment (Node + pnpm)";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];

      forEachSystem = fn:
        nixpkgs.lib.genAttrs systems (system: fn nixpkgs.legacyPackages.${system});
    in
    {
      # `nix run .#pnpm -- install` / `nix shell .#pnpm`
      packages = forEachSystem (pkgs: rec {
        pnpm = pkgs.pnpm_12;
        default = pnpm;
      });

      # `nix develop`
      devShells = forEachSystem (pkgs: {
        default = pkgs.mkShell {
          packages = [
            pkgs.nodejs_22
            pkgs.pnpm_12
          ];

          shellHook = ''
            echo "Node $(node --version) · pnpm $(pnpm --version)"
            echo "pnpm switches to the version pinned in package.json on first use."
          '';
        };
      });
    };
}
