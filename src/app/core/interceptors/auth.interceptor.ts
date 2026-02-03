import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Obtener el token del localStorage o sessionStorage
  const userStr =
    localStorage.getItem('currentUser') ||
    sessionStorage.getItem('currentUser');
  const currentUser = userStr ? JSON.parse(userStr) : null;
  const token = currentUser?.token;

  // Clonar la petición y añadir el token si existe
  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return next(req);
};
