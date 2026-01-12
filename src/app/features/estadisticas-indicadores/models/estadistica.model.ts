export interface KPI {
  id: number;
  nombre: string;
  valor: number;
  unidad: string;
  tendencia: 'positiva' | 'negativa' | 'neutral';
  variacion: number;
  periodo: string;
  meta?: number;
}

export interface Indicador {
  id: number;
  nombre: string;
  descripcion: string;
  categoria: string;
  valor: number;
  fechaCalculo: Date;
  parametros?: any;
}

export interface DatosGrafico {
  labels: string[];
  datasets: DatasetGrafico[];
}

export interface DatasetGrafico {
  label: string;
  data: number[];
  backgroundColor?: string;
  borderColor?: string;
}

export interface TendenciaProyecto {
  proyectoId: number;
  proyectoNombre: string;
  avance: number[];
  fechas: Date[];
}

export interface RendimientoEquipo {
  equipoId: number;
  equipoNombre: string;
  tareasCompletadas: number;
  tareasEnProgreso: number;
  tareasPendientes: number;
  eficiencia: number;
}
