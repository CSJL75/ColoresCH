const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST, // Usar la variable de entorno
  port: process.env.SMTP_PORT, // Usar el puerto adecuado (587 para Gmail)
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function enviarCorreo({ to, subject, html }) {
  try {
    const info = await transporter.sendMail({
      from: `"Artesanías MX" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html, // HTML dinámico para el cuerpo del correo
    });

    console.log('Correo enviado:', info.messageId);
  } catch (error) {
    console.error('Error al enviar el correo:', error);
  }
}

module.exports = { enviarCorreo };
