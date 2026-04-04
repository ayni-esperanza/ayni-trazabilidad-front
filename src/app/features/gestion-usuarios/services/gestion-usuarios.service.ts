import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  Usuario,
  Rol,
  Permiso,
  UsuarioRequest,
  UsuarioResponse,
  UsuarioCreacionResponse,
  PaginatedResponse,
  EstadisticasUsuarios,
} from '../models/usuario.model';

// Configuración de endpoints - Cambiar cuando el backend esté listo
const API_ENDPOINTS = {
  usuarios: '/v1/usuarios',
  roles: '/v1/roles',
  permisos: '/v1/permisos',
  estadisticas: '/v1/usuarios/estadisticas',
};

@Injectable({
  providedIn: 'root',
})
export class GestionUsuariosService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ==================== USUARIOS ====================

  obtenerUsuarios(params?: {
    page?: number;
    size?: number;
    search?: string;
    rolId?: number;
  }): Observable<PaginatedResponse<Usuario>> {
    const httpParams = params
      ? new HttpParams({ fromObject: params as any })
      : undefined;
    return this.http.get<PaginatedResponse<Usuario>>(
      `${this.baseUrl}${API_ENDPOINTS.usuarios}`,
      { params: httpParams },
    );
  }

  obtenerUsuarioPorId(id: number): Observable<Usuario> {
    return this.http.get<Usuario>(
      `${this.baseUrl}${API_ENDPOINTS.usuarios}/${id}`,
    );
  }

  crearUsuario(request: UsuarioRequest): Observable<UsuarioCreacionResponse> {
    return this.http.post<UsuarioCreacionResponse>(
      `${this.baseUrl}${API_ENDPOINTS.usuarios}`,
      request,
    );
  }

  actualizarUsuario(id: number, request: UsuarioRequest): Observable<Usuario> {
    return this.http.put<Usuario>(
      `${this.baseUrl}${API_ENDPOINTS.usuarios}/${id}`,
      request,
    );
  }

  eliminarUsuario(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}${API_ENDPOINTS.usuarios}/${id}`,
    );
  }

  cambiarEstadoUsuario(id: number, activo: boolean): Observable<Usuario> {
    return this.http.patch<Usuario>(
      `${this.baseUrl}${API_ENDPOINTS.usuarios}/${id}/estado`,
      { activo },
    );
  }

  // ==================== ESTADÍSTICAS ====================

  obtenerEstadisticas(): Observable<EstadisticasUsuarios> {
    return this.http.get<EstadisticasUsuarios>(
      `${this.baseUrl}${API_ENDPOINTS.estadisticas}`,
    );
  }

  // ==================== ROLES ====================

  obtenerRoles(): Observable<Rol[]> {
    return this.http.get<Rol[]>(`${this.baseUrl}${API_ENDPOINTS.roles}`);
  }

  obtenerRolPorId(id: number): Observable<Rol> {
    return this.http.get<Rol>(`${this.baseUrl}${API_ENDPOINTS.roles}/${id}`);
  }

  // ==================== PERMISOS ====================

  obtenerPermisos(): Observable<Permiso[]> {
    return this.http.get<Permiso[]>(`${this.baseUrl}${API_ENDPOINTS.permisos}`);
  }
}
