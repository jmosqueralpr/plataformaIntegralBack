/* Schema de los datos año a año de las bases */

const { z } = require('zod');

const a_enviarItemSchema = z.object({
  nombre: z.string({
    required_error: 'nombre es requerido'
  }).trim().min(1, 'El nombre no puede estar vacío'),
  cantidad: z.number().int().min(1).default(1),
  preparado: z.boolean().default(false)
});

function normalizeAEnviar(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return [];
    return trimmed.split(/[\n;]+/).map(line => {
      const clean = line.trim();
      if (!clean) return null;
      return { nombre: clean, cantidad: 1, preparado: false };
    }).filter(Boolean);
  }
  return [];
}

const createBaseAnualSchema = z.object({
  base_id: z.string({
    required_error: 'base_id es requerido'
  }),

  anio: z.number({
    required_error: 'anio es requerido'
  }).int().min(1900),

  necesidades_campania: z.string().optional(),
  a_enviar: z.union([z.array(a_enviarItemSchema), z.string()]).optional().transform(normalizeAEnviar).default([]),
  enviado: z.boolean().optional(),
  tareas_ejecutadas: z.string().optional(),
  tareas_pendientes: z.string().optional(),

  elementos_entregados: z.union([z.array(a_enviarItemSchema), z.string()]).optional().transform(normalizeAEnviar).default([]),
  tareas_a_realizar: z.string().optional(),
  elementos_proxima_campania: z.string().optional(),
  tareas_proxima_campania: z.string().optional(),

  nombre_contacto: z.string().optional(),
  tel_contacto: z.string().optional()
});

const updateBaseAnualSchema = createBaseAnualSchema.partial().omit({ base_id: true, anio: true });

module.exports = {
  createBaseAnualSchema,
  updateBaseAnualSchema
};
