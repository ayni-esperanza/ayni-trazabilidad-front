export interface Proceso {
  id: number;
  nombre: string;
  descripcion: string;
  categoria: string;
  activo: boolean;
  etapas: Etapa[];
  flujoTrabajo?: FlujoTrabajo;
}

export interface FlujoTrabajo {
  id: number;
  nombre: string;
  descripcion: string;
  pasos: PasoFlujo[];
  activo: boolean;
}

export interface PasoFlujo {
  id: number;
  orden: number;
  nombre: string;
  descripcion: string;
  responsable: string;
  tiempoEstimado: number;
  siguiente?: number;
}

export interface Plantilla {
  id: number;
  nombre: string;
  descripcion: string;
  tipo: 'Proyecto' | 'Tarea';
  contenido: any;
  etapas: Etapa[];
  activo: boolean;
}

export interface Etapa {
  id: number;
  nombre: string;
  descripcion: string;
  orden: number;
  color: string;
  activo: boolean;
  estados: Estado[];
}

export interface Estado {
  id: number;
  nombre: string;
  descripcion: string;
  tipo: 'Inicial' | 'En proceso' | 'Final';
  color: string;
}

export interface ConfiguracionNotificacion {
  id: number;
  evento: string;
  destinatarios: string[];
  plantillaMensaje: string;
  activo: boolean;
}
