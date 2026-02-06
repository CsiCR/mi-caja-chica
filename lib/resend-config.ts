
import { Resend } from 'resend';

let resendClient: Resend | null = null;

export function getResendClient(): Resend {
  if (resendClient) {
    return resendClient;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY environment variable is not set. Please configure your Resend API key.');
  }

  resendClient = new Resend(apiKey);
  return resendClient;
}

export async function sendPasswordResetEmail(email: string, resetToken: string) {
  const resend = getResendClient();
  
  const resetUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/restablecer-contrasena?token=${resetToken}`;
  
  try {
    const { data, error } = await resend.emails.send({
      from: 'Mi Caja Chica <onboarding@resend.dev>',
      to: email,
      subject: 'Recuperación de Contraseña - Mi Caja Chica',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                color: white;
                padding: 30px;
                text-align: center;
                border-radius: 8px 8px 0 0;
              }
              .content {
                background: #f9f9f9;
                padding: 30px;
                border: 1px solid #e5e5e5;
                border-top: none;
              }
              .button {
                display: inline-block;
                padding: 14px 28px;
                background: #10b981;
                color: white;
                text-decoration: none;
                border-radius: 6px;
                font-weight: 600;
                margin: 20px 0;
              }
              .footer {
                text-align: center;
                padding: 20px;
                color: #666;
                font-size: 14px;
              }
              .warning {
                background: #fef3c7;
                border-left: 4px solid #f59e0b;
                padding: 12px;
                margin: 20px 0;
                font-size: 14px;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>🔐 Recuperación de Contraseña</h1>
            </div>
            <div class="content">
              <h2>Hola,</h2>
              <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en <strong>Mi Caja Chica</strong>.</p>
              
              <p>Haz clic en el botón de abajo para restablecer tu contraseña:</p>
              
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Restablecer Contraseña</a>
              </div>
              
              <p>O copia y pega este enlace en tu navegador:</p>
              <p style="background: white; padding: 12px; border: 1px solid #ddd; border-radius: 4px; word-break: break-all; font-size: 13px;">
                ${resetUrl}
              </p>
              
              <div class="warning">
                ⚠️ Este enlace expirará en <strong>1 hora</strong> por razones de seguridad.
              </div>
              
              <p style="margin-top: 30px;">Si no solicitaste restablecer tu contraseña, puedes ignorar este correo de manera segura.</p>
              
              <p>Saludos,<br>El equipo de <strong>Mi Caja Chica</strong></p>
            </div>
            <div class="footer">
              <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
              <p>&copy; ${new Date().getFullYear()} Mi Caja Chica. Todos los derechos reservados.</p>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('Error sending email with Resend:', error);
      throw new Error('Failed to send password reset email');
    }

    return data;
  } catch (error) {
    console.error('Error in sendPasswordResetEmail:', error);
    throw error;
  }
}
