import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, delay, throwError } from 'rxjs';
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
  usuarios: '/usuarios',
  roles: '/roles',
  permisos: '/permisos',
  estadisticas: '/usuarios/estadisticas',
};

// Flag para usar datos mock mientras no hay backend
const USE_MOCK_DATA = false;

@Injectable({
  providedIn: 'root',
})
export class GestionUsuariosService {
  private baseUrl = environment.apiUrl;

  // Datos mock para desarrollo
  private mockRoles: Rol[] = [
    {
      id: 1,
      nombre: 'ASISTENTE',
      descripcion: 'Asistente del sistema',
      permisos: [],
      activo: true,
    },
    {
      id: 2,
      nombre: 'GERENTE',
      descripcion: 'Gerente de área',
      permisos: [],
      activo: true,
    },
    {
      id: 3,
      nombre: 'AYUDANTE',
      descripcion: 'Ayudante técnico',
      permisos: [],
      activo: true,
    },
    {
      id: 4,
      nombre: 'INGENIERO',
      descripcion: 'Ingeniero de proyecto',
      permisos: [],
      activo: true,
    },
    {
      id: 5,
      nombre: 'ADMINISTRADOR',
      descripcion: 'Administrador del sistema',
      permisos: [],
      activo: true,
    },
  ];

  private mockUsuarios: Usuario[] = [
    {
      id: 1,
      nombre: 'Ejemplo',
      apellido: '1',
      email: 'ejemplo1@gmail.com',
      username: 'Ejemplo1',
      telefono: '123456789',
      cargo: 'Asistente',
      area: 'Operaciones',
      fechaIngreso: new Date(),
      activo: true,
      roles: [this.mockRoles[0]],
      permisos: [],
    },
    {
      id: 2,
      nombre: 'Ejemplo',
      apellido: '2',
      email: 'ejemplo2@gmail.com',
      username: 'Ejemplo2',
      telefono: '123456789',
      cargo: 'Gerente',
      area: 'Gerencia',
      fechaIngreso: new Date(),
      activo: true,
      roles: [this.mockRoles[1]],
      permisos: [],
    },
    {
      id: 3,
      nombre: 'Ejemplo',
      apellido: '3',
      email: 'ejemplo3@gmail.com',
      username: 'Ejemplo3',
      telefono: '123456789',
      cargo: 'Ayudante',
      area: 'Técnico',
      fechaIngreso: new Date(),
      activo: true,
      roles: [this.mockRoles[2]],
      permisos: [],
    },
    {
      id: 4,
      nombre: 'Ejemplo',
      apellido: '4',
      email: 'ejemplo4@gmail.com',
      username: 'Ejemplo4',
      telefono: '123456789',
      cargo: 'Asistente',
      area: 'Soporte',
      fechaIngreso: new Date(),
      activo: true,
      roles: [this.mockRoles[0]],
      permisos: [],
    },
  ];

  constructor(private http: HttpClient) {}

  // ==================== USUARIOS ====================

  obtenerUsuarios(params?: {
    page?: number;
    size?: number;
    search?: string;
    rolId?: number;
  }): Observable<PaginatedResponse<Usuario>> {
    if (USE_MOCK_DATA) {
      let filtered = [...this.mockUsuarios];

      if (params?.search) {
        const term = params.search.toLowerCase();
        filtered = filtered.filter(
          (u) =>
            u.nombre.toLowerCase().includes(term) ||
            u.apellido.toLowerCase().includes(term) ||
            u.email.toLowerCase().includes(term) ||
            u.username.toLowerCase().includes(term),
        );
      }

      if (params?.rolId) {
        filtered = filtered.filter((u) =>
          u.roles.some((r) => r.id === params.rolId),
        );
      }

      const page = params?.page || 0;
      const size = params?.size || 10;
      const start = page * size;
      const content = filtered.slice(start, start + size);

      return of({
        content,
        totalElements: filtered.length,
        totalPages: Math.ceil(filtered.length / size),
        page,
        size,
      }).pipe(delay(300));
    }

    const httpParams = params
      ? new HttpParams({ fromObject: params as any })
      : undefined;
    return this.http.get<PaginatedResponse<Usuario>>(
      `${this.baseUrl}${API_ENDPOINTS.usuarios}`,
      { params: httpParams },
    );
  }

  obtenerUsuarioPorId(id: number): Observable<Usuario> {
    if (USE_MOCK_DATA) {
      const usuario = this.mockUsuarios.find((u) => u.id === id);
      if (usuario) {
        return of(usuario).pipe(delay(200));
      }
      return throwError(() => new Error('Usuario no encontrado'));
    }

    return this.http.get<Usuario>(
      `${this.baseUrl}${API_ENDPOINTS.usuarios}/${id}`,
    );
  }

  crearUsuario(request: UsuarioRequest): Observable<UsuarioCreacionResponse> {
    if (USE_MOCK_DATA) {
      const rol = this.mockRoles.find((r) => r.id === request.rolId);
      const nuevoUsuario: Usuario = {
        id: Math.max(...this.mockUsuarios.map((u) => u.id), 0) + 1,
        nombre: request.nombre,
        apellido: request.apellido,
        email: request.email,
        username: request.username,
        telefono: request.telefono,
        cargo: request.cargo || '',
        area: request.area || '',
        fechaIngreso: new Date(),
        activo: true,
        roles: rol ? [rol] : [],
        permisos: [],
      };
      this.mockUsuarios.push(nuevoUsuario);

      const response: UsuarioCreacionResponse = {
        usuario: nuevoUsuario as any,
        passwordGenerado: 'Mock1234',
      };
      return of(response).pipe(delay(500));
    }

    return this.http.post<UsuarioCreacionResponse>(
      `${this.baseUrl}${API_ENDPOINTS.usuarios}`,
      request,
    );
  }

  actualizarUsuario(id: number, request: UsuarioRequest): Observable<Usuario> {
    if (USE_MOCK_DATA) {
      const index = this.mockUsuarios.findIndex((u) => u.id === id);
      if (index === -1) {
        return throwError(() => new Error('Usuario no encontrado'));
      }

      const rol = this.mockRoles.find((r) => r.id === request.rolId);
      this.mockUsuarios[index] = {
        ...this.mockUsuarios[index],
        nombre: request.nombre,
        apellido: request.apellido,
        email: request.email,
        username: request.username,
        telefono: request.telefono,
        cargo: request.cargo || '',
        area: request.area || '',
        activo: request.activo ?? this.mockUsuarios[index].activo,
        roles: rol ? [rol] : this.mockUsuarios[index].roles,
      };

      return of(this.mockUsuarios[index]).pipe(delay(500));
    }

    return this.http.put<Usuario>(
      `${this.baseUrl}${API_ENDPOINTS.usuarios}/${id}`,
      request,
    );
  }

  eliminarUsuario(id: number): Observable<void> {
    if (USE_MOCK_DATA) {
      const index = this.mockUsuarios.findIndex((u) => u.id === id);
      if (index === -1) {
        return throwError(() => new Error('Usuario no encontrado'));
      }
      this.mockUsuarios.splice(index, 1);
      return of(void 0).pipe(delay(300));
    }

    return this.http.delete<void>(
      `${this.baseUrl}${API_ENDPOINTS.usuarios}/${id}`,
    );
  }

  cambiarEstadoUsuario(id: number, activo: boolean): Observable<Usuario> {
    if (USE_MOCK_DATA) {
      const usuario = this.mockUsuarios.find((u) => u.id === id);
      if (!usuario) {
        return throwError(() => new Error('Usuario no encontrado'));
      }
      usuario.activo = activo;
      return of(usuario).pipe(delay(300));
    }

    return this.http.patch<Usuario>(
      `${this.baseUrl}${API_ENDPOINTS.usuarios}/${id}/estado`,
      { activo },
    );
  }

  // ==================== ESTADÍSTICAS ====================

  obtenerEstadisticas(): Observable<EstadisticasUsuarios> {
    if (USE_MOCK_DATA) {
      const stats: EstadisticasUsuarios = {
        totalUsuarios: this.mockUsuarios.length,
        usuariosActivos: this.mockUsuarios.filter((u) => u.activo).length,
        administradores: this.mockUsuarios.filter((u) =>
          u.roles.some((r) =>
            ['ADMINISTRADOR', 'GERENTE'].includes(r.nombre.toUpperCase()),
          ),
        ).length,
        ingenieros: this.mockUsuarios.filter((u) =>
          u.roles.some((r) =>
            ['INGENIERO', 'AYUDANTE'].includes(r.nombre.toUpperCase()),
          ),
        ).length,
      };
      return of(stats).pipe(delay(200));
    }

    return this.http.get<EstadisticasUsuarios>(
      `${this.baseUrl}${API_ENDPOINTS.estadisticas}`,
    );
  }

  // ==================== ROLES ====================

  obtenerRoles(): Observable<Rol[]> {
    if (USE_MOCK_DATA) {
      return of(this.mockRoles).pipe(delay(200));
    }

    return this.http.get<Rol[]>(`${this.baseUrl}${API_ENDPOINTS.roles}`);
  }

  obtenerRolPorId(id: number): Observable<Rol> {
    if (USE_MOCK_DATA) {
      const rol = this.mockRoles.find((r) => r.id === id);
      if (rol) {
        return of(rol).pipe(delay(200));
      }
      return throwError(() => new Error('Rol no encontrado'));
    }

    return this.http.get<Rol>(`${this.baseUrl}${API_ENDPOINTS.roles}/${id}`);
  }

  // ==================== PERMISOS ====================

  obtenerPermisos(): Observable<Permiso[]> {
    if (USE_MOCK_DATA) {
      return of([]).pipe(delay(200));
    }

    return this.http.get<Permiso[]>(`${this.baseUrl}${API_ENDPOINTS.permisos}`);
  }
}
