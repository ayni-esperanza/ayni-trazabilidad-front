import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfiguracionProcesosService } from './services/configuracion-procesos.service';

@Component({
  selector: 'app-configuracion-procesos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './configuracion-procesos.component.html',
  styleUrls: ['./configuracion-procesos.component.css']
})
export class ConfiguracionProcesosComponent implements OnInit {
  
  constructor(private procesosService: ConfiguracionProcesosService) {}

  ngOnInit(): void {
    // Inicialización del componente
  }
}
