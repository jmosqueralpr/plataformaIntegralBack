/* const app = require('./app.js');
const connectdb = require('./db.js'); //Importo a la función connectdb
const { PORT } = require('./config.js');

connectdb(); //Utilizo la función connectdb

app.listen(PORT); //
console.log(`Server on port: 3000`); */

const app = require('./app.js');
const connectdb = require('./db.js');
const { PORT } = require('./config.js');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { connectToSerialServer } = require('./utils/tcpMonitor');

connectdb();

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

server.listen(PORT, () => {
  console.log(`🚀 Server on port: ${PORT}`);

  /* Conexiones RS232 a estaciones AIS */
  connectToSerialServer('AIS_Bs_As', '190.210.40.127', 3101);
  connectToSerialServer('AIS_Rosario', '190.210.40.127', 3102);
  connectToSerialServer('AIS_Montevideo', '190.210.40.127', 3103);
  connectToSerialServer('AIS_Parana', '190.210.40.127', 3104);
  connectToSerialServer('AIS_Barranqueras', '190.210.40.127', 3105);
  connectToSerialServer('AIS_Bella_Vista', '190.210.40.127', 3106);
  connectToSerialServer('AIS_Carabelitas', '190.210.40.127', 3107);
  connectToSerialServer('AIS_Diamante', '190.210.40.127', 3108);
  connectToSerialServer('AIS_Empedrado', '190.210.40.127', 3109);
  connectToSerialServer('AIS_La_Paz', '190.210.40.127', 3110);
  connectToSerialServer('AIS_La_Plata', '190.210.40.127', 3111);
  connectToSerialServer('AIS_Punta_Indio', '190.210.40.127', 3112);
  connectToSerialServer('AIS_Ramallo', '190.210.40.127', 3113);
  connectToSerialServer('AIS_San_Pedro', '190.210.40.127', 3114);
  connectToSerialServer('AIS_Veractiva', '190.210.40.127', 3115);
  connectToSerialServer('AIS_Marine_Traffic', '190.210.40.127', 3116);

});

// Opcional: emitir por WebSocket cada X segundos si hay datos
/* setInterval(() => {
  io.emit('rs232-status', { status: require('./utils/tcpMonitor').getStatus() });
}, 5000);
 */