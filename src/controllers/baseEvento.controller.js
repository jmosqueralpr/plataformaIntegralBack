const Evento = require('../models/baseEvento.model.js');

// GET EVENTS BY BASE
const getEventosByBase = async (req, res) => {
  try {
    const eventos = await Evento.find({ base_id: req.params.baseId })
      .sort({ fecha_evento: -1 });

    res.json(eventos);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener eventos' });
  }
};

// CREATE EVENT
const createEvento = async (req, res) => {
  try {
    const evento = new Evento(req.body);
    const savedEvento = await evento.save();
    res.status(201).json(savedEvento);
  } catch (error) {
    res.status(500).json({ message: 'Error creando evento' });
  }
};

// UPDATE EVENT
const updateEvento = async (req, res) => {
  try {
    const evento = await Evento.findByIdAndUpdate(req.params.id, req.body, {
      new: true
    });

    if (!evento) {
      return res.status(404).json({ message: 'Evento no encontrado' });
    }

    res.json(evento);
  } catch (error) {
    res.status(500).json({ message: 'Error actualizando evento' });
  }
};

// DELETE EVENT
const deleteEvento = async (req, res) => {
  try {
    const evento = await Evento.findByIdAndDelete(req.params.id);
    if (!evento) {
      return res.status(404).json({ message: 'Evento no encontrado' });
    }
    res.json(evento);
  } catch (error) {
    res.status(500).json({ message: 'Error eliminando evento' });
  }
};

module.exports = {
  getEventosByBase,
  createEvento,
  updateEvento,
  deleteEvento
};
