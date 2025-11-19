import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';

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
  species: Array<{ id?: any; name: string; description: string }> = [];
  name = '';
  description = '';
  editing: number | null = null;

  constructor(private api: ApiService) {
    this.load();
  }

  load() {
    // try backend first
    this.api.getFaunas().subscribe({
      next: (data: any) => {
        if (Array.isArray(data)) {
          this.species = data;
          this.saveToStorage();
        } else {
          this.loadFromStorage();
        }
      },
      error: (_err: any) => {
        this.loadFromStorage();
      }
    });
  }

  private loadFromStorage() {
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
      const id = this.editing;
      this.api.updateFaunas(id, item).subscribe({
        next: (res: any) => {
          this.species[id] = res || item;
          this.editing = null;
          this.name = '';
          this.description = '';
          this.saveToStorage();
        },
        error: () => {
          this.species[id] = item;
          this.editing = null;
          this.name = '';
          this.description = '';
          this.saveToStorage();
        }
      });
    } else {
      this.api.createFaunas(item).subscribe({
        next: (created: any) => {
          this.species.unshift(created || item);
          this.name = '';
          this.description = '';
          this.saveToStorage();
        },
        error: () => {
          this.species.unshift(item);
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
    if (!confirm('Eliminar especie?')) return;
    const id = this.species[i]?.id ?? i;
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
  }
}
