# Security Policy

We take security seriously and appreciate responsible disclosure of vulnerabilities.

## Supported Versions

We aim to support the latest release on the `main` branch and the active `development` branch.

## Reporting a Vulnerability

- Please report security issues privately using GitHub Security Advisories or by emailing the maintainer if available on their profile.
- Do not open public GitHub issues for security vulnerabilities.
- Include as much detail as possible:
  - Affected versions/branches
  - Reproduction steps or proof of concept
  - Potential impact
  - Suggested mitigation (if known)

You can create a private advisory draft here:
- https://github.com/mnichols08/drawer-count-app/security/advisories/new

## Response Process

- We will acknowledge receipt within 72 hours
- We will investigate and validate the report
- We will coordinate a fix and release timeline
- We will credit the reporter if desired

## Hardening Guidelines

- Do not commit secrets; use environment variables
- Prefer HTTPS for all external requests
- Validate and sanitize any user-provided inputs
- Keep dependencies up to date

## Scope

This project is primarily a static PWA with an optional Express API (`server.js`). Security considerations include:

- Service Worker: cache poisoning, update logic
- Express API: rate limiting, input validation, CORS
- MongoDB connection: TLS, credentials via environment, least privilege

See `docs/deployment/README.md` for deployment security notes.
