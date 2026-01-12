export interface ProyectoEnCurso {
  id: number;
  proyecto: string;
  responsable: string;
  etapa: string;
  inicio: string;
  fin: string;
  estado: 'En progreso' | 'Completado' | 'Pendiente';
}

export interface TareaEncargado {
  id: number;
  responsable: string;
  tarea: string;
  proyecto: string;
  etapa: string;
  inicio: string;
  fin: string;
  estado: 'En progreso' | 'Completado' | 'Pendiente';
}

export interface MetricaProyecto {
  total: number;
  tendencia: number[];
  periodo: string;
}

export interface Gastos {
  hoy: number;
  mes: number;
  ayer: number;
}
