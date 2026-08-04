# GitHub maintainability audit closure

This branch closes the independently reported repository gaps without deploying the site or modifying Timeweb/DNS.

- Exact manifest parity is generated and verified from Git-visible files.
- Historical `.bak` sources are removed and blocked by ignore/verification rules.
- A catch-all React 404 page is present while deep links remain supported by nginx.
- The production image runs as the unprivileged `rik` user.
- Forms and chat have bounded input, storage and rate-limit state; uploads are signature-checked.
- Catalog HTML is sanitized with DOMPurify.
- Backend regression tests, frontend lint/build, full-history secret scan and container smoke tests run in CI.
- Merges to `main` publish `latest` and commit-SHA images to GHCR.

Evidence belongs in GitHub Actions runs and pull requests. Raw credentials, form contents and secret-scan matches must never be copied into this document.

