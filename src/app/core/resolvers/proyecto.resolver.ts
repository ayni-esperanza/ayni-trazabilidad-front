import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { catchError, of } from 'rxjs';
import { Proyecto } from '../../features/registro-solicitudes/models/solicitud.model';
import { RegistroSolicitudesService } from '../../features/registro-solicitudes/services/registro-solicitudes.service';

/** Carga el detalle antes de activar la ruta con el ID del proyecto. */
export const proyectoResolver: ResolveFn<Proyecto | null> = (route: ActivatedRouteSnapshot) => {
  const proyectoId = Number(route.paramMap.get('proyectoId'));

  if (!Number.isFinite(proyectoId) || proyectoId <= 0) {
    return of(null);
  }

  return inject(RegistroSolicitudesService).obtenerProyectoPorId(proyectoId).pipe(
    catchError((error) => {
      console.error('Error al cargar el proyecto desde la ruta:', error);
      return of(null);
    })
  );
};
