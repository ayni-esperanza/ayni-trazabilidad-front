import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Usuario, Rol, Permiso } from '../models/usuario.model';

@Injectable({
  providedIn: 'root'
})
export class GestionUsuariosService {

  constructor() { }

  // Métodos para gestionar usuarios
  obtenerUsuarios(): Observable<Usuario[]> {
    // TODO: Implementar llamada al backend
    throw new Error('Método no implementado');
  }

  crearUsuario(usuario: Usuario): Observable<Usuario> {
    // TODO: Implementar llamada al backend
    throw new Error('Método no implementado');
  }

  actualizarUsuario(id: number, usuario: Usuario): Observable<Usuario> {
    // TODO: Implementar llamada al backend
    throw new Error('Método no implementado');
  }

  eliminarUsuario(id: number): Observable<void> {
    // TODO: Implementar llamada al backend
    throw new Error('Método no implementado');
  }

  activarDesactivarUsuario(id: number, activo: boolean): Observable<Usuario> {
    // TODO: Implementar llamada al backend
    throw new Error('Método no implementado');
  }

  // Métodos para gestionar roles
  obtenerRoles(): Observable<Rol[]> {
    // TODO: Implementar llamada al backend
    throw new Error('Método no implementado');
  }

  asignarRol(usuarioId: number, rolId: number): Observable<void> {
    // TODO: Implementar llamada al backend
    throw new Error('Método no implementado');
  }

  // Métodos para gestionar permisos
  obtenerPermisos(): Observable<Permiso[]> {
    // TODO: Implementar llamada al backend
    throw new Error('Método no implementado');
  }

  asignarPermiso(usuarioId: number, permisoId: number): Observable<void> {
    // TODO: Implementar llamada al backend
    throw new Error('Método no implementado');
  }
}
