import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';

interface ParqueItem {
  id: string;
  titulo: string;
  subtitulo: string;
}

@Component({
  selector: 'app-parques-admin',
  templateUrl: './parques.html',
  styleUrls: ['./parques.css'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class Parques implements OnInit {
  parks: ParqueItem[] = [];
  filteredParks: ParqueItem[] = [];
  filterText = '';

  editing: ParqueItem | null = null;
  editingIndex: number | null = null;
  title = '';
  subtitle = '';
  modalOpen = false;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadParks();
  }

  private loadParks() {
    this.api.getParks().subscribe({
      next: (data: any[]) => {
        this.parks = data.map((p, i) => ({
          id: p.id || 'srv_' + i,
          titulo: p.titulo || p.name || 'Parque',
          subtitulo: p.subtitulo || p.description || ''
        }));
        this.saveToStorage();
        this.applyFilter();
      },
      error: () => this.loadFromStorageOrGeojson()
    });
  }

  private loadFromStorageOrGeojson() {
    const saved = localStorage.getItem('av_parks');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.parks = parsed.map((p: any, i: number) => ({
          id: p.id || 'local_' + i,
          titulo: p.titulo || p.name || 'Parque',
          subtitulo: p.subtitulo || p.description || ''
        }));
        this.applyFilter();
        return;
      } catch {}
    }
    fetch('/parques-argentina.geojson')
      .then(r => r.json())
      .then(g => {
        const features = g.features || [];
        this.parks = features.slice(0, 25).map((f: any, i: number) => ({
          id: 'geo_' + i,
          titulo: f.properties?.name || 'Parque',
          subtitulo: f.properties?.description || ''
        }));
        this.saveToStorage();
        this.applyFilter();
      })
      .catch(() => (this.parks = []));
  }

  trackById(index: number, item: ParqueItem) {
    return item.id;
  }

  applyFilter() {
    const v = (this.filterText || '').toLowerCase().trim();
    this.filteredParks = !v
      ? this.parks.slice()
      : this.parks.filter(p => (p.titulo || '').toLowerCase().includes(v));
  }

  openCreate() {
    this.editing = null;
    this.editingIndex = null;
    this.clearForm();
    this.modalOpen = true;
  }

  closeModal() {
    this.modalOpen = false;
    this.cancelEdit();
  }

  saveFromModal() {
    if (!this.title) return alert('Ingrese un título');
    this.save();
  }

  save() {
    const item = { titulo: this.title, subtitulo: this.subtitle };

    if (this.editing) {
      this.api.updateParques(this.editing.id, item).subscribe({
        next: (res: any) => {
          this.parks[this.editingIndex as number] = {
            ...res,
            id: res.id || this.editing!.id
          };
          this.finishSave();
        },
        error: () => {
          this.parks[this.editingIndex as number] = {
            ...this.editing!,
            ...item
          };
          this.finishSave();
        }
      });
    } else {
      this.api.createParques(item).subscribe({
        next: (created: any) => {
          const idParque = created?.id || 'new_' + Date.now();
          this.parks.unshift({
            ...created,
            id: idParque
          });
          this.finishSave();
        },
        error: () => {
          const fallbackId = 'local_' + Date.now();
          this.parks.unshift({
            ...item,
            id: fallbackId
          });
          this.finishSave();
        }
      });
    }
  }

  private finishSave() {
    this.editing = null;
    this.editingIndex = null;
    this.modalOpen = false;
    this.clearForm();
    this.saveToStorage();
    this.applyFilter();
  }

  clearForm() {
    this.title = '';
    this.subtitle = '';
  }

  edit(p: ParqueItem, i: number) {
    this.editing = p;
    this.editingIndex = i;
    this.title = p.titulo;
    this.subtitle = p.subtitulo;
    this.modalOpen = true;
  }

  cancelEdit() {
    this.editing = null;
    this.editingIndex = null;
    this.clearForm();
  }

 remove(i: number) {
  if (!confirm('Eliminar parque?')) return;
  const id = this.parks[i]?.id;

  const isServerId = (val: any) => {
    if (typeof val === 'number') return true;
    if (typeof val === 'string') return !/^local_|^new_|^geo_|^srv_/.test(val);
    return false;
  };

  if (!isServerId(id)) {
    this.parks.splice(i, 1);
    this.saveToStorage();
    this.applyFilter();
    return;
  }

  this.api.deleteParques(id).subscribe({
    next: () => {
      this.parks.splice(i, 1);
      this.saveToStorage();
      this.applyFilter();
    },
    error: () => {
      this.parks.splice(i, 1);
      this.saveToStorage();
      this.applyFilter();
    }
  });
}
  private saveToStorage() {
    localStorage.setItem('av_parks', JSON.stringify(this.parks));
  }
}