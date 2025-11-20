import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';

@Component({
  selector: 'app-parques-admin',
  template: `
    <div class="parques-admin">
      <div class="page-header">
        <h1>Gestión de Parques</h1>
        <p class="muted">Lista, mapa interactivo y acciones CRUD. Los cambios se guardan en localStorage (temporal).</p>
      </div>

      <div class="parques-grid">
        <div class="left">
          <div class="controls">
            <div style="display:flex; gap:10px; align-items:center;">
              <button class="add-btn" (click)="openCreate()">Nuevo parque</button>
              <button class="btn" (click)="centerAll()">Mostrar todos</button>
            </div>
          </div>

          <div class="list">
            <div class="list-header">
              <h3>Parques disponibles</h3>
              <div class="list-actions">
                <input placeholder="Filtrar por nombre..." [(ngModel)]="filterText" (input)="applyFilter()" />
              </div>
            </div>

            <div class="table-wrap">
              <table class="nice-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Descripción</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let p of filteredParks; let i = index">
                      <td>{{ p.titulo || p.name }}</td>
                      <td class="muted">{{ p.subtitulo || p.description }}</td>
                      <td>{{ p.id || ('#' + i) }}</td>
                    <td>
                      <button class="btn" (click)="zoomTo(p)">Ver</button>
                      <button class="btn" (click)="edit(p, i)">Editar</button>
                      <button class="btn danger" (click)="remove(i)">Eliminar</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="right">
          <div class="map-toolbar" style="display:flex; gap:8px; margin-bottom:8px;">
            <button class="btn" (click)="fitBounds()">Ajustar vista</button>
            <button class="btn" (click)="centerAll()">Centrar puntos</button>
          </div>
          <div #mapContainer class="map" aria-label="Mapa de parques"></div>
        </div>
      </div>

      <!-- Modal para crear/editar parque -->
      <div class="modal-backdrop" *ngIf="modalOpen">
        <div class="modal-card">
          <h3>{{ editing ? 'Editar parque' : 'Nuevo parque' }}</h3>
          <div class="field-row">
            <label>Título</label>
            <input [(ngModel)]="title" />
          </div>
          <div class="field-row">
            <label>Subtítulo</label>
            <input [(ngModel)]="subtitle" />
          </div>
          <div class="form-actions">
            <button class="add-btn" (click)="saveFromModal()">{{ editing ? 'Guardar' : 'Agregar' }}</button>
            <button class="btn" (click)="closeModal()">Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  `,
  standalone: true,
  styleUrls: ['./parques.css'],
  imports: [CommonModule, FormsModule]
})
export class Parques implements OnInit, AfterViewInit {
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;
  constructor(private api: ApiService) {}

  parks: Array<any> = [];
  editing: any = null;
  editingIndex: number | null = null;
  title = '';
  subtitle = '';

  map: any = null;
  markerLayer: any = null;
  filterText = '';
  filteredParks: Array<any> = [];
  modalOpen: boolean = false;

  ngOnInit(): void {
    this.loadParks();
  }

  ngAfterViewInit(): void {
    this.initMap();
  }

  private loadParks() {
    // try backend first
    this.api.getParks().subscribe({
      next: (data: any) => {
        if (Array.isArray(data)) {
          this.parks = data;
          this.saveToStorage();
          this.refreshMarkers();
          this.applyFilter();
          return;
        }
        // otherwise fallback to storage
        this.loadFromStorageOrGeojson();
      },
      error: (err: any) => {
        console.warn('API parks error, fallback to local', err);
        this.loadFromStorageOrGeojson();
      }
    });
  }

  private loadFromStorageOrGeojson() {
    const saved = localStorage.getItem('av_parks');
    if (saved) {
      try {
        this.parks = JSON.parse(saved);
        this.refreshMarkers();
        this.applyFilter();
        return;
      } catch (e) {}
    }
    // fallback to public GeoJSON
    fetch('/parques-argentina.geojson')
      .then((r) => r.json())
      .then((g) => {
        const features = g.features || [];
        this.parks = features.slice(0, 25).map((f: any) => ({
          name: f.properties?.name || 'Parque',
          description: f.properties?.description || '',
          lat: (f.geometry?.coordinates && f.geometry.coordinates[1]) || null,
          lon: (f.geometry?.coordinates && f.geometry.coordinates[0]) || null
        }));
        this.saveToStorage();
        this.refreshMarkers();
        this.applyFilter();
      })
      .catch(() => {
        this.parks = [];
      });
  }

  private saveToStorage() {
    localStorage.setItem('av_parks', JSON.stringify(this.parks));
  }

  async initMap() {
    try {
      const L = await import('leaflet');
      // basic map
      this.map = L.map(this.mapContainer.nativeElement, {
        center: [-34.6, -58.4],
        zoom: 4
      });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
      }).addTo(this.map);

      this.markerLayer = L.layerGroup().addTo(this.map);
      this.refreshMarkers();
    } catch (e) {
      console.warn('Leaflet no disponible', e);
    }
  }

  refreshMarkers() {
    if (!this.markerLayer) return;
    this.markerLayer.clearLayers();
    // add markers
    (this.parks || []).forEach((p: any) => {
      if (p.lat != null && p.lon != null) {
        try {
          const L = (window as any).L;
          if (L) {
            const m = L.marker([p.lat, p.lon]).bindPopup(`<strong>${p.name}</strong><br>${p.description}`);
            this.markerLayer.addLayer(m);
          }
        } catch (e) {}
      }
    });
  }

  applyFilter() {
    const v = (this.filterText || '').toLowerCase().trim();
    if (!v) {
      this.filteredParks = this.parks.slice();
      return;
    }
    this.filteredParks = this.parks.filter((p: any) => (p.name||'').toLowerCase().includes(v));
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
    // basic validation: require title and id
    if (!this.title) return alert('Ingrese un título');
    this.save();
    this.closeModal();
  }

  fitBounds() {
    try {
      if (this.map && this.markerLayer && (this.markerLayer.getBounds)) {
        const bounds = this.markerLayer.getBounds();
        if (bounds && bounds.isValid && bounds.isValid()) {
          this.map.fitBounds(bounds, { padding: [40, 40] });
        }
      }
    } catch (e) {
      // fallback: no-op
    }
  }

  centerAll() {
    try {
      if (this.map && this.markerLayer && (this.markerLayer.getBounds)) {
        const bounds = this.markerLayer.getBounds();
        if (bounds && bounds.isValid && bounds.isValid()) {
          const c = bounds.getCenter();
          this.map.setView(c, this.map.getZoom() || 6);
        }
      }
    } catch (e) {}
  }

 save() {
  if (!this.title) return alert('Ingrese un título');

  const item = { titulo: this.title, subtitulo: this.subtitle };

  if (this.editing) {
    // UPDATE
    this.api.updateParques(this.editing.id, item).subscribe({
  next: (res: any) => {
    this.parks[this.editingIndex as number] = res || { ...this.editing, ...item };
    this.finishSave();
  },
  error: () => {
    this.parks[this.editingIndex as number] = { ...this.editing, ...item };
    this.finishSave();
  }
});

  } else {
    // CREATE
    this.api.createParques(item).subscribe({
      next: (created: any) => {
        this.parks.unshift(created || item);
        this.finishSave();
      },
      error: () => {
        this.parks.unshift(item);
        this.finishSave();
        this.clearForm();
        this.saveToStorage();
         this.refreshMarkers();
        this.applyFilter();
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
  this.refreshMarkers();
  this.applyFilter();
}



  clearForm() {
    this.title = '';
    this.subtitle = '';
  }

 edit(p: any, i: number) {
  this.editing = p;
  this.editingIndex = i;

  this.title = p.title || p.name || '';
  this.subtitle = p.subtitle || p.description || '';

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
    if (id) {
      this.api.deleteParques(id).subscribe({
        next: (_res: any) => {
          this.parks.splice(i, 1);
          this.saveToStorage();
          this.refreshMarkers();
          this.applyFilter();
        },
        error: (_err: any) => {
          // fallback local
          this.parks.splice(i, 1);
          this.saveToStorage();
          this.refreshMarkers();
          this.applyFilter();
        }
      });
    } else {
      this.parks.splice(i, 1);
      this.saveToStorage();
      this.refreshMarkers();
      this.applyFilter();
    }
  }

  zoomTo(p: any) {
    if (!this.map || p.lat == null || p.lon == null) return;
    try {
      this.map.setView([p.lat, p.lon], 10);
    } catch (e) {}
  }
}