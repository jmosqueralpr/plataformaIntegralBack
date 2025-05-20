const { z } = require("zod");

const solutionSchema = z.object({
    title: z.string({
        required_error: "El título es obligatorio"
    }),
    content: z.string({
        required_error: "El contenido es obligatorio"
    }),
    document_ref: z.string().optional(), // Ahora es opcional
    category: z.string().optional(),
    status: z.enum(["activa", "en revisión", "obsoleta"], {
        required_error: "El estado es obligatorio"
    }),
    notes: z.string().optional()
});

module.exports = { solutionSchema };
