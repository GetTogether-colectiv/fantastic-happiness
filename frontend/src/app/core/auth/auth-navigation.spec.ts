import { safeReturnUrl } from './auth-navigation';

describe('safeReturnUrl', () => {
  it('preserves a protected path, query, and fragment', () => {
    expect(safeReturnUrl('/events/42/chat?source=%2Fdiscover#latest')?.toString()).toBe(
      '/events/42/chat?source=%2Fdiscover#latest',
    );
  });

  it.each([
    null,
    '',
    '/',
    'events/42',
    'https://example.com/events/42',
    '//example.com',
    '/\\example.com',
    '/%5cexample.com',
    '/%2fexample.com',
    '/events/../login',
    '/login?returnUrl=/profile',
    '/%6cogin',
    '/register;source=link',
    '/(popup:profile)',
    '/events/%ZZ',
  ])('rejects %s', (destination) => {
    expect(safeReturnUrl(destination)).toBeNull();
  });
});
