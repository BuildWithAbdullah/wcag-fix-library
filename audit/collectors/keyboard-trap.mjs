/**
 * Observe 2.1.2 by opening every dialog on the page with a key press and then
 * trying to get out of it with key presses only.
 *
 * Nothing here is clicked. A dialog closed with the mouse tells you nothing
 * about whether a keyboard user could have closed it, and a focus position
 * measured after a click is a focus position the mouse put there.
 */

import { open } from '../browser.mjs';
import { environment } from '../browser.mjs';

const MAX_TAB = 24;

export async function collect(browser, file) {
  const page = await open(browser, file);
  try {
    await page.evaluate(() => {
      // Record every element the page makes inert, so the judging can say
      // whether the inert path or the fallback path was the one that ran.
      window.__inerted = [];
      const descriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'inert');
      if (descriptor && descriptor.set) {
        Object.defineProperty(HTMLElement.prototype, 'inert', {
          configurable: true,
          get: descriptor.get,
          set(value) {
            if (value) window.__inerted.push(window.__wcag.describe(this));
            descriptor.set.call(this, value);
          },
        });
      }
    });

    const candidates = await page.evaluate(() =>
      [...document.querySelectorAll('[role=dialog], [role=alertdialog], dialog')].map((el) =>
        window.__wcag.describe(el)
      )
    );

    const state = () =>
      page.evaluate((refs) => {
        const H = window.__wcag;
        const find = (ref) =>
          [...document.querySelectorAll('*')].find((el) => H.describe(el) === ref) || null;
        const active = document.activeElement;
        return {
          active: active && active !== document.body ? H.describe(active) : 'the document body',
          dialogs: refs.map((ref) => {
            const el = find(ref);
            return {
              ref,
              visible: el ? H.visible(el) : false,
              containsFocus: el ? el.contains(document.activeElement) : false,
            };
          }),
          inerted: window.__inerted.slice(),
        };
      }, candidates);

    const dialogs = [];

    for (const ref of candidates) {
      await page.goto(page.url(), { waitUntil: 'load' });
      await page.evaluate(() => {
        window.__inerted = [];
        const d = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'inert');
        if (d && d.set) {
          Object.defineProperty(HTMLElement.prototype, 'inert', {
            configurable: true,
            get: d.get,
            set(value) {
              if (value) window.__inerted.push(window.__wcag.describe(this));
              d.set.call(this, value);
            },
          });
        }
      });

      // Walk forward pressing Enter until this dialog becomes visible. That
      // is the keyboard route in, and if there is not one there is nothing
      // further to measure.
      let opener = null;
      let opened = false;
      for (let i = 0; i < MAX_TAB && !opened; i += 1) {
        await page.keyboard.press('Tab');
        const at = await page.evaluate(() => {
          const el = document.activeElement;
          if (!el || el === document.body) return null;
          return window.__wcag.describe(el);
        });
        if (at === null) break;
        await page.keyboard.press('Enter');
        const after = await state();
        const target = after.dialogs.find((d) => d.ref === ref);
        if (target && target.visible) {
          opener = at;
          opened = true;
        }
      }

      if (!opened) {
        dialogs.push({ ref, opened: false });
        continue;
      }

      const justOpened = await state();
      const target = justOpened.dialogs.find((d) => d.ref === ref);

      // Tab around with the dialog open and note everything reached that is
      // not inside it.
      const escapedWhileOpen = [];
      for (let i = 0; i < MAX_TAB; i += 1) {
        await page.keyboard.press('Tab');
        const now = await state();
        const d = now.dialogs.find((x) => x.ref === ref);
        if (!d || !d.visible) break;
        if (!d.containsFocus && now.active !== 'the document body') {
          if (!escapedWhileOpen.includes(now.active)) escapedWhileOpen.push(now.active);
        }
      }

      await page.keyboard.press('Escape');
      const afterEscape = await state();
      const stillOpen = afterEscape.dialogs.find((x) => x.ref === ref);
      const escapeClosedIt = !(stillOpen && stillOpen.visible);

      let closedByKeyboard = escapeClosedIt;
      let focusAfterClose = afterEscape.active;

      if (!escapeClosedIt) {
        // Try to reach a close control inside the dialog and press it.
        for (let i = 0; i < MAX_TAB; i += 1) {
          await page.keyboard.press('Tab');
          const now = await state();
          const d = now.dialogs.find((x) => x.ref === ref);
          if (!d || !d.visible) break;
          if (!d.containsFocus) continue;
          const looksLikeClose = await page.evaluate(() =>
            /close|dismiss|cancel|done/i.test(window.__wcag.accessibleish(document.activeElement))
          );
          if (!looksLikeClose) continue;
          await page.keyboard.press('Enter');
          const after = await state();
          const d2 = after.dialogs.find((x) => x.ref === ref);
          if (!d2 || !d2.visible) {
            closedByKeyboard = true;
            focusAfterClose = after.active;
          }
          break;
        }
      }

      dialogs.push({
        ref,
        opened: true,
        opener,
        focusAfterOpen: justOpened.active,
        focusMovedIn: Boolean(target && target.containsFocus),
        escapedWhileOpen,
        escapeClosedIt,
        closedByKeyboard,
        focusAfterClose,
        usedInert: justOpened.inerted.length > 0,
      });
    }

    return { dialogs, environment: await environment(page) };
  } finally {
    await page.close();
  }
}
