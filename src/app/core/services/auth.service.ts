import { Injectable } from '@angular/core';
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
  providedIn: 'root'
})
export class AuthService {
  
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser: Observable<User | null>;
  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    // Verificar primero en localStorage, luego en sessionStorage
    const storedUser = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
    this.currentUserSubject = new BehaviorSubject<User | null>(
      storedUser ? JSON.parse(storedUser) : null
    );
    this.currentUser = this.currentUserSubject.asObservable();
  }

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  login(username: string, password: string, rememberMe: boolean = false): Observable<User> {
    // TODO: Descomentar cuando el backend esté listo
    // return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, { username, password })
    //   .pipe(
    //     map(response => {
    //       const user = { ...response.user, token: response.token };
    //       this.setUser(user, rememberMe);
    //       return user;
    //     }),
    //     catchError(error => {
    //       return throwError(() => new Error(error.error?.message || 'Error al iniciar sesión'));
    //     })
    //   );

    // Simulación temporal para desarrollo
    return this.mockLogin(username, password, rememberMe);
  }

  private mockLogin(username: string, password: string, rememberMe: boolean): Observable<User> {
    // Simulación de login para desarrollo
    return of(null).pipe(
      delay(1000), // Simular latencia de red
      map(() => {
        // Usuarios de prueba
        if ((username === 'admin' && password === 'admin123') || 
            (username === 'usuario' && password === 'usuario123')) {
          const user: User = {
            id: 1,
            username: username,
            email: `${username}@ayni.com`,
            nombre: username === 'admin' ? 'Administrador' : 'Usuario',
            apellido: 'Sistema',
            token: 'mock-jwt-token-' + Math.random().toString(36).substr(2, 9),
            roles: username === 'admin' ? ['ADMIN', 'USER'] : ['USER'],
            permissions: username === 'admin' 
              ? ['READ', 'WRITE', 'DELETE', 'ADMIN'] 
              : ['READ', 'WRITE']
          };
          this.setUser(user, rememberMe);
          return user;
        }
        throw new Error('Usuario o contraseña incorrectos');
      }),
      catchError(error => {
        return throwError(() => error);
      })
    );
  }

  private setUser(user: User, rememberMe: boolean): void {
    // Siempre guardar en sessionStorage para la sesión actual
    sessionStorage.setItem('currentUser', JSON.stringify(user));
    
    // Si rememberMe está activo, también guardar en localStorage para persistir
    if (rememberMe) {
      localStorage.setItem('currentUser', JSON.stringify(user));
    }
    this.currentUserSubject.next(user);
  }

  logout(): void {
    // Eliminar usuario del almacenamiento
    localStorage.removeItem('currentUser');
    sessionStorage.removeItem('currentUser');
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
