const mongoose = require('mongoose');
const { DB_URL } = require('./config.js');

// mongoose.connect('mongodb://localhost/merndb'); Como es asincrono, tengo que meterlo en una funcion para usar async await.
const connectdb = async () => {
    try {
        await mongoose.connect(DB_URL);
        console.log(">>>db is connected");
    } catch {
        console.error(error);
    }
}

module.exports = connectdb;