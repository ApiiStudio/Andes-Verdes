import { Component, OnInit } from '@angular/core';
import { Footer } from "../../shared/footer/footer";
import { Navbar } from "../../shared/navbar/navbar";
// ...existing code...

declare let L: any;

@Component({
  selector: 'app-home',
  templateUrl: './home.html',
  styleUrls: ['./home.css'],
  imports: [Footer, Navbar]
})
export class Home implements OnInit {
  searchText = '';
  map : any;
  markerClusterGroup: any;
  initializedView = false;

  onSearchChange(evt: Event) {
    this.searchText = (evt.target as HTMLInputElement).value || '';
    console.log('Buscar:', this.searchText);
  }

  ngOnInit(): void {
    // Cargar recursos externos (Leaflet.markercluster) y después crear el mapa
    this.loadExternalResources()
      .then(() => this.createMap())
      .catch(err => {
        console.warn('No se pudieron cargar recursos externos para clustering, creando mapa sin clustering', err);
        this.createMap();
      });
  }

  // Carga dinámica de CSS/JS necesarios para MarkerCluster (si no están ya cargados)
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

  private createMap(): void {
    // Usar un basemap limpio sin etiquetas para luego dibujar solo lo que queremos (mejora la legibilidad/ calidad)
    // CartoDB Positron (sin etiquetas) — buena resolución y estilo neutro
    const osm = L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_nolabels/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd',
      detectRetina: true,
      maxZoom: 19,
      maxNativeZoom: 19
    });

    // Bounds aproximados de Argentina (para restringir navegación)
    const bounds = {
      north: -21.78,
      south: -55.13,
      east: -53.63,
      west: -73.58,
    };

    const southwest = L.latLng(bounds.south, bounds.west);
    const northeast = L.latLng(bounds.north, bounds.east);
    const fitbounds = L.latLngBounds(southwest, northeast);

    // Centro aproximado de Argentina
    this.map = L.map('map', {
      center: L.latLng(-38.4161, -63.6167),
      zoom: 4,
      minZoom: 4,
      maxZoom: 18,
      maxBounds: fitbounds,
      layers: [osm]
    });

    // Ocultar placeholder cuando el basemap o el mapa terminen de cargar tiles
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

    // Forzar recálculo de tamaño poco después para evitar que Leaflet deje el mapa a la mitad
    setTimeout(() => { try { this.map.invalidateSize(); } catch (e) {} }, 250);

    // Agrupar marcadores usando MarkerCluster (si está disponible)
    try {
      this.markerClusterGroup = (L as any).markerClusterGroup ? (L as any).markerClusterGroup() : null;
    } catch (e) {
      this.markerClusterGroup = null;
    }

    // Cargar etiquetas de países (solo el nombre) para que los otros países muestren únicamente su nombre
    this.loadCountryLabels()
      .then(layer => {
        if (layer) layer.addTo(this.map);
      })
      .catch(err => console.warn('No se pudieron cargar labels de países:', err));

    // Intentar cargar GeoJSON de provincias y ciudades de Argentina si existen en /public
    this.loadArgentinaDetails()
      .then(() => {
        // detalles cargados
      })
      .catch(() => {
        // no hay detalles, seguimos con los parques/markers ya implementados
      });

    // Intentar cargar un GeoJSON con la lista completa de Parques Nacionales
    const geoJsonUrl = '/parques-argentina.geojson';
    fetch(geoJsonUrl)
      .then(res => {
        if (!res.ok) throw new Error('No se encontró el archivo GeoJSON de parques');
        return res.json();
      })
      .then((data) => {
        // Para cada feature, crear un marcador con icono coloreado según properties.category
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
          markers.push(marker);
        });

        if (this.markerClusterGroup) {
          markers.forEach(m => this.markerClusterGroup.addLayer(m));
          this.map.addLayer(this.markerClusterGroup);
        } else {
          markers.forEach(m => m.addTo(this.map));
        }

        // Ajustar vista al bounds del GeoJSON si tiene geometría (una sola vez para no resetear cuando el usuario usa controles)
        try {
          if (!this.initializedView) {
            const group = this.markerClusterGroup || L.featureGroup(markers);
            const gBounds = group.getBounds();
            if (gBounds.isValid()) this.map.fitBounds(gBounds, { padding: [50, 50] });
            this.initializedView = true;
          }
        } catch (e) {
          // ignore
        }

        // Aplicar la política de bloqueo de interacción
        this.updateInteractionLock();
      })
      .catch(err => {
        console.warn('GeoJSON de parques no cargado:', err);
        // Fallback: marcar algunos parques de ejemplo para que el mapa muestre marcadores
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
          markers.push(marker);
        });

        if (this.markerClusterGroup) {
          markers.forEach(m => this.markerClusterGroup.addLayer(m));
          this.map.addLayer(this.markerClusterGroup);
        } else {
          markers.forEach(m => m.addTo(this.map));
        }

        // Después de renderizar fallback markers, aplicar la política de bloqueo (solo si no inicializamos la vista aún)
        if (!this.initializedView) this.updateInteractionLock();
      });

  // Escuchar cambios de zoom para habilitar/deshabilitar interacción según el nivel
  this.map.on('zoomend', () => this.updateInteractionLock());
  }

  // Devuelve un color según categoría (puedes adaptar la paleta)
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

  // Carga una capa con nombres de países (simple): usamos un GeoJSON ligero con solo etiquetas de países
  // Para mantenerlo simple y offline-friendly, intentamos usar un archivo en public/ country-labels.geojson si existe
  // De lo contrario, devolvemos null.
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

  // Intentamos cargar GeoJSON de provincias/ciudades de Argentina si existe en public/
  private loadArgentinaDetails(): Promise<void> {
    const provUrl = '/argentina-provincias.geojson';
    const citiesUrl = '/argentina-ciudades.geojson';
    const addLayerIfFound = (url: string, style?: any) => fetch(url)
      .then(res => { if (!res.ok) throw new Error('no'); return res.json(); })
      .then((gj) => L.geoJSON(gj, { style }).addTo(this.map))
      .catch(() => null);

    return Promise.all([addLayerIfFound(provUrl, { color: '#666', weight: 1, fill: false }), addLayerIfFound(citiesUrl)])
      .then(() => undefined);
  }

  // Controla si el mapa debe bloquear el arrastre (dragging) y el zoom de desplazamiento cuando se está viendo toda Argentina
  private updateInteractionLock(): void {
    if (!this.map) return;

    const currentZoom = this.map.getZoom();
    const currentBounds = this.map.getBounds();

    // Bounds aproximados de Argentina (misma definición que arriba)
    const argBounds = L.latLngBounds(L.latLng(-55.13, -73.58), L.latLng(-21.78, -53.63));

    // Si la vista actual contiene totalmente los bounds de Argentina (es decir, estás viendo todo el país)
    const containsAll = currentBounds.contains(argBounds);

    // Política: si estás viendo todo Argentina (containsAll true) o el zoom <= 5, bloquear el arrastre para mantener foco.
    const shouldLock = containsAll || currentZoom <= 5;

    // Aplicar bloqueo/permiso de arrastre (dragging) solamente.
    // Conservamos el zoom por scroll, doble-clic y gestos para que el usuario pueda hacer zoom sin que la página haga zoom completo.
    if (shouldLock) {
      try { this.map.dragging.disable(); } catch (e) {}
    } else {
      try { this.map.dragging.enable(); } catch (e) {}
    }
  }
}