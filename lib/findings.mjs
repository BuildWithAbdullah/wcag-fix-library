/**
 * findings.mjs
 *
 * The shape every judge returns, and the two kinds a finding can be.
 *
 * `failure` means the page does not meet the success criterion, and this
 * repository's own judging says so from an observation of a real browser.
 *
 * `limit` means the judging did not reach something. A limit is not a pass
 * and it is not a failure. It is the repository admitting, in a line a
 * machine checks, what its own tools did not look at. Every limit in
 * tools/catalogue.mjs is observed on a corrected page and asserted there, so
 * a change that quietly widens the judging fails the build and the claim in
 * the README has to be rewritten rather than left standing.
 */

export const FAILURE = 'failure';
export const LIMIT = 'limit';

export function finding(id, kind, detail, extra = {}) {
  if (typeof id !== 'string' || !id.includes('/')) {
    throw new TypeError(`finding id must look like "1.4.10/slug", got ${JSON.stringify(id)}`);
  }
  if (kind !== FAILURE && kind !== LIMIT) {
    throw new TypeError(`finding kind must be ${FAILURE} or ${LIMIT}, got ${JSON.stringify(kind)}`);
  }
  if (typeof detail !== 'string' || detail.trim() === '') {
    throw new TypeError(`finding ${id} needs a detail line a reader can act on`);
  }
  return { id, criterion: id.split('/')[0], kind, detail, ...extra };
}

export const failure = (id, detail, extra) => finding(id, FAILURE, detail, extra);
export const limit = (id, detail, extra) => finding(id, LIMIT, detail, extra);

/** Finding ids present, sorted and deduplicated. The unit of every assertion. */
export const idsOf = (findings) => [...new Set(findings.map((f) => f.id))].sort();
