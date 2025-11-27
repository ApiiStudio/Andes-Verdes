import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';

interface FloraItem {
  id_flora: number;
  titulo: string;
  nombre: string;
}

@Component({
  selector: 'app-flora-admin',
  templateUrl: './flora.html',
  styleUrls: ['./flora.css'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class Flora implements OnInit, OnDestroy {

  species: FloraItem[] = [];
  filteredSpecies: FloraItem[] = [];

  filterText = '';
  titulo = '';
  nombre = '';

  editingId: number | null = null;

  constructor(private api: ApiService) { }

  ngOnInit(): void {
    this.load();
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
    } catch { }
  }

  private _onAdminSearch = (e: any) => {
    const term = (e?.detail?.term || '').toString().trim().toLowerCase();
    this.filterText = term;
    this.applyFilter();
  };

  load() {
    this.api.getFloras().subscribe({
      next: (data: any[]) => {
        this.species = data.map(f => ({
          id_flora: f.id_flora,
          titulo: f.titulo ?? '',
          nombre: f.nombre ?? ''
        }));
        this.applyFilter();
      },
      error: err => console.error('LOAD failed', err)
    });
  }

  applyFilter() {
    const v = this.filterText.toLowerCase().trim();
    this.filteredSpecies = !v
      ? [...this.species]
      : this.species.filter(s =>
        s.titulo.toLowerCase().includes(v) ||
        s.nombre.toLowerCase().includes(v)
      );
  }

  save() {
    const payload = {
      titulo: this.titulo,
      nombre: this.nombre
    };

    if (this.editingId !== null) {
      this.api.updateFloras(this.editingId, payload).subscribe({
        next: (res: any) => {
          const idx = this.species.findIndex(
            s => s.id_flora === this.editingId
          );
          if (idx !== -1) {
            this.species[idx] = {
              id_flora: res.id_flora,
              titulo: res.titulo,
              nombre: res.nombre
            };
          }
          this.cancel();
          this.applyFilter();
        },
        error: err => console.error('UPDATE failed', err)
      });
      return;
    }

    this.api.createFloras(payload).subscribe({
      next: (created: any) => {
        if (!created?.id_flora) return;
        this.species.unshift({
          id_flora: created.id_flora,
          titulo: created.titulo,
          nombre: created.nombre
        });
        this.cancel();
        this.applyFilter();
      },
      error: err => console.error('CREATE failed', err)
    });
  }

  edit(f: FloraItem) {
    this.titulo = f.titulo;
    this.nombre = f.nombre;
    this.editingId = f.id_flora;
  }

  cancel() {
    this.titulo = '';
    this.nombre = '';
    this.editingId = null;
  }

  remove(f: FloraItem) {
    if (!f?.id_flora) return;

    this.api.deleteFloras(f.id_flora).subscribe({
      next: () => {
        this.species = this.species.filter(
          s => s.id_flora !== f.id_flora
        );
        this.applyFilter();
      },
      error: err => console.error('DELETE failed', err)
    });
  }
}
