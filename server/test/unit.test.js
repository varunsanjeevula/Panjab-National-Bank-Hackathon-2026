'use strict';
/**
 * Unit tests for QuantumShield Scanner server modules.
 * Run with: node --test server/test/unit.test.js
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

// ── Password Policy Tests ────────────────────────────────
describe('Password Policy', () => {
  const { validatePassword } = require('../middleware/passwordPolicy');

  test('accepts a strong password meeting all requirements', () => {
    const result = validatePassword('Admin#1234');
    assert.equal(result.valid, true, `Expected valid but got errors: ${result.errors}`);
  });

  test('accepts exactly 8-character password', () => {
    const result = validatePassword('Short1A!');
    assert.equal(result.valid, true);
  });

  test('rejects password without uppercase letter', () => {
    const result = validatePassword('nouppercase1!');
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => /uppercase/i.test(e)));
  });

  test('rejects password without lowercase letter', () => {
    const result = validatePassword('NOLOWERCASE1!');
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => /lowercase/i.test(e)));
  });

  test('rejects password without special character', () => {
    const result = validatePassword('NoSpecialChar1');
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => /special/i.test(e)));
  });

  test('rejects password without a number', () => {
    const result = validatePassword('NoNumber!Aa');
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => /number/i.test(e)));
  });

  test('rejects empty password', () => {
    const result = validatePassword('');
    assert.equal(result.valid, false);
  });

  test('rejects null password', () => {
    const result = validatePassword(null);
    assert.equal(result.valid, false);
  });

  test('test-register script password (TestUser@1234) meets policy', () => {
    const result = validatePassword('TestUser@1234');
    assert.equal(result.valid, true);
  });

  test('old weak test password (test1234) is correctly rejected', () => {
    const result = validatePassword('test1234');
    assert.equal(result.valid, false);
  });
});

// ── Scheduler getNextRun Tests ───────────────────────────
describe('Scheduler — getNextRun', () => {
  const { getNextRun } = require('../utils/scheduler');
  const now = new Date();

  test('daily cron (0 2 * * *) returns a future date', () => {
    const next = getNextRun('0 2 * * *');
    assert.ok(next > now, `Expected future date, got ${next}`);
  });

  test('daily cron (0 2 * * *) has correct hour and minute', () => {
    const next = getNextRun('0 2 * * *');
    assert.equal(next.getHours(), 2);
    assert.equal(next.getMinutes(), 0);
  });

  test('weekly cron (30 3 * * 1) returns a Monday', () => {
    const next = getNextRun('30 3 * * 1');
    assert.equal(next.getDay(), 1, 'Expected day 1 (Monday)');
    assert.equal(next.getHours(), 3);
    assert.equal(next.getMinutes(), 30);
  });

  test('monthly cron (0 2 1 * *) returns the 1st of a month', () => {
    const next = getNextRun('0 2 1 * *');
    assert.equal(next.getDate(), 1);
    assert.ok(next > now);
  });

  test('invalid cron expression returns a fallback future date', () => {
    const next = getNextRun('invalid');
    assert.ok(next > now, 'Should return a future fallback date for invalid expression');
  });

  test('cron with fewer than 5 parts returns a fallback future date', () => {
    const next = getNextRun('0 2 * *');
    assert.ok(next > now);
  });
});

// ── CbomRecord status enum includes 'error' ─────────────
describe('CbomRecord model — status enum', () => {
  test("status enum includes 'error' value alongside 'completed' and 'failed'", () => {
    // Load schema definition to verify the enum without DB connection
    const cbomRecordSchema = require('../models/CbomRecord').schema;
    const allowedStatuses = cbomRecordSchema.path('status').enumValues;
    assert.ok(allowedStatuses.includes('completed'), "Should allow 'completed'");
    assert.ok(allowedStatuses.includes('failed'), "Should allow 'failed'");
    assert.ok(allowedStatuses.includes('error'), "Should allow 'error'");
  });
});
