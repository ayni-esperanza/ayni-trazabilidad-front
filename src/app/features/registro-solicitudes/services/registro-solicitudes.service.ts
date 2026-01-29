import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Solicitud, Proyecto, EtapaProyecto, Responsable, ProcesoSimple } from '../models/solicitud.model';

@Injectable({
  providedIn: 'root'
})
export class RegistroSolicitudesService {

  constructor() { }

  // Métodos para gestionar solicitudes
  obtenerSolicitudes(): Observable<Solicitud[]> {
    // TODO: Implementar llamada al backend
    return of([]);
  }

  crearSolicitud(solicitud: Solicitud): Observable<Solicitud> {
    // TODO: Implementar llamada al backend
    return of(solicitud);
  }

  actualizarSolicitud(id: number, solicitud: Solicitud): Observable<Solicitud> {
    // TODO: Implementar llamada al backend
    return of(solicitud);
  }

  eliminarSolicitud(id: number): Observable<void> {
    // TODO: Implementar llamada al backend
    return of();
  }

  obtenerSolicitudPorId(id: number): Observable<Solicitud | null> {
    // TODO: Implementar llamada al backend
    return of(null);
  }

  // Métodos para gestionar proyectos
  obtenerProyectos(): Observable<Proyecto[]> {
    // TODO: Implementar llamada al backend
    return of([]);
  }

  crearProyecto(proyecto: Proyecto): Observable<Proyecto> {
    // TODO: Implementar llamada al backend
    return of(proyecto);
  }

  actualizarProyecto(id: number, proyecto: Proyecto): Observable<Proyecto> {
    // TODO: Implementar llamada al backend
    return of(proyecto);
  }

  obtenerProyectoPorId(id: number): Observable<Proyecto | null> {
    // TODO: Implementar llamada al backend
    return of(null);
  }

  // Métodos para gestionar etapas de proyectos
  obtenerEtapasPorProyecto(proyectoId: number): Observable<EtapaProyecto[]> {
    // TODO: Implementar llamada al backend
    return of([]);
  }

  actualizarEtapa(etapa: EtapaProyecto): Observable<EtapaProyecto> {
    // TODO: Implementar llamada al backend
    return of(etapa);
  }

  // Métodos para obtener datos de referencia
  obtenerResponsables(): Observable<Responsable[]> {
    // TODO: Implementar llamada al backend
    return of([]);
  }

  obtenerProcesos(): Observable<ProcesoSimple[]> {
    // TODO: Implementar llamada al backend
    return of([]);
  }
}
