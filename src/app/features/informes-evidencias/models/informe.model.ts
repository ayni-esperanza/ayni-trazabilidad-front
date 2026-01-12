export interface Informe {
  id: number;
  titulo: string;
  tipo: 'Proyecto' | 'Tarea' | 'Usuario' | 'General';
  fechaGeneracion: Date;
  generadoPor: string;
  formato: 'PDF' | 'Excel' | 'Word';
  parametros: any;
  url?: string;
}

export interface Evidencia {
  id: number;
  nombre: string;
  descripcion: string;
  tipo: string;
  tamaño: number;
  proyectoId: number;
  tareaId?: number;
  fechaCarga: Date;
  cargadoPor: string;
  url: string;
  extension: string;
}

export interface ParametrosInforme {
  tipo: string;
  fechaInicio?: Date;
  fechaFin?: Date;
  proyectoId?: number;
  usuarioId?: number;
  formato: 'PDF' | 'Excel' | 'Word';
}
