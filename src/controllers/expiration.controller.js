const Expiration = require('../models/expiration.model.js');
const User = require('../models/user.model.js');

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
  try {
    const {
      title,
      description,
      expirationDate,
      expirationTime = '10:00',
      reminders = {},
      assignedTo
    } = req.body;

    const assignedUsers = Array.isArray(assignedTo)
      ? assignedTo
      : typeof assignedTo === 'string' && assignedTo.trim().length > 0
      ? [assignedTo.trim()]
      : [req.user.username];

    const newExpiration = new Expiration({
      title,
      description,
      expirationDate,
      expirationTime: expirationTime || '10:00',
      reminders: {
        onExpiration: reminders.onExpiration ?? true,
        tenDaysBefore: reminders.tenDaysBefore ?? true,
        customDaysBefore: reminders.customDaysBefore ?? null
      },
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
    const currentExpiration = await Expiration.findById(req.params.id);
    if (!currentExpiration)
      return res.status(404).json({ message: 'Expiration not found' });

    const changes = { ...req.body };
    if (Object.prototype.hasOwnProperty.call(changes, 'expirationTime')) {
      changes.expirationTime = changes.expirationTime || '10:00';
    }
    if (
      Object.prototype.hasOwnProperty.call(changes, 'expirationDate') &&
      changes.expirationDate !== currentExpiration.expirationDate
    ) {
      changes.sentReminders = [];
    }

    if (changes.reminders) {
      changes.reminders = {
        onExpiration: changes.reminders.onExpiration ?? currentExpiration.reminders?.onExpiration ?? true,
        tenDaysBefore: changes.reminders.tenDaysBefore ?? currentExpiration.reminders?.tenDaysBefore ?? true,
        customDaysBefore: changes.reminders.customDaysBefore ?? currentExpiration.reminders?.customDaysBefore ?? null
      };
    }

    const expiration = await Expiration.findByIdAndUpdate(req.params.id, changes, {
      new: true,
      runValidators: true
    });
    res.json(expiration);
  } catch (error) {
    console.error('Error updating expiration:', error);
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

// GET resumen de vencimientos para el dashboard (próximos y vencidos)
const getExpirationSummary = async (req, res) => {
  try {
    const expirations = await Expiration.find({
      assignedTo: req.user.username
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sevenDaysLater = new Date(today);
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

    const vencidos = [];
    const proximos = [];

    expirations.forEach((exp) => {
      const expDate = new Date(exp.expirationDate);
      expDate.setHours(0, 0, 0, 0);

      if (expDate < today) {
        vencidos.push(exp);
      } else if (expDate <= sevenDaysLater) {
        proximos.push(exp);
      }
    });

    vencidos.sort((a, b) => new Date(a.expirationDate) - new Date(b.expirationDate));
    proximos.sort((a, b) => new Date(a.expirationDate) - new Date(b.expirationDate));

    res.json({
      proximos: proximos.slice(0, 2),
      vencidos: vencidos.slice(0, 2)
    });
  } catch (error) {
    console.error('Error al obtener resumen de vencimientos:', error);
    res.status(500).json({ message: 'Error al obtener resumen de vencimientos' });
  }
};

// GET preferencias de notificación del usuario
const getNotificationPreferences = async (req, res) => {
  try {
    const user = await User.findOne({ username: req.user.username }).select('notificationPreferences');
    const prefs = user?.notificationPreferences || { telegram: true, email: false };
    res.json(prefs);
  } catch (error) {
    console.error('Error al obtener preferencias:', error);
    res.status(500).json({ message: 'Error al obtener preferencias' });
  }
};

// PUT preferencias de notificación del usuario
const updateNotificationPreferences = async (req, res) => {
  try {
    const { telegram, email } = req.body;
    const user = await User.findOneAndUpdate(
      { username: req.user.username },
      { 
        $set: { 
          notificationPreferences: {
            telegram: telegram ?? true,
            email: email ?? false
          }
        }
      },
      { new: true }
    ).select('notificationPreferences');
    
    res.json(user?.notificationPreferences || { telegram: true, email: false });
  } catch (error) {
    console.error('Error al actualizar preferencias:', error);
    res.status(500).json({ message: 'Error al actualizar preferencias' });
  }
};

module.exports = {
  getExpirations,
  getExpiration,
  createExpiration,
  updateExpiration,
  deleteExpiration,
  getExpirationSummary,
  getNotificationPreferences,
  updateNotificationPreferences
};


