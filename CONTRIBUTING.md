# Contributing

The canonical repository is the private GitHub repository `vstoilsky-svg/rik-site`.

1. Pull `main` and create a branch named `agent/<topic>` or `feature/<topic>`.
2. Keep credentials only in `backend/.env`; never add that file to Git.
3. Install reproducibly with `INSTALL.ps1` and validate with `VERIFY.ps1`.
4. Regenerate `MANIFEST.csv` with `GENERATE-MANIFEST.ps1` after the final file change.
5. Commit a focused diff and open a pull request. CI must pass before merge.
6. A successful merge publishes immutable and `latest` container tags to GHCR.

Production deployment, Timeweb settings, DNS and domain cutover are separate operator actions. A Git merge does not authorize or perform them.

