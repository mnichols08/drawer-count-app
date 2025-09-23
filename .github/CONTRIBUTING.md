# Contributing Guide

Thanks for your interest in contributing! This guide explains how to get set up, how to work with the codebase, and how to submit changes.

## 📦 Project Setup

- Node.js 18+ recommended
- Install dependencies:
```powershell
npm ci
```
- Run the dev server:
```powershell
npm run dev
```
- Run tests locally:
```powershell
npm test
```

## 🧪 Tests

We use the Node.js built-in test runner. See `docs/testing/README.md` for details.

- Run all tests:
```powershell
npm test
```
- Run in watch mode:
```powershell
npm run test:watch
```

## 🧰 Useful Scripts

- Build production: `npm run build`
- Bump SW cache/version: `npm run bump-sw`
- Optimize images: `npm run optimize-images`
- Generate icons: `npm run generate-icons`

See `docs/scripts/README.md` for the full list and details.

## 🧭 Branching & Workflow

- Default branch: `development`
- Use feature branches: `feat/<short-name>`
- Use fix branches: `fix/<short-name>`
- Use docs branches: `docs/<short-name>`

```text
main        ← protected, releases only
└─ development  ← default branch
   ├─ feat/*
   ├─ fix/*
   └─ docs/*
```

## ✅ Commit Messages

Follow Conventional Commits when possible:

- `feat:` new user-facing functionality
- `fix:` bug fix
- `docs:` documentation only changes
- `test:` adding or updating tests
- `build:` build system or external dependencies
- `chore:` misc chores

Examples:
- `feat(settings): add dark mode toggle`
- `fix(sw): handle cache fallback on network error`

## 🔍 Pull Requests

- Keep PRs focused and small when possible
- Include a clear description and before/after if UI changes
- Add tests for new behavior when it makes sense
- Update docs in `/docs` if behavior or scripts change

Checklist:
- [ ] Tests pass (`npm test`)
- [ ] Lint/style consistent (n/a if not configured)
- [ ] Docs updated
- [ ] No secrets or private data

## 🐛 Filing Issues

- Use the provided issue templates
- Include reproduction steps and environment details
- Attach screenshots or logs when helpful

## 🔐 Security

See `SECURITY.md` for reporting vulnerabilities. Please do not open public issues for security reports.

## 📄 Licensing

By contributing, you agree that your contributions are licensed under the project license (see `LICENSE`).
