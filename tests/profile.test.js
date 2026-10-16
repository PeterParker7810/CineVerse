import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultPersonalization, validateProfile } from '../src/lib/profile.js';

test('profile usernames normalize to lowercase and permit valid handles', () => {
  assert.equal(validateProfile({ username: 'Cine_Fan7' }).username, 'cine_fan7');
  assert.equal(validateProfile({ username: '' }).username, '');
});

test('profile usernames reject invalid length and characters', () => {
  assert.throws(() => validateProfile({ username: 'ab' }), /3–24 characters/);
  assert.throws(() => validateProfile({ username: 'cine fan' }), /3–24 characters/);
  assert.throws(() => validateProfile({ username: 'x'.repeat(25) }), /3–24 characters/);
});

test('profile text fields enforce safe display limits', () => {
  assert.throws(() => validateProfile({ display_name: 'x'.repeat(61) }), /60 characters/);
  assert.throws(() => validateProfile({ nickname: 'x'.repeat(41) }), /40 characters/);
  assert.throws(() => validateProfile({ bio: 'x'.repeat(221) }), /220 characters/);
});

test('default discovery preferences include only working homepage sections', () => {
  assert.deepEqual(Object.keys(defaultPersonalization.homepageSections), ['trending','recommendations','watched','films','series','gems','acclaimed']);
  assert.equal(defaultPersonalization.defaultDiscovery, 'Home');
});

