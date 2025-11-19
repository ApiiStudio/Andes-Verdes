import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';

@Component({
  selector: 'app-flora-admin',
  template: `
    <div class="flora-admin">
      <h2>Flora - Administración</h2>
      <p class="muted">Gestiona plantas: agrega nombre y descripción.</p>

      <div class="species-form">
        <input placeholder="Nombre planta" [(ngModel)]="name" />
        <input placeholder="Descripción" [(ngModel)]="description" />
        <button class="add-btn" (click)="save()">{{ editing ? 'Guardar' : 'Agregar' }}</button>
        <button class="btn" *ngIf="editing" (click)="cancel()">Cancelar</button>
      </div>

      <ul class="species-list">
        <li *ngFor="let s of plants; let i = index">
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
export class Flora {
  plants: Array<{ id?: any; name: string; description: string }> = [];
  name = '';
  description = '';
  editing: number | null = null;

  constructor(private api: ApiService) {
    this.load();
  }

  load() {
    this.api.getFloras().subscribe({
      next: (data: any) => {
        if (Array.isArray(data)) {
          this.plants = data;
          this.saveToStorage();
        } else {
          this.loadFromStorage();
        }
      },
      error: () => this.loadFromStorage()
    });
  }

  private loadFromStorage() {
    const s = localStorage.getItem('av_flora');
    if (s) {
      try {
        this.plants = JSON.parse(s);
      } catch (e) {
        this.plants = [];
      }
    }
  }

  save() {
    if (!this.name) return alert('Ingrese nombre');
    const item = { name: this.name, description: this.description };
    if (this.editing != null) {
      const id = this.plants[this.editing]?.id ?? this.editing;
      this.api.updateFloras(id, item).subscribe({
        next: (res: any) => {
          this.plants[this.editing!] = res || item;
          this.editing = null;
          this.name = '';
          this.description = '';
          this.saveToStorage();
        },
        error: () => {
          this.plants[this.editing!] = item;
          this.editing = null;
          this.name = '';
          this.description = '';
          this.saveToStorage();
        }
      });
    } else {
      this.api.createFloras(item).subscribe({
        next: (created: any) => {
          this.plants.unshift(created || item);
          this.name = '';
          this.description = '';
          this.saveToStorage();
        },
        error: () => {
          this.plants.unshift(item);
          this.name = '';
          this.description = '';
          this.saveToStorage();
        }
      });
    }
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
    if (!confirm('Eliminar planta?')) return;
    const id = this.plants[i]?.id ?? i;
    this.api.deleteFloras(id).subscribe({
      next: () => {
        this.plants.splice(i, 1);
        this.saveToStorage();
      },
      error: () => {
        this.plants.splice(i, 1);
        this.saveToStorage();
      }
    });
  }

  saveToStorage() {
    localStorage.setItem('av_flora', JSON.stringify(this.plants));
  }
}