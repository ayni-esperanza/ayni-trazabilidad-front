import { FlujoAdjunto } from '../../../models/solicitud.model';

export type DocumentoResumen = {
  actividad: string;
  origen: string;
  nombre: string;
  tipo: string;
  adjunto: FlujoAdjunto;
};
