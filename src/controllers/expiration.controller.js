const Expiration = require('../models/expiration.model.js');

// GET múltiples expirations
const getExpirations = async (req, res) => {
  try {
    const expirations = await Expiration.find({
      assignedTo: req.user.username
    });
    res.json(expirations);
  } catch (error) {
    console.error('Error al obtener expirations:', error);
    res.status(500).json({ message: 'Error al obtener expirations' });
  }
};

// POST - Crear nuevo expiration
const createExpiration = async (req, res) => {
  console.log("datos del body");
  console.log(req.body);
  try {
    const {
      title,
      description,
      expirationDate,
      expirationTime,
      notify30DaysBefore = false,
      notify90DaysBefore = false,
      assignedTo
    } = req.body;

    // Asignar el usuario automáticamente si no se pasa assignedTo
    const assignedUsers = Array.isArray(assignedTo)
      ? assignedTo
      : typeof assignedTo === 'string' && assignedTo.trim().length > 0
      ? [assignedTo.trim()]
      : [req.user.username];

    const newExpiration = new Expiration({
      title,
      description,
      expirationDate,
      expirationTime,
      notify30DaysBefore,
      notify90DaysBefore,
      assignedTo: assignedUsers
    });

    const savedExpiration = await newExpiration.save();
    res.status(201).json(savedExpiration);
  } catch (error) {
    console.error('Error al crear expiration:', error);
    res.status(500).json({ message: 'Error al crear expiration' });
  }
};

// GET uno
const getExpiration = async (req, res) => {
  try {
    const expiration = await Expiration.findById(req.params.id);
    if (!expiration)
      return res.status(404).json({ message: 'Expiration not found' });

    res.json(expiration);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving the expiration' });
  }
};

// PUT o PATCH
const updateExpiration = async (req, res) => {
  try {
    const expiration = await Expiration.findByIdAndUpdate(req.params.id, req.body, {
      new: true
    });
    if (!expiration)
      return res.status(404).json({ message: 'Expiration not found' });

    res.json(expiration);
  } catch (error) {
    res.status(500).json({ message: 'Error updating expiration' });
  }
};

// DELETE
const deleteExpiration = async (req, res) => {
  try {
    const expiration = await Expiration.findByIdAndDelete(req.params.id);
    if (!expiration)
      return res.status(404).json({ message: 'Expiration not found' });

    res.json(expiration);
  } catch (error) {
    res.status(500).json({ message: 'Error deleting expiration' });
  }
};

module.exports = {
  getExpirations,
  getExpiration,
  createExpiration,
  updateExpiration,
  deleteExpiration
};


