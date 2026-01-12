export interface Solicitud {
  id: number;
  titulo: string;
  descripcion: string;
  solicitante: string;
  fechaSolicitud: Date;
  prioridad: 'Alta' | 'Media' | 'Baja';
  estado: 'Pendiente' | 'En revisión' | 'Aprobada' | 'Rechazada';
  categoria: string;
  observaciones?: string;
}

export interface FiltroBusquedaSolicitud {
  estado?: string;
  prioridad?: string;
  fechaDesde?: Date;
  fechaHasta?: Date;
  solicitante?: string;
}
