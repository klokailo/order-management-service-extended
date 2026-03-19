import { maskPii } from '../../../src/utils/masking/piiMasker';

describe('maskPii', () => {
  it('masks email addresses', () => {
    const result = maskPii({ email: 'john.doe@example.com' }) as any;
    expect(result.email).toMatch(/^j\*\*\*@/);
    expect(result.email).not.toContain('john.doe');
  });

  it('masks phone numbers', () => {
    const result = maskPii('call me at 555-867-5309') as any;
    expect(result).not.toContain('867-5309');
  });

  it('masks credit card numbers', () => {
    const result = maskPii({ card: '4111 1111 1111 1234' }) as any;
    expect(result.card).toContain('1234');
    expect(result.card).not.toContain('4111');
  });

  it('redacts blacklisted field names entirely', () => {
    const result = maskPii({ password: 'hunter2', token: 'abc123' }) as any;
    expect(result.password).toContain('[REDACTED');
    expect(result.token).toContain('[REDACTED');
  });

  it('handles nested objects', () => {
    const result = maskPii({
      user: {
        email: 'test@test.com',
        address: { phone: '555-123-4567' },
      },
    }) as any;
    expect(result.user.email).not.toContain('test@test.com');
  });

  it('handles arrays', () => {
    const result = maskPii(['test@foo.com', 'nothing']) as any;
    expect(result[0]).not.toContain('test@foo.com');
    expect(result[1]).toBe('nothing');
  });

  it('does not blow up on null or undefined', () => {
    expect(maskPii(null)).toBeNull();
    expect(maskPii(undefined)).toBeUndefined();
  });

  it('handles circular references without throwing', () => {
    const obj: any = { name: 'test' };
    obj.self = obj;
    expect(() => maskPii(obj)).not.toThrow();
    const result = maskPii(obj) as any;
    expect(result.self).toBe('[Circular]');
  });

  it('masks stripe keys', () => {
    const result = maskPii('key is sk_test_REDACTED_FOR_REPO_FAKE1234567890') as string;
    expect(result).toContain('[STRIPE_KEY_REDACTED]');
    expect(result).not.toContain('sk_live_');
  });

  it('masks JWT tokens', () => {
    const fakeJwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
    const result = maskPii(`token: ${fakeJwt}`) as string;
    expect(result).toContain('[JWT_REDACTED]');
  });
});
