import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfiguracionProcesosService } from './services/configuracion-procesos.service';
import { ProcesoFormData, ProcesoFormModalComponent } from './components/proceso-form-modal/proceso-form-modal.component';

type ProcesoConfigurado = ProcesoFormData & { id: number };

@Component({
  selector: 'app-configuracion-procesos',
  standalone: true,
  imports: [CommonModule, ProcesoFormModalComponent],
  templateUrl: './configuracion-procesos.component.html',
  styleUrls: ['./configuracion-procesos.component.css']
})
export class ConfiguracionProcesosComponent implements OnInit {

  procesos: ProcesoConfigurado[] = [
    { id: 1, proceso: 'Ejemplo1', area: 'Ejemplo1', etapas: 1, flujo: ['Inicio', 'Inicio', 'Inicio', 'Inicio', 'Inicio'] },
    { id: 2, proceso: 'Ejemplo1', area: 'Ejemplo1', etapas: 1, flujo: ['Inicio', 'Inicio', 'Inicio'] },
    { id: 3, proceso: 'Ejemplo1', area: 'Ejemplo1', etapas: 1, flujo: ['Inicio', 'Inicio'] },
    { id: 4, proceso: 'Ejemplo1', area: 'Ejemplo1', etapas: 1, flujo: ['Inicio', 'Inicio'] },
    { id: 5, proceso: 'Ejemplo1', area: 'Ejemplo1', etapas: 1, flujo: ['Inicio', 'Inicio', 'Inicio', 'Inicio'] },
  ];

  mostrarModal = false;
  procesoSeleccionado: ProcesoConfigurado | null = null;
  
  constructor(
    private procesosService: ConfiguracionProcesosService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Inicialización del componente
  }

  abrirModalNuevoProceso(): void {
    this.procesoSeleccionado = null;
    this.mostrarModal = true;
    this.cdr.detectChanges();
  }

  seleccionarProceso(p: ProcesoConfigurado): void {
    this.procesoSeleccionado = p;
    this.mostrarModal = true;
    this.cdr.detectChanges();
  }

  cerrarModal(): void {
    this.mostrarModal = false;
    this.procesoSeleccionado = null;
    this.cdr.detectChanges();
  }

  onGuardarProceso(data: ProcesoFormData): void {
    if (data.id) {
      this.procesos = this.procesos.map((p) => (p.id === data.id ? ({ ...p, ...data } as ProcesoConfigurado) : p));
    } else {
      const maxId = this.procesos.reduce((acc, p) => Math.max(acc, p.id), 0);
      const nuevo: ProcesoConfigurado = { id: maxId + 1, ...data };
      this.procesos = [nuevo, ...this.procesos];
    }

    this.cerrarModal();
  }

  onEliminarProceso(id: number): void {
    this.procesos = this.procesos.filter((p) => p.id !== id);
    this.cerrarModal();
  }
}
