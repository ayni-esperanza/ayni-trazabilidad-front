import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, delay, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Firma, FirmaRequest, FirmaResponse } from '../models/firma.model';

// Configuración de endpoints
const API_ENDPOINTS = {
  firmas: '/firmas',
};

// Flag para usar datos mock mientras no hay backend
const USE_MOCK_DATA = true;

@Injectable({
  providedIn: 'root',
})
export class FirmasService {
  private baseUrl = environment.apiUrl;

  // Datos mock para desarrollo
  private mockFirmas: Firma[] = [];
  private nextMockId = 1;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todas las firmas disponibles
   */
  obtenerFirmas(): Observable<Firma[]> {
    if (USE_MOCK_DATA) {
      return of([...this.mockFirmas]).pipe(delay(200));
    }

    return this.http.get<Firma[]>(`${this.baseUrl}${API_ENDPOINTS.firmas}`);
  }

  /**
   * Obtiene una firma por su ID
   */
  obtenerFirmaPorId(id: number): Observable<Firma> {
    if (USE_MOCK_DATA) {
      const firma = this.mockFirmas.find((f) => f.id === id);
      if (firma) {
        return of({ ...firma }).pipe(delay(200));
      }
      return throwError(() => new Error('Firma no encontrada'));
    }

    return this.http.get<Firma>(`${this.baseUrl}${API_ENDPOINTS.firmas}/${id}`);
  }

  /**
   * Crea una nueva firma
   */
  crearFirma(request: FirmaRequest): Observable<FirmaResponse> {
    if (USE_MOCK_DATA) {
      const nuevaFirma: Firma = {
        id: this.nextMockId++,
        nombre: request.nombre,
        cargo: request.cargo,
        imagenBase64: request.imagenBase64,
        fechaCreacion: new Date(),
        activo: true,
      };
      this.mockFirmas.push(nuevaFirma);

      return of({
        firma: { ...nuevaFirma },
        mensaje: 'Firma creada exitosamente',
      }).pipe(delay(300));
    }

    return this.http.post<FirmaResponse>(
      `${this.baseUrl}${API_ENDPOINTS.firmas}`,
      request
    );
  }

  /**
   * Actualiza una firma existente
   */
  actualizarFirma(id: number, request: FirmaRequest): Observable<Firma> {
    if (USE_MOCK_DATA) {
      const index = this.mockFirmas.findIndex((f) => f.id === id);
      if (index === -1) {
        return throwError(() => new Error('Firma no encontrada'));
      }

      this.mockFirmas[index] = {
        ...this.mockFirmas[index],
        nombre: request.nombre,
        cargo: request.cargo,
        imagenBase64: request.imagenBase64,
      };

      return of({ ...this.mockFirmas[index] }).pipe(delay(300));
    }

    return this.http.put<Firma>(
      `${this.baseUrl}${API_ENDPOINTS.firmas}/${id}`,
      request
    );
  }

  /**
   * Elimina una firma
   */
  eliminarFirma(id: number): Observable<void> {
    if (USE_MOCK_DATA) {
      const index = this.mockFirmas.findIndex((f) => f.id === id);
      if (index === -1) {
        return throwError(() => new Error('Firma no encontrada'));
      }
      this.mockFirmas.splice(index, 1);
      return of(void 0).pipe(delay(200));
    }

    return this.http.delete<void>(
      `${this.baseUrl}${API_ENDPOINTS.firmas}/${id}`
    );
  }

  /**
   * Cambia el estado activo/inactivo de una firma
   */
  cambiarEstadoFirma(id: number, activo: boolean): Observable<Firma> {
    if (USE_MOCK_DATA) {
      const firma = this.mockFirmas.find((f) => f.id === id);
      if (!firma) {
        return throwError(() => new Error('Firma no encontrada'));
      }
      firma.activo = activo;
      return of({ ...firma }).pipe(delay(200));
    }

    return this.http.patch<Firma>(
      `${this.baseUrl}${API_ENDPOINTS.firmas}/${id}/estado`,
      { activo }
    );
  }
}
