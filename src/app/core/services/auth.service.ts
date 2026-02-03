import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { map, catchError, delay } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

export interface User {
  id: number;
  username: string;
  email: string;
  nombre: string;
  apellido: string;
  token: string;
  roles: string[];
  permissions: string[];
}

export interface LoginResponse {
  user: User;
  token: string;
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser: Observable<User | null>;
  private apiUrl = environment.apiUrl;
  private platformId = inject(PLATFORM_ID);

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {
    // Verificar primero en localStorage, luego en sessionStorage (solo en el navegador)
    let storedUser: string | null = null;
    if (isPlatformBrowser(this.platformId)) {
      storedUser =
        localStorage.getItem('currentUser') ||
        sessionStorage.getItem('currentUser');
    }
    this.currentUserSubject = new BehaviorSubject<User | null>(
      storedUser ? JSON.parse(storedUser) : null,
    );
    this.currentUser = this.currentUserSubject.asObservable();
  }

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  login(
    username: string,
    password: string,
    rememberMe: boolean = false,
  ): Observable<User> {
    return this.http
      .post<any>(`${this.apiUrl}/auth/login`, {
        usernameOrEmail: username,
        password,
      })
      .pipe(
        map((response) => {
          const user: User = {
            id: response.usuario.id,
            username: response.usuario.username,
            email: response.usuario.email,
            nombre: response.usuario.nombre,
            apellido: response.usuario.apellido,
            token: response.accessToken,
            roles: response.usuario.roles || [],
            permissions: [],
          };
          this.setUser(user, rememberMe);
          return user;
        }),
        catchError((error) => {
          return throwError(
            () => new Error(error.error?.message || 'Error al iniciar sesión'),
          );
        }),
      );
  }

  private setUser(user: User, rememberMe: boolean): void {
    // Solo guardar en storage si estamos en el navegador
    if (isPlatformBrowser(this.platformId)) {
      if (rememberMe) {
        // Guardar en localStorage para persistir entre sesiones
        localStorage.setItem('currentUser', JSON.stringify(user));
        sessionStorage.removeItem('currentUser');
      } else {
        // Guardar en sessionStorage solo para esta sesión
        sessionStorage.setItem('currentUser', JSON.stringify(user));
        localStorage.removeItem('currentUser');
      }
    }
    this.currentUserSubject.next(user);
  }

  logout(): void {
    // Eliminar usuario del almacenamiento (solo en el navegador)
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('currentUser');
      sessionStorage.removeItem('currentUser');
    }
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean {
    const user = this.currentUserValue;
    return !!user && !!user.token;
  }

  hasRole(role: string): boolean {
    return this.currentUserValue?.roles?.includes(role) || false;
  }

  hasPermission(permission: string): boolean {
    return this.currentUserValue?.permissions?.includes(permission) || false;
  }

  getUserFullName(): string {
    const user = this.currentUserValue;
    if (user) {
      return `${user.nombre} ${user.apellido}`;
    }
    return '';
  }
}
