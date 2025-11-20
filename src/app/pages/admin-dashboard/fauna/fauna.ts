import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';

interface FaunaItem {
  id?: any;
  titulo: string;
  nombre: string;
}


@Component({
  selector: 'app-fauna-admin',
  template: `
    <div class="fauna-admin">
      <h2>Fauna - Administración</h2>
      <p class="muted">Gestiona especies: agrega nombre y descripción.</p>

      <div class="species-form">
        <input placeholder="titulo" [(ngModel)]="titulo" />
        <input placeholder="nombre" [(ngModel)]="subtitulo" />
        <button class="add-btn" (click)="save()">{{ editing !== null ? 'Guardar' : 'Agregar' }}</button>
        <button class="btn" *ngIf="editing !== null" (click)="cancel()">Cancelar</button>
      </div>

      <ul class="species-list">
        <li *ngFor="let s of species; let i = index">
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
export class Fauna {
  species: FaunaItem[] = [];
  titulo = '';
  subtitulo = '';
  editing: number | null = null;

  constructor(private api: ApiService) {
    this.load();
  }

  load() {
    this.api.getFaunas().subscribe({
      next: (data) => {
        if (Array.isArray(data)) {
          this.species = data;
          this.saveToStorage();
        } else {
          this.loadFromStorage();
        }
      },
      error: () => this.loadFromStorage()
    });
  }

  private loadFromStorage() {
    const s = localStorage.getItem('av_fauna');
    if (s) this.species = JSON.parse(s);
  }

  saveToStorage() {
    localStorage.setItem('av_fauna', JSON.stringify(this.species));
  }

  save() {
  if (!this.titulo) return alert('Ingrese título');

  const payload = {
  titulo: this.titulo,
  nombre: this.subtitulo  
};


  if (this.editing !== null) {
    const id = this.species[this.editing]?.id;

    this.api.updateFaunas(id, payload).subscribe({
      next: () => {
        this.species[this.editing!] = { ...payload, id };
        this.reset();
      },
      error: () => {
        this.species[this.editing!] = { ...payload, id };
        this.reset();
      }
    });

  } else {
    this.api.createFaunas(payload).subscribe({
      next: (created: any) => {
        this.species.unshift({ ...payload, id: created?.id });
        this.reset();
      },
      error: () => {
        this.species.unshift(payload);
        this.reset();
      }
    });
  }
}


  edit(s: FaunaItem, i: number) {
    this.titulo = s.titulo;
this.subtitulo = s.nombre;
    this.editing = i;
  }

  cancel() {
    this.reset();
  }

  reset() {
    this.titulo = '';
    this.subtitulo = '';
    this.editing = null;
    this.saveToStorage();
  }

  remove(i: number) {
    if (!confirm('Eliminar especie?')) return;

    const id = this.species[i]?.id;

    if (id) {
      this.api.deleteFaunas(id).subscribe({
        next: () => {
          this.species.splice(i, 1);
          this.saveToStorage();
        },
        error: () => {
          this.species.splice(i, 1);
          this.saveToStorage();
        }
      });
    } else {
      this.species.splice(i, 1);
      this.saveToStorage();
    }
  }
}

