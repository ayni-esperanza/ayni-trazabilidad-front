import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Solicitud } from '../models/solicitud.model';

@Injectable({
  providedIn: 'root'
})
export class RegistroSolicitudesService {

  constructor() { }

  // Métodos para gestionar solicitudes
  obtenerSolicitudes(): Observable<Solicitud[]> {
    // TODO: Implementar llamada al backend
    throw new Error('Método no implementado');
  }

  crearSolicitud(solicitud: Solicitud): Observable<Solicitud> {
    // TODO: Implementar llamada al backend
    throw new Error('Método no implementado');
  }

  actualizarSolicitud(id: number, solicitud: Solicitud): Observable<Solicitud> {
    // TODO: Implementar llamada al backend
    throw new Error('Método no implementado');
  }

  eliminarSolicitud(id: number): Observable<void> {
    // TODO: Implementar llamada al backend
    throw new Error('Método no implementado');
  }

  obtenerSolicitudPorId(id: number): Observable<Solicitud> {
    // TODO: Implementar llamada al backend
    throw new Error('Método no implementado');
  }
}
