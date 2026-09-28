# CLAUDE.md

**Read [AGENTS.md](AGENTS.md) first** — project context, stack, the Google Drive
contract, testing and the hard rules live there. This file is only the working
agreement for Claude Code sessions. It mirrors `zhangqi444/isee/CLAUDE.md`; when
the two drift, this project follows isee.

## Before you change anything

- Work in `site/`. Catalog edits go in `content/catalog.json`, then re-run
  `python3 site/make_bundle.py` and commit the regenerated bundle.
- Keep `isee` and `volunteer` consistent: same shell, tokens, component library,
  store shape, test layout and docs. A convention added to one belongs in the other.

## Before you commit

```bash
cd site && npm run build && npm test        # all three suites must pass
python3 site/make_bundle.py && git diff --exit-code -- site/public/content/bundle.json
```

If a check fails because the UI legitimately changed, fix the test's assumption —
never delete the check.

## Committing and pushing

- Work on `main` directly; the owner asked for that in the remote session.
  Push after every green commit — the Pages build follows automatically.
- Commit messages: what changed and *why it was wrong before*, in prose. No
  bullet-point changelogs of file names.
- Trailers:

```
Co-Authored-By: Claude <noreply@anthropic.com>
Claude-Session: <session url>
```

## Things that have bitten before

- The Google popup cannot be opened without a user gesture and cannot be reached
  by browser automation. Auth changes are verified with the stub in `test_helpers.cjs`.
- Pages must have **Source: GitHub Actions**. With "Deploy from a branch" the
  workflow's deploy job fails the moment it starts, and the branch build serves the
  repo root, which no longer has an `index.html`.
- Radix `Select` refuses an empty-string item value; use `Pick` from `bits.jsx`,
  which maps "none" for you and renders the platform's own `<select>` on touch
  devices, where the custom dropdown was unreliable inside a dialog on iOS.
- Bumping the Drive `schema` means updating `normalize`, `merge`, `replaceAll` and the drive test.
- **Tailwind v4 does not scan `node_modules`.** Most of the shadcn primitives now
  come from `@zhangqi444/ui`, so their styling hangs on one line —
  `@source "../node_modules/@zhangqi444/ui/src";` in `src/index.css`. Remove it
  and the build succeeds, every import resolves, and all 156 checks pass, because
  they assert on text, roles and behaviour and cannot see a missing rule; the
  separators, sheets, tooltips and tables just render as unstyled HTML.
  `check_css.cjs` compares the class names only the package uses against the
  stylesheet the build produced, and runs at the end of `npm run build` — inside
  the command the deploy workflow runs, which is the last point at which catching
  this keeps it away from a reader. With the line, 35 of 97 such classes are in
  the stylesheet; without it, none, and the build stops.
- `button.jsx` and `sidebar.jsx` stay local on purpose: this site's button is
  deliberately not the learning site's, and the sidebar trigger is the one place
  that renders one. Do not "finish the migration" by moving either without
  tokenising the twenty-two lines of difference first.

## Verification habit

Screenshot the page you changed — desktop, phone width, and dark mode — and look
at it before saying it is done. The suites write `shot-*.png` into `site/`.
