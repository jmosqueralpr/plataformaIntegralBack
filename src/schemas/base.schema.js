/* Schema de los datos fijos de la base */

const { z } = require('zod');

const createBaseSchema = z.object({
  nombre_base: z.string({
    required_error: 'nombre_base es requerido'
  }).min(1),

  tipo_base: z.string({
    required_error: 'tipo_base es requerido'
  }).min(1),

  descripcion_base: z.string().optional(),

  nombre_comunicante: z.string().optional(),
  tel_comunicante: z.string().optional(),

  descripcion_ais_rx: z.string().optional(),
  descripcion_ais_tx: z.string().optional()
});

module.exports = {
  createBaseSchema
};
