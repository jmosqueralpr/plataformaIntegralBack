const { z } = require('zod');

const createExpirationSchema = z.object({
  title: z.string({
    required_error: 'title is required',
  }),
  description: z.string().optional(),
  expirationDate: z.string({
    required_error: 'expirationDate is required',
  }),
  expirationTime: z.string().optional(),
  reminders: z.object({
    onExpiration: z.boolean().optional(),
    tenDaysBefore: z.boolean().optional(),
    customDaysBefore: z.number().int().min(1).max(365).nullable().optional(),
  }).optional(),
  assignedTo: z
    .union([
      z.string().trim().min(1, 'assignedTo no puede estar vacío'),
      z.array(z.string().min(1)),
    ])
    .optional(),
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