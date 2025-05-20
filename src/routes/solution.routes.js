const express = require('express');
const { authRequired } = require('../middlewares/validateToken.js');
const { validateSchema } = require('../middlewares/validator.middleware.js');
const { solutionSchema } = require('../schemas/solution.schema.js'); // Esquema de validación
const {
    getSolution,
    getSolutions,
    searchSolutions,
    createSolution,
    updateSolution,
    deleteSolution
} = require('../controllers/solution.controller.js'); // Controladores para manejar la lógica de las rutas

const router = express.Router();

// CRUD
// Obtener varias soluciones
// router.get('/solutions', authRequired, getSolutions);

// Obtener una solución específica
// router.get('/solutions/:id', authRequired, getSolution);

// Buscador de soluciones - Ok
router.get('/search', authRequired, searchSolutions);

// Crear una nueva solución - Ok
router.post('/solutions', authRequired, validateSchema(solutionSchema), createSolution); // Aquí validamos autenticación y el esquema

// Eliminar una solución
router.delete('/solutions/:id', authRequired, deleteSolution);

// Modificar una solución - Ok
router.put('/solutions/:id', authRequired, updateSolution); // Aquí validamos el esquema

module.exports = router;
