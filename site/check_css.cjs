/* Does the built CSS actually contain the shared package's styles?
 *
 * The primitives in src/components/ui/ now live in @zhangqi444/ui, under
 * node_modules/. Tailwind v4 does not scan node_modules: without the
 * `@source "../node_modules/@zhangqi444/ui/src";` line in src/index.css it
 * emits no rule for any class those files use and nothing else does, and the
 * separators, sheets, tooltips and tables render as unstyled HTML.
 *
 * Nothing catches that. The build succeeds; every import resolves; the three
 * Playwright suites pass all 156 checks, because they assert on text, roles
 * and behaviour, never on whether a rule exists. This was measured, not
 * assumed: with the @source line removed the suites exited 0 with zero
 * failures, and the stylesheet was 14,138 bytes lighter.
 *
 * So the check has to be on the stylesheet itself, and it has to run inside
 * `npm run build` — that is the command CI runs before it deploys, and a
 * deploy is exactly the moment this failure would reach a reader.
 */
const fs = require('fs'), path = require('path');

const PKG = path.join(__dirname, 'node_modules/@zhangqi444/ui/src');
const LOCAL = path.join(__dirname, 'src');
const DIST = path.join(__dirname, 'dist/assets');

const die = (msg) => { console.error('check_css: ' + msg); process.exit(1) }

/* Class names as they can be looked up verbatim in the output. Tailwind escapes
 * the punctuation in `peer-data-[x]:w-2`, so only plain names are usable here —
 * there are plenty, and a sample is all this needs. */
function classesIn(dir) {
  const out = new Set()
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name)
      if (e.isDirectory()) walk(p)
      else if (/\.jsx?$/.test(e.name))
        for (const m of fs.readFileSync(p, 'utf8').matchAll(/"([^"\n]*)"|'([^'\n]*)'|`([^`\n]*)`/g))
          for (const w of (m[1] ?? m[2] ?? m[3]).split(/\s+/))
            if (/^[a-z][a-z0-9-]*$/.test(w)) out.add(w)
    }
  }
  walk(dir)
  return out
}

if (!fs.existsSync(PKG)) die('@zhangqi444/ui is not installed — run npm ci.')
if (!fs.existsSync(DIST)) die('no dist/assets — run vite build first.')

const css = fs.readdirSync(DIST).filter((f) => f.endsWith('.css'))
  .map((f) => fs.readFileSync(path.join(DIST, f), 'utf8')).join('\n')
if (!css) die('the build produced no stylesheet at all.')

const local = classesIn(LOCAL)
const only = [...classesIn(PKG)].filter((c) => !local.has(c)).sort()

/* If the package and the site ever share every plain class name, this check
 * would pass whatever the stylesheet said. That is silent success, which is
 * the failure it exists to prevent, so say so instead. */
if (only.length < 20) die(`only ${only.length} class names are unique to the package; too few to tell whether its styles were emitted. Widen the sample or drop this check deliberately.`)

const present = only.filter((c) => new RegExp('\\.' + c + '[,{:\\s]').test(css))
if (present.length * 3 < only.length)
  die(`${present.length} of ${only.length} package-only classes reached the stylesheet.\n` +
      `  Tailwind is not scanning the package. Check that src/index.css still has\n` +
      `  @source "../node_modules/@zhangqi444/ui/src"; and that the dependency is installed.`)

console.log(`check_css: ${present.length}/${only.length} package-only classes in the stylesheet.`)
