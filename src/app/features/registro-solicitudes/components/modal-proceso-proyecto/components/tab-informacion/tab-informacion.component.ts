import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FlujoNodo, ProcesoSimple, Proyecto, Responsable } from '../../../../models/solicitud.model';
import { DocumentoResumen } from '../../models/documento-resumen.model';
import { DescripcionCardComponent } from './components/descripcion-card/descripcion-card.component';
import { IdentificacionCardComponent } from './components/identificacion-card/identificacion-card.component';
import { OrdenesCompraCardComponent } from './components/ordenes-compra-card/ordenes-compra-card.component';
import { ProyectoInfoFormData } from './tab-informacion.models';

@Component({
  selector: 'app-tab-informacion',
  standalone: true,
  imports: [CommonModule, IdentificacionCardComponent, OrdenesCompraCardComponent, DescripcionCardComponent],
  templateUrl: './tab-informacion.component.html'
})
export class TabInformacionComponent {
  @Input() proyecto: Proyecto | null = null;
  @Input() proyectoInfoForm!: ProyectoInfoFormData;
  @Input() flujoNodos: FlujoNodo[] = [];
  @Input() responsables: Responsable[] = [];
  @Input() procesos: ProcesoSimple[] = [];
  @Input() modoSoloLectura = false;
  @Input() proyectoFinalizado = false;
  @Input() proyectoCancelado = false;

  @Output() abrirVistaPreviaDocumentoEvt = new EventEmitter<DocumentoResumen>();
}
