import { DatoGrafico, GastoProyecto, MonedaDashboard, ProyectoEnCurso, TareaEncargado } from './tablero.model';

export type DashboardMetrica = 'activos' | 'finalizados' | 'gastos';

export interface DashboardFiltros {
  moneda?: MonedaDashboard;
  empresa?: string | null;
  lugar?: string | null;
  area?: string | null;
  estado?: string | null;
  fechaDesde?: string | null;
  fechaHasta?: string | null;
  mes?: number | null;
  metrica?: DashboardMetrica;
  proyectoId?: number | null;
  categoria?: string | null;
}

export interface DashboardPaginacion { page: number; size: 100 | 500 | 1000; }

export interface DashboardPagina<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

export interface DashboardResumen {
  proyectosActivos: number;
  proyectosFinalizados: number;
  gastosMes: number;
  gastosHoy: number;
  gastosAyer: number;
  datosProyectosActivos: DatoGrafico[];
  datosProyectosFinalizados: DatoGrafico[];
  datosGastos: DatoGrafico[];
}

export type DashboardTabla = ProyectoEnCurso | TareaEncargado | GastoProyecto;
