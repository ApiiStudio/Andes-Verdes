import { Component } from '@angular/core';

@Component({
  selector: 'app-parques-admin',
  template: `
    <div class="parques-admin">
      <h3>Gestión de Parques</h3>
      <p>Aquí podrás ver la lista de parques y acciones CRUD (crear/editar/borrar).</p>

      <!-- placeholder: reemplaza por tu tabla/listado real -->
      <button (click)="onCreate()" class="btn">Nuevo parque</button>

      <div class="empty">Lista de parques (implementa CRUD aquí)</div>
    </div>
  `
})
export class Parques {
  onCreate() {
    // muestra modal o navega a formulario de creación cuando lo implementes
    alert('Implementa creación de parque (form).');
  }
}