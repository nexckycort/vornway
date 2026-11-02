export const OTP_EMAIL_FROM = 'security@updates.vornway.com';
export const OTP_EMAIL_SUBJECT = 'Código de verificación';

export const otpEmailHtml = (otp: string) => `
    <p>Hola,</p>
    <p>Tu código de verificación es: <strong>${otp}</strong></p>
    <p>Si no solicitaste este código, por favor ignora este mensaje.</p>
    <p>Saludos,</p>
    <p>El equipo de Splitway</p>
  `;
