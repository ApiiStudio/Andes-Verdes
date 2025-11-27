import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';

interface FaunaItem {
  id: any;
  titulo: string;
  nombre: string;
}

@Component({
  selector: 'app-fauna-admin',
  templateUrl: './fauna.html',
  styleUrls: ['./fauna.css'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class Fauna implements OnInit, OnDestroy {
  species: FaunaItem[] = [];
  filteredSpecies: FaunaItem[] = [];

  filterText = '';
  titulo = '';
  nombre = '';

  editingId: any = null;

  constructor(private api: ApiService) {
    this.load();
  }

  ngOnInit(): void {
    (window as any).addEventListener(
      'admin-search',
      this._onAdminSearch as EventListener
    );
  }

  ngOnDestroy(): void {
    try {
      (window as any).removeEventListener(
        'admin-search',
        this._onAdminSearch as EventListener
      );
    } catch {}
  }

  private _onAdminSearch = (e: any) => {
    const term = (e?.detail?.term || '').toLowerCase().trim();
    this.filterText = term;
    this.applyFilter();
  };

  applyFilter() {
    const v = this.filterText.toLowerCase();
    this.filteredSpecies = !v
      ? [...this.species]
      : this.species.filter(s =>
          s.titulo.toLowerCase().includes(v) ||
          s.nombre.toLowerCase().includes(v)
        );
  }

  load() {
    this.api.getFaunas().subscribe({
      next: (data: any[]) => {
        this.species = data.map(f => ({
          id: f.id_fauna,
          titulo: f.titulo ?? '',
          nombre: f.nombre ?? ''
        }));
        this.applyFilter();
      }
    });
  }

  save() {
    const payload = {
      titulo: this.titulo,
      nombre: this.nombre
    };

    if (this.editingId !== null) {
      this.api.updateFaunas(this.editingId, payload).subscribe({
        next: (updated: any) => {
          const idx = this.species.findIndex(s => s.id === this.editingId);
          if (idx !== -1) {
            this.species[idx] = updated;
          }
          this.cancel();
          this.applyFilter();
        }
      });
    } else {
      this.api.createFaunas(payload).subscribe({
        next: (created: any) => {
          this.species.unshift(created);
          this.cancel();
          this.applyFilter();
        }
      });
    }
  }

  edit(f: FaunaItem) {
    this.titulo = f.titulo;
    this.nombre = f.nombre;
    this.editingId = f.id;
  }

  cancel() {
    this.titulo = '';
    this.nombre = '';
    this.editingId = null;
  }

  remove(f: FaunaItem) {
    if (!f?.id) return;

    this.api.deleteFaunas(f.id).subscribe({
      next: () => {
        this.species = this.species.filter(s => s.id !== f.id);
        this.applyFilter();
      }
    });
  }
}
