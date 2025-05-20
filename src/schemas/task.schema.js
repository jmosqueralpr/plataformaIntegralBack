
    const { z } = require('zod');

    const createTaskSchema = z.object({
      title: z.string({
        required_error: 'title is required'
      }),
      description: z.string({
        required_error: 'description is required'
      }),
      reminderDate: z.coerce.date().optional(),
      sendWhatsAppOwner: z.boolean().optional(),
      sendWhatsAppAssignedTo: z.boolean().optional(),
      status: z.enum(['No iniciada', 'En proceso', 'Finalizada']).optional(),
      importance: z.enum(['Baja', 'Media', 'Alta', 'Urgente']).optional(),
      assignedTo: z
        .union([
          z.string().trim().min(1, 'assignedTo no puede estar vacío'),
          z.array(z.string().min(1))
        ])
        .optional()
    });
    
    module.exports = {
      createTaskSchema
    };
    