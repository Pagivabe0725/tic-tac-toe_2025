import { HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { Csrf } from '../../services/csrf.service';

/**
 * @function csrfInterceptor
 *
 * Angular HTTP interceptor function that ensures each outgoing HTTP request
 * includes a valid CSRF token in the headers.
 *
 * Responsibilities:
 * - Injects the {@link Csrf} service to obtain the current CSRF token
 * - Clones the request and adds the `X-CSRF-Token` header
 * - Ensures `withCredentials` is set to `true` for cross-site requests
 *
 * @param req The original {@link HttpRequest} object
 * @param next The {@link HttpHandlerFn} that processes the modified request
 * @returns An Observable that emits the HTTP response after attaching the CSRF token
 */
export const csrfInterceptor: HttpInterceptorFn = (
  req: HttpRequest<any>,
  next: HttpHandlerFn
) => {
  const csrfService = inject(Csrf);

  return from(csrfService.ensureToken()).pipe(
    switchMap(token => {
      const modified = req.clone({
        withCredentials: true,
        setHeaders: { 'X-CSRF-Token': token ?? '' },
      });
      return next(modified);
    })
  );
};
