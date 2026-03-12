'use strict';
/**
 * Pure utility for calculating the next run date from a 5-field cron expression.
 * No external dependencies — safe to import in tests without installing node_modules.
 *
 * Supports standard cron fields: minute, hour, day-of-month, month, day-of-week.
 * Handles wildcards (*), step values (*\/n), ranges (a-b), and comma lists (a,b,c).
 * Uses a forward-search approach (up to 366 days × 24 h × 60 min) to find the
 * next valid minute that satisfies all five fields.
 */

/**
 * @param {string} cronExpr - 5-field cron expression (e.g. "0 2 * * *")
 * @returns {Date} The next date/time that matches the expression
 */
function getNextRun(cronExpr) {
  const parts = (cronExpr || '').trim().split(/\s+/);
  if (parts.length < 5) {
    // Fallback: return 1 hour from now for malformed expressions
    return new Date(Date.now() + 60 * 60 * 1000);
  }

  const [minutePart, hourPart, domPart, monthPart, dowPart] = parts;

  function matches(value, part) {
    if (part === '*') return true;
    // Handle step values like */5
    if (part.startsWith('*/')) {
      const step = parseInt(part.slice(2));
      if (!step) return false;
      return value % step === 0;
    }
    // Handle comma-separated values and ranges
    return part.split(',').some(p => {
      if (p.includes('-')) {
        const [lo, hi] = p.split('-').map(Number);
        return value >= lo && value <= hi;
      }
      return parseInt(p) === value;
    });
  }

  const start = new Date();
  start.setSeconds(0);
  start.setMilliseconds(0);
  // Start searching from the next minute
  start.setMinutes(start.getMinutes() + 1);

  for (let i = 0; i < 366 * 24 * 60; i++) {
    const candidate = new Date(start.getTime() + i * 60 * 1000);
    if (
      matches(candidate.getMonth() + 1, monthPart) &&
      matches(candidate.getDate(), domPart) &&
      matches(candidate.getDay(), dowPart) &&
      matches(candidate.getHours(), hourPart) &&
      matches(candidate.getMinutes(), minutePart)
    ) {
      return candidate;
    }
  }

  // Fallback: return 1 week from now if no match found within search window
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
}

module.exports = { getNextRun };
