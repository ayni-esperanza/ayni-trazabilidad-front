import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AsignacionTareasService } from './services/asignacion-tareas.service';

@Component({
  selector: 'app-asignacion-tareas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './asignacion-tareas.component.html',
  styleUrls: ['./asignacion-tareas.component.css']
})
export class AsignacionTareasComponent implements OnInit {
  
  constructor(private tareasService: AsignacionTareasService) {}

  ngOnInit(): void {
    // Inicialización del componente
  }
}
