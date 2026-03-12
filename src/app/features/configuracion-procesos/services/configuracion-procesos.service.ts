import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { Proceso, Etapa, PaginatedResponse } from '../models/proceso.model';
import { environment } from '../../../../environments/environment';

const API_ENDPOINTS = {
  procesos: '/v1/procesos',
};

@Injectable({
  providedIn: 'root'
})
export class ConfiguracionProcesosService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  // Métodos para gestionar procesos
  obtenerProcesos(params?: {
    page?: number;
    size?: number;
    search?: string;
    area?: string;
    activo?: boolean;
    sortBy?: string;
    direction?: string;
  }): Observable<PaginatedResponse<Proceso>> {
    const httpParams = params
      ? new HttpParams({ fromObject: params as any })
      : undefined;
    return this.http.get<PaginatedResponse<Proceso>>(
      `${this.baseUrl}${API_ENDPOINTS.procesos}`,
      { params: httpParams }
    );
  }

  crearProceso(proceso: Partial<Proceso>): Observable<Proceso> {
    return this.http.post<Proceso>(
      `${this.baseUrl}${API_ENDPOINTS.procesos}`,
      proceso
    );
  }

  actualizarProceso(id: number, proceso: Partial<Proceso>): Observable<Proceso> {
    return this.http.put<Proceso>(
      `${this.baseUrl}${API_ENDPOINTS.procesos}/${id}`,
      proceso
    );
  }

  eliminarProceso(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}${API_ENDPOINTS.procesos}/${id}`
    );
  }


}
