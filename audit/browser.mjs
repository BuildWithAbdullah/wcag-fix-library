/**
 * browser.mjs
 *
 * One browser for the whole audit, and the single place that knows how to put
 * a criterion page in front of it with the helpers already installed.
 *
 * PUPPETEER_EXECUTABLE_PATH is honoured by puppeteer itself, so a machine
 * that already has a Chromium build can point at it and skip the download.
 */

import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer';
import { HELPERS } from './page-helpers.mjs';

export async function launch() {
  return puppeteer.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
}

export async function open(browser, file, viewport = { width: 1280, height: 900 }) {
  const page = await browser.newPage();
  await page.setViewport(viewport);
  // Installed before any document script runs, so a collector can read it on
  // the very first evaluate without a race.
  await page.evaluateOnNewDocument(HELPERS);
  await page.goto(pathToFileURL(file).href, { waitUntil: 'load' });
  return page;
}

export async function environment(page) {
  return page.evaluate(() => ({
    inertSupported: 'inert' in HTMLElement.prototype,
    forcedColors: window.matchMedia('(forced-colors: active)').matches,
    prefersContrast: window.matchMedia('(prefers-contrast: more)').matches,
  }));
}
