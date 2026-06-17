import { authenticator } from 'otplib';

// Tolerate a neighbouring 30s step so generate→check across a window boundary isn't flaky.
authenticator.options = { window: 1 };

describe('MFA TOTP primitive (otplib)', () => {
  it('generates a secret and validates a freshly generated token', () => {
    const secret = authenticator.generateSecret();
    const token = authenticator.generate(secret);
    expect(authenticator.check(token, secret)).toBe(true);
  });

  it('rejects an incorrect token', () => {
    const secret = authenticator.generateSecret();
    expect(authenticator.check('000000', secret)).toBe(false);
  });

  it('builds an otpauth provisioning URI for authenticator apps', () => {
    const secret = authenticator.generateSecret();
    const uri = authenticator.keyuri('user@example.org', 'DXP Platform', secret);
    expect(uri).toMatch(/^otpauth:\/\/totp\//);
    expect(uri).toContain(secret);
  });
});
