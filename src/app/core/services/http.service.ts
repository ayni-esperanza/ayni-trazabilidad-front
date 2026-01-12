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
    return this.http.get<T>(`${this.baseUrl}${endpoint}`, options);
  }

  // Métodos POST
  post<T>(endpoint: string, body: any): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}${endpoint}`, body);
  }

  // Métodos PUT
  put<T>(endpoint: string, body: any): Observable<T> {
    return this.http.put<T>(`${this.baseUrl}${endpoint}`, body);
  }

  // Métodos PATCH
  patch<T>(endpoint: string, body: any): Observable<T> {
    return this.http.patch<T>(`${this.baseUrl}${endpoint}`, body);
  }

  // Métodos DELETE
  delete<T>(endpoint: string): Observable<T> {
    return this.http.delete<T>(`${this.baseUrl}${endpoint}`);
  }

  // Método para subir archivos
  uploadFile<T>(endpoint: string, file: FormData): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}${endpoint}`, file);
  }

  // Método para descargar archivos
  downloadFile(endpoint: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}${endpoint}`, { 
      responseType: 'blob' 
    });
  }
}
