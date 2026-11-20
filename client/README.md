# Client

Minimal Angular 22 + PrimeNG 22/Aura foundation shell. Requires Node.js 24.22.0
and npm 12.2.0. Client dependencies and quality gates are independent of Server.

From this directory:

```powershell
npm ci
npm run format:check
npm run lint
npm test -- --watch=false
npm run build -- --configuration production
npm start
```

`npm run format` applies Prettier. Lint uses an ESLint flat config:
Angular/TypeScript recommended rules, template accessibility, `app` selectors,
and `eslint-config-prettier` last. ESLint scans `src/`, including templates;
Prettier checks all supported project files except generated output/dependencies.
Vitest is run through Angular's adopted unit-test builder. Zero discovered tests
are an error. Build output is in `dist/client/`.

## PrimeUI license

PrimeNG 22 uses the Community license configured directly in
`src/app/app.config.ts`. Standard development and production build commands
require no local license file or build-time injection. Other developers must
ensure their own use complies with the
[official license terms](https://primeui.dev/licenses/community).
Aura follows the system theme; this slice does not implement theme/language
controls, navigation, or business features.

## Verification

Verified on Windows on 2026-11-19: clean `npm ci`, format, lint, 2 Vitest tests,
and production build passed. The same gates passed from an isolated source copy
with its own clean dependency installation. Deliberate formatting, unused-variable,
type-error, and assertion probes failed in that copy; restored gates passed.
A no-matching-test-files probe also failed.

Browser inspection with an authorized local license passed at actual CSS widths
375px, 768px, and 1280px: Aura card rendered without horizontal overflow or a
license notice. The static shell has no interactive controls to exercise with
keyboard/touch. This is shell verification, not business-flow browser E2E.

CI runs these gates in the independent Client workflow; see the
[root CI documentation](../README.md#continuous-integration). Actual hosted-run
evidence is the next slice in [the foundation plan](../Docs/Foundation-CI-Plan.md).
