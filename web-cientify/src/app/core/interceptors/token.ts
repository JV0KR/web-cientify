import { HttpInterceptorFn } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('ACCESS_TOKEN');

  if (token) {
    const cloned = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });

    return next(cloned).pipe(
      catchError(error => {
        console.error('HTTP Error:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          url: error.url,
          error: error.error
        });
        return throwError(() => error);
      })
    );
  }

  return next(req).pipe(
    catchError(error => {
      console.error('HTTP Error (sin token):', {
        status: error.status,
        statusText: error.statusText,
        message: error.message,
        url: error.url,
        error: error.error
      });
      return throwError(() => error);
    })
  );
};

