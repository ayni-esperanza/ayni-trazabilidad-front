import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface PaginacionConfig {
  paginaActual: number;
  porPagina: number;
  totalElementos: number;
  totalPaginas: number;
}

export interface CambioPaginaEvent {
  pagina: number;
  porPagina: number;
}

@Component({
  selector: 'app-paginacion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './paginacion.component.html'
})
export class PaginacionComponent {
  
  @Input() config: PaginacionConfig = {
    paginaActual: 0,
    porPagina: 100,
    totalElementos: 0,
    totalPaginas: 0
  };
  
  @Input() opcionesPorPagina: number[] = [100, 200, 500, 1000];
  @Input() mostrarInfo = true;
  @Input() mostrarSelector = true;
  @Input() mostrarNavegacion = true;
  
  @Output() cambioPagina = new EventEmitter<CambioPaginaEvent>();
  @Output() cambioTamano = new EventEmitter<number>();
  
  get inicioRegistros(): number {
    if (this.config.totalElementos === 0) return 0;
    return this.config.paginaActual * this.config.porPagina + 1;
  }
  
  get finRegistros(): number {
    const fin = (this.config.paginaActual + 1) * this.config.porPagina;
    return Math.min(fin, this.config.totalElementos);
  }
  
  get puedeRetroceder(): boolean {
    return this.config.paginaActual > 0;
  }
  
  get puedeAvanzar(): boolean {
    return this.config.paginaActual < this.config.totalPaginas - 1;
  }
  
  onCambioTamano(): void {
    this.cambioTamano.emit(this.config.porPagina);
    this.cambioPagina.emit({
      pagina: 0,
      porPagina: this.config.porPagina
    });
  }
  
  paginaAnterior(): void {
    if (this.puedeRetroceder) {
      this.cambioPagina.emit({
        pagina: this.config.paginaActual - 1,
        porPagina: this.config.porPagina
      });
    }
  }
  
  paginaSiguiente(): void {
    if (this.puedeAvanzar) {
      this.cambioPagina.emit({
        pagina: this.config.paginaActual + 1,
        porPagina: this.config.porPagina
      });
    }
  }
  
  irAPagina(pagina: number): void {
    if (pagina >= 0 && pagina < this.config.totalPaginas) {
      this.cambioPagina.emit({
        pagina,
        porPagina: this.config.porPagina
      });
    }
  }
  
  primeraPagina(): void {
    this.irAPagina(0);
  }
  
  ultimaPagina(): void {
    this.irAPagina(this.config.totalPaginas - 1);
  }
}
