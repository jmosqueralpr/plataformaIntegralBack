const Task = require('../models/task.model.js');

//FIND TASKS
const getTasks = async (req, res) => {
  try {
      console.log("Busco Task para usuario:", req.user.username);

      const tasks = await Task.find({
          $or: [
              { creator: req.user.username },
              { assignedTo: req.user.username }
          ]
      })/*.populate('user')*/;

      console.log("Estas son las tasks:", tasks);
      res.json(tasks);
  } catch (error) {
      console.error("Error al buscar tasks:", error);
      res.status(500).json({ message: "Error al obtener las tareas" });
  }
};

//CREATE TASK
/* const createTask = async (req, res) => {
    const { title, description, date } = req.body; // Recibo eso desde el body.
    const newTask = new Task({ // Genero una nueva instancia de Task para crear la tarea en la db
        title,
        description,
        date,
        user: req.user.id //La id es del usuario que solicita crear la tarea es necesaria. La tengo porque paso por el autRequired y se guarda el usuario en el req.user.
    });
    const savedTask = await newTask.save(); // Guardo en la db y además voy a crear una constante para responder.
    res.json(savedTask);
};
 */
const createTask = async (req, res) => {
  try {
    const {
      title,
      description,
      notifyAssignedDate,
      notifyAssignedTime,
      reminderDate,
      sendWhatsAppOwner = false,
      sendWhatsAppAssignedTo = false,
      status = 'No iniciada',
      importance = 'Media',
      assignedTo
    } = req.body;

    const creatorName = req.user.username;

    const assignedUsers = Array.isArray(assignedTo)
      ? assignedTo
      : typeof assignedTo === 'string' && assignedTo.trim().length > 0
      ? [assignedTo.trim()]
      : [creatorName];

    const newTask = new Task({
      title,
      description,
      notifyAssignedDate,
      notifyAssignedTime,
      reminderDate,
      sendWhatsAppOwner,
      sendWhatsAppAssignedTo,
      status,
      importance,
      assignedTo: assignedUsers,
      creator: creatorName
    });

    const savedTask = await newTask.save();
    res.status(201).json(savedTask);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ message: 'Error creating task' });
  }
};



/* Para probar hacer un POST a:
http://localhost:3000/api/task

con el json correspondiente:
{
  "title": "Inspección mensual de sistema solar",
  "description": "Verificar paneles, inversor y baterías en sitio de Isla del Medio",
  "reminderDate": "2025-04-15T08:00:00.000Z",
  "sendWhatsAppOwner": true,
  "sendWhatsAppAssignedTo": true,
  "status": "no iniciada",
  "assignedTo": [
    "6617e6a3659d3fc71887078c",
    "6618f24e1e9a4cb2c6aa7785"
  ]
}

*/

//FIND TASK
//Asi pido la tarea: ...api/task/laIdQueCorresponda.
const getTask = async (req, res) => {

/*     const task = await Task.findById(req.params.id).populate('user'); 
    if (!task) return res.status(404).json({ message: 'Task no found'}); //Si no encuentro tarea retorno un mensaje.
    return res.sendStatus(204); //Significa que esta todo bien pero no voy a devolver nada. */

    //Con esto voy a devolver la tarea:

    try{
        const task = await Task.findById(req.params.id).populate('user');
        if (!task) {
            return res.status(404).json({ messaje: 'Task not found' });
        }
        return res.status(200).json(task); //Si encuentra la tarea, devuelve la tarea encontrada.
    } catch (error) {
        return res.status(500).json({ messaje: "Error retrieving the task", error: error.messaje })
    }
};
//DELETE
const deleteTask = async (req, res) => {
    const task = await Task.findByIdAndDelete(req.params.id); //Busco y elimino. Devuelve la tarea eliminada.
    if (!task) return res.status(404).json({ message: 'Task no found'}); //Si no encuentro tarea retorno un mensaje.
    res.json(task); //Devuelvo la tarea que acabo de eliminar.
};
//UPDATE
const updateTask = async (req, res) => {
    console.log("Vista de Task a actualizar");
    console.log(req.body);
    const task = await Task.findByIdAndUpdate(req.params.id, req.body, {
      new: true
    });
    
  
    if (!task)
      return res.status(404).json({ message: 'Task not found' });
  
    res.json(task);
  };
  
/* Probar el update:

Enviar a la siguiente URL con la id que corresponda a la tarea a modificar:

PUT a http://localhost:3000/api/task/67f9547d53be9d8de06aea72

y un json como por ejemplo este: 

{
  "title": "Título actualizado",
  "status": "en proceso"
}

o si quiero modificar todo puedo enviar todo:

{
  "title": "Nueva tarea actualizada",
  "description": "Descripción actualizada de la tarea",
  "reminderDate": "2025-04-20T10:30:00.000Z",
  "sendWhatsAppOwner": true,
  "sendWhatsAppAssignedTo": true,
  "status": "en proceso",
  "assignedTo": ["67d32c9bdde26c605787be09", "67d45f2a61e59a72b8abcc51"]
}


*/




//Exportando las funciones en CommonJS

module.exports = {
    getTasks,
    createTask,
    getTask,
    updateTask,
    deleteTask
}