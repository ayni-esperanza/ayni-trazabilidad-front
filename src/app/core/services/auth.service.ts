import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

export interface User {
  id: number | string;
  username: string;
  email: string;
  nombre: string;
  apellido: string;
  token: string;
  refreshToken?: string;
  tokenType?: string;
  expiresAt?: number;
  roles: string[];
  permissions: string[];
}

interface AuthApiResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  usuario: {
    id: number;
    username                                                      : string;
    email: string;
    nombre: string;
    apellido: string;
    roles: string[];
  };
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly storageKey = 'currentUser';
  private readonly adminUsername = environment.adminUsername.trim().toLowerCase();
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser: Observable<User | null>;
  private apiUrl = `${environment.apiUrl}/auth`;
  private platformId = inject(PLATFORM_ID);

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    let storedUser: string | null = null;
    if (isPlatformBrowser(this.platformId)) {
      storedUser =
        localStorage.getItem(this.storageKey) ||
        sessionStorage.getItem(this.storageKey);
    }
    this.currentUserSubject = new BehaviorSubject<User | null>(
      this.parseStoredUser(storedUser)
    );

    this.currentUser = this.currentUserSubject.asObservable();
  }

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  login(username: string, password: string, rememberMe: boolean = false): Observable<User> {
    return this.http
      .post<AuthApiResponse>(`${this.apiUrl}/login`, {
        usernameOrEmail: username,
        password,
      })
      .pipe(
        map((response) => this.mapAuthResponseToUser(response)),
        tap((user) => this.setUser(user, rememberMe)),
        catchError((error) => {
          return throwError(
            () => new Error(error.error?.message || 'Error al iniciar sesión'),
          );
        }),
      );
  }

  refreshAccessToken(): Observable<string> {
    const currentUser = this.currentUserValue;

    if (!currentUser?.refreshToken) {
      return throwError(() => new Error('No hay refresh token disponible'));
    }

    return this.http
      .post<AuthApiResponse>(`${this.apiUrl}/refresh`, {
        refreshToken: currentUser.refreshToken,
      })
      .pipe(
        map((response) => {
          const updatedUser = this.mapAuthResponseToUser(response);
          this.setUser(
            {
              ...currentUser,
              ...updatedUser,
              permissions: currentUser.permissions || [],
            },
            this.isRememberedSession(),
          );

          return updatedUser.token;
        }),
      );
  }

  private setUser(user: User, rememberMe: boolean): void {
    if (isPlatformBrowser(this.platformId)) {
      sessionStorage.setItem(this.storageKey, JSON.stringify(user));

      if (rememberMe) {
        localStorage.setItem(this.storageKey, JSON.stringify(user));
      } else {
        localStorage.removeItem(this.storageKey);
      }
    }

    this.currentUserSubject.next(user);
  }

  logout(): void {
    this.clearSession();
    this.router.navigate(['/login']);
  }

  getAccessToken(): string | null {
    return this.currentUserValue?.token || null;
  }

  getRefreshToken(): string | null {
    return this.currentUserValue?.refreshToken || null;
  }

  isAuthenticated(): boolean {
    const user = this.currentUserValue;
    if (!user?.token) {
      return false;
    }

    if (!user.expiresAt) {
      return true;
    }

    return Date.now() < user.expiresAt;
  }

  hasRole(role: string): boolean {
    return this.currentUserValue?.roles?.includes(role) || false;
  }

  hasPermission(permission: string): boolean {
    return this.currentUserValue?.permissions?.includes(permission) || false;
  }

  isAdminUser(): boolean {
    const normalizedUsername = this.currentUserValue?.username?.trim().toLowerCase();
    if (normalizedUsername === this.adminUsername) {
      return true;
    }

    const tokenUsername = this.getTokenUsername();
    return tokenUsername === this.adminUsername;
  }

  getLandingRoute(): string {
    return this.isAdminUser() ? '/tablero-control' : '/registro-solicitudes';
  }

  getUserFullName(): string {
    const user = this.currentUserValue;
    if (user) {
      return `${user.nombre} ${user.apellido}`;
    }
    return '';
  }

  private mapAuthResponseToUser(response: AuthApiResponse): User {
    return {
      id: response.usuario.id,
      username: response.usuario.username,
      email: response.usuario.email,
      nombre: response.usuario.nombre,
      apellido: response.usuario.apellido,
      token: response.accessToken,
      refreshToken: response.refreshToken,
      tokenType: response.tokenType,
      expiresAt: response.expiresIn,
      roles: response.usuario.roles || [],
      permissions: [],
    };
  }

  private parseStoredUser(storedUser: string | null): User | null {
    if (!storedUser) {
      return null;
    }

    try {
      const parsed = JSON.parse(storedUser) as User;
      return parsed.token ? parsed : null;
    } catch {
      if (isPlatformBrowser(this.platformId)) {
        localStorage.removeItem(this.storageKey);
        sessionStorage.removeItem(this.storageKey);
      }
      return null;
    }
  }

  private isRememberedSession(): boolean {
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }

    return !!localStorage.getItem(this.storageKey);
  }

  private clearSession(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(this.storageKey);
      sessionStorage.removeItem(this.storageKey);
    }

    this.currentUserSubject.next(null);
  }

  private getTokenUsername(): string | null {
    const token = this.currentUserValue?.token;
    if (!token) {
      return null;
    }

    const payload = token.split('.')[1];
    if (!payload) {
      return null;
    }

    try {
      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
      if (!isPlatformBrowser(this.platformId) || typeof atob !== 'function') {
        return null;
      }

      const decoded = atob(padded);
      const parsed = JSON.parse(decoded) as { sub?: string };
      return parsed.sub?.trim().toLowerCase() || null;
    } catch {
      return null;
    }
  }
}
