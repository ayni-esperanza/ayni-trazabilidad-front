import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PaginacionComponent } from '../../../../../../../../shared/components/paginacion/paginacion.component';
import { LinkifyPipe } from '../../../../../../../../shared/pipes/linkify.pipe';
import type { CambioPaginaEvent } from '../../../../../../../../shared/components/paginacion/paginacion.component';

@Component({
  selector: 'app-proceso-tabla',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginacionComponent, LinkifyPipe],
  templateUrl: './proceso-tabla.component.html',
  styleUrl: './proceso-tabla.component.css'
})
export class ProcesoTablaComponent {
  @Input({ required: true }) ctx!: any;

  get vistaFlujo(): 'timeline' | 'tabla' {
    return this.ctx.vistaFlujo;
  }

  get ordenRecientePrimero(): boolean {
    return this.ctx.ordenRecientePrimero;
  }

  get proyectoFinalizado(): boolean {
    return this.ctx.proyectoFinalizado;
  }

  get paginacionTablaFlujo() {
    return this.ctx.paginacionTablaFlujo;
  }

  get opcionesPorPaginaTablaFlujo() {
    return this.ctx.opcionesPorPaginaTablaFlujo;
  }

  cambiarVistaFlujo(vista: 'timeline' | 'tabla'): void {
    this.ctx.cambiarVistaFlujo(vista);
  }

  alternarOrdenFlujo(): void {
    this.ctx.alternarOrdenFlujo();
  }

  crearNuevaActividad(): void {
    this.ctx.crearNuevaActividad();
  }

  onCambioPaginaTablaFlujo(event: CambioPaginaEvent): void {
    this.ctx.onCambioPaginaTablaFlujo(event);
  }

  onCambioTamanoTablaFlujo(nuevoTamano: number): void {
    this.ctx.onCambioTamanoTablaFlujo(nuevoTamano);
  }

}
