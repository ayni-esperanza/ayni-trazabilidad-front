import { Injectable } from '@angular/core';
import { Observable, map, of } from 'rxjs';
import { HttpService } from '../../../core/services/http.service';
import { ComentarioAdicionalActividad, EtapaProyecto, FlujoNodo, FlujoProyecto, ProcesoSimple, Proyecto, Responsable, Solicitud } from '../models/solicitud.model';

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
  id?: number;
  numero: string;
  fecha: string;
  tipo?: string;
  numeroLicitacion?: string;
  numeroSolicitud?: string;
  total?: number;
  adjuntos?: FlujoAdjuntoApi[];
};

type FlujoAdjuntoApi = {
  id?: number;
  nombre: string;
  tipo: string;
  tamano: number;
  objectKey?: string;
  dataUrl?: string;
  url?: string;
};

type StorageUploadResponseApi = {
  objectKey: string;
  publicUrl?: string;
  eTag?: string;
};

type FlujoNodoApi = {
  id: number;
  nombre: string;
  tipo: 'inicio' | 'tarea';
  tipoActividad?: string;
  posicionX?: number;
  posicionY?: number;
  estadoActividad?: string;
  fechaCambioEstado?: string;
  responsableId?: number;
  responsableNombre?: string;
  fechaInicio?: string;
  fechaFin?: string;
  descripcion?: string;
  adjuntos?: FlujoAdjuntoApi[];
  siguientesIds: number[];
};

type ComentarioAdicionalApi = {
  id?: number;
  actividadId: number;
  nombre?: string;
  texto?: string;
  autorCuenta?: string;
  autor_cuenta?: string;
  fechaComentario?: string;
  fecha_comentario?: string;
  estadoActividad?: string;
  responsableId?: number;
  responsable_id?: number;
  fechaInicio?: string;
  fechaFin?: string;
  descripcion?: string;
  adjuntos?: FlujoAdjuntoApi[];
};

export type ComentarioActividadPayloadApi = {
  actividadId: number;
  nombre?: string;
  texto?: string;
  autorCuenta?: string;
  fechaComentario?: string;
  estadoActividad?: string;
  responsableId?: number;
  fechaInicio?: string;
  fechaFin?: string;
  descripcion?: string;
  adjuntos?: FlujoAdjuntoApi[];
};

type ActividadRequestApi = {
  id?: number;
  nombre: string;
  tipo: 'inicio' | 'tarea';  tipoActividad?: string;  estadoActividad?: string;
  fechaCambioEstado?: string;
  responsableId?: number;
  responsableNombre?: string;
  fechaInicio?: string;
  fechaFin?: string;
  descripcion?: string;
  nodoOrigenId?: number;
  adjuntos: FlujoAdjuntoApi[];
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
  comentariosAdicionalesActividad?: ComentarioAdicionalApi[];
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

export type CostoCategoriaAdicionalApi = {
  id: number;
  nombre: string;
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
      costo: Number(proyecto.costo || 0),
      fechaInicio: this.toIsoDate(proyecto.fechaInicio),
      fechaFinalizacion: this.toIsoDate(proyecto.fechaFinalizacion),
      responsableId: Number(proyecto.responsableId || 0),
      motivoCancelacion: proyecto.motivoCancelacion
    }).pipe(map((item) => this.mapProyecto(item)));
  }

  crearComentarioActividad(proyectoId: number, payload: ComentarioActividadPayloadApi): Observable<ComentarioAdicionalActividad> {
    return this.http.post<ComentarioAdicionalApi>(`/v1/proyectos/${proyectoId}/comentarios-actividad`, payload)
      .pipe(map((item) => this.mapComentarioAdicional(item)));
  }

  actualizarComentarioActividad(proyectoId: number, comentarioId: number, payload: ComentarioActividadPayloadApi): Observable<ComentarioAdicionalActividad> {
    return this.http.put<ComentarioAdicionalApi>(`/v1/proyectos/${proyectoId}/comentarios-actividad/${comentarioId}`, payload)
      .pipe(map((item) => this.mapComentarioAdicional(item)));
  }

  eliminarComentarioActividad(proyectoId: number, comentarioId: number): Observable<void> {
    return this.http.delete<void>(`/v1/proyectos/${proyectoId}/comentarios-actividad/${comentarioId}`);
  }

  finalizarProyecto(id: number): Observable<Proyecto> {
    return this.http.post<ProyectoApi>(`/v1/proyectos/${id}/finalizar`, {}).pipe(map((item) => this.mapProyecto(item)));
  }

  cambiarEstadoProyecto(id: number, estado: string): Observable<Proyecto> {
    return this.http.patch<ProyectoApi>(`/v1/proyectos/${id}/estado`, { nuevoEstado: estado }).pipe(
      map((item) => this.mapProyecto(item))
    );
  }

  cancelarProyecto(id: number, motivo: string): Observable<Proyecto> {
    return this.http.post<ProyectoApi>(`/v1/proyectos/${id}/cancelar`, { motivo }).pipe(
      map((item) => this.mapProyecto(item))
    );
  }

  eliminarProyecto(id: number): Observable<void> {
    return this.http.delete<void>(`/v1/proyectos/${id}`);
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

  obtenerActividades(proyectoId: number): Observable<FlujoNodo[]> {
    return this.http.get<FlujoNodoApi[]>(`/v1/proyectos/${proyectoId}/actividades`).pipe(
      map((items) => this.mapFlujo({ nodos: items || [] }).nodos)
    );
  }

  crearActividad(proyectoId: number, payload: ActividadRequestApi): Observable<FlujoNodo> {
    return this.http.post<FlujoNodoApi>(`/v1/proyectos/${proyectoId}/actividades`, payload).pipe(
      map((item) => this.mapFlujo({ nodos: [item] }).nodos[0])
    );
  }

  actualizarActividad(proyectoId: number, actividadId: number, payload: ActividadRequestApi): Observable<FlujoNodo> {
    return this.http.put<FlujoNodoApi>(`/v1/proyectos/${proyectoId}/actividades/${actividadId}`, payload).pipe(
      map((item) => this.mapFlujo({ nodos: [item] }).nodos[0])
    );
  }

  eliminarActividad(proyectoId: number, actividadId: number): Observable<void> {
    return this.http.delete<void>(`/v1/proyectos/${proyectoId}/actividades/${actividadId}`);
  }

  sincronizarActividades(proyectoId: number, nodos: FlujoNodo[]): Observable<FlujoNodo[]> {
    const payload: ActividadRequestApi[] = (nodos || []).map((nodo) => ({
      id: nodo.id,
      nombre: nodo.nombre,
      tipo: nodo.tipo,
      tipoActividad: nodo.tipoActividad,
      estadoActividad: nodo.estadoActividad,
      fechaCambioEstado: nodo.fechaCambioEstado,
      responsableId: nodo.responsableId,
      responsableNombre: nodo.responsableNombre,
      fechaInicio: nodo.fechaInicio,
      fechaFin: nodo.fechaFin,
      descripcion: nodo.descripcion,
      adjuntos: (nodo.adjuntos || []).map((adjunto) => ({
        nombre: adjunto.nombre,
        tipo: adjunto.tipo,
        tamano: adjunto.tamano,
        objectKey: adjunto.objectKey,
        dataUrl: adjunto.objectKey ? undefined : adjunto.dataUrl
      })),
      siguientesIds: nodo.siguientesIds || []
    }));

    return this.http.put<FlujoNodoApi[]>(`/v1/proyectos/${proyectoId}/actividades`, payload).pipe(
      map((items) => this.mapFlujo({ nodos: items || [] }).nodos)
    );
  }

  subirAdjuntoActividad(file: File, proyectoId?: number, actividadId?: number, carpeta: string = 'evidencias'): Observable<StorageUploadResponseApi> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    formData.append('carpeta', carpeta);

    if (typeof proyectoId === 'number' && Number.isFinite(proyectoId) && proyectoId > 0) {
      formData.append('proyectoId', String(proyectoId));
    }
    if (typeof actividadId === 'number' && Number.isFinite(actividadId) && actividadId > 0) {
      formData.append('actividadId', String(actividadId));
    }

    return this.http.uploadFile<StorageUploadResponseApi>('/v1/storage/upload', formData);
  }

  obtenerOrdenesCompra(proyectoId: number): Observable<OrdenCompraApi[]> {
    return this.http.get<OrdenCompraApi[]>(`/v1/proyectos/${proyectoId}/ordenes-compra`);
  }

  crearOrdenCompra(proyectoId: number, orden: OrdenCompraApi): Observable<OrdenCompraApi> {
    return this.http.post<OrdenCompraApi>(`/v1/proyectos/${proyectoId}/ordenes-compra`, orden);
  }

  actualizarOrdenCompra(proyectoId: number, ordenId: number, orden: OrdenCompraApi): Observable<OrdenCompraApi> {
    return this.http.put<OrdenCompraApi>(`/v1/proyectos/${proyectoId}/ordenes-compra/${ordenId}`, orden);
  }

  eliminarOrdenCompra(proyectoId: number, ordenId: number): Observable<void> {
    return this.http.delete<void>(`/v1/proyectos/${proyectoId}/ordenes-compra/${ordenId}`);
  }

  reemplazarOrdenesCompra(proyectoId: number, ordenes: OrdenCompraApi[]): Observable<OrdenCompraApi[]> {
    return this.http.put<OrdenCompraApi[]>(`/v1/proyectos/${proyectoId}/ordenes-compra`, ordenes);
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

  obtenerCategoriasAdicionales(proyectoId: number): Observable<CostoCategoriaAdicionalApi[]> {
    return this.http.get<CostoCategoriaAdicionalApi[]>(`/v1/proyectos/${proyectoId}/costos/adicionales/categorias-registro`);
  }

  crearCategoriaAdicional(proyectoId: number, nombre: string): Observable<CostoCategoriaAdicionalApi> {
    return this.http.post<CostoCategoriaAdicionalApi>(`/v1/proyectos/${proyectoId}/costos/adicionales/categorias-registro`, {
      nombre
    });
  }

  eliminarCategoriaAdicional(proyectoId: number, categoriaId: number): Observable<void> {
    return this.http.delete<void>(`/v1/proyectos/${proyectoId}/costos/adicionales/categorias-registro/${categoriaId}`);
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
      ordenesCompra: (item.ordenesCompra || []).map((orden) => ({
        id: orden.id,
        numero: orden.numero,
        fecha: orden.fecha,
        tipo: orden.tipo,
        numeroLicitacion: orden.numeroLicitacion,
        numeroSolicitud: orden.numeroSolicitud,
        total: Number(orden.total || 0),
        adjuntos: (orden.adjuntos || []).map((adjunto) => this.mapAdjunto(adjunto))
      })),
      responsableId: item.responsableId,
      responsableNombre: item.responsableNombre,
      descripcion: item.descripcion,
      areas: item.areas || [],
      ubicacion: item.ubicacion,
      fechaInicio: this.toDate(item.fechaInicio) || item.fechaInicio,
      fechaFinalizacion: this.toDate(item.fechaFinalizacion) || item.fechaFinalizacion,
      procesoId: Number(item.procesoId || 0),
      procesoNombre: item.procesoNombre,
      estado: this.mapEstadoProyecto(item.estado),
      etapaActual: item.etapaActual,
      motivoCancelacion: item.motivoCancelacion,
      etapas: (item.etapasProyecto || []).map((etapa) => this.mapEtapa(etapa, item.id)),
      flujo: this.mapFlujo(item.flujo),
      fechaActualizacion: this.toDate(item.fechaActualizacion),
      comentariosAdicionalesActividad: (item.comentariosAdicionalesActividad || []).map((comentario) => this.mapComentarioAdicional(comentario))
    };
  }

  private mapComentarioAdicional(comentario: ComentarioAdicionalApi): ComentarioAdicionalActividad {
    const autorCuenta = String(comentario.autorCuenta || comentario.autor_cuenta || '').trim();
    const responsableId = Number(comentario.responsableId ?? comentario.responsable_id ?? 0);
    const fechaComentario = String(comentario.fechaComentario || comentario.fecha_comentario || '').trim();

    return {
      id: Number(comentario.id || 0),
      actividadId: Number(comentario.actividadId || 0),
      guardado: true,
      nombre: comentario.nombre,
      texto: comentario.texto || comentario.descripcion || '',
      autorCuenta: autorCuenta || undefined,
      fechaComentario: fechaComentario || undefined,
      estadoActividad: this.mapEstadoTarea(comentario.estadoActividad),
      responsableId: responsableId > 0 ? responsableId : undefined,
      fechaInicio: comentario.fechaInicio,
      fechaFin: comentario.fechaFin,
      descripcion: comentario.descripcion,
      adjuntos: (comentario.adjuntos || []).map((adjunto) => this.mapAdjunto(adjunto))
    };
  }

  private mapFlujo(flujo?: { nodos: FlujoNodoApi[] }): FlujoProyecto {
    return {
      nodos: (flujo?.nodos || []).map((nodo): FlujoNodo => ({
        id: nodo.id,
        nombre: nodo.nombre,
        tipo: nodo.tipo,
        tipoActividad: this.mapTipoActividad(nodo.tipoActividad),
        posicionX: nodo.posicionX,
        posicionY: nodo.posicionY,
        estadoActividad: this.mapEstadoTarea(nodo.estadoActividad),
        fechaCambioEstado: nodo.fechaCambioEstado,
        responsableId: nodo.responsableId,
        responsableNombre: nodo.responsableNombre,
        fechaInicio: nodo.fechaInicio,
        fechaFin: nodo.fechaFin,
        descripcion: nodo.descripcion,
        adjuntos: (nodo.adjuntos || []).map((adjunto) => this.mapAdjunto(adjunto)),
        siguientesIds: nodo.siguientesIds || []
      }))
    };
  }

  private mapAdjunto(adjunto: FlujoAdjuntoApi) {
    return {
      nombre: adjunto.nombre,
      tipo: adjunto.tipo,
      tamano: Number(adjunto.tamano || 0),
      objectKey: adjunto.objectKey,
      dataUrl: adjunto.dataUrl || adjunto.url,
      url: adjunto.url || adjunto.dataUrl
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

  private mapEstadoProyecto(value?: string): Proyecto['estado'] {
    if (!value) return 'En Proceso';
    const clean = value.trim().toLowerCase().replace(/_/g, ' ');
    if (clean.includes('finaliz')) return 'Finalizado';
    if (clean.includes('complet')) return 'Completado';
    if (clean.includes('cancel')) return 'Cancelado';
    if (clean.includes('pend')) return 'Pendiente';
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

  private mapTipoActividad(value?: string): FlujoNodo['tipoActividad'] {
    if (!value) return undefined;
    const clean = value.trim().toLowerCase();
    if (clean.includes('seguimiento')) return 'SEGUIMIENTO';
    if (clean.includes('desarrollo')) return 'DESARROLLO';
    return undefined;
  }

  private toDate(value?: string): Date | undefined {
    if (!value) return undefined;
    const raw = String(value).trim();
    if (!raw) return undefined;

    // Preserve date-only values as local calendar dates to avoid UTC day-shift.
    const localDateOnly = this.parseLocalDateOnly(raw);
    if (localDateOnly) return localDateOnly;

    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return undefined;
    return date;
  }

  private toIsoDate(value?: Date | string): string | null {
    if (!value) return null;

    const raw = typeof value === 'string' ? value.trim() : '';
    if (raw) {
      const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (match) {
        // Keep explicit yyyy-MM-dd values untouched.
        return `${match[1]}-${match[2]}-${match[3]}`;
      }
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private parseLocalDateOnly(value: string): Date | undefined {
    const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnlyMatch) {
      const [, year, month, day] = dateOnlyMatch;
      return new Date(Number(year), Number(month) - 1, Number(day));
    }

    const midnightUtcMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})T00:00(?::00(?:\.\d{1,3})?)?(?:Z|[+\-]00:00)?$/);
    if (midnightUtcMatch) {
      const [, year, month, day] = midnightUtcMatch;
      return new Date(Number(year), Number(month) - 1, Number(day));
    }

    return undefined;
  }
}
