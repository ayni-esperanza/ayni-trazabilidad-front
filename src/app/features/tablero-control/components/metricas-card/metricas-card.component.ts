import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FiltroMonedaDashboard } from '../../models/tablero.model';

@Component({
  selector: 'app-metricas-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './metricas-card.component.html',
  styleUrls: ['./metricas-card.component.css']
})
export class MetricasCardComponent {
  @Input() proyectosFinalizados: number = 0;
  @Input() proyectosActivos: number = 0;
  @Input() gastosMes: number = 0;
  @Input() gastosHoy: number = 0;
  @Input() gastosAyer: number = 0;
  @Input() gastosMesUSD: number | null = null;
  @Input() gastosHoyUSD: number | null = null;
  @Input() gastosAyerUSD: number | null = null;
  @Input() moneda: FiltroMonedaDashboard = 'PEN';
  @Input() metricaSeleccionada: 'finalizados' | 'activos' | 'gastos' = 'activos';
  
  @Output() metricaSeleccionadaChange = new EventEmitter<'finalizados' | 'activos' | 'gastos'>();
  
  seleccionarMetrica(metrica: 'finalizados' | 'activos' | 'gastos'): void {
    this.metricaSeleccionadaChange.emit(metrica);
  }
  
  formatearMoneda(valor: number, moneda = this.moneda): string {
    const simbolo = moneda === 'USD' ? '$' : 'S/';
    if (valor >= 1000) {
      return simbolo + ' ' + (valor / 1000).toFixed(1) + 'k';
    }
    return simbolo + ' ' + valor.toFixed(0);
  }
}
