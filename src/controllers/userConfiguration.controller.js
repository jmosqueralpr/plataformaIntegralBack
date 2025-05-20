
// CREATE PAGE ACCESS.
const UserConfiguration = require('../models/userConfiguration.model');

// CREATE USER CONFIGURATION
const createUserConfiguration = async (req, res) => {
    try {
        const existingConfig = await UserConfiguration.findOne({ user: req.user.id });
        console.log('Existe la configuracion?' , existingConfig);
        
        if (existingConfig) { //Si existe el usuario respondo con éste mensaje.
            console.log('Entra al if cuando existe la configuración')
            return res.status(400).json({ message: "Configuration for this user already exists." });
        }

        // Si no hay configuración existente, procedemos a crear una nueva
        // const { dashboard, settings, profile, taskManager, bitWarden, comprasHidrovia, comprasEmepa, comprasDYB, gpsUnitsConverter, guiaLinternista, downloadGestionar } = req.body;
        
        const newUserConfiguration = new UserConfiguration({
           /*  dashboard,
            settings,
            profile,
            taskManager,
            bitWarden,
            comprasHidrovia,
            comprasEmepa,
            comprasDYB,
            gpsUnitsConverter,
            guiaLinternista,
            downloadGestionar, */
            user: req.user.id
        });

        const savedUserConfiguration = await newUserConfiguration.save();
        res.json(savedUserConfiguration);
    } catch (error) {
        // Manejo de errores inesperados
        res.status(500).json({ message: "Error creating user configuration", error: error.message });
    }
};

//GET USER CONFIGURATION

const getUserConfiguration = async (req, res) => {

    const configuration = await UserConfiguration.find({
        user: req.user.id //Busco en función del usuario en la bas de datos.
    }).populate('user');
    res.json(configuration); //Devuelvo como respuesta la configuración.




}

// Exportando la función en CommonJS
module.exports = {
    createUserConfiguration,
    getUserConfiguration
};