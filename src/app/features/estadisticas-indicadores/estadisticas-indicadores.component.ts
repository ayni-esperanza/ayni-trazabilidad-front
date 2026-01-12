import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EstadisticasIndicadoresService } from './services/estadisticas-indicadores.service';

@Component({
  selector: 'app-estadisticas-indicadores',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './estadisticas-indicadores.component.html',
  styleUrls: ['./estadisticas-indicadores.component.css']
})
export class EstadisticasIndicadoresComponent implements OnInit {
  
  constructor(private estadisticasService: EstadisticasIndicadoresService) {}

  ngOnInit(): void {
    // Inicialización del componente
  }
}
