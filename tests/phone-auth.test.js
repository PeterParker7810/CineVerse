import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePhoneNumber, phoneAuthErrorMessage, requestPhoneOtp, verifyPhoneOtp } from '../src/lib/phone.js';

test('normalizes local and already international numbers without doubling the country code', () => {
  assert.equal(normalizePhoneNumber('(415) 555-2671', '+1'), '+14155552671');
  assert.equal(normalizePhoneNumber('+1 415 555 2671', '+1'), '+14155552671');
  assert.equal(normalizePhoneNumber('020 7946 0018', '+44'), '+442079460018');
  assert.equal(normalizePhoneNumber('+44 20 7946 0018', '+44'), '+442079460018');
  assert.equal(normalizePhoneNumber('09876543210', '+91'), '+919876543210');
  assert.equal(normalizePhoneNumber('0491 570 006', '+61'), '+61491570006');
});

test('rejects invalid lengths, impossible prefixes, and a number using a different selected country', () => {
  assert.throws(() => normalizePhoneNumber('12345', '+1'), /valid \+1 phone number/);
  assert.throws(() => normalizePhoneNumber('1235552671', '+1'), /valid \+1 phone number/);
  assert.throws(() => normalizePhoneNumber('+91 9876543210', '+1'), /must use the selected/);
  assert.throws(() => normalizePhoneNumber('abc', '+44'), /valid phone number/);
  assert.throws(() => normalizePhoneNumber('++1 415 555 2671', '+1'), /valid phone number/);
});

test('requests SMS OTP with account creation controlled by the selected flow', async () => {
  const calls = [];
  const supabase = { auth: { signInWithOtp: async value => { calls.push(value); return { error: null }; } } };
  await requestPhoneOtp(supabase, '+14155552671', 'login');
  await requestPhoneOtp(supabase, '+919876543210', 'register');
  assert.deepEqual(calls.map(x => x.options.shouldCreateUser), [false, true]);
  assert.equal(calls[0].phone, '+14155552671');
  await assert.rejects(() => requestPhoneOtp({ auth: { signInWithOtp: async () => ({ error: new Error('SMS delivery failed') }) } }, '+14155552671', 'login'), /SMS delivery failed/);
});

test('verifies SMS OTP using Supabase and requires a returned session', async () => {
  let request;
  const session = { access_token: 'test-session' };
  const supabase = { auth: { verifyOtp: async value => { request = value; return { data: { session }, error: null }; } } };
  assert.equal((await verifyPhoneOtp(supabase, '+14155552671', '123456')).session, session);
  assert.deepEqual(request, { phone: '+14155552671', token: '123456', type: 'sms' });
  await assert.rejects(() => verifyPhoneOtp(supabase, '+14155552671', '12345'), /6-digit SMS code/);
  await assert.rejects(() => verifyPhoneOtp({ auth: { verifyOtp: async () => ({ data: {}, error: null }) } }, '+14155552671', '123456'), /did not create a session/);
});

test('maps provider, delivery, expiry, and rate-limit errors to useful messages', () => {
  assert.match(phoneAuthErrorMessage({ status: 429, message: 'rate limit' }), /Too many/);
  assert.match(phoneAuthErrorMessage({ message: 'Phone provider is disabled' }), /Phone sign-in is disabled/);
  assert.match(phoneAuthErrorMessage({ message: 'SMS provider rejected request' }), /SMS/);
  assert.match(phoneAuthErrorMessage({ message: 'Token has expired or is invalid' }), /incorrect or has expired/);
});

