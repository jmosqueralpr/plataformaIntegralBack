const jwt = require('jsonwebtoken');
const { TOKEN_SECRET } = require("../config");

function createAccessToken (payload) {
    //TRANSFORMÉ TODO EN UNA PROMESA PARA LUEGO USAR ASYNC AWAIT
    return new Promise((resolve, reject)=>{ 
        jwt.sign(
            payload,
            TOKEN_SECRET, 
        {
            expiresIn: "1h"
        },
        (err, token) => { 
            if (err) reject (err); //Si la promesa sale mal mando el error
            resolve(token); //Si la promesa sale bien, mando el token.
        })
    })
    

}

module.exports = { createAccessToken };