import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { noAuthGuard } from './core/guards/no-auth.guard';
import { submoduleLockGuard } from './core/guards/submodule-lock.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/registro-solicitudes',
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
    path: 'loading',
    loadComponent: () =>
      import('./shared/components/loading-screen/loading-screen.component').then(
        (m) => m.LoadingScreenComponent,
      ),
    title: 'Cargando - AYNI Trazabilidad',
  },
  {
    path: 'tablero-control',
    loadComponent: () =>
      import('./features/tablero-control/tablero-control.component').then(
        (m) => m.TableroControlComponent,
      ),
    title: 'Módulo de Trazabilidad',
    canActivate: [authGuard, submoduleLockGuard],
    data: { moduleLabel: 'Tablero de control' },
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
    path: 'informes-evidencias',
    loadComponent: () =>
      import('./features/informes-evidencias/informes-evidencias.component').then(
        (m) => m.InformesEvidenciasComponent,
      ),
    title: 'Módulo de Trazabilidad',
    canActivate: [authGuard, submoduleLockGuard],
    data: { moduleLabel: 'Informes y evidencias' },
  },
  {
    path: 'estadisticas-indicadores',
    loadComponent: () =>
      import('./features/estadisticas-indicadores/estadisticas-indicadores.component').then(
        (m) => m.EstadisticasIndicadoresComponent,
      ),
    title: 'Módulo de Trazabilidad',
    canActivate: [authGuard, submoduleLockGuard],
    data: { moduleLabel: 'Estadisticas e indicadores' },
  },
  {
    path: 'alertas',
    loadComponent: () =>
      import('./features/alertas/alertas.component').then(
        (m) => m.AlertasComponent,
      ),
    title: 'Alertas - AYNI Trazabilidad',
    canActivate: [authGuard, submoduleLockGuard],
    data: { moduleLabel: 'Alertas' },
  },
  {
    path: 'gestion-usuarios',
    loadComponent: () =>
      import('./features/gestion-usuarios/gestion-usuarios.component').then(
        (m) => m.GestionUsuariosComponent,
      ),
    title: 'Módulo de Trazabilidad',
    canActivate: [authGuard, submoduleLockGuard],
    data: { moduleLabel: 'Gestion de usuarios' },
  },
  {
    path: 'submodulo-en-construccion',
    loadComponent: () =>
      import('./features/submodulo-construccion/submodulo-construccion.component').then(
        (m) => m.SubmoduloConstruccionComponent,
      ),
    title: 'Submodulo en construccion - AYNI Trazabilidad',
    canActivate: [authGuard],
  },
  {
    path: '**',
    redirectTo: '/login',
  },
];
