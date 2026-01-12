import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Tarea, AsignacionTarea } from '../models/tarea.model';

@Injectable({
  providedIn: 'root'
})
export class AsignacionTareasService {

  constructor() { }

  // Métodos para gestionar tareas
  obtenerTareas(): Observable<Tarea[]> {
    // TODO: Implementar llamada al backend
    throw new Error('Método no implementado');
  }

  asignarTarea(asignacion: AsignacionTarea): Observable<Tarea> {
    // TODO: Implementar llamada al backend
    throw new Error('Método no implementado');
  }

  actualizarTarea(id: number, tarea: Tarea): Observable<Tarea> {
    // TODO: Implementar llamada al backend
    throw new Error('Método no implementado');
  }

  obtenerTareasPorProyecto(proyectoId: number): Observable<Tarea[]> {
    // TODO: Implementar llamada al backend
    throw new Error('Método no implementado');
  }

  obtenerTareasPorUsuario(usuarioId: number): Observable<Tarea[]> {
    // TODO: Implementar llamada al backend
    throw new Error('Método no implementado');
  }

  reasignarTarea(tareaId: number, nuevoUsuarioId: number): Observable<Tarea> {
    // TODO: Implementar llamada al backend
    throw new Error('Método no implementado');
  }
}
