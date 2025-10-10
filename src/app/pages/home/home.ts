import { Component, OnInit } from '@angular/core';
import { Footer } from "../../shared/footer/footer";
import { Navbar } from "../../shared/navbar/navbar";
import { CommonModule } from '@angular/common';

declare let L: any;

@Component({
  selector: 'app-home',
  templateUrl: './home.html',
  styleUrls: ['./home.css'],
  imports: [Footer, Navbar, CommonModule]
})
export class Home implements OnInit {
  searchText = '';
  allParques: any[] = [];
  filteredParques: any[] = [];
  markerByName: { [key: string]: any } = {};
  map : any;
  markerClusterGroup: any;
  initializedView = false;
  argBounds: any = null;
  markerZoomed = false;

  onSearchChange(evt: Event) {
    this.searchText = (evt.target as HTMLInputElement).value || '';
    console.log('Buscar:', this.searchText)

    const value = (evt.target as HTMLInputElement).value.toLowerCase().trim();
    this.searchText = value;

    if (value.length > 0) {
    this.filteredParques = this.allParques.filter((parque: any) =>
      parque.properties.name.toLowerCase().includes(value)
    );
    } else {
      this.filteredParques = [];
    };
  }

  ngOnInit(): void {
    // Cargar recursos externos (Leaflet.markercluster) y después crea el mapa
    this.loadParques();
    this.loadExternalResources()
      .then(() => this.createMap())
      .catch(err => {
        console.warn('No se pudieron cargar recursos externos para clustering, creando mapa sin clustering', err);
        this.createMap();
      });
  }

  private loadParques() {
    fetch('/parques-argentina.geojson')
    .then(res => res.json())
    .then(data => {
      this.allParques = data.features || [];
    })
    .catch(err => console.error('Error cargando parques:', err));
  }

  selectParque(parque: any) {
    this.searchText = parque.properties.name;
    this.filteredParques = [];
    const name = parque.properties.name;
    const marker = this.markerByName[name];
    if (marker && this.map) {
      if (this.markerClusterGroup && typeof this.markerClusterGroup.zoomToShowLayer === 'function') {
        try {
          this.markerClusterGroup.zoomToShowLayer(marker, () => {
            this.map.setView(marker.getLatLng(), 10);
            marker.openPopup();
          });
          return;
        } catch (e) {
        }
      }

      this.map.setView(marker.getLatLng(), Math.max(this.map.getZoom(), 10));
      marker.openPopup();
      return;
    }
    // Si no hay marker (fallback), usar las coordenadas del GeoJSON
    const coords = parque.geometry?.coordinates;
    if (coords && this.map) {
      const [lon, lat] = coords;
      this.map.setView([lat, lon], 10);
      L.popup({ offset: [0, -20] })
        .setLatLng([lat, lon])
        .setContent(`<strong>${parque.properties.name}</strong><br>${parque.properties.description}`)
        .openOn(this.map);
    }
  }

  // Handler para presionar Enter en el input: seleccionar la primera suggestion si existe
  onEnter() {
    if (this.filteredParques && this.filteredParques.length > 0) {
      this.selectParque(this.filteredParques[0]);
    }
  }

  trackByName(index: number, item: any) {
    return item?.properties?.name || index;
  }

  private loadExternalResources(): Promise<void> {
    const cssUrl = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css';
    const cssUrl2 = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css';
    const scriptUrl = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster-src.js';

    const loadCss = (href: string) => new Promise<void>((resolve) => {
      if (document.querySelector(`link[href="${href}"]`)) return resolve();
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.onload = () => resolve();
      document.head.appendChild(link);
    });

    const loadScript = (src: string) => new Promise<void>((resolve, reject) => {
      if ((window as any).L && (window as any).L.MarkerCluster) return resolve();
      if (document.querySelector(`script[src="${src}"]`)) return resolve();
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Error cargando ' + src));
      document.body.appendChild(s);
    });

    return Promise.all([loadCss(cssUrl), loadCss(cssUrl2), loadScript(scriptUrl)]).then(() => undefined as void);
  }

  // Crea mapa vacio y sus limites
  private createMap(): void {
    const osm = L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_nolabels/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd',
      detectRetina: true,
      maxZoom: 19,
      maxNativeZoom: 19
    });

    // Lmiites aproximados de Argentina
    const bounds = {
      north: -21.78,
      south: -55.13,
      east: -53.63,
      west: -73.58,
    };

    const southwest = L.latLng(bounds.south, bounds.west);
    const northeast = L.latLng(bounds.north, bounds.east);
    const fitbounds = L.latLngBounds(southwest, northeast);
  this.argBounds = fitbounds;

    // Centrar aprox arg
    this.map = L.map('map', {
      center: L.latLng(-38.4161, -63.6167),
      zoom: 4,
      minZoom: 4,
      maxZoom: 18,
      maxBounds: fitbounds,
      layers: [osm]
    });

    try {
      osm.on && osm.on('load', () => {
        const ph = document.getElementById('map-placeholder'); if (ph) ph.classList.add('hidden');
      });
    } catch (e) {}
    try {
      this.map.on && this.map.on('load', () => {
        const ph = document.getElementById('map-placeholder'); if (ph) ph.classList.add('hidden');
      });
    } catch (e) {}

    setTimeout(() => { try { this.map.invalidateSize(); } catch (e) {} }, 250);

    // Agrupar marcadores con MarkerCluster
    try {
      this.markerClusterGroup = (L as any).markerClusterGroup ? (L as any).markerClusterGroup() : null;
    } catch (e) {
      this.markerClusterGroup = null;
    }

    // Cargar la lista de los Parques Nacionales
    const geoJsonUrl = '/parques-argentina.geojson';
    fetch(geoJsonUrl)
      .then(res => {
        if (!res.ok) throw new Error('No se encontró el archivo GeoJSON de parques');
        return res.json();
      })
      .then((data) => {
        // Para cada feature, crea un marcador con icono coloreado según properties.category
        const markers: any[] = [];
        (data.features || []).forEach((f: any) => {
          if (!f.geometry) return;
          const coords = f.geometry.type === 'Point' ? [f.geometry.coordinates[1], f.geometry.coordinates[0]] : null;
          if (!coords) return;
          const cat = f.properties?.category || 'default';
          const color = this.colorForCategory(cat);

          const icon = L.divIcon({
            className: 'custom-pin',
            html: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 24 36"><path fill="${color}" d="M12 0C7 0 3.5 3.5 3.5 8.5c0 6.1 8.5 16.8 8.5 16.8s8.5-10.7 8.5-16.8C20.5 3.5 17 0 12 0z"/><circle cx="12" cy="9" r="3" fill="#fff"/></svg>`,
            iconSize: [28, 36],
            iconAnchor: [14, 36],
            popupAnchor: [0, -32]
          });

          const marker = L.marker(coords, { icon });
          const name = f.properties?.name || 'Parque';
          const desc = f.properties?.description || '';
          marker.bindPopup(`<strong>${name}</strong><br/>${desc}`);
          marker.on && marker.on('click', (e: any) => {
            try { if (e?.originalEvent) L.DomEvent.stopPropagation(e.originalEvent); } catch (err) {}
            try { this.map.setView(marker.getLatLng(), 10); } catch (err) {}
            try { marker.openPopup(); } catch (err) {}
            this.markerZoomed = true;
          });
          markers.push(marker);
          try { this.markerByName[name] = marker; } catch (e) {}
        });

        if (this.markerClusterGroup) {
          markers.forEach(m => this.markerClusterGroup.addLayer(m));
          this.map.addLayer(this.markerClusterGroup);
        } else {
          markers.forEach(m => m.addTo(this.map));
        }
        try {
          if (!this.initializedView) {
            const group = this.markerClusterGroup || L.featureGroup(markers);
            const gBounds = group.getBounds();
            if (gBounds.isValid()) this.map.fitBounds(gBounds, { padding: [50, 50] });
            this.initializedView = true;
          }
        } catch (e) {
        }

        this.updateInteractionLock();
      })
      .catch(err => {
        console.warn('GeoJSON de parques no cargado:', err);
        const sampleParks = [
          { name: 'Parque Nacional Iguazú', lat: -25.6953, lon: -54.4367, category: 'noreste' },
          { name: 'Parque Nacional Los Glaciares', lat: -50.3319, lon: -72.2495, category: 'sur' },
          { name: 'Parque Nacional Nahuel Huapi', lat: -41.1333, lon: -71.3000, category: 'patagonia' },
          { name: 'Parque Nacional Talampaya', lat: -29.8402, lon: -67.8579, category: 'noroeste' },
          { name: 'Parque Nacional Tierra del Fuego', lat: -54.8333, lon: -68.3333, category: 'sur' },
          { name: 'Parque Nacional El Impenetrable', lat: -25.987, lon: -60.633, category: 'norte' },
          { name: 'Parque Nacional Chaco', lat: -27.5, lon: -60.833, category: 'norte' },
          { name: 'Parque Nacional Quebrada del Condorito', lat: -31.448, lon: -64.52, category: 'centro' },
          { name: 'Parque Nacional Islas de Santa Fe', lat: -31.6, lon: -60.7, category: 'litoral' }
        ];

        const markers: any[] = [];
        sampleParks.forEach(p => {
          const color = this.colorForCategory(p.category);
          const icon = L.divIcon({
            className: 'custom-pin',
            html: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 24 36"><path fill="${color}" d="M12 0C7 0 3.5 3.5 3.5 8.5c0 6.1 8.5 16.8 8.5 16.8s8.5-10.7 8.5-16.8C20.5 3.5 17 0 12 0z"/><circle cx="12" cy="9" r="3" fill="#fff"/></svg>`,
            iconSize: [28, 36],
            iconAnchor: [14, 36],
            popupAnchor: [0, -32]
          });
          const marker = L.marker([p.lat, p.lon], { icon }).bindPopup(`<strong>${p.name}</strong>`);
          marker.on && marker.on('click', (e: any) => {
            try { if (e?.originalEvent) L.DomEvent.stopPropagation(e.originalEvent); } catch (err) {}
            try { this.map.setView(marker.getLatLng(), 10); } catch (err) {}
            try { marker.openPopup(); } catch (err) {}
            this.markerZoomed = true;
          });
          markers.push(marker);
          try { this.markerByName[p.name] = marker; } catch (e) {}
        });

        if (this.markerClusterGroup) {
          markers.forEach(m => this.markerClusterGroup.addLayer(m));
          this.map.addLayer(this.markerClusterGroup);
        } else {
          markers.forEach(m => m.addTo(this.map));
        }

        if (!this.initializedView) this.updateInteractionLock();
      });

  this.map.on('zoomend', () => this.updateInteractionLock());
    this.map.on('click', (e: any) => {
      if (this.markerZoomed && this.argBounds) {
        try {
          this.map.fitBounds(this.argBounds, { padding: [50, 50] });
        } catch (err) {}
        this.markerZoomed = false;
      }
    });
  }

  // Devuelve color según categoría
  private colorForCategory(cat: string) {
    const map: any = {
      norte: '#e84a5f',
      noreste: '#f6c85f',
      centro: '#7fb069',
      litoral: '#4aa3df',
      patagonia: '#6a7bd1',
      sur: '#b66dff',
      noroeste: '#ff7f50',
      default: '#6ba292'
    };
    return map[cat] || map.default;
  }

  private loadCountryLabels(): Promise<any | null> {
    const url = '/country-labels.geojson';
    return fetch(url)
      .then(res => {
        if (!res.ok) throw new Error('No country labels');
        return res.json();
      })
      .then((geojson) => {
        const layer = L.geoJSON(geojson, {
          onEachFeature: (feature: any, layer: any) => {
            const name = feature.properties?.name || feature.properties?.ADMIN || '';
            const center = layer.getBounds ? layer.getBounds().getCenter() : null;
            if (center) {
              const label = L.marker(center, {
                interactive: false,
                icon: L.divIcon({
                  className: 'country-label',
                  html: `<span style="font-size:12px;color:#444;">${name}</span>`
                })
              });
              label.addTo(this.map);
            }
          }
        });
        return layer;
      })
      .catch(() => null);
  }

  private updateInteractionLock(): void {
    if (!this.map) return;

    const currentZoom = this.map.getZoom();
    const currentBounds = this.map.getBounds();

    // Bounds aproximados de Argentina
    const argBounds = L.latLngBounds(L.latLng(-55.13, -73.58), L.latLng(-21.78, -53.63));
    const containsAll = currentBounds.contains(argBounds);

    const shouldLock = containsAll || currentZoom <= 5;
    if (shouldLock) {
      try { this.map.dragging.disable(); } catch (e) {}
    } else {
      try { this.map.dragging.enable(); } catch (e) {}
    }
  }


}