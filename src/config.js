/* SECRET KEY FOR TOKEN */
const TOKEN_SECRET = 'some secret key';
/* SERVER PORT */
const PORT = '3000';
/* URL BASE FOR ROUTES */
const BASE_URL = '';
/* URL ORIGIN FOR URL*/
const DB_URL = process.env.MONGO_URL || 'mongodb://localhost/merndb'; /* Para usar la variable de entorno en docker y fuera de docker la variable que fijo ahi */
/* URL ORIGIN FRONTEND FOR CORS */
const ORIGIN_URL = 'http://localhost:5173';


module.exports = { 
    TOKEN_SECRET,
    PORT,
    BASE_URL,
    DB_URL,
    ORIGIN_URL
};