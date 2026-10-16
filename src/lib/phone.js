const COUNTRY_RULES = {
  '+1': { callingCode: '1', min: 10, max: 10, national: /^[2-9]\d{2}[2-9]\d{6}$/ },
  '+44': { callingCode: '44', min: 9, max: 10, national: /^[1-9]\d{8,9}$/ },
  '+91': { callingCode: '91', min: 10, max: 10, national: /^[6-9]\d{9}$/ },
  '+61': { callingCode: '61', min: 9, max: 9, national: /^(?:[23478]\d{8}|4\d{8})$/ },
  '+81': { callingCode: '81', min: 9, max: 10, national: /^[1-9]\d{8,9}$/ },
  '+49': { callingCode: '49', min: 5, max: 12, national: /^[1-9]\d{4,11}$/ },
};

/** Normalize a national number or an E.164 number for one of CineVerse's listed regions. */
export function normalizePhoneNumber(input, countryCode) {
  const rule = COUNTRY_RULES[countryCode];
  if (!rule) throw new Error('Choose a supported country calling code.');

  const raw = String(input ?? '').trim();
  if (!raw || !/^(?:\+|00)?[\d\s().-]+$/.test(raw)) throw new Error('Enter a valid phone number.');

  const digits = raw.replace(/\D/g, '');
  const isInternational = raw.startsWith('+') || raw.startsWith('00');
  let national;
  if (isInternational) {
    const internationalDigits = raw.startsWith('00') ? digits.slice(2) : digits;
    if (!internationalDigits.startsWith(rule.callingCode)) {
      throw new Error(`The number must use the selected ${countryCode} country code. Change the country selection to use a different code.`);
    }
    national = internationalDigits.slice(rule.callingCode.length);
  } else {
    national = digits;
    // Accept pasted numbers that already include the selected calling code.
    if (national.startsWith(rule.callingCode) && national.length > rule.max) {
      national = national.slice(rule.callingCode.length);
    }
  }

  // Remove the domestic trunk prefix used in the supported regions. It is not part of E.164.
  if (countryCode !== '+1' && national.startsWith('0')) national = national.slice(1);
  if (national.length < rule.min || national.length > rule.max || !rule.national.test(national)) {
    throw new Error(`Enter a valid ${countryCode} phone number, including its area or mobile prefix.`);
  }

  const normalized = `+${rule.callingCode}${national}`;
  if (normalized.length > 16) throw new Error('Phone numbers cannot exceed 15 digits.');
  return normalized;
}

export async function requestPhoneOtp(supabase, phone, mode) {
  if (!supabase) throw new Error('Authentication is not configured.');
  const { error } = await supabase.auth.signInWithOtp({
    phone,
    options: { shouldCreateUser: mode === 'register' },
  });
  if (error) throw error;
}

export async function verifyPhoneOtp(supabase, phone, token) {
  if (!supabase) throw new Error('Authentication is not configured.');
  if (!/^\d{6}$/.test(String(token ?? '').trim())) throw new Error('Enter the 6-digit SMS code.');
  const result = await supabase.auth.verifyOtp({ phone, token: String(token).trim(), type: 'sms' });
  if (result.error) throw result.error;
  if (!result.data?.session) throw new Error('Verification did not create a session. Request a new code and try again.');
  return result.data;
}

export function phoneAuthErrorMessage(error) {
  const message = String(error?.message || 'Phone verification could not be completed.');
  const code = String(error?.code || '');
  const status = Number(error?.status || 0);
  if (status === 429 || /rate.?limit|too many|over_.*request|over_.*sms/i.test(`${code} ${message}`)) {
    return 'Too many verification requests. Wait a little before requesting another SMS code.';
  }
  if (/phone.*disabled|disabled.*phone|phone_provider_disabled/i.test(`${code} ${message}`)) {
    return 'Phone sign-in is disabled for this Supabase project. Ask the project owner to enable Phone under Auth → Sign In / Providers and configure SMS delivery.';
  }
  if (/sms|provider|delivery|send.*message/i.test(`${code} ${message}`)) {
    return 'Supabase could not deliver the SMS. Check the project’s SMS provider settings and try again.';
  }
  if (/expired|invalid.*(token|otp|code)|token.*invalid|otp.*invalid/i.test(`${code} ${message}`)) {
    return 'That code is incorrect or has expired. Check the code or request a new one.';
  }
  if (/invalid.*phone|phone.*invalid|e\.164/i.test(`${code} ${message}`)) {
    return 'Supabase rejected this phone number. Check the country code and number, then try again.';
  }
  if (error instanceof TypeError || /network|fetch failed|failed to fetch|load failed/i.test(message)) {
    return 'A network error interrupted phone verification. Check your connection and try again.';
  }
  return message;
}

