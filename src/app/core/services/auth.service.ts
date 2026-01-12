import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  
  private currentUserSubject: BehaviorSubject<any>;
  public currentUser: Observable<any>;

  constructor() {
    this.currentUserSubject = new BehaviorSubject<any>(
      JSON.parse(localStorage.getItem('currentUser') || '{}')
    );
    this.currentUser = this.currentUserSubject.asObservable();
  }

  public get currentUserValue(): any {
    return this.currentUserSubject.value;
  }

  login(username: string, password: string): Observable<any> {
    // TODO: Implementar llamada al backend para autenticación
    throw new Error('Método no implementado');
  }

  logout(): void {
    // Eliminar usuario del localStorage
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
  }

  isAuthenticated(): boolean {
    return !!this.currentUserValue && !!this.currentUserValue.token;
  }

  hasRole(role: string): boolean {
    return this.currentUserValue?.roles?.includes(role) || false;
  }

  hasPermission(permission: string): boolean {
    return this.currentUserValue?.permissions?.includes(permission) || false;
  }
}
