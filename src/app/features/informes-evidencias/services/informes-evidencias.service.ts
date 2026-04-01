import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpService } from '../../../core/services/http.service';
import { Informe, Evidencia } from '../models/informe.model';

@Injectable({
  providedIn: 'root'
})
export class InformesEvidenciasService {

  private readonly informesEndpoint = '/v1/informes';
  private readonly evidenciasEndpoint = '/v1/evidencias';

  constructor(private readonly http: HttpService) { }

  // Métodos para gestionar informes
  obtenerInformes(): Observable<Informe[]> {
    return this.http.get<Informe[]>(this.informesEndpoint);
  }

  generarInforme(parametros: any): Observable<Informe> {
    return this.http.post<Informe>(this.informesEndpoint, parametros);
  }

  descargarInforme(id: number): Observable<Blob> {
    return this.http.downloadFile(`${this.informesEndpoint}/${id}/descargar`);
  }

  // Métodos para gestionar evidencias
  obtenerEvidencias(proyectoId?: number): Observable<Evidencia[]> {
    const params = proyectoId ? { proyectoId: String(proyectoId) } : undefined;
    return this.http.get<Evidencia[]>(this.evidenciasEndpoint, params);
  }

  subirEvidencia(evidencia: FormData): Observable<Evidencia> {
    return this.http.uploadFile<Evidencia>(this.evidenciasEndpoint, evidencia);
  }

  eliminarEvidencia(id: number): Observable<void> {
    return this.http.delete<void>(`${this.evidenciasEndpoint}/${id}`);
  }

  descargarEvidencia(id: number): Observable<Blob> {
    return this.http.downloadFile(`${this.evidenciasEndpoint}/${id}/descargar`);
  }
}
