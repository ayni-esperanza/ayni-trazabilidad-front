import {
  Component, ElementRef, EventEmitter, Input,
  OnChanges, OnInit, Output, SimpleChanges, ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { GrupoDepartamento, ubicacionesAgrupadas } from '../../utils/ubicaciones-peru';

@Component({
  selector: 'app-ubicacion-select',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ubicacion-select.component.html'
})
export class UbicacionSelectComponent implements OnInit, OnChanges {
  @Input() value = '';
  @Output() valueChange = new EventEmitter<string>();
  @ViewChild('inputEl') inputEl!: ElementRef<HTMLInputElement>;

  searchText = '';
  isOpen = false;
  opcionesFiltradas: GrupoDepartamento[] = ubicacionesAgrupadas;

  dropdownTop = 0;
  dropdownLeft = 0;
  dropdownWidth = 0;

  ngOnInit() {
    this.searchText = this.value ?? '';
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['value']) this.searchText = this.value ?? '';
  }

  abrir() {
    const rect = this.inputEl.nativeElement.getBoundingClientRect();
    this.dropdownTop = rect.bottom + 2;
    this.dropdownLeft = rect.left;
    this.dropdownWidth = rect.width;
    this.searchText = '';
    this.filtrar('');
    this.isOpen = true;
  }

  cerrar() {
    // Delay para que el click en la opción se procese antes de cerrar
    setTimeout(() => {
      this.isOpen = false;
      this.searchText = this.value ?? '';
    }, 150);
  }

  filtrar(term: string) {
    const t = term.toLowerCase().trim();
    if (!t) {
      this.opcionesFiltradas = ubicacionesAgrupadas;
      return;
    }
    this.opcionesFiltradas = ubicacionesAgrupadas
      .map(g => ({
        departamento: g.departamento,
        provincias: g.provincias.filter(p => p.toLowerCase().includes(t))
      }))
      .filter(g => g.provincias.length > 0);
  }

  seleccionar(opcion: string) {
    this.value = opcion;
    this.searchText = opcion;
    this.valueChange.emit(opcion);
    this.isOpen = false;
  }

  limpiar(event: MouseEvent) {
    event.stopPropagation();
    this.value = '';
    this.searchText = '';
    this.valueChange.emit('');
  }
}
