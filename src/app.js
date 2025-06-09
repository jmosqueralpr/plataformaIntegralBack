const express = require('express'); //Importo
const path = require('path');
const morgan = require('morgan');
const cookieParser =  require('cookie-parser');
const cors = require('cors'); // Importo cors
require('dotenv').config(); //Para cargar las variables de entorno

const authRoutes = require('./routes/auth.routes.js');
const taskRoutes = require('./routes/task.routes.js');
const expirationRoutes = require('./routes/expiration.routes.js');
const userConfigurationRoutes = require('./routes/userConfiguration.routes.js');
const solutionRoutes = require('./routes/solution.routes.js');
const telegramRoutes = require('./routes/telegram.routes.js');

/* Config */
const { ORIGIN_URL } = require('./config.js');

const frontEndPath = path.join(__dirname, '../../plaltaformaIntegralFront/dist');


const app = express(); //Inicializo


/* // Middleware de CORS
app.use(cors({
    origin: '*', // Permitir todos los orígenes
    methods: 'GET,POST,PUT,DELETE', // Métodos permitidos
    allowedHeaders: ['Content-Type', 'Authorization'], // Encabezados permitidos
    credentials: true, // Permitir cookies, si es necesario
  })); */

//app.use(cors()); //Con esta configuración cors anduvo bien, pero con problemas con los GET.

app.use(cors({
  origin: [
    'http://localhost:5173', // Para acceso ejecutando vite.
    'http://190.13.215.102:5500', //Para acceso instalando el servidor en la red de idm
    'http://190.210.40.127:5500', //Para acceso instalando el servidor en la red de GBA.
    'http://localhost:4173',
    'http://localhost:5500', //Para acceso local sirviendo el front de forma local.
    'https://plataformaintegral.netlify.app', // Producción
  ],
  credentials: true, //Con esto acepto las credenciales del token.
}));
/* 
app.use(cors({
  origin: '*', // Acepta todos los orígenes
})); */



app.use(morgan('dev'));  //Uso morgan en el modo dev.

app.use(cookieParser()); //Cada vez que se recibe una cookie, se convierte en un objeto json.

app.use(express.json()); //Para que express pueda entender los datos json que enviamos en el body.

app.use( '/api', authRoutes); //Uso las rutas de autentificación. Hago que todas las rutas de authRoutes se deban acceder agregando /api.

app.use('/api', taskRoutes); //Hago que las rutas de task se accedan anteponiendo /api.

app.use('/api', expirationRoutes); //Rutas del modulo de vencimientos.

app.use('/api', solutionRoutes); //Hago que las rutas de solution se accedan atneponiendo /api

app.use('/api', userConfigurationRoutes); //Hago que las rutas userConfiguration se accedan anteponiendo /api.

app.use('/api', telegramRoutes); //Rutas de telegram para enviar un mensaje desde la web.

app. use(express.static(frontEndPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(frontEndPath, 'index.html'));
});

module.exports = app;
