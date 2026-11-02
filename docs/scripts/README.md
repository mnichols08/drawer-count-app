# Scripts

## Development and verification

```bash
npm run dev             # Netlify Dev: static site + functions
npm test                # default test suite
npm run test:functions  # sync function contract tests
npm run build           # copy src/ to dist/
npm run build:prod      # optimize images, then build
npm run clean           # remove dist/
```

## Assets and releases

```bash
npm run icons
npm run optimize-images
npm run bump-sw
npm run release:patch
npm run release:minor
npm run release:major
```

Netlify uses `npm run build:prod` from `netlify.toml`. Runtime Supabase values
are Function environment variables and are not consumed by the build script.

See [build.md](build.md), [icons.md](icons.md), [images.md](images.md), and
[version-management.md](version-management.md) for the individual utilities.
