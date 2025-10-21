const fs = require('fs').promises;
const https = require('https');
const path = require('path');

const DATA_PATH = path.resolve(__dirname, '..', 'public', 'parques-argentina.geojson');
const BACKUP_PATH = DATA_PATH + '.bak';

function nominatimSearch(q) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=ar`;
  const options = {
    headers: {
      'User-Agent': 'AndesVerdes/1.0 (https://github.com/ApiiStudio/Andes-Verdes)',
      'Accept-Language': 'es'
    }
  };
  return new Promise((resolve, reject) => {
    https.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log('Leyendo', DATA_PATH);
  const raw = await fs.readFile(DATA_PATH, 'utf8');
  const geo = JSON.parse(raw);

  // backup
  await fs.writeFile(BACKUP_PATH, raw, 'utf8');
  console.log('Backup guardado en', BACKUP_PATH);

  const features = geo.features || [];
  const toGeocode = [];
  features.forEach((f, i) => {
    const coords = f.geometry && f.geometry.coordinates;
    if (!coords || !Array.isArray(coords) || coords.length < 2 || coords[0] === null) {
      toGeocode.push({ i, feature: f });
    }
  });

  console.log('Features totales:', features.length);
  console.log('A geocodificar:', toGeocode.length);

  for (let idx = 0; idx < toGeocode.length; idx++) {
    const { i, feature } = toGeocode[idx];
    const name = feature.properties && (feature.properties.name || feature.properties.nombre || '');
    const desc = feature.properties && (feature.properties.description || feature.properties.provincia || '');
    const query = `${name} ${desc} Argentina`;
    console.log(`(${idx+1}/${toGeocode.length}) Buscando:`, query);
    try {
      const res = await nominatimSearch(query);
      if (res && res.length > 0) {
        const r = res[0];
        const lon = parseFloat(r.lon);
        const lat = parseFloat(r.lat);
        features[i].geometry = { type: 'Point', coordinates: [lon, lat] };
        console.log(' -> Encontrado:', lat, lon, `(${r.display_name})`);
      } else {
        console.log(' -> No encontrado');
      }
    } catch (err) {
      console.error('Error en geocoding:', err.message || err);
    }
    // Esperar 1100ms por la política de uso de Nominatim
    await new Promise(r => setTimeout(r, 1100));
  }

  // Guardar cambios
  await fs.writeFile(DATA_PATH, JSON.stringify(geo, null, 2), 'utf8');
  console.log('Archivo actualizado:', DATA_PATH);
  console.log('Proceso finalizado. Revisa el archivo y recarga la página.');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
