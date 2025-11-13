import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-fauna-admin',
  template: `
    <div class="fauna-admin">
      <h2>Fauna - Administración</h2>
      <p class="muted">Gestiona especies: agrega nombre y descripción.</p>

      <div class="species-form">
        <input placeholder="Nombre especie" [(ngModel)]="name" />
        <input placeholder="Descripción" [(ngModel)]="description" />
        <button class="add-btn" (click)="save()">{{ editing ? 'Guardar' : 'Agregar' }}</button>
        <button class="btn" *ngIf="editing" (click)="cancel()">Cancelar</button>
      </div>

      <ul class="species-list">
        <li *ngFor="let s of species; let i = index">
          <div>
            <strong>{{ s.name }}</strong>
            <div class="muted">{{ s.description }}</div>
          </div>
          <div class="actions">
            <button class="btn" (click)="edit(s, i)">Editar</button>
            <button class="btn danger" (click)="remove(i)">Eliminar</button>
          </div>
        </li>
      </ul>
    </div>
  `,
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class Fauna {
  species: Array<{ name: string; description: string }> = [];
  name = '';
  description = '';
  editing: number | null = null;

  constructor() {
    this.load();
  }

  load() {
    const s = localStorage.getItem('av_fauna');
    if (s) {
      try {
        this.species = JSON.parse(s);
      } catch (e) {
        this.species = [];
      }
    }
  }

  saveToStorage() {
    localStorage.setItem('av_fauna', JSON.stringify(this.species));
  }

  save() {
    if (!this.name) return alert('Ingrese nombre');
    const item = { name: this.name, description: this.description };
    if (this.editing != null) {
      this.species[this.editing] = item;
      this.editing = null;
    } else {
      this.species.unshift(item);
    }
    this.name = '';
    this.description = '';
    this.saveToStorage();
  }

  edit(s: any, i: number) {
    this.name = s.name;
    this.description = s.description;
    this.editing = i;
  }

  cancel() {
    this.editing = null;
    this.name = '';
    this.description = '';
  }

  remove(i: number) {
    if (!confirm('Eliminar especie?')) return;
    this.species.splice(i, 1);
    this.saveToStorage();
  }
}
