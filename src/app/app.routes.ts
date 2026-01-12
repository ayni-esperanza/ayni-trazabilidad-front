import { Routes } from '@angular/router';
import { TableroControlComponent } from './features/tablero-control/tablero-control.component';
import { RegistroSolicitudesComponent } from './features/registro-solicitudes/registro-solicitudes.component';
import { AsignacionTareasComponent } from './features/asignacion-tareas/asignacion-tareas.component';
import { InformesEvidenciasComponent } from './features/informes-evidencias/informes-evidencias.component';
import { EstadisticasIndicadoresComponent } from './features/estadisticas-indicadores/estadisticas-indicadores.component';
import { GestionUsuariosComponent } from './features/gestion-usuarios/gestion-usuarios.component';
import { ConfiguracionProcesosComponent } from './features/configuracion-procesos/configuracion-procesos.component';

export const routes: Routes = [
  { 
    path: '', 
    redirectTo: '/tablero-control', 
    pathMatch: 'full' 
  },
  {
    path: 'tablero-control',
    component: TableroControlComponent,
    title: 'Tablero de Control'
  },
  {
    path: 'registro-solicitudes',
    component: RegistroSolicitudesComponent,
    title: 'Registro de Solicitudes'
  },
  {
    path: 'asignacion-tareas',
    component: AsignacionTareasComponent,
    title: 'Asignación de Tareas'
  },
  {
    path: 'informes-evidencias',
    component: InformesEvidenciasComponent,
    title: 'Informes y Evidencias'
  },
  {
    path: 'estadisticas-indicadores',
    component: EstadisticasIndicadoresComponent,
    title: 'Estadísticas e Indicadores'
  },
  {
    path: 'gestion-usuarios',
    component: GestionUsuariosComponent,
    title: 'Gestión de Usuarios'
  },
  {
    path: 'configuracion-procesos',
    component: ConfiguracionProcesosComponent,
    title: 'Configuración de Procesos'
  },
  {
    path: '**',
    redirectTo: '/tablero-control'
  }
];
