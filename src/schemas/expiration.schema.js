const { z } = require('zod');

const createExpirationSchema = z.object({
  title: z.string({
    required_error: 'title is required', // Título obligatorio
  }),
  description: z.string().optional(), // Descripción opcional
  expirationDate: z.string().optional(), // Fecha de expiración opcional
  expirationTime: z.string().optional(), // Hora de expiración opcional
  notified: z.boolean().optional(),
  notify30DaysBefore: z.boolean().optional(), // Notificación 30 días antes (opcional)
  notify90DaysBefore: z.boolean().optional(), // Notificación 90 días antes (opcional)
  assignedTo: z
    .union([
      z.string().trim().min(1, 'assignedTo no puede estar vacío'), // Si se pasa, debe ser una cadena no vacía
      z.array(z.string().min(1)), // O puede ser un array de strings
    ])
    .optional(), // Si no se pasa, se asignará automáticamente el nombre de usuario
});

module.exports = {
  createExpirationSchema,
};


/* const { z } = require('zod');

const createExpirationSchema = z.object({
  title: z.string({
    required_error: 'title is required'
  }),
  description: z.string({
    required_error: 'description is required'
  }),
  expirationDate: z.string({
    required_error: 'expirationDate is required'
  }),
  notify30DaysBefore: z.boolean().optional(),
  notify90DaysBefore: z.boolean().optional(),
  assignedTo: z
    .union([
      z.string().trim().min(1, 'assignedTo no puede estar vacío'),
      z.array(z.string().min(1))
    ])
    .optional()
});

module.exports = {
  createExpirationSchema
};
 */