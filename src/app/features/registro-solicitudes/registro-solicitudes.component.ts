import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RegistroSolicitudesService } from './services/registro-solicitudes.service';

@Component({
  selector: 'app-registro-solicitudes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './registro-solicitudes.component.html',
  styleUrls: ['./registro-solicitudes.component.css']
})
export class RegistroSolicitudesComponent implements OnInit {
  
  constructor(private solicitudesService: RegistroSolicitudesService) {}

  ngOnInit(): void {
    // Inicialización del componente
  }
}
