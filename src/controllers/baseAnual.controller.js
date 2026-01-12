const BaseAnual = require('../models/baseAnual.model.js');

// GET BY BASE
const getBaseAnualByBase = async (req, res) => {
  try {
    const registros = await BaseAnual.find({ base_id: req.params.baseId })
      .sort({ anio: -1 });

    res.json(registros);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener historial anual' });
  }
};

// CREATE
const createBaseAnual = async (req, res) => {
    try {
    const nuevoRegistro = new BaseAnual(req.body);
    const saved = await nuevoRegistro.save();
    res.status(201).json(saved);
  } catch (error) {
    if (error.code === 11000) { /* El error 11000 es un error por codigo duplicado */
      return res.status(409).json({
        message: 'Ya existe un registro para ese año en esta base'
      });
    }
    res.status(500).json({ message: 'Error creando registro anual' });
  }

};

// UPDATE
const updateBaseAnual = async (req, res) => {
  try {
    const registro = await BaseAnual.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!registro) {
      return res.status(404).json({ message: 'Registro no encontrado' });
    }

    res.json(registro);
  } catch (error) {
    res.status(500).json({ message: 'Error actualizando registro anual' });
  }
};

// DELETE
const deleteBaseAnual = async (req, res) => {
  try {
    const registro = await BaseAnual.findByIdAndDelete(req.params.id);
    if (!registro) {
      return res.status(404).json({ message: 'Registro no encontrado' });
    }
    res.json(registro);
  } catch (error) {
    res.status(500).json({ message: 'Error eliminando registro anual' });
  }
};

module.exports = {
  getBaseAnualByBase,
  createBaseAnual,
  updateBaseAnual,
  deleteBaseAnual
};
