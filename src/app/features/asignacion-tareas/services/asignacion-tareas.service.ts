import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { Tarea, AsignacionTarea } from '../models/tarea.model';

interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

const API_ENDPOINTS = {
  tareas: '/v1/tareas',
};

@Injectable({
  providedIn: 'root'
})
export class AsignacionTareasService {

  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  obtenerTareas(params?: {
    page?: number;
    size?: number;
    search?: string;
    estado?: string;
    proyectoId?: number;
  }): Observable<PaginatedResponse<Tarea>> {
    const httpParams = params
      ? new HttpParams({ fromObject: params as any })
      : undefined;
    return this.http.get<PaginatedResponse<any>>(
      `${this.baseUrl}${API_ENDPOINTS.tareas}`,
      { params: httpParams }
    ).pipe(
      map(response => ({
        ...response,
        content: response.content.map((t: any) => this.mapTareaResponse(t))
      }))
    );
  }

  asignarTarea(asignacion: AsignacionTarea): Observable<Tarea> {
    return this.http.post<any>(
      `${this.baseUrl}${API_ENDPOINTS.tareas}/asignar`,
      {
        etapaProyectoId: asignacion.tareaId,
        titulo: '',
        responsableId: asignacion.usuarioId,
        observaciones: asignacion.observaciones,
      }
    ).pipe(map(t => this.mapTareaResponse(t)));
  }

  actualizarTarea(id: number, tarea: Partial<Tarea>): Observable<Tarea> {
    return this.http.put<any>(
      `${this.baseUrl}${API_ENDPOINTS.tareas}/${id}`,
      {
        etapaProyectoId: tarea.proyectoId,
        titulo: tarea.titulo,
        descripcion: tarea.descripcion,
        responsableId: tarea.responsableId,
        fechaInicio: tarea.fechaInicio,
        fechaFin: tarea.fechaFin,
        prioridad: tarea.prioridad?.toUpperCase(),
      }
    ).pipe(map(t => this.mapTareaResponse(t)));
  }

  obtenerTareasPorProyecto(proyectoId: number): Observable<Tarea[]> {
    return this.http.get<any[]>(
      `${this.baseUrl}${API_ENDPOINTS.tareas}/proyecto/${proyectoId}`
    ).pipe(
      map(tareas => tareas.map(t => this.mapTareaResponse(t)))
    );
  }

  obtenerTareasPorUsuario(usuarioId: number): Observable<Tarea[]> {
    return this.http.get<any[]>(
      `${this.baseUrl}${API_ENDPOINTS.tareas}/usuario/${usuarioId}`
    ).pipe(
      map(tareas => tareas.map(t => this.mapTareaResponse(t)))
    );
  }

  reasignarTarea(tareaId: number, nuevoUsuarioId: number): Observable<Tarea> {
    return this.http.put<any>(
      `${this.baseUrl}${API_ENDPOINTS.tareas}/${tareaId}`,
      { responsableId: nuevoUsuarioId }
    ).pipe(map(t => this.mapTareaResponse(t)));
  }

  private mapTareaResponse(t: any): Tarea {
    return {
      id: t.id,
      titulo: t.titulo,
      descripcion: t.descripcion || '',
      proyectoId: t.proyectoId,
      proyectoNombre: t.proyectoNombre || '',
      responsableId: t.responsableId,
      responsableNombre: t.responsableNombre || '',
      fechaInicio: t.fechaInicio ? new Date(t.fechaInicio) : new Date(),
      fechaFin: t.fechaFin ? new Date(t.fechaFin) : new Date(),
      estado: t.estado || 'Pendiente',
      prioridad: t.prioridad || 'Media',
      etapa: t.etapaNombre || '',
      porcentajeAvance: t.porcentajeAvance || 0,
    };
  }
}
