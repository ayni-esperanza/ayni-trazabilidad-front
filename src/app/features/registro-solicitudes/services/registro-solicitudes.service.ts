import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { Solicitud, Proyecto, EtapaProyecto, Responsable, ProcesoSimple } from '../models/solicitud.model';
import { PaginatedResponse } from '../../configuracion-procesos/models/proceso.model';

const API_ENDPOINTS = {
  solicitudes: '/v1/solicitudes',
  proyectos: '/v1/proyectos',
  usuarios: '/v1/usuarios',
  procesos: '/v1/procesos',
};

@Injectable({
  providedIn: 'root'
})
export class RegistroSolicitudesService {

  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  // ==================== SOLICITUDES ====================

  obtenerSolicitudes(params?: {
    page?: number;
    size?: number;
    search?: string;
    estado?: string;
    responsableId?: number;
  }): Observable<PaginatedResponse<Solicitud>> {
    const httpParams = params
      ? new HttpParams({ fromObject: params as any })
      : undefined;
    return this.http.get<PaginatedResponse<Solicitud>>(
      `${this.baseUrl}${API_ENDPOINTS.solicitudes}`,
      { params: httpParams }
    );
  }

  crearSolicitud(solicitud: Partial<Solicitud>): Observable<Solicitud> {
    const request = {
      nombreProyecto: solicitud.nombreProyecto,
      cliente: solicitud.cliente,
      representante: solicitud.representante,
      costo: solicitud.costo || 0,
      responsableId: solicitud.responsableId,
      descripcion: solicitud.descripcion,
      ubicacion: solicitud.ubicacion,
      fechaInicio: solicitud.fechaInicio,
      fechaFin: solicitud.fechaFin,
    };
    return this.http.post<Solicitud>(
      `${this.baseUrl}${API_ENDPOINTS.solicitudes}`,
      request
    );
  }

  actualizarSolicitud(id: number, solicitud: Partial<Solicitud>): Observable<Solicitud> {
    const request = {
      nombreProyecto: solicitud.nombreProyecto,
      cliente: solicitud.cliente,
      representante: solicitud.representante,
      costo: solicitud.costo || 0,
      responsableId: solicitud.responsableId,
      descripcion: solicitud.descripcion,
      ubicacion: solicitud.ubicacion,
      fechaInicio: solicitud.fechaInicio,
      fechaFin: solicitud.fechaFin,
    };
    return this.http.put<Solicitud>(
      `${this.baseUrl}${API_ENDPOINTS.solicitudes}/${id}`,
      request
    );
  }

  eliminarSolicitud(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}${API_ENDPOINTS.solicitudes}/${id}`
    );
  }

  obtenerSolicitudPorId(id: number): Observable<Solicitud> {
    return this.http.get<Solicitud>(
      `${this.baseUrl}${API_ENDPOINTS.solicitudes}/${id}`
    );
  }

  cambiarEstadoSolicitud(id: number, estado: string): Observable<Solicitud> {
    return this.http.patch<Solicitud>(
      `${this.baseUrl}${API_ENDPOINTS.solicitudes}/${id}/estado`,
      { estado }
    );
  }

  // ==================== PROYECTOS ====================

  obtenerProyectos(params?: {
    page?: number;
    size?: number;
    search?: string;
    estado?: string;
  }): Observable<PaginatedResponse<Proyecto>> {
    const httpParams = params
      ? new HttpParams({ fromObject: params as any })
      : undefined;
    return this.http.get<PaginatedResponse<Proyecto>>(
      `${this.baseUrl}${API_ENDPOINTS.proyectos}`,
      { params: httpParams }
    );
  }

  crearProyecto(proyecto: Partial<Proyecto>): Observable<Proyecto> {
    const request = {
      solicitudId: proyecto.solicitudId,
      procesoId: proyecto.procesoId,
      fechaInicio: proyecto.fechaInicio,
      fechaFinalizacion: proyecto.fechaFinalizacion,
      ordenCompra: (proyecto.ordenesCompra && proyecto.ordenesCompra.length > 0)
        ? proyecto.ordenesCompra.map(oc => oc.numero).join(', ')
        : undefined,
    };
    return this.http.post<Proyecto>(
      `${this.baseUrl}${API_ENDPOINTS.proyectos}/iniciar`,
      request
    );
  }

  actualizarProyecto(id: number, proyecto: Partial<Proyecto>): Observable<Proyecto> {
    return this.http.put<Proyecto>(
      `${this.baseUrl}${API_ENDPOINTS.proyectos}/${id}`,
      proyecto
    );
  }

  obtenerProyectoPorId(id: number): Observable<Proyecto> {
    return this.http.get<Proyecto>(
      `${this.baseUrl}${API_ENDPOINTS.proyectos}/${id}`
    );
  }

  cambiarEstadoProyecto(id: number, estado: string, motivo?: string): Observable<Proyecto> {
    return this.http.patch<Proyecto>(
      `${this.baseUrl}${API_ENDPOINTS.proyectos}/${id}/estado`,
      { estado, motivo }
    );
  }

  finalizarProyecto(id: number): Observable<Proyecto> {
    return this.http.patch<Proyecto>(
      `${this.baseUrl}${API_ENDPOINTS.proyectos}/${id}/finalizar`,
      {}
    );
  }

  // ==================== ETAPAS DE PROYECTOS ====================

  obtenerEtapasPorProyecto(proyectoId: number): Observable<EtapaProyecto[]> {
    return this.http.get<EtapaProyecto[]>(
      `${this.baseUrl}${API_ENDPOINTS.proyectos}/${proyectoId}/etapas`
    );
  }

  actualizarEtapa(etapa: EtapaProyecto): Observable<EtapaProyecto> {
    return this.http.put<EtapaProyecto>(
      `${this.baseUrl}${API_ENDPOINTS.proyectos}/${etapa.proyectoId}/etapas/${etapa.id}`,
      etapa
    );
  }

  // ==================== DATOS DE REFERENCIA ====================

  obtenerResponsables(): Observable<Responsable[]> {
    return this.http.get<PaginatedResponse<any>>(
      `${this.baseUrl}${API_ENDPOINTS.usuarios}`,
      { params: new HttpParams().set('size', '100') }
    ).pipe(
      map(response => response.content.map((u: any) => ({
        id: u.id,
        nombre: `${u.nombre} ${u.apellido}`,
        cargo: u.cargo || '',
        email: u.email,
      })))
    );
  }

  obtenerProcesos(): Observable<ProcesoSimple[]> {
    return this.http.get<PaginatedResponse<any>>(
      `${this.baseUrl}${API_ENDPOINTS.procesos}`,
      { params: new HttpParams().set('size', '100') }
    ).pipe(
      map(response => response.content.map((p: any) => ({
        id: p.id,
        nombre: p.proceso,
        etapas: (p.flujo || []).map((nombre: string, index: number) => ({
          id: index + 1,
          nombre: nombre,
          orden: index + 1,
        })),
      })))
    );
  }
}
