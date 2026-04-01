import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class HttpService {
  
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  // Métodos GET
  get<T>(endpoint: string, params?: any): Observable<T> {
    const options = params ? { params: new HttpParams({ fromObject: params }) } : {};
    return this.http.get<T>(this.buildUrl(endpoint), options);
  }

  // Métodos POST
  post<T>(endpoint: string, body: any): Observable<T> {
    return this.http.post<T>(this.buildUrl(endpoint), body);
  }

  // Métodos PUT
  put<T>(endpoint: string, body: any): Observable<T> {
    return this.http.put<T>(this.buildUrl(endpoint), body);
  }

  // Métodos PATCH
  patch<T>(endpoint: string, body: any): Observable<T> {
    return this.http.patch<T>(this.buildUrl(endpoint), body);
  }

  // Métodos DELETE
  delete<T>(endpoint: string): Observable<T> {
    return this.http.delete<T>(this.buildUrl(endpoint));
  }

  // Método para subir archivos
  uploadFile<T>(endpoint: string, file: FormData): Observable<T> {
    return this.http.post<T>(this.buildUrl(endpoint), file);
  }

  // Método para descargar archivos
  downloadFile(endpoint: string): Observable<Blob> {
    return this.http.get(this.buildUrl(endpoint), {
      responseType: 'blob' 
    });
  }

  private buildUrl(endpoint: string): string {
    const base = (this.baseUrl || '').replace(/\/+$/, '');
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    if (base.endsWith('/api/v1') && path.startsWith('/v1/')) {
      return `${base}${path.slice(3)}`;
    }

    if (base.endsWith('/v1') && path.startsWith('/v1/')) {
      return `${base}${path.slice(3)}`;
    }

    return `${base}${path}`;
  }
}
