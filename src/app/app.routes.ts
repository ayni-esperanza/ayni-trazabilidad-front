import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { noAuthGuard } from './core/guards/no-auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/tablero-control',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(
        (m) => m.LoginComponent,
      ),
    title: 'Iniciar Sesión - AYNI Trazabilidad',
    canActivate: [noAuthGuard],
  },
  {
    path: 'tablero-control',
    loadComponent: () =>
      import('./features/tablero-control/tablero-control.component').then(
        (m) => m.TableroControlComponent,
      ),
    title: 'Módulo de Trazabilidad',
    canActivate: [authGuard],
  },
  {
    path: 'registro-solicitudes',
    loadComponent: () =>
      import('./features/registro-solicitudes/registro-solicitudes.component').then(
        (m) => m.RegistroSolicitudesComponent,
      ),
    title: 'Módulo de Trazabilidad',
    canActivate: [authGuard],
  },
  {
    path: 'asignacion-tareas',
    loadComponent: () =>
      import('./features/asignacion-tareas/asignacion-tareas.component').then(
        (m) => m.AsignacionTareasComponent,
      ),
    title: 'Módulo de Trazabilidad',
    canActivate: [authGuard],
  },
  {
    path: 'informes-evidencias',
    loadComponent: () =>
      import('./features/informes-evidencias/informes-evidencias.component').then(
        (m) => m.InformesEvidenciasComponent,
      ),
    title: 'Módulo de Trazabilidad',
    canActivate: [authGuard],
  },
  {
    path: 'estadisticas-indicadores',
    loadComponent: () =>
      import('./features/estadisticas-indicadores/estadisticas-indicadores.component').then(
        (m) => m.EstadisticasIndicadoresComponent,
      ),
    title: 'Módulo de Trazabilidad',
    canActivate: [authGuard],
  },
  {
    path: 'gestion-usuarios',
    loadComponent: () =>
      import('./features/gestion-usuarios/gestion-usuarios.component').then(
        (m) => m.GestionUsuariosComponent,
      ),
    title: 'Módulo de Trazabilidad',
    canActivate: [authGuard],
  },
  {
    path: 'configuracion-procesos',
    loadComponent: () =>
      import('./features/configuracion-procesos/configuracion-procesos.component').then(
        (m) => m.ConfiguracionProcesosComponent,
      ),
    title: 'Módulo de Trazabilidad',
    canActivate: [authGuard],
  },
  {
    path: '**',
    redirectTo: '/login',
  },
];
