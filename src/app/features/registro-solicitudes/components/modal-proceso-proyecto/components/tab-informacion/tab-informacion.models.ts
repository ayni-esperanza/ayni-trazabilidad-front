import { ComentarioAdicionalActividad, OrdenCompra } from '../../../../models/solicitud.model';

export type ProyectoInfoFormData = {
  nombreProyecto: string;
  cliente: string;
  representante: string;
  areas: string[];
  ordenesCompra: OrdenCompra[];
  comentariosAdicionalesActividad: ComentarioAdicionalActividad[];
  costo: number;
  procesoId: number;
  responsableId: number;
  fechaInicio: string;
  fechaFinalizacion: string;
  ubicacion: string;
  descripcion: string;
};
