import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxChartsModule, Color } from '@swimlane/ngx-charts';
import { DatoGrafico, FiltroMonedaDashboard, MonedaDashboard, SerieGrafico } from '../../models/tablero.model';

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
  @Input() compararMonedas = false;
  @Input() datosComparativosBarras: SerieGrafico[] = [];
  @Input() datosComparativosLineas: SerieGrafico[] = [];
  @Input() datosComparativosPie: DatoGrafico[] = [];
  @Input() esGraficoGastos = false;
  @Input() moneda: FiltroMonedaDashboard = 'PEN';
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

  monedaTooltip(model: any): MonedaDashboard {
    const referencias = [model?.name, model?.series].map(valor => String(valor || '').toLowerCase());
    if (referencias.some(valor => valor === 'dólares' || valor === 'dolares' || valor === 'usd')) return 'USD';
    if (referencias.some(valor => valor === 'soles' || valor === 'pen')) return 'PEN';
    return this.moneda === 'USD' ? 'USD' : 'PEN';
  }

  simboloTooltip(model: any): 'S/' | '$' {
    return this.monedaTooltip(model) === 'USD' ? '$' : 'S/';
  }

  nombreMonedaTooltip(model: any): 'Soles' | 'Dólares' {
    return this.monedaTooltip(model) === 'USD' ? 'Dólares' : 'Soles';
  }

  periodoTooltip(model: any): string {
    const moneda = this.nombreMonedaTooltip(model).toLowerCase();
    const candidatos = [model?.name, model?.series]
      .map(valor => String(valor || '').trim())
      .filter(valor => valor && !['soles', 'pen', 'dólares', 'dolares', 'usd'].includes(valor.toLowerCase()));
    const periodo = candidatos.find(valor => !valor.toLowerCase().startsWith('gastos mensuales'));
    return periodo || (moneda === 'soles' ? 'Soles' : 'Dólares');
  }

  formatearMontoTooltip(valor: unknown): string {
    const monto = Number(valor || 0);
    return monto.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}
