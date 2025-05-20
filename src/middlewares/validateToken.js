// src/middlewares/validateToken.js
const jwt = require("jsonwebtoken");
const { TOKEN_SECRET } = require("../config");

const authRequired = (req, res, next) => {
    console.log("Ingreso a authRequired");

    // Extraer el token de las cookies
    const { token } = req.cookies;
    console.log("Token recibido:", token);

    // Verificar si el token existe
    if (!token) {
        return res.status(401).json({ message: "No token, authorization denied" });
    }

    try {
        // Verificar el token de forma síncrona (sin callback)
        const decoded = jwt.verify(token, TOKEN_SECRET);
        console.log("Token decodificado:", decoded);

        // Asignar los datos del usuario a req.user
        req.user = decoded;
        console.log("Usuario asignado a req.user:", req.user);

        console.log("Token Verificado.")
        // Continuar al siguiente middleware o controlador
        next();
    } catch (error) {
        console.error("Error al verificar el token:", error.message);
        return res.status(401).json({ message: "Invalid Token" });
    }
};

module.exports = { authRequired };