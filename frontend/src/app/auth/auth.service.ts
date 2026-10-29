import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse, SesionAdmin, SesionLogin } from '../models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;
  private readonly tokenSignal = signal<boolean>(false);

  readonly isLoggedIn = computed(() => this.tokenSignal());

  login(usuario: string, password: string): Observable<void> {
    return this.http.post<ApiResponse<SesionLogin>>(`${this.apiUrl}/auth/login`, { usuario, password }).pipe(
      tap(() => this.tokenSignal.set(true)),
      map(() => undefined),
    );
  }

  // Comprueba con el servidor que el token guardado sigue valido.
  verificarSesion(): Observable<SesionAdmin> {
    return this.http.get<ApiResponse<SesionAdmin>>(`${this.apiUrl}/auth/sesion`).pipe(
      tap(() => this.tokenSignal.set(true)),
      map((response) => response.data),
    );
  }

  logout(): void {
    if (this.tokenSignal()) this.http.post(`${this.apiUrl}/auth/logout`, null).subscribe({ error: () => undefined });
    this.limpiarSesion();
  }

  limpiarSesion(): void {
    this.tokenSignal.set(false);
  }
}
