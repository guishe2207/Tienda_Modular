export interface Categoria {
  idCategoria: number;
  nombre: string;
  descripcion: string | null;
}

export interface Producto {
  idProducto: number;
  nombre: string;
  descripcion: string | null;
  precio: number;
  stock: number;
  imagen: string | null;
  idCategoria: number;
}

export interface CategoriaEntrada {
  nombre: string;
  descripcion: string | null;
}

export interface ProductoEntrada {
  nombre: string;
  descripcion: string | null;
  precio: number;
  stock: number;
  imagen: string | null;
  idCategoria: number;
}

export interface SesionLogin {
  token: string;
  csrfToken: string;
  usuario: string;
  expiraEn: string;
}

export interface CartItem {
  producto: Producto;
  cantidad: number;
}

export interface CartState {
  items: CartItem[];
}

export interface SesionAdmin {
  idUsuario: number;
  usuario: string;
}

export interface ApiResponse<T> {
  data: T;
}
