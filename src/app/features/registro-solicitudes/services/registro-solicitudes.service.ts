import { Injectable } from '@angular/core';
import { Observable, map, of } from 'rxjs';
import { HttpService } from '../../../core/services/http.service';
import { EtapaProyecto, FlujoNodo, FlujoProyecto, ProcesoSimple, Proyecto, Responsable, Solicitud } from '../models/solicitud.model';

type PaginatedResponse<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
};

type SolicitudApi = {
  id: number;
  nombreProyecto: string;
  cliente: string;
  representante?: string;
  costo?: number;
  responsableId: number;
  responsableNombre?: string;
  descripcion: string;
  areas?: string[];
  ubicacion?: string;
  fechaSolicitud?: string;
  fechaActualizacion?: string;
  fechaInicio?: string;
  fechaFin?: string;
  estado: string;
};

type OrdenCompraApi = {
  numero: string;
  fecha: string;
  tipo?: string;
  numeroLicitacion?: string;
  numeroSolicitud?: string;
  total?: number;
};

type FlujoAdjuntoApi = {
  nombre: string;
  tipo: string;
  tamano: number;
  dataUrl?: string;
  url?: string;
};

type FlujoNodoApi = {
  id: number;
  nombre: string;
  tipo: 'inicio' | 'tarea';
  posicionX?: number;
  posicionY?: number;
  estadoActividad?: string;
  fechaCambioEstado?: string;
  responsableId?: number;
  fechaInicio?: string;
  fechaFin?: string;
  descripcion?: string;
  adjuntos?: FlujoAdjuntoApi[];
  siguientesIds: number[];
};

type EtapaProyectoApi = {
  id: number;
  nombre: string;
  orden: number;
  presupuesto: number;
  responsableId?: number;
  responsableNombre?: string;
  fechaInicio?: string;
  fechaFinalizacion?: string;
  estado: string;
};

type ProyectoApi = {
  id: number;
  solicitudId: number;
  nombreProyecto: string;
  cliente: string;
  representante?: string;
  costo: number;
  fechaRegistro?: string;
  fechaActualizacion?: string;
  ordenesCompra?: OrdenCompraApi[];
  responsableId: number;
  responsableNombre?: string;
  descripcion: string;
  areas?: string[];
  ubicacion?: string;
  fechaInicio: string;
  fechaFinalizacion: string;
  procesoId?: number;
  procesoNombre?: string;
  estado: string;
  etapaActual?: number;
  motivoCancelacion?: string;
  etapasProyecto?: EtapaProyectoApi[];
  flujo?: {
    nodos: FlujoNodoApi[];
  };
};

type CostoMaterialApi = {
  id: number;
  fecha?: string;
  nroComprobante?: string;
  producto: string;
  cantidad: number;
  costoUnitario: number;
  costoTotal: number;
  encargado?: string;
  dependenciaActividadId?: number | null;
};

type CostoManoObraApi = {
  id: number;
  trabajador: string;
  cargo?: string;
  diasTrabajando: number;
  costoPorDia: number;
  costoTotal: number;
  dependenciaActividadId?: number | null;
};

type CostoAdicionalApi = {
  id: number;
  fecha?: string;
  categoria: string;
  descripcion?: string;
  cantidad: number;
  costoUnitario: number;
  costoTotal: number;
  encargado?: string;
  dependenciaActividadId?: number | null;
};

@Injectable({
  providedIn: 'root'
})
export class RegistroSolicitudesService {
  constructor(private readonly http: HttpService) {}

  obtenerSolicitudes(): Observable<Solicitud[]> {
    return this.http.get<PaginatedResponse<SolicitudApi>>('/v1/solicitudes', { size: 500 }).pipe(
      map((response) => (response.content || []).map((item) => this.mapSolicitud(item)))
    );
  }

  crearSolicitud(solicitud: Partial<Solicitud>): Observable<Solicitud> {
    return this.http.post<SolicitudApi>('/v1/solicitudes', {
      nombreProyecto: solicitud.nombreProyecto,
      cliente: solicitud.cliente,
      representante: solicitud.representante,
      costo: Number(solicitud.costo || 0),
      responsableId: Number(solicitud.responsableId),
      descripcion: solicitud.descripcion,
      ubicacion: solicitud.ubicacion,
      areas: solicitud.areas || [],
      fechaInicio: this.toIsoDate(solicitud.fechaInicio),
      fechaFin: this.toIsoDate(solicitud.fechaFin)
    }).pipe(map((item) => this.mapSolicitud(item)));
  }

  actualizarSolicitud(id: number, solicitud: Partial<Solicitud>): Observable<Solicitud> {
    return this.http.put<SolicitudApi>(`/v1/solicitudes/${id}`, {
      nombreProyecto: solicitud.nombreProyecto,
      cliente: solicitud.cliente,
      representante: solicitud.representante,
      costo: Number(solicitud.costo || 0),
      responsableId: Number(solicitud.responsableId),
      descripcion: solicitud.descripcion,
      ubicacion: solicitud.ubicacion,
      areas: solicitud.areas || [],
      fechaInicio: this.toIsoDate(solicitud.fechaInicio),
      fechaFin: this.toIsoDate(solicitud.fechaFin)
    }).pipe(map((item) => this.mapSolicitud(item)));
  }

  eliminarSolicitud(id: number): Observable<void> {
    return this.http.delete<void>(`/v1/solicitudes/${id}`);
  }

  obtenerProyectos(): Observable<Proyecto[]> {
    return this.http.get<PaginatedResponse<ProyectoApi>>('/v1/proyectos', { size: 500 }).pipe(
      map((response) => (response.content || []).map((item) => this.mapProyecto(item)))
    );
  }

  obtenerProyectoPorId(id: number): Observable<Proyecto> {
    return this.http.get<ProyectoApi>(`/v1/proyectos/${id}`).pipe(map((item) => this.mapProyecto(item)));
  }

  iniciarProyecto(solicitud: Solicitud, procesoId?: number): Observable<Proyecto> {
    return this.http.post<ProyectoApi>('/v1/proyectos/iniciar', {
      solicitudId: solicitud.id,
      representante: solicitud.representante,
      ubicacion: solicitud.ubicacion,
      areas: solicitud.areas || [],
      fechaInicio: this.toIsoDate(solicitud.fechaInicio),
      fechaFinalizacion: this.toIsoDate(solicitud.fechaFin)
    }).pipe(map((item) => this.mapProyecto(item)));
  }

  actualizarProyecto(id: number, proyecto: Partial<Proyecto>): Observable<Proyecto> {
    return this.http.put<ProyectoApi>(`/v1/proyectos/${id}`, {
      nombreProyecto: proyecto.nombreProyecto,
      cliente: proyecto.cliente,
      representante: proyecto.representante,
      descripcion: proyecto.descripcion,
      ubicacion: proyecto.ubicacion,
      areas: proyecto.areas || [],
      ordenesCompra: proyecto.ordenesCompra || [],
      flujo: proyecto.flujo || { nodos: [] },
      costo: Number(proyecto.costo || 0),
      fechaInicio: this.toIsoDate(proyecto.fechaInicio),
      fechaFinalizacion: this.toIsoDate(proyecto.fechaFinalizacion),
      responsableId: Number(proyecto.responsableId || 0),
      motivoCancelacion: proyecto.motivoCancelacion
    }).pipe(map((item) => this.mapProyecto(item)));
  }

  finalizarProyecto(id: number): Observable<Proyecto> {
    return this.http.post<ProyectoApi>(`/v1/proyectos/${id}/finalizar`, {}).pipe(map((item) => this.mapProyecto(item)));
  }

  cambiarEstadoProyecto(id: number, estado: string): Observable<Proyecto> {
    return this.http.patch<ProyectoApi>(`/v1/proyectos/${id}/estado`, { nuevoEstado: estado }).pipe(
      map((item) => this.mapProyecto(item))
    );
  }

  obtenerEtapasPorProyecto(proyectoId: number): Observable<EtapaProyecto[]> {
    return this.http.get<EtapaProyectoApi[]>(`/v1/proyectos/${proyectoId}/etapas`).pipe(
      map((items) => (items || []).map((item) => this.mapEtapa(item, proyectoId)))
    );
  }

  actualizarEtapa(proyectoId: number, etapa: EtapaProyecto): Observable<EtapaProyecto> {
    return this.http.put<EtapaProyectoApi>(`/v1/proyectos/${proyectoId}/etapas/${etapa.id}`, {
      presupuesto: Number(etapa.presupuesto || 0),
      responsableId: Number(etapa.responsableId || 0),
      fechaInicio: this.toIsoDate(etapa.fechaInicio),
      fechaFinalizacion: this.toIsoDate(etapa.fechaFinalizacion)
    }).pipe(map((item) => this.mapEtapa(item, proyectoId)));
  }

  completarEtapa(proyectoId: number, etapaId: number): Observable<EtapaProyecto> {
    return this.http.post<EtapaProyectoApi>(`/v1/proyectos/${proyectoId}/etapas/${etapaId}/completar`, {}).pipe(
      map((item) => this.mapEtapa(item, proyectoId))
    );
  }

  obtenerResponsables(): Observable<Responsable[]> {
    return this.http.get<Responsable[]>('/v1/solicitudes/responsables');
  }

  obtenerProcesos(): Observable<ProcesoSimple[]> {
    return of([]);
  }

  obtenerCostosMateriales(proyectoId: number): Observable<CostoMaterialApi[]> {
    return this.http.get<CostoMaterialApi[]>(`/v1/proyectos/${proyectoId}/costos/materiales`).pipe(
      map((items) => (items || []).map((item) => ({
        id: item.id,
        fecha: item.fecha,
        nroComprobante: item.nroComprobante,
        producto: item.producto,
        cantidad: Number(item.cantidad || 0),
        costoUnitario: Number(item.costoUnitario || 0),
        costoTotal: Number(item.costoTotal || 0),
        encargado: item.encargado,
        dependenciaActividadId: item.dependenciaActividadId ?? null
      })))
    );
  }

  crearCostoMaterial(proyectoId: number, item: CostoMaterialApi): Observable<CostoMaterialApi> {
    return this.http.post<CostoMaterialApi>(`/v1/proyectos/${proyectoId}/costos/materiales`, {
      fecha: item.fecha || null,
      nroComprobante: item.nroComprobante || '',
      producto: item.producto,
      cantidad: Number(item.cantidad || 0),
      costoUnitario: Number(item.costoUnitario || 0),
      encargado: item.encargado || '',
      dependenciaActividadId: item.dependenciaActividadId ?? null
    });
  }

  actualizarCostoMaterial(proyectoId: number, item: CostoMaterialApi): Observable<CostoMaterialApi> {
    return this.http.put<CostoMaterialApi>(`/v1/proyectos/${proyectoId}/costos/materiales/${item.id}`, {
      fecha: item.fecha || null,
      nroComprobante: item.nroComprobante || '',
      producto: item.producto,
      cantidad: Number(item.cantidad || 0),
      costoUnitario: Number(item.costoUnitario || 0),
      encargado: item.encargado || '',
      dependenciaActividadId: item.dependenciaActividadId ?? null
    });
  }

  eliminarCostoMaterial(proyectoId: number, id: number): Observable<void> {
    return this.http.delete<void>(`/v1/proyectos/${proyectoId}/costos/materiales/${id}`);
  }

  obtenerCostosManoObra(proyectoId: number): Observable<CostoManoObraApi[]> {
    return this.http.get<CostoManoObraApi[]>(`/v1/proyectos/${proyectoId}/costos/mano-obra`).pipe(
      map((items) => (items || []).map((item) => ({
        id: item.id,
        trabajador: item.trabajador,
        cargo: item.cargo,
        diasTrabajando: Number(item.diasTrabajando || 0),
        costoPorDia: Number(item.costoPorDia || 0),
        costoTotal: Number(item.costoTotal || 0),
        dependenciaActividadId: item.dependenciaActividadId ?? null
      })))
    );
  }

  crearCostoManoObra(proyectoId: number, item: CostoManoObraApi): Observable<CostoManoObraApi> {
    return this.http.post<CostoManoObraApi>(`/v1/proyectos/${proyectoId}/costos/mano-obra`, {
      trabajador: item.trabajador,
      cargo: item.cargo || '',
      diasTrabajando: Number(item.diasTrabajando || 0),
      costoPorDia: Number(item.costoPorDia || 0),
      dependenciaActividadId: item.dependenciaActividadId ?? null
    });
  }

  actualizarCostoManoObra(proyectoId: number, item: CostoManoObraApi): Observable<CostoManoObraApi> {
    return this.http.put<CostoManoObraApi>(`/v1/proyectos/${proyectoId}/costos/mano-obra/${item.id}`, {
      trabajador: item.trabajador,
      cargo: item.cargo || '',
      diasTrabajando: Number(item.diasTrabajando || 0),
      costoPorDia: Number(item.costoPorDia || 0),
      dependenciaActividadId: item.dependenciaActividadId ?? null
    });
  }

  eliminarCostoManoObra(proyectoId: number, id: number): Observable<void> {
    return this.http.delete<void>(`/v1/proyectos/${proyectoId}/costos/mano-obra/${id}`);
  }

  obtenerCostosAdicionales(proyectoId: number): Observable<CostoAdicionalApi[]> {
    return this.http.get<CostoAdicionalApi[]>(`/v1/proyectos/${proyectoId}/costos/adicionales`).pipe(
      map((items) => (items || []).map((item) => ({
        id: item.id,
        fecha: item.fecha,
        categoria: item.categoria,
        descripcion: item.descripcion,
        cantidad: Number(item.cantidad || 0),
        costoUnitario: Number(item.costoUnitario || 0),
        costoTotal: Number(item.costoTotal || 0),
        encargado: item.encargado,
        dependenciaActividadId: item.dependenciaActividadId ?? null
      })))
    );
  }

  crearCostoAdicional(proyectoId: number, item: CostoAdicionalApi): Observable<CostoAdicionalApi> {
    return this.http.post<CostoAdicionalApi>(`/v1/proyectos/${proyectoId}/costos/adicionales`, {
      fecha: item.fecha || null,
      categoria: item.categoria,
      descripcion: item.descripcion || '',
      cantidad: Number(item.cantidad || 0),
      costoUnitario: Number(item.costoUnitario || 0),
      encargado: item.encargado || '',
      dependenciaActividadId: item.dependenciaActividadId ?? null
    });
  }

  actualizarCostoAdicional(proyectoId: number, item: CostoAdicionalApi): Observable<CostoAdicionalApi> {
    return this.http.put<CostoAdicionalApi>(`/v1/proyectos/${proyectoId}/costos/adicionales/${item.id}`, {
      fecha: item.fecha || null,
      categoria: item.categoria,
      descripcion: item.descripcion || '',
      cantidad: Number(item.cantidad || 0),
      costoUnitario: Number(item.costoUnitario || 0),
      encargado: item.encargado || '',
      dependenciaActividadId: item.dependenciaActividadId ?? null
    });
  }

  eliminarCostoAdicional(proyectoId: number, id: number): Observable<void> {
    return this.http.delete<void>(`/v1/proyectos/${proyectoId}/costos/adicionales/${id}`);
  }

  private mapSolicitud(item: SolicitudApi): Solicitud {
    return {
      id: item.id,
      nombreProyecto: item.nombreProyecto,
      cliente: item.cliente,
      representante: item.representante,
      costo: Number(item.costo || 0),
      responsableId: item.responsableId,
      responsableNombre: item.responsableNombre,
      descripcion: item.descripcion,
      areas: item.areas || [],
      ubicacion: item.ubicacion,
      fechaSolicitud: this.toDate(item.fechaSolicitud),
      fechaActualizacion: this.toDate(item.fechaActualizacion),
      fechaInicio: this.toDate(item.fechaInicio),
      fechaFin: this.toDate(item.fechaFin),
      estado: this.mapEstadoSolicitud(item.estado)
    };
  }

  private mapProyecto(item: ProyectoApi): Proyecto {
    return {
      id: item.id,
      solicitudId: item.solicitudId,
      nombreProyecto: item.nombreProyecto,
      cliente: item.cliente,
      representante: item.representante,
      costo: Number(item.costo || 0),
      fechaRegistro: this.toDate(item.fechaRegistro),
      ordenesCompra: item.ordenesCompra || [],
      responsableId: item.responsableId,
      responsableNombre: item.responsableNombre,
      descripcion: item.descripcion,
      areas: item.areas || [],
      ubicacion: item.ubicacion,
      fechaInicio: this.toDate(item.fechaInicio) || item.fechaInicio,
      fechaFinalizacion: this.toDate(item.fechaFinalizacion) || item.fechaFinalizacion,
      procesoId: Number(item.procesoId || 0),
      procesoNombre: item.procesoNombre,
      estado: this.mapEstadoSolicitud(item.estado),
      etapaActual: item.etapaActual,
      motivoCancelacion: item.motivoCancelacion,
      etapas: (item.etapasProyecto || []).map((etapa) => this.mapEtapa(etapa, item.id)),
      flujo: this.mapFlujo(item.flujo),
      fechaActualizacion: this.toDate(item.fechaActualizacion)
    };
  }

  private mapFlujo(flujo?: { nodos: FlujoNodoApi[] }): FlujoProyecto {
    return {
      nodos: (flujo?.nodos || []).map((nodo): FlujoNodo => ({
        id: nodo.id,
        nombre: nodo.nombre,
        tipo: nodo.tipo,
        posicionX: nodo.posicionX,
        posicionY: nodo.posicionY,
        estadoActividad: this.mapEstadoTarea(nodo.estadoActividad),
        fechaCambioEstado: nodo.fechaCambioEstado,
        responsableId: nodo.responsableId,
        fechaInicio: nodo.fechaInicio,
        fechaFin: nodo.fechaFin,
        descripcion: nodo.descripcion,
        adjuntos: (nodo.adjuntos || []).map((adjunto) => ({
          nombre: adjunto.nombre,
          tipo: adjunto.tipo,
          tamano: Number(adjunto.tamano || 0),
          dataUrl: adjunto.dataUrl || adjunto.url
        })),
        siguientesIds: nodo.siguientesIds || []
      }))
    };
  }

  private mapEtapa(item: EtapaProyectoApi, proyectoId: number): EtapaProyecto {
    return {
      id: item.id,
      proyectoId,
      etapaId: item.id,
      nombre: item.nombre,
      orden: item.orden,
      presupuesto: Number(item.presupuesto || 0),
      responsableId: Number(item.responsableId || 0),
      responsableNombre: item.responsableNombre,
      fechaInicio: this.toDate(item.fechaInicio) || item.fechaInicio || '',
      fechaFinalizacion: this.toDate(item.fechaFinalizacion) || item.fechaFinalizacion || '',
      estado: this.mapEstadoEtapa(item.estado),
      tareas: []
    };
  }

  private mapEstadoSolicitud(value?: string): Solicitud['estado'] {
    if (!value) return 'En Proceso';
    const clean = value.trim().toLowerCase();
    if (clean.includes('complet')) return 'Completado';
    if (clean.includes('cancel')) return 'Cancelado';
    return 'En Proceso';
  }

  private mapEstadoEtapa(value?: string): EtapaProyecto['estado'] {
    if (!value) return 'Pendiente';
    const clean = value.trim().toLowerCase().replace(/_/g, ' ');
    if (clean.includes('complet')) return 'Completado';
    if (clean.includes('cancel')) return 'Cancelado';
    if (clean.includes('proceso')) return 'En Proceso';
    return 'Pendiente';
  }

  private mapEstadoTarea(value?: string): FlujoNodo['estadoActividad'] {
    if (!value) return 'Pendiente';
    const clean = value.trim().toLowerCase().replace(/_/g, ' ');
    if (clean.includes('complet')) return 'Completado';
    if (clean.includes('cancel')) return 'Cancelado';
    if (clean.includes('retras')) return 'Retrasado';
    if (clean.includes('proceso')) return 'En Proceso';
    return 'Pendiente';
  }

  private toDate(value?: string): Date | undefined {
    if (!value) return undefined;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return undefined;
    return date;
  }

  private toIsoDate(value?: Date | string): string | null {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
}
