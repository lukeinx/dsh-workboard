# mediaremote-adapter

Vendored from <https://github.com/ungive/mediaremote-adapter> at commit `14eed9389241d06e29f7326c19e9ebc6ec8a5f36` (BSD-3-Clause, see `LICENSE`).

- `mediaremote-adapter.pl`: `bin/mediaremote-adapter.pl`, unchanged.
- `MediaRemoteAdapter.framework/MediaRemoteAdapter`: universal (arm64 + x86_64) binary built with `cmake .. && cmake --build .`, copied without the framework's symlinks so npm packs it as a plain file.

To update, rebuild at the new commit, copy the same two files and run `npm run check`.
