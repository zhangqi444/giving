/* Desktop + phone shells, navigation, first entry, persistence across a reload, theme.
 * Run:  npm run build && node test_e2e.cjs */
const { serve, launch, check, failed, fakeGoogle, pick, errorsOf, signIn, saveEntry, PNG } = require('./test_helpers.cjs');

(async () => {
  const { srv, base } = await serve(8150);
  const b = await launch();
  for (const [label, viewport] of [['desktop', { width: 1280, height: 860 }], ['phone', { width: 390, height: 844 }]]) {
    console.log('\n== ' + label + ' ==');
    const phone = label === 'phone';
    const ctx = await b.newContext({ viewport, ...(phone ? { isMobile: true, hasTouch: true } : {}) });
    await fakeGoogle(ctx);
    const pg = await ctx.newPage(); const errs = errorsOf(pg);
    await pg.goto(base, { waitUntil: 'networkidle' });
    await pg.waitForSelector('[data-testid=signin]');
    check('sign-in gate shown first, nothing of the app behind it', (await pg.$('[data-slot=sidebar-trigger]')) === null);
    check('no Google prompt on load', (await pg.evaluate(() => window.__gisCalls.length)) === 0);
    await signIn(pg);
    await pg.waitForSelector('[data-testid=today]');
    check('dashboard renders empty state after sign-in', /Ready to log your first hours/.test(await pg.textContent('[data-testid=today]')));
    /* Wait for the state rather than reading whatever the chip says the instant
       the dashboard appears. It climbs local → connecting → syncing → live, so
       a bare read here was a race that happened to win most of the time and
       reported "header shows Saved to Drive" as a failure when the upload was a
       few milliseconds slower. Every other suite already waits for this text. */
    if (!phone) {
      const live = await pg.waitForSelector('[data-testid=drive-button]:has-text("Saved to Drive")', { timeout: 8000 }).then(() => true).catch(() => false);
      check('header shows Saved to Drive', live, live ? '' : await pg.textContent('[data-testid=drive-button]'));
    }

    // navigation: sidebar is a drawer on phones and must close after navigating
    if (phone) {
      check('sidebar hidden on phone until opened', (await pg.$('[data-slot=sidebar][data-mobile=true]')) === null);
      await pg.click('[data-slot=sidebar-trigger]');
      await pg.waitForSelector('[data-slot=sidebar][data-mobile=true]');
      await pg.click('[data-slot=sidebar-menu-button]:has-text("Rewards")');
      await pg.waitForSelector('[data-slot=sidebar][data-mobile=true]', { state: 'detached' });
      check('drawer closes after navigation', true);
    } else {
      check('sidebar visible on desktop', (await pg.$('[data-slot=sidebar-container]')) !== null);
      await pg.click('[data-slot=sidebar-menu-button]:has-text("Rewards")');
    }
    await pg.waitForFunction(() => location.hash === '#/rewards');
    check('rewards route', true);

    // log hours from the sidebar's primary button, and make the place from inside it:
    // there is no Places page any more, so every organization picker carries its own New
    if (phone) { await pg.click('[data-slot=sidebar-trigger]'); await pg.waitForSelector('[data-slot=sidebar][data-mobile=true]'); }
    await pg.click('[data-testid=log-hours]');
    await pg.waitForSelector('[data-testid=entry-dialog]');
    await pg.click('[data-testid=entry-new-org]');
    await pg.waitForSelector('[data-testid=org-dialog]');
    await pg.fill('[data-testid=org-name]', 'Riverside Food Bank');
    await pg.fill('[data-testid=org-contact]', 'Maria Lopez');
    await pg.click('[data-testid=org-save]');
    await pg.waitForSelector('[data-testid=org-dialog]', { state: 'detached' });
    check('a place added from the entry dialog is chosen straight away', /Riverside Food Bank/.test(await pg.textContent('[data-testid=entry-org]')));
    check('date defaults to today', (await pg.inputValue('[data-testid=entry-date]')) === new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10));
    check(phone ? 'touch device gets the native organization picker' : 'desktop gets the Radix organization picker', (await pg.$eval('[data-testid=entry-org]', (el) => el.tagName)) === (phone ? 'SELECT' : 'BUTTON'));
    await pg.fill('[data-testid=entry-hours]', '2.5');
    await pick(pg, '[data-testid=entry-org]', 'Riverside Food Bank');
    await pg.fill('[data-testid=entry-activity]', 'Sorted donations');
    check('the log dialog asks for her words once, in one box', (await pg.$('[data-testid=entry-reflection]')) !== null && !/Notes/.test(await pg.textContent('[data-testid=entry-dialog]')));
    await pg.fill('[data-testid=entry-reflection]', 'I stacked the tins by date.');
    await pg.click('[data-testid=entry-save]');
    await pg.waitForSelector('[data-testid=entry-dialog]', { state: 'detached' });
    // the "Logged 2.5 hours" toast is replaced within the second by "Badge earned: First
    // hours", so assert the record that was written rather than whichever toast won the race
    check('the entry is written with its hours, place and activity', await pg.evaluate(() => {
      const d = JSON.parse(localStorage.getItem('volunteer.v2')), e = d.entries[0];
      return d.entries.length === 1 && e.hours === 2.5 && e.activity === 'Sorted donations' && !!e.orgId;
    }));
    check('what she wrote is kept as her words, and no second field holds a copy', await pg.evaluate(() => {
      const e = JSON.parse(localStorage.getItem('volunteer.v2')).entries[0];
      return e.reflection === 'I stacked the tins by date.' && e.notes === '';
    }));
    // having written it in the dialog, the step that follows is only there for the photo —
    // a photo needs an entry to hang on, which is why there is a second step at all
    await pg.waitForSelector('[data-testid=reflection-dialog]');
    check('the step after saving asks for a photo, not for the same words again', (await pg.$('[data-testid=reflection-text]')) === null && /Keep a photo/.test(await pg.textContent('[data-testid=reflection-dialog]')));
    await pg.click('[data-testid=reflection-skip]');
    await pg.waitForSelector('[data-testid=reflection-dialog]', { state: 'detached' });

    // validation: zero hours is refused
    if (phone) { await pg.click('[data-slot=sidebar-trigger]'); await pg.waitForSelector('[data-slot=sidebar][data-mobile=true]'); }
    await pg.click('[data-testid=log-hours]');
    await pg.waitForSelector('[data-testid=entry-dialog]');
    await pg.fill('[data-testid=entry-hours]', '0');
    await pg.click('[data-testid=entry-save]');
    check('zero hours rejected with a message', /greater than zero/.test(await pg.textContent('[data-testid=form-error]')));
    await pg.keyboard.press('Escape');
    await pg.waitForSelector('[data-testid=entry-dialog]', { state: 'detached' });

    // dashboard totals + persistence across a reload (localStorage first)
    await pg.goto(base + '#/', { waitUntil: 'networkidle' });
    await pg.waitForSelector('[data-testid=stat-total]');
    check('total hours 2.5 on dashboard', /2\.5/.test(await pg.textContent('[data-testid=stat-total]')));
    await pg.reload({ waitUntil: 'networkidle' });
    await pg.waitForSelector('[data-testid=stat-total]');
    check('reload opens the app directly, data intact', /2\.5/.test(await pg.textContent('[data-testid=stat-total]')) && (await pg.$('[data-testid=signin]')) === null);
    check('recent activity lists the entry', /Sorted donations/.test(await pg.textContent('[data-testid=recent]')));

    // breadcrumb: always a way out
    await pg.goto(base + '#/log', { waitUntil: 'networkidle' });
    const crumbs = await pg.$$eval('[data-slot=breadcrumb-item]', (n) => n.map((x) => x.textContent.trim()).filter(Boolean));
    check('breadcrumb Dashboard > Hours', crumbs[0] === 'Dashboard' && crumbs.includes('Hours'), crumbs.join(' > '));
    await pg.click('[data-slot=breadcrumb-link]:has-text("Dashboard")');
    await pg.waitForFunction(() => location.hash === '#/' || location.hash === '');
    check('breadcrumb navigates home', true);

    // theme
    await pg.click('[data-testid=theme-toggle]');
    check('dark theme applied', await pg.evaluate(() => document.documentElement.classList.contains('dark')));
    await pg.screenshot({ path: `shot-${label}-dark.png`, fullPage: phone });
    await pg.click('[data-testid=theme-toggle]');
    check('light theme restored', !(await pg.evaluate(() => document.documentElement.classList.contains('dark'))));
    await pg.screenshot({ path: `shot-${label}.png`, fullPage: phone });

    check('no page errors', errs.length === 0, errs.join(' | '));
    await ctx.close();
  }
  await b.close(); srv.close();
  console.log(failed() ? `\n${failed()} check(s) failed` : '\nall e2e checks passed');
  process.exit(failed() ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
