import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TableroControlService {

  constructor() { }

  // Métodos para obtener datos del backend
  obtenerProyectosFinalizados(): Observable<any> {
    // TODO: Implementar llamada al backend
    throw new Error('Método no implementado');
  }

  obtenerProyectosActivos(): Observable<any> {
    // TODO: Implementar llamada al backend
    throw new Error('Método no implementado');
  }

  obtenerGastos(): Observable<any> {
    // TODO: Implementar llamada al backend
    throw new Error('Método no implementado');
  }

  obtenerProyectosEnCurso(): Observable<any[]> {
    // TODO: Implementar llamada al backend
    throw new Error('Método no implementado');
  }

  obtenerTareasEncargados(): Observable<any[]> {
    // TODO: Implementar llamada al backend
    throw new Error('Método no implementado');
  }
}
