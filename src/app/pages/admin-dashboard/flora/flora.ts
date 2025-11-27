import { Component, OnInit, OnDestroy } from '@angular/core';
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
  editingIndex: number | null = null;
  editingId: any = null;

  constructor(private api: ApiService) {
    this.load();
  }

  ngOnInit(): void {
    (window as any).addEventListener('admin-search', this._onAdminSearch as EventListener);
  }

  private _onAdminSearch = (e: any) => {
    const term = (e?.detail?.term || '').toString().trim().toLowerCase();
    this.filterText = term;
    this.applyFilter();
  };

  ngOnDestroy(): void {
    try { (window as any).removeEventListener('admin-search', this._onAdminSearch as EventListener); } catch {}
  }

  applyFilter() {
    const v = (this.filterText || '').toLowerCase().trim();
    this.filteredSpecies = !v ? this.species.slice() : this.species.filter(s => {
      return (s.titulo || '').toLowerCase().includes(v) || (s.nombre || '').toLowerCase().includes(v);
    });
  }

  load() {
    this.api.getFloras().subscribe({
      next: (data: any[]) => {
        this.species = data.map(f => ({
          id: f.id,
          titulo: f.titulo || '',
          nombre: f.nombre || ''
        }));
        this.applyFilter();
      }
    });
  }

  save() {
    const item = { titulo: this.titulo, nombre: this.nombre };

    if (this.editingIndex !== null && this.editingId) {
      this.api.updateFloras(this.editingId, item).subscribe({
        next: (res: any) => {
          this.species[this.editingIndex!] = {
            ...res,
            id: this.editingId
          };
          this.cancel();
        }
      });
    } else {
      this.api.createFloras(item).subscribe({
        next: (created: any) => {
          this.species.unshift({
            ...created,
            id: created?.id
          });
          this.cancel();
        }
      });
    }
  }

  edit(f: FloraItem, i: number) {
    this.titulo = f.titulo;
    this.nombre = f.nombre;
    this.editingIndex = i;
    this.editingId = f.id;
  }

  cancel() {
    this.titulo = '';
    this.nombre = '';
    this.editingIndex = null;
    this.editingId = null;
  }

  remove(i: number) {
    const item = this.species[i];
    if (item && item.id) {
      this.api.deleteFloras(item.id).subscribe({
        next: () => this.species.splice(i, 1)
      });
    } else {
      this.species.splice(i, 1);
    }
  }
}