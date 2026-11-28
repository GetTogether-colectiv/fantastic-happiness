import { Observable, defer, exhaustMap, filter, map, timer, catchError, EMPTY } from 'rxjs';

export const LIVE_REFRESH_MS = 2_000;

export interface Refreshed<T> {
  value: T;
  changesBefore: number;
}

export function refreshEvery<T>(
  request: () => Observable<T>,
  changeCounter: () => number,
): Observable<Refreshed<T>> {
  return timer(LIVE_REFRESH_MS, LIVE_REFRESH_MS).pipe(
    filter(() => !document.hidden),
    exhaustMap(() =>
      defer(() => {
        const changesBefore = changeCounter();
        return request().pipe(map((value) => ({ value, changesBefore })));
      }).pipe(catchError(() => EMPTY)),
    ),
  );
}
