const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../infoGral');
const DATA_FILE = path.join(DATA_DIR, 'aisSources.json');

/* Asegurar que el directorio exista */
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

/* Cargar configuraciones de fuentes desde archivo JSON */
const loadAisSources = () => {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return [];
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    if (!raw.trim()) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error cargando configuraciones de fuentes AIS:', error.message);
    return [];
  }
};

/* Guardar configuraciones de fuentes en archivo JSON */
const saveAisSources = (sources) => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(sources, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error guardando configuraciones de fuentes AIS:', error.message);
    return false;
  }
};

/* Agregar una nueva fuente a la persistencia */
const appendAisSource = (sourceConfig) => {
  const existing = loadAisSources();
  existing.push(sourceConfig);
  return saveAisSources(existing);
};

/* Actualizar una fuente existente por sourceId */
const updateAisSource = (sourceId, updates) => {
  const existing = loadAisSources();
  const index = existing.findIndex((s) => s.sourceId === sourceId);
  if (index === -1) return false;
  existing[index] = { ...existing[index], ...updates };
  return saveAisSources(existing);
};

/* Eliminar una fuente por sourceId */
const removeAisSource = (sourceId) => {
  const existing = loadAisSources();
  const filtered = existing.filter((s) => s.sourceId !== sourceId);
  if (filtered.length === existing.length) return false;
  return saveAisSources(filtered);
};

module.exports = {
  loadAisSources,
  saveAisSources,
  appendAisSource,
  updateAisSource,
  removeAisSource,
  DATA_FILE,
};
