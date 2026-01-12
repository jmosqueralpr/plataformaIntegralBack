/* Schema de los eventos que ocurrieron en las bases */

const { z } = require('zod');

const createEventoSchema = z.object({
  base_id: z.string({
    required_error: 'base_id es requerido'
  }),

  fecha_evento: z.coerce.date({
    required_error: 'fecha_evento es requerida'
  }),

  fecha_resolucion: z.coerce.date().optional(),

  titulo_evento: z.string({
    required_error: 'titulo_evento es requerido'
  }).min(1),

  descripcion_evento: z.string({
    required_error: 'descripcion_evento es requerida'
  }).min(1)
});

module.exports = {
  createEventoSchema
};
