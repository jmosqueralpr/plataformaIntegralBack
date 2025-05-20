
const User = require('../models/user.model.js');
const bcrypt = require('bcryptjs');
const createAccessToken = require('../libs/jwt.js');

//REGISTER

const register = async (req, res) => { //Le agrege a la funcion async porque necesito el await para guardar en mongoDB. Ademas lo que es asincrono lo guardo en un try/catch.

    const { email, password, username, phone, telegramChatId, role } = req.body; //Extraigo los datos que necesito del body.
    console.log( email, username );

    const passwordHash = await bcrypt.hash(password, 10); //Encripto la contraseña y la guardo en la variabla hash

    try {
        const newUser = new User({
            username,
            email,
            password: passwordHash, //Guardo la contraseña como hash.
            role,
            phone,
            telegramChatId,
        })
    
        const userSaved = await newUser.save(); //Este save va a guardar el usuario en mongoDB. Ademas se guarda en userSaved para tener los datos del id y de la fecha de creación.


        const token = await createAccessToken.createAccessToken( { id:userSaved._id } ); //Genero un token (Ver en libs/jwt.js)

        res.cookie('token', token);     //Genero la cookie token.
        res.json({                      //Devuelvo los datos de usuario al front.
            id: userSaved._id,
            username: userSaved.username,
            email: userSaved.email,
            role: userSaved.role,
            createdAt: userSaved.createdAt,
            updatedAt: userSaved.updatedAt
        }); 

    } catch (error) {
        
        res.status(500).json( { messaje: error.messaje } );
        
    }
    
};

/* 
Para probarlo hacer un POST a:
http://localhost:3000/api/register

con el json correspondiente:
{
  "username":"invitados6",
  "email":"invitados6@gmail.com",
  "password":"invitados6"
}

*/

//LOGIN

const login = async (req, res) => { //Le agrege a la funcion async porque necesito el await para guardar en mongoDB. Ademas lo que es asincrono lo guardo en un try/catch.

    const { username, email, password } = req.body; //Extraigo los datos que necesito del body.
    console.log("Datsos básicos");
    console.log( username, email, password);

    try {

        // const userFound = await User.findOne({ email }); //Busco en la base de datos un usuario que coincida.
        const userFound = await User.findOne({
            $or: [{ email }, { username }] // Se usa $or para buscar por email o username
          });

        console.log("userFound?")
        console.log(userFound);
        //console.log(userFound.password);
        if (!userFound) return res.status(400).json({ message: "User nor found" }); //Si no encuentra usuario termino acá.
        
        const isMatch = await bcrypt.compare(password, userFound.password); //Comparo el password
        
        console.log("isMatch");
        console.log(isMatch);
        
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

 
        const token = await createAccessToken.createAccessToken( { id:userFound._id, username: userFound.username } ); //Genero un token (Ver en libs/jwt.js) con usuario encontrado.

        /* res.cookie('token', token);     //Genero la cookie token. */
        /* Esto es una correccion porque no andaba bien el logout, no borraba la cookie: */
        res.cookie('token', token, {
            httpOnly: true,      // Evita que el frontend acceda a la cookie por JavaScript
            secure: process.env.NODE_ENV === "production", // Solo en HTTPS en producción
            sameSite: "strict",  // Protege contra ataques CSRF
            path: "/",           // Se aplica a toda la app
            maxAge: 3600000      // Expira en 1 hora (opcional, depende de tu implementación)
        });
        
        res.json({                      //Devuelvo los datos de usuario al front.
            id: userFound._id,
            username: userFound.username,
            email: userFound.email,
            role: userFound.role,
            createdAt: userFound.createdAt,
            updatedAt: userFound.updatedAt
        }); 

    } catch (error) {
        
        res.status(500).json( { messaje: error.messaje } );
        
    }
    
};

/* 
Para probarlo hacer un POST a:
http://localhost:3000/api/login

con el json del usuario correspondiente:
{
  "email":"invitados6@gmail.com",
  "password":"invitados6"
}


*/

//CHANGEMAIL

const changeEmail = async (req, res) => {
    const { newEmail } = req.body;

    console.log("Intento de cambio de email", newEmail);

    try {
        // 1️⃣ Buscar el usuario en la base de datos
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        // 2️⃣ Verificar si el nuevo email es diferente al actual
        if (user.email === newEmail) {
            return res.status(400).json({ message: "New email must be different from the current email" });
        }

        // 3️⃣ Actualizar el email en la base de datos
        user.email = newEmail;
        const userUpdated = await user.save();

        console.log("Email actualizado a:", userUpdated.email);

        // 4️⃣ Responder con los datos actualizados
        res.json({
            message: "Email updated successfully",
            id: userUpdated._id,
            username: userUpdated.username,
            email: userUpdated.email,
            createdAt: userUpdated.createdAt,
            updatedAt: userUpdated.updatedAt
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


//CHANGEPASSWORD

const changePassword = async (req, res) => {

    const { oldPassword, newPassword } = req.body;

    console.log("Intento de cambio de password", newPassword);

    try {
        // 1️⃣ Buscar el usuario en la base de datos
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        // 2️⃣ Verificar que la contraseña actual es correcta
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) return res.status(400).json({ message: "Incorrect current password" });

        // 3️⃣ Hashear la nueva contraseña
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // 4️⃣ Guardar la nueva contraseña en la base de datos
        user.password = hashedPassword;
        const userUpdated = await user.save();

        //const token = await createAccessToken.createAccessToken({ id:userUpdated._id });
        console.log(hashedPassword);
        //res.cookie( 'token', token );
        // res.json({ message: "Password updated successfully" });
        res.json({
            message: "Password updated successfully",
            id: userUpdated._id,
            username: userUpdated.username,
            email: userUpdated.email,
            createdAt: userUpdated.createdAt,
            updatedAt: userUpdated.updatedAt
        })

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/* Para probar hacer un POST a:

http://localhost:3000/api/change-password

con el json correspondiente, por ejemplo:
{
  "oldPassword":"invitados6",
  "newPassword":"invitados6"
}

*/

//PROFILE

const profile = async (req, res) => { 
    
    const userFound = await User.findById(req.user.id); //la id la guarde en req en el middleware.

    if ( !userFound ) return res.status(400).json({ message: "User not found." });

    return res.json({ //Respondo los datos del usuario.
        id: userFound._id,
        username: userFound.username,
        email: userFound.email,
        createdAt: userFound.createdAt,
        updatedAt: userFound.updatedAt
    })

}

/* Para probar hacer un GET a:

http://localhost:3000/api/profile

*/

/* findUsers */

const findUsers = async (req, res) => {
    try {
        const users = await User.find({},'username');
        console.log("users");
        console.log(users);
        const usernames = users.map(user => user.username);
        console.log("usernames");
        console.log(usernames);
        res.json(usernames);
    } catch (error) {
        console.log(error);
    }
}

//LOGOUT

const logout = async (req, res) => {
    res.cookie("token", "", { //Estoy anulando la cookie token para hacer el logout.
        expires: new Date(0),
    });
    return res.status(200).json({ message: "Logout" });
};



//Exportando las funciones en CommonJS

module.exports = {
    register,
    login,
    changeEmail,
    changePassword,
    logout,
    profile,
    findUsers
}