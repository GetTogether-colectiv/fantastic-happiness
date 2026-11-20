import { DefaultUrlSerializer, PRIMARY_OUTLET, Router, UrlTree } from '@angular/router';

export const LOGIN_PATH = 'login';
export const REGISTER_PATH = 'register';
export const RETURN_URL = 'returnUrl';
export const PROFILE_PREFERENCES_FRAGMENT = 'preferences';

const serializer = new DefaultUrlSerializer();

export function isAuthPage(url: UrlTree): boolean {
  const path = url.root.children[PRIMARY_OUTLET]?.segments[0]?.path;
  return path === LOGIN_PATH || path === REGISTER_PATH;
}

export function safeReturnUrl(value: string | null): UrlTree | null {
  if (!value?.startsWith('/') || value.startsWith('//')) return null;

  try {
    const path = value.split(/[?#]/, 1)[0];
    const decodedPath = decodeURIComponent(path);
    if (
      /[\\()\s]/.test(decodedPath) ||
      /%2f/i.test(path) ||
      decodedPath.split('/').some((segment) => segment === '.' || segment === '..')
    ) {
      return null;
    }

    const url = serializer.parse(value);
    return url.root.children[PRIMARY_OUTLET] && !isAuthPage(url) ? url : null;
  } catch {
    return null;
  }
}

export function loginUrl(router: Router, requestedUrl?: string): UrlTree {
  const destination = safeReturnUrl(requestedUrl ?? null);
  return router.createUrlTree(['/', LOGIN_PATH], {
    queryParams: destination ? { [RETURN_URL]: router.serializeUrl(destination) } : undefined,
  });
}
