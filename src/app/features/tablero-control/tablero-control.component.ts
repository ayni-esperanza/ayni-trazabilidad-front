import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableroControlService } from './services/tablero-control.service';

@Component({
  selector: 'app-tablero-control',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tablero-control.component.html',
  styleUrls: ['./tablero-control.component.css']
})
export class TableroControlComponent implements OnInit {
  
  constructor(private tableroService: TableroControlService) {}

  ngOnInit(): void {
    // Inicialización del componente
  }
}
