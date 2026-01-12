import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Informe, Evidencia } from '../models/informe.model';

@Injectable({
  providedIn: 'root'
})
export class InformesEvidenciasService {

  constructor() { }

  // Métodos para gestionar informes
  obtenerInformes(): Observable<Informe[]> {
    // TODO: Implementar llamada al backend
    throw new Error('Método no implementado');
  }

  generarInforme(parametros: any): Observable<Informe> {
    // TODO: Implementar llamada al backend
    throw new Error('Método no implementado');
  }

  descargarInforme(id: number): Observable<Blob> {
    // TODO: Implementar llamada al backend
    throw new Error('Método no implementado');
  }

  // Métodos para gestionar evidencias
  obtenerEvidencias(proyectoId?: number): Observable<Evidencia[]> {
    // TODO: Implementar llamada al backend
    throw new Error('Método no implementado');
  }

  subirEvidencia(evidencia: FormData): Observable<Evidencia> {
    // TODO: Implementar llamada al backend
    throw new Error('Método no implementado');
  }

  eliminarEvidencia(id: number): Observable<void> {
    // TODO: Implementar llamada al backend
    throw new Error('Método no implementado');
  }

  descargarEvidencia(id: number): Observable<Blob> {
    // TODO: Implementar llamada al backend
    throw new Error('Método no implementado');
  }
}
