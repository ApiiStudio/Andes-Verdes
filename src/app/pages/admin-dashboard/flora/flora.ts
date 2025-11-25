import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';

interface FloraItem {
  id?: any;
  titulo: string;
  nombre: string;
}

@Component({
  selector: 'app-flora-admin',
  template: `
    <div class="flora-admin">
      <h2>Flora - Administración</h2>
      <p class="muted">Gestiona plantas: agrega nombre y título.</p>

      <div class="species-form">
        <input placeholder="Título" [(ngModel)]="titulo" />
        <input placeholder="Nombre" [(ngModel)]="nombre" />
        <button class="add-btn" (click)="save()">
          {{ editing !== null ? 'Guardar' : 'Agregar' }}
        </button>
        <button class="btn" *ngIf="editing !== null" (click)="cancel()">Cancelar</button>
      </div>

      <ul class="species-list">
        <li *ngFor="let s of plants; let i = index">
          <div>
            <strong>{{ s.titulo }}</strong>
            <div class="muted">{{ s.nombre }}</div>
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
  plants: FloraItem[] = [];
  titulo = '';
  nombre = '';
  editing: number | null = null;

  constructor(private api: ApiService) {
    this.load();
  }

  load() {
    this.api.getFloras().subscribe({
      next: (data) => {
        if (Array.isArray(data)) {
          this.plants = data;
          localStorage.setItem('av_flora', JSON.stringify(this.plants));
        } else {
          this.loadFromStorage();
        }
      },
      error: () => this.loadFromStorage()
    });
  }

  private loadFromStorage() {
    const s = localStorage.getItem('av_flora');
    if (s) this.plants = JSON.parse(s);
  }

  save() {
    if (!this.titulo) return alert('Ingrese título');
    if (!this.nombre) return alert('Ingrese nombre');

    const payload = {
      titulo: this.titulo,
      nombre: this.nombre
    };

    if (this.editing !== null) {
      const id = this.plants[this.editing]?.id;

      this.api.updateFloras(id, payload).subscribe({
        next: () => {
          this.plants[this.editing!] = { ...payload, id };
          this.reset();
        },
        error: () => {
          this.plants[this.editing!] = { ...payload, id };
          this.reset();
        }
      });

    } else {
      this.api.createFloras(payload).subscribe({
        next: (created: any) => {
          this.plants.unshift({ ...payload, id: created?.id });
          this.reset();
        },
        error: () => {
          this.plants.unshift(payload);
          this.reset();
        }
      });
    }
  }

  edit(s: FloraItem, i: number) {
    this.titulo = s.titulo;
    this.nombre = s.nombre;
    this.editing = i;
  }

  cancel() {
    this.reset();
  }

  reset() {
    this.titulo = '';
    this.nombre = '';
    this.editing = null;
    localStorage.setItem('av_flora', JSON.stringify(this.plants));
  }

  remove(i: number) {
    if (!confirm('Eliminar planta?')) return;
    const id = this.plants[i]?.id;

    if (id) {
      this.api.deleteFloras(id).subscribe({
        next: () => {
          this.plants.splice(i, 1);
          this.reset();
        },
        error: () => {
          this.plants.splice(i, 1);
          this.reset();
        }
      });
    } else {
      this.plants.splice(i, 1);
      this.reset();
    }
  }
}
