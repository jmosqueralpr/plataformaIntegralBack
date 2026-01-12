/* Schema de los datos año a año de las bases */

const { z } = require('zod');

const createBaseAnualSchema = z.object({
  base_id: z.string({
    required_error: 'base_id es requerido'
  }),

  anio: z.number({
    required_error: 'anio es requerido'
  }).int().min(1900),

  elementos_entregados: z.string().optional(),
  tareas_a_realizar: z.string().optional(),

  elementos_proxima_campania: z.string().optional(),
  tareas_proxima_campania: z.string().optional(),

  nombre_contacto: z.string().optional(),
  tel_contacto: z.string().optional()
});

module.exports = {
  createBaseAnualSchema
};
