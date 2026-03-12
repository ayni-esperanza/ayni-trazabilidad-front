import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Informe, Evidencia } from '../models/informe.model';

@Injectable({
  providedIn: 'root'
})
export class InformesEvidenciasService {

  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  // Métodos para gestionar informes
  obtenerInformes(): Observable<Informe[]> {
    // Sin backend disponible - retornar vacío
    return of([]);
  }

  generarInforme(parametros: any): Observable<Informe> {
    // Sin backend disponible
    return of({} as Informe);
  }

  descargarInforme(id: number): Observable<Blob> {
    return of(new Blob());
  }

  // Métodos para gestionar evidencias
  obtenerEvidencias(proyectoId?: number): Observable<Evidencia[]> {
    return of([]);
  }

  subirEvidencia(evidencia: FormData): Observable<Evidencia> {
    return of({} as Evidencia);
  }

  eliminarEvidencia(id: number): Observable<void> {
    return of();
  }

  descargarEvidencia(id: number): Observable<Blob> {
    return of(new Blob());
  }
}
