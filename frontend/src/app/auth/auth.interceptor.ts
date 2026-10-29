import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

// Anade el token a las peticiones de la API. Si el servidor responde 401 con token, la sesion ya no sirve.
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  if (!request.url.startsWith(environment.apiUrl)) {
    return next(request);
  }

  const router = inject(Router);
  return next(request.clone({ withCredentials: true })).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        auth.limpiarSesion();
        router.navigateByUrl('/admin/login');
      }
      return throwError(() => error);
    }),
  );
};
