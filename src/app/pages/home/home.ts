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
  polygonByName: { [key: string]: any } = {};
  kmlFeatures: any[] = [];
  regions: any[] = [];
  map: any;
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
        const features = data.features || [];
        // Asignar todos los parques del GeoJSON (antes se filtraba por provincias centralizadas)
        this.allParques = features;
        try { this.buildRegions(); } catch (e) { console.warn('buildRegions error after loadParques', e); }
      })
      .catch(err => console.error('Error cargando parques:', err));
  }

  // Construye las 6 regiones oficiales y asigna parques
  private buildRegions() {
    const normalize = (s: any) => typeof s === 'string' ? s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '') : '';

    // Extract a best-effort raw name from multiple possible properties (name, ROTULO, Name, description)
    const getRawName = (ft: any) => {
      const props = ft.properties || {};
      let raw = (props.name || props.ROTULO || props.Name || '') + '';
      raw = raw.trim();
      if (!raw && props.description) {
        const desc = (props.description || '') + '';
        // intentar extraer etiquetas comunes dentro de description (ROTULO:, name:)
        const m1 = desc.match(/ROTULO:\s*([^<\n\r]+)/i);
        const m2 = desc.match(/\bName:\s*([^<\n\r]+)/i);
        const m3 = desc.match(/\bname:\s*([^<\n\r]+)/i);
        const m4 = desc.match(/\bROTULO\b\s*[:\-]\s*([^<\n\r]+)/i);
        raw = (m1 && m1[1]) || (m2 && m2[1]) || (m3 && m3[1]) || (m4 && m4[1]) || raw || '';
      }
      return (raw || '').toString().trim();
    };

    // stronger base-name extractor: remove parenthetical role tags and common suffixes/prefixes
    const baseName = (raw: string) => {
      if (!raw) return '';
      let s = raw.toLowerCase();
      // remove HTML that sometimes exists in description/name
      s = s.replace(/<[^>]+>/g, ' ');
      // remove leading 'núcleo' or 'núcleo ' variants
      s = s.replace(/^núcleo\s+/u, '');
      // remove common abbreviation like 'pn' or 'p.n.' or leading 'pn '
      s = s.replace(/\bpn\b/gu, '');
      s = s.replace(/p\.n\./giu, '');
      // remove role tags in parentheses e.g. (Parque Nacional) (Reserva Nacional)
      s = s.replace(/\([^)]*\)/g, '');
      // remove common suffix words
      s = s.replace(/\b(parque nacional|parque nacional marino|reserva nacional|sector|núcleo|área protegida|provincia)\b/gu, '');
      // remove labels like 'rotulo:' or 'name:' if present
      s = s.replace(/\b(rotulo|rotulo:)\b/giu, '');
      s = s.replace(/\b(name|name:)\b/giu, '');
      // normalize slashes and punctuation
      s = s.replace(/[\/\|]/g, ' ');
      s = s.replace(/[^a-z0-9\s]/gu, ' ');
      s = s.replace(/\s+/g, ' ').trim();
      // remove diacritics
      s = s.normalize('NFD').replace(/\p{Diacritic}/gu, '');
      return s;
    };

    const manual: any = {
      'noa': ['pn baritu', 'el rey', 'los cardones', 'aconquija', 'calilegua', 'copo'],
      'nea': ['iguazu', 'chaco', 'el impenetrable', 'laguna el palmar', 'ibera', 'mburucuya', 'rio pilcomayo', 'río pilcomayo'],
      'centro': ['quebrada del condorito', 'traslasierra', 'ansenuza', 'el leoncito', 'san guillermo', 'sierra de las quijadas', 'talampaya', 'islas de santa fe', 'pre-delta', 'el palmar', 'ciervo de los pantanos', 'campos del tuyu', 'campos del tuyú', 'campos del tuyú'],
      'patagonia': ['lanin', 'laguna blanca', 'los arrayanes', 'nahuel huapi', 'islote lobos', 'lihue calel', 'los alerces', 'lago puelo'],
      'patagonia-austral': ['los glaciares', 'perito moreno', 'patagonia', 'bosques petrificados de jaramillo', 'bosques petrificados', 'monte leon', 'tierra del fuego'],
      'mar-argentino': [
        'pim isla pinguino', 'pim isla pingüino', 'pimc patagonia austral', 'parque interjurisdiccional marino costero patagonia austral',
        'isla pinguino', 'isla pingüino', 'islote pinguino', 'islote pingüino'
      ]
    };

    // construir lookup nombre -> region
    const nameToRegion: { [key: string]: string } = {};
    Object.keys(manual).forEach(rid => {
      (manual[rid] as string[]).forEach(n => nameToRegion[normalize(n)] = rid);
    });

    // Deduplicar: preferir features del GeoJSON (this.allParques) y luego KMLs
    const dedup: { [key: string]: { feature: any, score: number } } = {};
    // Mapa auxiliar key->feature desde el GeoJSON para recuperar metadatos (p.ej. provincia)
    const geoByKey: { [key: string]: any } = {};
    (this.allParques || []).forEach(f => {
      try {
        const raw = getRawName(f);
        const k = baseName(raw || '');
        if (k && !geoByKey[k]) geoByKey[k] = f;
      } catch (e) { }
    });
    const scoreFeature = (ft: any) => {
      // Polígonos en el mapa
      let score = 0;
      if (ft.geometry) {
        const t = ft.geometry.type || '';
        if (t === 'Polygon' || t === 'MultiPolygon' || t === 'LineString' || t === 'MultiLineString') score += 10;
        if (t === 'Point') score += 1;
      }
      // prefer GeoJSON source: we mark features that appear in this.allParques
      if ((this.allParques || []).includes(ft)) score += 5;
      // small bonus if properties show a longer description (more likely canonical)
      const desc = ft.properties?.description || '';
      if (typeof desc === 'string' && desc.length > 30) score += 1;
      return score;
    };

    const pushBucket = (ft: any) => {
      const raw = getRawName(ft);
      const key = baseName(raw || '');
      if (!key) return;
      const s = scoreFeature(ft);
      if (!dedup[key] || (dedup[key].score || 0) < s) {
        dedup[key] = { feature: ft, score: s };
      }
    };

    // First add GeoJSON features (prefer them when names collide)
    (this.allParques || []).forEach(f => pushBucket(f));
    // Then KML-derived features - they can replace if they have better score (usually polygons)
    (this.kmlFeatures || []).forEach(f => pushBucket(f));

    // inicializar regiones en orden solicitado
    const regionOrder = [
      { id: 'noa', name: 'NOA', parks: [] as any[] },
      { id: 'nea', name: 'NEA', parks: [] as any[] },
      { id: 'centro', name: 'Centro', parks: [] as any[] },
      { id: 'patagonia', name: 'Patagonia', parks: [] as any[] },
      { id: 'patagonia-austral', name: 'Patagonia Austral', parks: [] as any[] },
      { id: 'mar-argentino', name: 'Mar Argentino', parks: [] as any[] }
    ];

    // Helper fallback classifier (provincias/coords) — reusar parte de la heurística previa
    const regionDefs: any[] = [
      { id: 'noa', provinces: ['jujuy', 'salta', 'tucuman', 'tucumán', 'catamarca', 'santiago del estero'] },
      { id: 'nea', provinces: ['misiones', 'corrientes', 'formosa', 'chaco'] },
      { id: 'centro', provinces: ['cordoba', 'córdoba', 'santa fe', 'santafe', 'entre rios', 'entre ríos', 'la pampa', 'buenos aires', 'san luis'] },
      { id: 'patagonia', provinces: ['neuquen', 'nequén', 'neuquén', 'rio negro', 'río negro', 'chubut'] },
      { id: 'patagonia-austral', provinces: ['santa cruz', 'tierra del fuego'] }
    ];

    const classifyFallback = (ft: any) => {
      const props = ft.properties || {};
      const name = normalize(props.name || props.ROTULO || '');
      const desc = normalize(props.description || props.provincia || props.PROVINCIA || props.province || '');
      for (const def of regionDefs) {
        for (const pk of def.provinces) {
          if (!pk) continue;
          const pkNorm = normalize(pk);
          if (desc.includes(pkNorm) || name.includes(pkNorm)) return def.id;
        }
      }
      if (name.includes('pim') || name.includes('mar')) return 'mar-argentino';
      const lat = ft.geometry?.type === 'Point' ? ft.geometry.coordinates[1] : null;
      if (typeof lat === 'number') {
        if (lat <= -50) return 'patagonia-austral';
        if (lat <= -40) return 'patagonia';
        if (lat <= -34) return 'centro';
        if (lat <= -21) return 'noa';
      }
      return 'centro';
    };

    // Asignar deduplicados a regiones
    // For diagnostics, keep track of which key chose which region and source
    const diagnostics: { key: string, region: string, source: string, origin: string }[] = [];
    const manualKeys = Object.keys(nameToRegion || {});
    Object.keys(dedup).forEach(nm => {
      const ft = dedup[nm].feature;
      const manualKey = nm;
      // Prefer manual mapping (exact key)
      let mapped = nameToRegion[manualKey];
      // If not exact, try substring matching against manual keys (helps with small variations)
      if (!mapped) {
        const match = manualKeys.find(k => k.includes(manualKey) || manualKey.includes(k));
        if (match) mapped = nameToRegion[match];
      }
      // If still not mapped to a manual region, skip — avoids adding 'núcleos', 'portales', fragments
      if (!mapped) {
        diagnostics.push({ key: nm, region: 'skipped', source: (this.allParques || []).includes(ft) ? 'geojson' : 'kml', origin: 'nomatch' });
        return;
      }

      const target = mapped;
      const r = regionOrder.find(rr => rr.id === target) || regionOrder[2];
      // Si la feature seleccionada es KML o no tiene provincia, intentar rellenarla desde el GeoJSON original
      try {
        const hasProvince = !!(ft.properties && (ft.properties.provincia || ft.properties.PROVINCIA || ft.properties.province || ft.properties.description));
        if (!hasProvince && geoByKey[manualKey]) {
          const src = geoByKey[manualKey];
          try {
            ft.properties = ft.properties || {};
            if (src.properties) {
              if (src.properties.description) ft.properties.provincia = src.properties.description;
              else if (src.properties.provincia) ft.properties.provincia = src.properties.provincia;
            }
          } catch (e) { }
        }
      } catch (e) { }

      r.parks.push(ft);

      const source = (this.allParques || []).includes(ft) ? 'geojson' : 'kml';
      diagnostics.push({ key: nm, region: target, source, origin: 'manual' });
    });

    // Guardar
    this.regions = regionOrder;

    // Log de diagnóstico (simplificado)
    try {
      const total = Object.keys(dedup).length;
      this.regions.forEach(r => console.log(`region ${r.id} (${r.name}) => ${r.parks.length} parques`));
      // Print detailed diagnostics for Centro specifically to help debugging
      const centroDiag = diagnostics.filter(d => d.region === 'centro');
      if (centroDiag.length > 0) {
        centroDiag.forEach(d => console.log(`  key='${d.key}' source=${d.source} origin=${d.origin}`));
      }
        // Detalle por región: clave normalizada, nombre mostrado, fuente, provincia detectada, geoByKey
        try {
          this.regions.forEach(region => {
            region.parks.forEach((p: any, idx: number) => {
              try {
                const raw = getRawName(p) || '';
                const key = baseName(raw || '');
                const display = this.getDisplayName(p) || raw || (p.properties && (p.properties.name || p.properties.ROTULO)) || '';
                const src = (this.allParques || []).includes(p) ? 'geojson' : 'kml';
                const prov = this.getProvince(p) || (geoByKey[key] && (geoByKey[key].properties?.description || geoByKey[key].properties?.provincia)) || '';
                const hasGeo = !!(geoByKey[key]);
              } catch (e) { }
            });
          });
        } catch (e) { }
        // Además, log JSON completo y compacto para copiar/pegar
        try {
          const summary = this.regions.map((region: any) => ({
            id: region.id,
            name: region.name,
            count: region.parks.length,
            parks: (region.parks || []).map((p: any) => {
              const raw = getRawName(p) || '';
              const key = baseName(raw || '');
              const display = this.getDisplayName(p) || raw || (p.properties && (p.properties.name || p.properties.ROTULO)) || '';
              const src = (this.allParques || []).includes(p) ? 'geojson' : 'kml';
              const prov = this.getProvince(p) || (geoByKey[key] && (geoByKey[key].properties?.description || geoByKey[key].properties?.provincia)) || '';
              const hasGeo = !!(geoByKey[key]);
              return { key, display, src, prov, hasGeo };
            })
          }));
        } catch (e) { }
    } catch (e) { }
  }

  selectParque(parque: any) {
    this.searchText = parque.properties.name;
    this.filteredParques = [];
    const name = parque.properties.name;
    // Si tenemos un polígono cargado (KML convertido) para este parque, hacer fitBounds a ese polígono
    const poly = this.polygonByName[name];
    if (poly && this.map) {
      try {
        const b = poly.getBounds();
        if (b && b.isValid()) {
          this.map.fitBounds(b, { padding: [40, 40] });
          // abrir popup si existe alguna capa con popup
          try { poly.eachLayer((l: any) => l.openPopup && l.openPopup()); } catch (e) { }
          this.markerZoomed = true;
          return;
        }
      } catch (e) { }
    }
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

  // Devuelve un nombre limpio para mostrar en listas (quita etiquetas ROTULO/Name y HTML)
  getDisplayName(ft: any): string {
    try {
      const props = ft.properties || {};
      let raw = (props.name || props.ROTULO || props.Name || '') + '';
      raw = raw.trim();
      if (!raw && props.description) {
        const desc = (props.description || '') + '';
        const m1 = desc.match(/ROTULO:\s*([^<\n\r]+)/i);
        const m2 = desc.match(/\bName:\s*([^<\n\r]+)/i);
        const m3 = desc.match(/\bname:\s*([^<\n\r]+)/i);
        raw = (m1 && m1[1]) || (m2 && m2[1]) || (m3 && m3[1]) || raw || '';
      }
      let cleaned = (raw || '').replace(/ROTULO:\s*/i, '').replace(/\bname:\s*/i, '');
      cleaned = cleaned.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (!cleaned) cleaned = (ft.properties && (ft.properties.name || ft.properties.ROTULO || ft.properties.Name)) || 'Parque';
      return cleaned;
    } catch (e) { return (ft.properties && (ft.properties.name || ft.properties.ROTULO || ft.properties.Name)) || 'Parque'; }
  }

  // Extrae la provincia desde propiedades o description (mejor esfuerzo)
  getProvince(ft: any): string {
    const props = ft.properties || {};
    const strip = (s: string) => (s || '').toString().replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' ').trim();

    // Candidates from properties (various possible keys)
    const propCandidates = [props.provincia, props.PROVINCIA, props.province, props.PROVINCE, props.admin, props.region, props.department, props.departamento];
    for (const c of propCandidates) {
      if (c && (c + '').trim()) {
        const cleaned = strip(c + '');
        // If contains commas, take the last token or the most likely province token
        const parts = cleaned.split(/[;,\|\-]/).map(p => p.trim()).filter(Boolean);
        if (parts.length) return parts[0];
        return cleaned;
      }
    }

    // Try to extract from description (line-by-line). Prefer explicit 'Provincia:' patterns
    const desc = strip(props.description || '');
    if (desc) {
      const lines = desc.split(/\n+/).map(l => l.trim()).filter(Boolean);
      // pattern: Provincia: X
      for (const ln of lines) {
        const m = ln.match(/(?:provincia|prov)\s*[:\-]\s*(.+)/i);
        if (m && m[1]) return m[1].trim();
      }

      // otherwise try to match any known province name inside the description
      const provinces = ['Buenos Aires','Córdoba','Cordoba','Entre Ríos','Entre Rios','Santa Fe','La Pampa','San Juan','San Luis','La Rioja','Neuquén','Nequen','Río Negro','Rio Negro','Chubut','Santa Cruz','Tierra del Fuego','Misiones','Corrientes','Formosa','Chaco','Catamarca','Jujuy','Salta','Tucumán','Tucuman'];
      const dlow = desc.toLowerCase();
      for (const pr of provinces) {
        if (!pr) continue;
        const low = pr.toLowerCase();
        if (dlow.indexOf(low) >= 0) return pr;
      }
      // As a last resort, if description is short and looks like a province token, return it
      if (lines.length === 1 && lines[0].length < 40) return lines[0];
    }

    return '';
  }

  private loadExternalResources(): Promise<void> {
    const cssUrl = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css';
    const cssUrl2 = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css';
    const scriptUrl = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster-src.js';
    const togeojsonUrl = 'https://unpkg.com/togeojson@0.16.0/dist/togeojson.min.js';

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

    return Promise.all([loadCss(cssUrl), loadCss(cssUrl2), loadScript(scriptUrl), loadScript(togeojsonUrl)]).then(() => undefined as void);
  }

  // Carga KMLs opcionales desde /public y los dibuja como GeoJSON
  private loadKmlOverlays(): void {
    if (!this.map) return;
    // Lista de KMLs esperados (puedes añadir más archivos aquí)
    const kmlFiles = [
      // alternativa sin espacios por si decides renombrarlo
      { url: '/pn-el-rey.kml', name: 'El Rey' },
      { url: '/pn-calilegua.kml', name: 'Calilegua' },
      { url: '/pn-baritu.kml', name: 'Baritú' },
      { url: '/pn-el-impenetrable.kml', name: 'El Impenetrable' },
      { url: '/pn-rio-pilcomayo.kml', name: 'Río Pilcomayo' },
      { url: '/pn-los-cardones.kml', name: 'Los Cardones' },
      { url: '/pn-copo.kml', name: 'El Copo' },
      { url: '/pn-iguazu.kml', name: 'Iguazú' },
      { url: '/pn-aconquija.kml', name: 'Aconquija' },
      { url: '/pn-chaco.kml', name: 'Chaco' },
      { url: '/pn-mburucuya.kml', name: 'Mburucuya' },
      { url: '/pn-ibera.kml', name: 'Iberá' },
      { url: '/pn-san-guillermo.kml', name: 'San Guillermo' },
      { url: '/pn-talampaya.kml', name: 'Talampaya' },
      { url: '/pn-traslasierra.kml', name: 'Traslasierra' },
      { url: '/pn-el-leoncito.kml', name: 'El Leoncito' },
      { url: '/pn-quebrada-del-condorito.kml', name: 'Quebrada del Condorito' },
      { url: '/pn-pre-delta.kml', name: 'Pre-Delta' },
      { url: '/pn-islas-santa-fe.kml', name: 'Islas de Santa Fé' },
      { url: '/pn-el-palmar.kml', name: 'El Palmar' },
      { url: '/pn-sierra-quijadas.kml', name: 'Sierra de las Quijadas' },
      { url: '/pn-ciervo-pantano.kml', name: 'Ciervo de los Pantanos' },
      { url: '/pn-lihue-calel.kml', name: 'Lihué Calel' },
      { url: '/pn-laguna-blanca.kml', name: 'Laguna Blanca' },
      { url: '/pn-lanin.kml', name: 'Lanín' },
      { url: '/pn-nahuel-huapi.kml', name: 'Nahuel-Huapi' },
      { url: '/pn-lago-puelo.kml', name: 'Lago Puelo' },
      { url: '/pn-los-alerces.kml', name: 'Los Alerces' },
      { url: '/pn-patagonia.kml', name: 'Patagonia' },
      { url: '/pn-bosques-petrificados.kml', name: 'Bosques Petrificados' },
      { url: '/pn-isla-pinguino.kml', name: 'Isla Pingüino' },
      { url: '/pn-monte-leon.kml', name: 'Monte León' },
      { url: '/pn-los-glaciares.kml', name: 'Los Glaciares' },
      { url: '/pn-tierra-del-fuego.kml', name: 'Tierra del Fuego' },
      { url: '/pn-costero-patagonia-austral.kml', name: 'Parque Interjurisdiccional Marino Costero Patagonia Austral' },
      { url: '/pn-campos-del-tuyu.kml', name: 'Campos del Tuyú' },
    ];

    kmlFiles.forEach(k => {
      const fetchUrl = encodeURI(k.url);
      fetch(fetchUrl)
        .then(res => {
          if (!res.ok) throw new Error('KML no encontrado: ' + k.url);
          return res.text();
        })
        .then(text => {
          // Parsear KML a DOM
          const parser = new DOMParser();
          const xml = parser.parseFromString(text, 'application/xml');
          // togeojson debe estar cargado por loadExternalResources
          // Aquí probamos las dos variantes de global que puede exponer la librería
          const toGeoJsonFunc = (window as any).togeojson?.kml || (window as any).toGeoJSON?.kml || (window as any).toGeoJSON;
          let gj: any = null;
          try {
            if (typeof toGeoJsonFunc === 'function') gj = toGeoJsonFunc(xml);
            else if (toGeoJsonFunc && typeof toGeoJsonFunc.kml === 'function') gj = toGeoJsonFunc.kml(xml);
          } catch (e) {
            gj = null;
          }
          if (!gj) {
            // Intentar parser de respaldo (manejo básico de LineString y Polygon)
            try {
              const fc: any = { type: 'FeatureCollection', features: [] };
              // Obtener placemarks (compatibilidad con namespaces)
              let placemarks = xml.getElementsByTagName('Placemark');
              if (!placemarks || placemarks.length === 0) placemarks = xml.getElementsByTagNameNS('*', 'Placemark');
              for (let i = 0; i < placemarks.length; i++) {
                const pm = placemarks[i];
                const nameEl = pm.getElementsByTagName('name')[0] || pm.getElementsByTagNameNS('*', 'name')[0];
                const name = nameEl ? (nameEl.textContent || k.name) : k.name;
                // extraer description si existe
                const descEl = pm.getElementsByTagName('description')[0] || pm.getElementsByTagNameNS('*', 'description')[0];
                const description = descEl ? (descEl.textContent || '') : '';
                // extraer ExtendedData -> Data[@name]
                const props: any = { name, description };
                let dataEls = pm.getElementsByTagName('Data');
                if (!dataEls || dataEls.length === 0) dataEls = pm.getElementsByTagNameNS('*', 'Data');
                for (let d = 0; dataEls && d < dataEls.length; d++) {
                  try {
                    const de = dataEls[d];
                    const key = de.getAttribute && de.getAttribute('name') ? de.getAttribute('name') : (de.getElementsByTagName('name')[0]?.textContent || null);
                    const val = (de.getElementsByTagName('value')[0]?.textContent) || '';
                    if (key) props[key] = val;
                  } catch (e) { }
                }

                // Buscar Polygon
                let polys = pm.getElementsByTagName('Polygon');
                if (!polys || polys.length === 0) polys = pm.getElementsByTagNameNS('*', 'Polygon');
                if (polys && polys.length > 0) {
                  const rings: any[] = [];
                  for (let p = 0; p < polys.length; p++) {
                    const poly = polys[p];
                    // Buscar coordinates dentro de LinearRing
                    let coordsEl = poly.getElementsByTagName('coordinates');
                    if (!coordsEl || coordsEl.length === 0) coordsEl = poly.getElementsByTagNameNS('*', 'coordinates');
                    for (let c = 0; c < coordsEl.length; c++) {
                      const txt = coordsEl[c].textContent || '';
                      const pts = txt.trim().split(/\s+/).map((s: string) => {
                        const parts = s.trim().split(',').map((v: string) => parseFloat(v));
                        return [parts[0], parts[1]];
                      }).filter((p: any) => Array.isArray(p) && p.length === 2);
                      if (pts.length) rings.push(pts);
                    }
                  }
                  if (rings.length) {
                    fc.features.push({ type: 'Feature', properties: props, geometry: { type: 'Polygon', coordinates: rings } });
                    continue;
                  }
                }

                // Buscar LineString
                let lines = pm.getElementsByTagName('LineString');
                if (!lines || lines.length === 0) lines = pm.getElementsByTagNameNS('*', 'LineString');
                if (lines && lines.length > 0) {
                  for (let l = 0; l < lines.length; l++) {
                    const ln = lines[l];
                    let coordsEl = ln.getElementsByTagName('coordinates');
                    if (!coordsEl || coordsEl.length === 0) coordsEl = ln.getElementsByTagNameNS('*', 'coordinates');
                    for (let c = 0; c < coordsEl.length; c++) {
                      const txt = coordsEl[c].textContent || '';
                      const pts = txt.trim().split(/\s+/).map((s: string) => {
                        const parts = s.trim().split(',').map((v: string) => parseFloat(v));
                        return [parts[0], parts[1]];
                      }).filter((p: any) => Array.isArray(p) && p.length === 2);
                      if (pts.length) {
                        // Si el primer y último punto no coinciden, cerrar el anillo para formar Polygon
                        const first = pts[0];
                        const last = pts[pts.length - 1];
                        if (first[0] !== last[0] || first[1] !== last[1]) {
                          const polyCoords = pts.concat([first]);
                          fc.features.push({ type: 'Feature', properties: props, geometry: { type: 'Polygon', coordinates: [polyCoords] } });
                        } else {
                          fc.features.push({ type: 'Feature', properties: props, geometry: { type: 'Polygon', coordinates: [pts] } });
                        }
                      }
                    }
                  }
                  continue;
                }
              }
              if (fc.features.length) gj = fc;
            } catch (err) {
              console.warn('toGeoJSON no disponible o conversión falló para', k.url);
              return;
            }
            if (!gj) {
              console.warn('toGeoJSON no disponible o conversión falló para', k.url);
              return;
            }
          }
          // Añadir capa GeoJSON al mapa
          const layer = L.geoJSON(gj, {
            style: (feature: any) => {
              const nm = feature.properties?.name || k.name || '';
              const col = this.colorForCategory(feature.properties?.category || 'default', nm) || '#2c6e2c';
              return { color: col, weight: 3, fillColor: col, fillOpacity: 0.08 };
            },
            onEachFeature: (feature: any, lyr: any) => {
              const title = feature.properties?.name || k.name;
              if (feature.properties) {
                // Añadir popup con información mínima
                const content = `<strong>${title}</strong>` + (feature.properties.description ? `<br/>${feature.properties.description}` : '');
                lyr.bindPopup(content);
              }
            }
          }).addTo(this.map);

          // Guardar por nombre para poder hacer fitBounds al seleccionar
          try { this.polygonByName[k.name] = layer; } catch (e) { }

          // Guardar features KML en índice y reconstruir regiones
            try {
            (gj.features || []).forEach((ft: any) => {
              ft.properties = ft.properties || {};
              if (!ft.properties.name) ft.properties.name = k.name;
              this.kmlFeatures.push(ft);
            });
            try { this.buildRegions(); } catch (e) { console.warn('buildRegions error after loadKmlOverlays', e); }
          } catch (e) { }

        })
        .catch(err => {
          // No es crítico si no existe
          // console.warn('No se cargó KML', k.url, err);
        });
    });
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

    // Límites aproximados de Argentina
    // Hacemos el límite oeste un poco más permisivo (más hacia Chile) para permitir desplazamiento
    const bounds = {
      north: -20.78,
      south: -60.13,
      east: -43.63,
      west: -80.00, // extendido hacia el oeste para permitir mover hacia Chile
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
    } catch (e) { }
    try {
      this.map.on && this.map.on('load', () => {
        const ph = document.getElementById('map-placeholder'); if (ph) ph.classList.add('hidden');
      });
    } catch (e) { }

    setTimeout(() => { try { this.map.invalidateSize(); } catch (e) { } }, 250);

    // Forzar ocultado del placeholder si el mapa ya fue creado (fallback si no se dispararon eventos 'load')
    try {
      const ph = document.getElementById('map-placeholder');
      if (ph) ph.classList.add('hidden');
    } catch (e) { }

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
        (this.allParques || []).forEach((f: any) => {
          if (!f.geometry) return;
          const coords = f.geometry.type === 'Point' ? [f.geometry.coordinates[1], f.geometry.coordinates[0]] : null;
          if (!coords) return;
          const cat = f.properties?.category || 'default';
          const color = this.colorForCategory(cat, f.properties?.name || '');

          const icon = L.divIcon({
            className: 'custom-pin',
            html: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 24 36"><path fill="${color}" d="M12 0C7 0 3.5 3.5 3.5 8.5c0 6.1 8.5 16.8 8.5 16.8s8.5-10.7 8.5-16.8C20.5 3.5 17 0 12 0z"/><circle cx="12" cy="9" r="3" fill="#fff"/></svg>`,
            iconSize: [28, 36],
            iconAnchor: [14, 36],
            popupAnchor: [0, -32]
          });

          const marker = L.marker(coords, { icon });
          const displayName = f.properties?.name || 'Parque';
          const desc = f.properties?.description || '';
          marker.bindPopup(`<strong>${displayName}</strong><br/>${desc}`);
          marker.on && marker.on('click', (e: any) => {
            try { if (e?.originalEvent) L.DomEvent.stopPropagation(e.originalEvent); } catch (err) { }
            try { this.map.setView(marker.getLatLng(), 10); } catch (err) { }
            try { marker.openPopup(); } catch (err) { }
            this.markerZoomed = true;
          });
          markers.push(marker);
          try { this.markerByName[displayName] = marker; } catch (e) { }
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
        // Intentar cargar KMLs opcionales (polígonos de parques)
        try { this.loadKmlOverlays(); } catch (e) { }
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
          const color = this.colorForCategory(p.category, p.name);
          const icon = L.divIcon({
            className: 'custom-pin',
            html: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 24 36"><path fill="${color}" d="M12 0C7 0 3.5 3.5 3.5 8.5c0 6.1 8.5 16.8 8.5 16.8s8.5-10.7 8.5-16.8C20.5 3.5 17 0 12 0z"/><circle cx="12" cy="9" r="3" fill="#fff"/></svg>`,
            iconSize: [28, 36],
            iconAnchor: [14, 36],
            popupAnchor: [0, -32]
          });
          const marker = L.marker([p.lat, p.lon], { icon }).bindPopup(`<strong>${p.name}</strong>`);
          marker.on && marker.on('click', (e: any) => {
            try { if (e?.originalEvent) L.DomEvent.stopPropagation(e.originalEvent); } catch (err) { }
            try { this.map.setView(marker.getLatLng(), 10); } catch (err) { }
            try { marker.openPopup(); } catch (err) { }
            this.markerZoomed = true;
          });
          markers.push(marker);
          try { this.markerByName[p.name] = marker; } catch (e) { }
        });

        if (this.markerClusterGroup) {
          markers.forEach(m => this.markerClusterGroup.addLayer(m));
          this.map.addLayer(this.markerClusterGroup);
        } else {
          markers.forEach(m => m.addTo(this.map));
        }


        if (!this.initializedView) this.updateInteractionLock();
        try { this.loadKmlOverlays(); } catch (e) { }
      })
      ;

    this.map.on('zoomend', () => this.updateInteractionLock());
    this.map.on('click', (e: any) => {
      if (this.markerZoomed && this.argBounds) {
        try {
          this.map.fitBounds(this.argBounds, { padding: [50, 50] });
        } catch (err) { }
        this.markerZoomed = false;
      }
    });
  }

  // Devuelve color según categoría o nombre (permite marcar áreas marinas en azul)
  private colorForCategory(cat: string, name?: string) {
    if (name && typeof name === 'string') {
      const n = name.toLowerCase();
      if (n.includes('pim') || n.includes('isla pinguino') || n.includes('pingüino') || n.includes('patagonia austral') || n.includes('marino')) {
        return '#1f78b4';
      }
    }

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

    // Usar los bounds guardados en this.argBounds (creados al iniciar el mapa)
    const argBounds = this.argBounds || currentBounds;
    const containsAll = currentBounds.contains(argBounds);

    const shouldLock = containsAll || currentZoom <= 5;
    if (shouldLock) {
      try { this.map.dragging.disable(); } catch (e) { }
    } else {
      try { this.map.dragging.enable(); } catch (e) { }
    }
  }

}