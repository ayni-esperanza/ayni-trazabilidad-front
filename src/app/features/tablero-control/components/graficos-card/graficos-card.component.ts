import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxChartsModule, Color } from '@swimlane/ngx-charts';
import { DatoGrafico } from '../../models/tablero.model';

@Component({
  selector: 'app-graficos-card',
  standalone: true,
  imports: [CommonModule, NgxChartsModule],
  templateUrl: './graficos-card.component.html',
  styleUrls: ['./graficos-card.component.css']
})
export class GraficosCardComponent {
  @Input() tituloGrafico: string = '';
  @Input() tipoGrafico: 'barras' | 'linea' | 'pie' = 'barras';
  @Input() datosGrafico: DatoGrafico[] = [];
  @Input() datosPieChart: DatoGrafico[] = [];
  @Input() colorScheme!: Color;
  @Input() customColors: any = { domain: [] };
  @Input() graficosListos: boolean = false;
  
  @Output() tipoGraficoChange = new EventEmitter<'barras' | 'linea' | 'pie'>();
  @Output() selectGrafico = new EventEmitter<any>();
  
  cambiarTipoGrafico(tipo: 'barras' | 'linea' | 'pie'): void {
    this.tipoGraficoChange.emit(tipo);
  }
  
  onSelectGrafico(event: any): void {
    this.selectGrafico.emit(event);
  }
}
