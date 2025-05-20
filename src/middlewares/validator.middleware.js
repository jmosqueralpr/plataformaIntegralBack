


//Acá ejecuto la validación.
const validateSchema = (schema) => (req, res, next) => {
    try{
        schema.parse(req.body) //El método parse valida el schema, se valida con el req.body que es lo que llega.
        next();
    } catch (error) { //NEcesito para que no crashee el servidor.
        console.error("❌ Error en validación:", error);
/*         return res.status(400).json({ error }); //asi estoy devolviendo el error pero completo */
         return res.status(400).json({error: error.errors.map(error => error.message)}); //Aca solo voy a devolver los mensajes de error.
    }
};

module.exports = {
    validateSchema
};