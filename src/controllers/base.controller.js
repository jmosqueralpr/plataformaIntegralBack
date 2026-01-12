const Base = require('../models/base.model.js');

// GET ALL BASES
const getBases = async (req, res) => {
  try {
    const bases = await Base.find();
    res.json(bases);
  } catch (error) {
    console.error('Error al obtener bases:', error);
    res.status(500).json({ message: 'Error al obtener bases' });
  }
};

// GET ONE BASE
const getBase = async (req, res) => {
  try {
    const base = await Base.findById(req.params.id);
    if (!base) {
      return res.status(404).json({ message: 'Base no encontrada' });
    }
    res.json(base);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener la base' });
  }
};

// CREATE BASE
const createBase = async (req, res) => {
  try {
    const newBase = new Base(req.body);
    const savedBase = await newBase.save();
    res.status(201).json(savedBase);
  } catch (error) {
    console.error('Error creando base:', error);
    res.status(500).json({ message: 'Error creando base' });
  }
};

// UPDATE BASE
const updateBase = async (req, res) => {
  try {
    const base = await Base.findByIdAndUpdate(req.params.id, req.body, {
      new: true
    });

    if (!base) {
      return res.status(404).json({ message: 'Base no encontrada' });
    }

    res.json(base);
  } catch (error) {
    res.status(500).json({ message: 'Error actualizando base' });
  }
};

// DELETE BASE
const deleteBase = async (req, res) => {
  try {
    const base = await Base.findByIdAndDelete(req.params.id);
    if (!base) {
      return res.status(404).json({ message: 'Base no encontrada' });
    }
    res.json(base);
  } catch (error) {
    res.status(500).json({ message: 'Error eliminando base' });
  }
};

module.exports = {
  getBases,
  getBase,
  createBase,
  updateBase,
  deleteBase
};
