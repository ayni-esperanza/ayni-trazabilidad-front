/**
 * Modelo de Firma para informes y documentos
 */
export interface Firma {
  id: number;
  nombre: string;
  cargo?: string;
  imagenBase64: string; // Imagen de la firma en base64
  fechaCreacion: Date;
  activo: boolean;
  usuarioId?: number;
}

export interface FirmaRequest {
  nombre: string;
  cargo?: string;
  imagenBase64: string;
}

export interface FirmaResponse {
  firma: Firma;
  mensaje: string;
}
