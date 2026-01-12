import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Proceso, FlujoTrabajo, Plantilla, Etapa } from '../models/proceso.model';

@Injectable({
  providedIn: 'root'
})
export class ConfiguracionProcesosService {

  constructor() { }

  // Métodos para gestionar procesos
  obtenerProcesos(): Observable<Proceso[]> {
    // TODO: Implementar llamada al backend
    throw new Error('Método no implementado');
  }

  crearProceso(proceso: Proceso): Observable<Proceso> {
    // TODO: Implementar llamada al backend
    throw new Error('Método no implementado');
  }

  actualizarProceso(id: number, proceso: Proceso): Observable<Proceso> {
    // TODO: Implementar llamada al backend
    throw new Error('Método no implementado');
  }

  eliminarProceso(id: number): Observable<void> {
    // TODO: Implementar llamada al backend
    throw new Error('Método no implementado');
  }

  // Métodos para gestionar flujos de trabajo
  obtenerFlujosTrabajo(): Observable<FlujoTrabajo[]> {
    // TODO: Implementar llamada al backend
    throw new Error('Método no implementado');
  }

  crearFlujoTrabajo(flujo: FlujoTrabajo): Observable<FlujoTrabajo> {
    // TODO: Implementar llamada al backend
    throw new Error('Método no implementado');
  }

  // Métodos para gestionar plantillas
  obtenerPlantillas(): Observable<Plantilla[]> {
    // TODO: Implementar llamada al backend
    throw new Error('Método no implementado');
  }

  crearPlantilla(plantilla: Plantilla): Observable<Plantilla> {
    // TODO: Implementar llamada al backend
    throw new Error('Método no implementado');
  }

  // Métodos para gestionar etapas
  obtenerEtapas(): Observable<Etapa[]> {
    // TODO: Implementar llamada al backend
    throw new Error('Método no implementado');
  }

  crearEtapa(etapa: Etapa): Observable<Etapa> {
    // TODO: Implementar llamada al backend
    throw new Error('Método no implementado');
  }
}
