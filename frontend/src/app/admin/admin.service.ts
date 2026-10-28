import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse, Categoria, CategoriaEntrada, Producto, ProductoEntrada } from '../models';

// Escrituras del panel de administracion. Las lecturas publicas estan en CatalogService.
@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  crearCategoria(datos: CategoriaEntrada): Observable<Categoria> {
    return this.http.post<ApiResponse<Categoria>>(`${this.apiUrl}/categorias`, datos).pipe(map((r) => r.data));
  }

  actualizarCategoria(id: number, datos: CategoriaEntrada): Observable<Categoria> {
    return this.http.put<ApiResponse<Categoria>>(`${this.apiUrl}/categorias/${id}`, datos).pipe(map((r) => r.data));
  }

  eliminarCategoria(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/categorias/${id}`);
  }

  crearProducto(datos: ProductoEntrada): Observable<Producto> {
    return this.http.post<ApiResponse<Producto>>(`${this.apiUrl}/productos`, datos).pipe(map((r) => r.data));
  }

  actualizarProducto(id: number, datos: ProductoEntrada): Observable<Producto> {
    return this.http.put<ApiResponse<Producto>>(`${this.apiUrl}/productos/${id}`, datos).pipe(map((r) => r.data));
  }

  eliminarProducto(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/productos/${id}`);
  }
}
