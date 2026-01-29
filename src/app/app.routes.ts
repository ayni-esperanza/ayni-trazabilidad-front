import { Routes } from '@angular/router';
import { TableroControlComponent } from './features/tablero-control/tablero-control.component';
import { RegistroSolicitudesComponent } from './features/registro-solicitudes/registro-solicitudes.component';
import { AsignacionTareasComponent } from './features/asignacion-tareas/asignacion-tareas.component';
import { InformesEvidenciasComponent } from './features/informes-evidencias/informes-evidencias.component';
import { EstadisticasIndicadoresComponent } from './features/estadisticas-indicadores/estadisticas-indicadores.component';
import { GestionUsuariosComponent } from './features/gestion-usuarios/gestion-usuarios.component';
import { ConfiguracionProcesosComponent } from './features/configuracion-procesos/configuracion-procesos.component';
import { LoginComponent } from './features/auth/login/login.component';
import { authGuard } from './core/guards/auth.guard';
import { noAuthGuard } from './core/guards/no-auth.guard';

export const routes: Routes = [
  { 
    path: '', 
    redirectTo: '/tablero-control', 
    pathMatch: 'full' 
  },
  {
    path: 'login',
    component: LoginComponent,
    title: 'Iniciar Sesión - AYNI Trazabilidad',
    canActivate: [noAuthGuard]
  },
  {
    path: 'tablero-control',
    component: TableroControlComponent,
    title: 'Módulo de Trazabilidad',
    canActivate: [authGuard]
  },
  {
    path: 'registro-solicitudes',
    component: RegistroSolicitudesComponent,
    title: 'Módulo de Trazabilidad',
    canActivate: [authGuard]
  },
  {
    path: 'asignacion-tareas',
    component: AsignacionTareasComponent,
    title: 'Módulo de Trazabilidad',
    canActivate: [authGuard]
  },
  {
    path: 'informes-evidencias',
    component: InformesEvidenciasComponent,
    title: 'Módulo de Trazabilidad',
    canActivate: [authGuard]
  },
  {
    path: 'estadisticas-indicadores',
    component: EstadisticasIndicadoresComponent,
    title: 'Módulo de Trazabilidad',
    canActivate: [authGuard]
  },
  {
    path: 'gestion-usuarios',
    component: GestionUsuariosComponent,
    title: 'Módulo de Trazabilidad',
    canActivate: [authGuard]
  },
  {
    path: 'configuracion-procesos',
    component: ConfiguracionProcesosComponent,
    title: 'Módulo de Trazabilidad',
    canActivate: [authGuard]
  },
  {
    path: '**',
    redirectTo: '/login'
  }
];
