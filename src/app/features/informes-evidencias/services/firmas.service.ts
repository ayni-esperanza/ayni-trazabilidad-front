import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Firma, FirmaRequest, FirmaResponse } from '../models/firma.model';

// Configuración de endpoints
const API_ENDPOINTS = {
  firmas: '/v1/firmas',
};

@Injectable({
  providedIn: 'root',
})
export class FirmasService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  private buildUrl(endpoint: string): string {
    const base = (this.baseUrl || '').replace(/\/+$/, '');
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    if ((base.endsWith('/api/v1') || base.endsWith('/v1')) && path.startsWith('/v1/')) {
      return `${base}${path.slice(3)}`;
    }
    return `${base}${path}`;
  }

  /**
   * Obtiene todas las firmas disponibles
   */
  obtenerFirmas(): Observable<Firma[]> {
    return this.http.get<Firma[]>(this.buildUrl(API_ENDPOINTS.firmas));
  }

  /**
   * Obtiene una firma por su ID
   */
  obtenerFirmaPorId(id: number): Observable<Firma> {
    return this.http.get<Firma>(this.buildUrl(`${API_ENDPOINTS.firmas}/${id}`));
  }

  /**
   * Crea una nueva firma
   */
  crearFirma(request: FirmaRequest): Observable<FirmaResponse> {
    return this.http.post<FirmaResponse>(
      this.buildUrl(API_ENDPOINTS.firmas),
      request
    );
  }

  /**
   * Actualiza una firma existente
   */
  actualizarFirma(id: number, request: FirmaRequest): Observable<Firma> {
    return this.http.put<Firma>(
      this.buildUrl(`${API_ENDPOINTS.firmas}/${id}`),
      request
    );
  }

  /**
   * Elimina una firma
   */
  eliminarFirma(id: number): Observable<void> {
    return this.http.delete<void>(
      this.buildUrl(`${API_ENDPOINTS.firmas}/${id}`)
    );
  }

  /**
   * Cambia el estado activo/inactivo de una firma
   */
  cambiarEstadoFirma(id: number, activo: boolean): Observable<Firma> {
    return this.http.patch<Firma>(
      this.buildUrl(`${API_ENDPOINTS.firmas}/${id}/estado`),
      { activo }
    );
  }
}
