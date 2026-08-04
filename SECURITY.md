# Security

Do not put API keys, SMTP credentials, tokens, customer documents or `backend/.env` in Git, issues, pull requests or bridge messages.

The request endpoint limits body, field, file and aggregate sizes; checks file extensions and signatures; and rate-limits by the client address supplied by the trusted local reverse proxy. Chat payloads, sessions and rate-limit buckets are bounded. Rich catalog HTML is sanitized before rendering.

Report a suspected leak privately to the repository owner. Rotate the affected credential before discussing implementation details. Do not publish the raw secret in an issue.

