import { HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError(error => {
      if (error.status === 401) {
        // Auto logout si la respuesta es 401
        localStorage.removeItem('currentUser');
        location.reload();
      }

      const errorMessage = error.error?.message || error.statusText;
      console.error('Error HTTP:', errorMessage);
      
      return throwError(() => error);
    })
  );
};
