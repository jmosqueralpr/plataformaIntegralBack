const User = require('../models/user.model');

const isAdministrator = (role) => {
  const normalizedRole = String(role || '')
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '');

  return normalizedRole === 'admin' || normalizedRole === 'superadmin';
};

const adminRequired = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('role');
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    if (!isAdministrator(user.role)) {
      return res.status(403).json({ message: 'Esta opción está disponible solo para administradores.' });
    }

    return next();
  } catch (error) {
    console.error('Error al verificar permisos de administrador:', error.message);
    return res.status(500).json({ message: 'No se pudieron verificar los permisos.' });
  }
};

module.exports = { adminRequired };
