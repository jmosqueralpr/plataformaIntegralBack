/* Con zod valido los datos antes de usarlos. y si no son como yo quiero puedo enviar el mensaje de error */
const { z } = require('zod');

const registerSchema = z.object({
    username: z.string({
      required_error: 'Username is required'
    }),
    email: z.string({
      required_error: 'Email is required'
    }).email({
      message: 'Invalid email'
    }),
    password: z.string({
      required_error: 'Password is required'
    }).min(6, {
      message: 'Password must be at least 6 characters'
    }),
    role: z
      .enum(['superadmin', 'admin', 'manager', 'coordinator', 'technician', 'user', 'guest'])
      .optional(),
    phone: z.string()
      .trim()
      .regex(/^\+?\d{7,15}$/, 'Invalid phone number')
      .optional(),
    telegramChatId: z.string()
    .trim()
    .regex(/^\d+$/, 'Invalid Telegram Chat ID')
    .optional(),
    telegramId: z.string()
      .trim()
      .regex(/^\d+$/, 'Invalid Telegram ID')
      .optional()
  });
  

const loginSchema = z.object({
    email: z.string({
        required_error: "Email is required"
    }).email({
        message: "Invalid email"
    }).optional(),  //Queda optional para aceptar también username

    username: z.string().optional(), 

    telegramId: z.string() /* Para hacer el login con Telegram */
    .regex(/^\d+$/, 'Invalid Telegram ID')
    .optional(),

    password: z.string({
        required_error: "Password is required"
    }).min(6, {
        message: "Password must be at least 6 characters"
    })
});

const changeEmailSchema = z.object({
    newEmail: z.string({
        required_error: "New email is required"
    }).email({
        message: "Invalid email format"
    })
});


const changePasswordSchema = z.object({
    oldPassword: z.string({
        required_error: "Old password is required"
    }),
    newPassword: z.string({
        required_error: "New password is required"
    }).min(6, {
        message: "New password must be at least 6 characters"
    })
});


module.exports = {
    registerSchema,
    loginSchema,
    changeEmailSchema,
    changePasswordSchema
}
