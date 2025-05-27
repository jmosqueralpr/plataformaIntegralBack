/* SECRET KEY FOR TOKEN */
const TOKEN_SECRET = 'some secret key';
/* SERVER PORT */
const PORT = '3000';
/* URL BASE FOR ROUTES */
const BASE_URL = '';
/* URL ORIGIN FOR URL*/
const DB_URL = process.env.MONGO_URL || 'mongodb://localhost/merndb'; /* Para usar la variable de entorno en docker y fuera de docker la variable que fijo ahi */
/* URL ORIGIN FRONTEND PARA CORS, ASI PUEDE ACEPTAR localhost en desarrollo y la otra en produccion */
const ORIGIN_URL = process.env.ORIGIN_URL || 'http://localhost:5173';



module.exports = { 
    TOKEN_SECRET,
    PORT,
    BASE_URL,
    DB_URL,
    ORIGIN_URL
};