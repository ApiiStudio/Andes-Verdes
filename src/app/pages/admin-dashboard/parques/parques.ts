import { Component, OnInit, OnDestroy } from '@angular/core';
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
export class Parques implements OnInit, OnDestroy {
  parks: ParqueItem[] = [];
  filteredParks: ParqueItem[] = [];
  filterText = '';
  searchText = '';
  suggestions: ParqueItem[] = [];
  provinces: string[] = [];
  provinceFilter = '';

  editing: ParqueItem | null = null;
  editingIndex: number | null = null;
  title = '';
  subtitle = '';
  modalOpen = false;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadParks();
    // listen to global admin search events
    (window as any).addEventListener('admin-search', this._onAdminSearch as EventListener);
  }

  private _onAdminSearch = (e: any) => {
    const term = (e?.detail?.term || '').toString().trim();
    this.filterText = term;
    this.searchText = term;
    this.applyFilter();
    // if search cleared, also clear suggestions
    if (!term) this.suggestions = [];
  };

  ngOnDestroy(): void {
    try { (window as any).removeEventListener('admin-search', this._onAdminSearch as EventListener); } catch {}
  }

  private loadParks() {
    this.api.getParks().subscribe({
      next: (data: any[]) => {
        this.parks = data.map((p, i) => ({
              id: p.id || p.id_parque || p.pk || p._id || 'srv_' + i,
              titulo: p.titulo || p.name || p.title || 'Parque',
              subtitulo: p.subtitulo || p.description || p.subtitulo || ''
            }));
        this.saveToStorage();
        this.buildProvinces();
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
          id: p.id || p.id_parque || p.pk || p._id || 'local_' + i,
          titulo: p.titulo || p.name || p.title || 'Parque',
          subtitulo: p.subtitulo || p.description || ''
        }));
        this.buildProvinces();
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
          titulo: f.properties?.name || f.properties?.title || 'Parque',
          subtitulo: f.properties?.description || ''
        }));
        this.saveToStorage();
        // build provinces list
        this.buildProvinces();
        this.applyFilter();
      })
      .catch(() => (this.parks = []));
  }

  trackById(index: number, item: ParqueItem) {
    return item.id;
  }

  applyFilter() {
    const v = (this.filterText || '').toLowerCase().trim();
    const prov = (this.provinceFilter || '').toLowerCase().trim();
    this.filteredParks = this.parks.filter(p => {
      const title = (p.titulo || '').toLowerCase();
      const sub = (p.subtitulo || '').toLowerCase();
      const matchesText = !v || title.includes(v);
      const matchesProv = !prov || sub.includes(prov);
      return matchesText && matchesProv;
    });
  }

  buildProvinces() {
    const set = new Set<string>();
    this.parks.forEach(p => {
      const s = (p.subtitulo || '').toString().trim();
      if (!s) return;
      // try split by comma or paren and push pieces
      const parts = s.split(/[,\-()\/;]+/).map(x => x.trim()).filter(Boolean);
      parts.forEach(part => set.add(part));
    });
    this.provinces = Array.from(set).sort();
  }

  setProvinceFilter(v: string) {
    this.provinceFilter = v || '';
    this.applyFilter();
  }

  onSearchChange(evt: Event) {
    const raw = (evt.target as HTMLInputElement).value || '';
    const value = raw.toLowerCase().trim();
    this.searchText = raw;
    if (!value) {
      // when search is cleared, show all parks again
      this.suggestions = [];
      this.filterText = '';
      this.applyFilter();
      return;
    }

    // score matches: exact(0), startsWith(1), contains(10+index), otherwise large
    const scored = this.parks.map(p => {
      const name = (p.titulo || '').toLowerCase();
      let score = 100000;
      if (name === value) score = 0;
      else if (name.startsWith(value)) score = 1;
      else {
        const idx = name.indexOf(value);
        if (idx >= 0) score = 10 + idx;
      }
      return { p, score };
    }).filter(s => s.score < 100000)
      .sort((a, b) => a.score - b.score)
      .slice(0, 3)
      .map(s => s.p);

    this.suggestions = scored;
  }

  selectParque(parque: ParqueItem) {
    if (!parque) return;
    this.searchText = parque.titulo || '';
    this.filterText = parque.titulo || '';
    this.applyFilter();
    this.suggestions = [];
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
            id: res.id || res.id_parque || res.pk || this.editing!.id
          };
          this.finishSave();
        },
        error: (err: any) => {
          console.error('Error updating parque', { id: this.editing?.id, err });
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
          const idParque = created?.id || created?.id_parque || created?.pk || 'new_' + Date.now();
          this.parks.unshift({
            ...created,
            id: idParque
          });
          this.finishSave();
        },
        error: (err: any) => {
          console.error('Error creating parque', err);
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

  console.log('Attempting to delete parque index', i, 'id=', id, 'type=', typeof id);

  const isServerId = (val: any) => {
    if (typeof val === 'number') return true;
    if (typeof val === 'string') return !/^local_|^new_|^geo_|^srv_/.test(val);
    return false;
  };

  if (!isServerId(id)) {
    this.parks.splice(i, 1);
    this.saveToStorage();
    // after deleting, reset any active filter so user sees full list
    this.filterText = '';
    this.applyFilter();
    return;
  }
  this.api.deleteParques(id).subscribe({
    next: (res: any) => {
      console.log('Delete successful for id', id, res);
      this.parks.splice(i, 1);
      this.saveToStorage();
      // after deleting, reset filter so list shows all parks
      this.filterText = '';
      this.applyFilter();
    },
    error: (err: any) => {
      console.error('Error deleting parque', { id, err });
      // still remove locally as fallback, but keep logs
      this.parks.splice(i, 1);
      this.saveToStorage();
      this.filterText = '';
      this.applyFilter();
    }
  });
}
  private saveToStorage() {
    localStorage.setItem('av_parks', JSON.stringify(this.parks));
  }
}
