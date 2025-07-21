const Solution = require('../models/solution.model');
const Fuse = require('fuse.js'); /* Para busqueda difusa, aun no implementado */

// Obtener todas las soluciones
const getSolutions = async (req, res) => {
    try {
        const solutions = await Solution.find();
        res.json(solutions);
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener las soluciones' });
    }
};

// Obtener una solución por ID
const getSolution = async (req, res) => {
    try {
        const solution = await Solution.findById(req.params.id);
        if (!solution) {
            return res.status(404).json({ error: 'Solución no encontrada' });
        }
        res.json(solution);
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener la solución' });
    }
};


// Búsqueda de una solución.
const searchSolutions = async (req, res) => {
    const { query, field } = req.query;
    const words = query
        .split(' ') //Divido cuando hay espacios.
        .map(word => word.trim())   // limpia espacios de cada palabra
        .filter(word => word.length > 0); // Elimina los campos vacíos (Palabras vacías)

  
    // Si `field` está definido y es "all", buscamos en todos los campos
    const allFields = ['title', 'content', 'document_ref', 'notes'];
    const searchFields = field === 'all' || !field ? allFields : [field]; // Si 'field' es 'all' o no está definido, buscar en todos los campos, sino buscar solo en el campo indicado
  
    // Generamos las búsquedas con OR para cada palabra
    const searchCriteria = words.map(word => {
      // Para cada palabra buscamos en los campos seleccionados
      const fieldCriteria = searchFields.map(f => ({
        [f]: { $regex: word, $options: 'i' }
      }));
      return { $or: fieldCriteria };  // Usamos $or para buscar en cualquiera de los campos seleccionados
    });
  
    try {
      // Buscamos usando AND para que todas las palabras estén presentes en el campo o campos seleccionados
      const solutions = await Solution.find({
        $and: searchCriteria
      });
  
      res.status(200).json(solutions);
    } catch (error) {
      console.error('Error en la búsqueda:', error);
      res.status(500).json({ message: 'Error en la búsqueda' });
    }
  };
  




/* 
Busca y devuelve todas las soluciones.

Para probar hacer un GET a (La palabra prueba debe estar en algun lugar de la busqueda):

Para buscar en todos los campos
http://localhost:3000/api/search?query=busqueda prueba&field=all

PAra buscar en un campo específico
http://localhost:3000/api/search?query=busqueda prueba&field=content
http://localhost:3000/api/search?query=busqueda prueba&field=title
http://localhost:3000/api/search?query=busqueda prueba&field=document_ref

*/


// Crear una nueva solución
const createSolution = async (req, res) => {
    console.log("Funcion creataSolution, inicio");
    try {
        const newSolution = new Solution({
            ...req.body,
            createdBy: req.user.id, // Suponiendo que `req.user.id` viene del middleware de autenticación
            createdAt: new Date()
        });
        await newSolution.save();
        res.status(201).json(newSolution);
    } catch (err) {
        res.status(500).json({ error: 'Error al crear la solución' });
    }
};

/* 
Para verificar
Enviar a: http:///localhost:3000/api/solutions

y en el body: 
{
    "title": "Solución de prueba",
    "content": "Pasos para resolver el problema...",
    "document_ref": "GBA-253-25",
    "status": "activa",
    "notes": "Esto es una nota"
}


*/

// Actualizar una solución
const updateSolution = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content, document_ref, category, status, notes } = req.body;

        // Verificar que todos los campos requeridos estén presentes
        if (!title || !status) {
            return res.status(400).json({ message: 'Los campos "title" y "status" son obligatorios.' });
        }

        const userId = req.user.id; // Asumiendo que `authRequired` agrega el usuario a `req.user`

        // Buscar la solución actual
        const solution = await Solution.findById(id);
        if (!solution) {
            return res.status(404).json({ message: "Solución no encontrada" });
        }

        // Guardar la versión anterior completa en `previousVersion`
        const previousVersion = {
            title: solution.title,
            content: solution.content,
            document_ref: solution.document_ref,
            category: solution.category,
            status: solution.status,
            notes: solution.notes,
            updatedBy: solution.updatedBy,
            updatedAt: solution.updatedAt, // Guardar la fecha de la versión anterior
        };

        // Limpiar previousVersions para no acumular versiones anteriores
        solution.previousVersions = [previousVersion]; // Mantener solo la última versión anterior

        // Establecer la nueva versión actual
        solution.title = title;
        solution.content = content;
        solution.document_ref = document_ref;
        solution.category = category;
        solution.status = status;
        solution.notes = notes;
        solution.updatedBy = userId;
        solution.updatedAt = new Date();

        // Guardar los cambios
        const updatedSolution = await solution.save();

        // Responder con la solución actualizada
        res.json({
            message: "Solución actualizada",
            solution: updatedSolution
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error al actualizar la solución" });
    }
};

/* 
PAra probarla hay que tener la ide de una tarea y enviar todos los datos de la tarea modificados mediante un put
PUT a http://localhost:3000/api/solutions/67dae6875a68f4f0c585be11 (67dae6875a68f4f0c585be11 es la id de mi tarea)
con el json completo:

{
  "title": "Nuevo título 7",
  "content": "Nuevo contenido actualizado 7...",
  "document_ref": "GBA-253-26",
  "category": "General",
  "status": "activa",
  "notes": "Esto es una nota"
}


*/


// Eliminar una solución
const deleteSolution = async (req, res) => {
    try {
        const solution = await Solution.findByIdAndDelete(req.params.id);
        if (!solution) {
            return res.status(404).json({ error: 'Solución no encontrada' });
        }
        res.json({ message: 'Solución eliminada con éxito' });
    } catch (err) {
        res.status(500).json({ error: 'Error al eliminar la solución' });
    }
};

module.exports = {
    getSolutions,
    getSolution,
    createSolution,
    searchSolutions,
    updateSolution,
    deleteSolution
};
