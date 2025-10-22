const User = require('../models/user.model.js');

// Middleware para bloquear acciones a usuarios guest
const blockGuest = async (req, res, next) => {
  const user = req.user; // Asumimos que tu auth middleware coloca el usuario en req.user

  if (!user) {
    return res.status(401).json({ message: "No autenticado" });
  }

  try {
    // Buscamos el usuario en la base de datos por username
    const userFound = await User.findOne({ username: user.username });

    if (!userFound) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // Bloqueamos si el rol es 'guest' o el username es 'invitado'
    if (userFound.role === 'guest') {
      return res.status(403).json({ message: "Los usuarios invitados no pueden realizar esta acción" });
    }


    console.log("al final, sale el role? lo encuentra?")
    console.log(userFound.role)

    next(); // Si no es invitado, continúa normalmente
  } catch (error) {
    console.error("Error validando usuario invitado:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

module.exports = {
  blockGuest
};
