const mongoose = require("mongoose");

const solutionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    document_ref: { type: String, default: null }, // Opcional
    category: { type: String, default: "General" },
    status: {
      type: String,
      enum: ["activa", "en revisión", "obsoleta"],
      required: true
    },
    notes: { type: String, default: "" },

    // Metadatos de creación
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    createdAt: { type: Date, default: Date.now },

    // Metadatos de actualización
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    updatedAt: { type: Date, default: null },

    // Historial de versiones anteriores (se guarda un array en lugar de solo una)
    previousVersions: [
      {
        title: String,
        content: String,
        document_ref: String,
        category: String,
        status: String,
        notes: String,
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        updatedAt: Date
      }
    ]
  },
  { timestamps: true } // Automático `createdAt` y `updatedAt`
);

module.exports = mongoose.model("Solution", solutionSchema);
