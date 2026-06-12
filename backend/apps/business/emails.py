import logging

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone
from django.utils.html import escape, strip_tags

logger = logging.getLogger(__name__)


def send_appointment_notification(appointment, action: str):
    """
    Envía un correo electrónico al cliente y al asesor cuando una cita
    es creada, editada, confirmada o eliminada.
    """
    try:
        # Extraer datos de la cita
        client_name = escape(appointment.client_name)
        client_email = appointment.client_email
        advisor_name = escape(
            appointment.advisor.get_full_name() or appointment.advisor.email
        )
        advisor_email = appointment.advisor.email
        appointment_type = escape(appointment.appointment_type)

        # Formatear la fecha
        # Usamos timezone.localtime si existe, o strftime directamente
        if timezone.is_aware(appointment.scheduled_at):
            local_time = timezone.localtime(appointment.scheduled_at)
        else:
            local_time = appointment.scheduled_at

        date_str = local_time.strftime("%d/%m/%Y")
        time_str = local_time.strftime("%H:%M")

        # Configurar mensajes según la acción
        action_text = ""
        action_color = "#1d4ed8"  # Blue default
        title = "Notificación de Cita"

        if action == "created":
            action_text = "ha sido solicitada"
            title = "Nueva solicitud de cita"
        elif action == "updated":
            action_text = "ha sido modificada"
            title = "Cita modificada"
            action_color = "#eab308"  # Yellow
        elif action == "confirmed":
            action_text = "ha sido confirmada por el asesor"
            title = "Cita confirmada"
            action_color = "#10b981"  # Green
        elif action == "deleted":
            action_text = "ha sido cancelada"
            title = "Cita cancelada"
            action_color = "#ef4444"  # Red

        subject = f"Consultoritas - {title}: {appointment_type}"

        # HTML Template
        html_message = f"""
        <div style="margin:0;padding:0;background-color:#f5f7fb;font-family:Arial, Helvetica, sans-serif;color:#1f2937;">
          <div style="max-width:640px;margin:0 auto;padding:40px 20px;">
            <div style="background:#ffffff;border-radius:16px;box-shadow:0 10px 30px rgba(15,23,42,0.08);overflow:hidden;">
              <div style="background:linear-gradient(135deg,#0f172a,{action_color});padding:28px 32px;color:#ffffff;">
                <div style="font-size:28px;font-weight:700;letter-spacing:0.3px;">Consultoritas</div>
                <div style="margin-top:8px;font-size:14px;opacity:0.92;">Gestión de Citas y Reuniones</div>
              </div>
              <div style="padding:32px;line-height:1.6;font-size:15px;">
                <p style="margin:0 0 16px;">Hola,</p>
                <p style="margin:0 0 16px;font-size:16px;">
                  La cita para <strong>{appointment_type}</strong> {action_text}.
                </p>

                <div style="margin:24px 0;padding:20px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;">
                  <h3 style="margin:0 0 16px;font-size:14px;text-transform:uppercase;color:#64748b;letter-spacing:0.5px;">Detalles de la Cita</h3>
                  <table style="width:100%;border-collapse:collapse;">
                    <tr>
                      <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;color:#64748b;width:35%;">Fecha:</td>
                      <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;font-weight:600;">{date_str}</td>
                    </tr>
                    <tr>
                      <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;color:#64748b;">Hora:</td>
                      <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;font-weight:600;">{time_str}</td>
                    </tr>
                    <tr>
                      <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;color:#64748b;">Cliente:</td>
                      <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;font-weight:600;">{client_name}</td>
                    </tr>
                    <tr>
                      <td style="padding:8px 0;color:#64748b;">Asesor asignado:</td>
                      <td style="padding:8px 0;font-weight:600;">{advisor_name}</td>
                    </tr>
                  </table>
                </div>

                <p style="margin:0 0 12px;color:#374151;">
                  {'Si tienes dudas, puedes responder directamente a este correo para contactar con tu asesor.' if action != 'deleted' else 'Lamentamos los inconvenientes. Puedes solicitar una nueva cita desde la plataforma.'}
                </p>
              </div>
            </div>
          </div>
        </div>
        """

        plain_message = strip_tags(html_message)

        # Enviar a ambos
        recipient_list = [client_email, advisor_email]
        # Si el cliente y asesor son el mismo correo (pruebas locales), se envía uno solo
        recipient_list = list(set(recipient_list))

        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=recipient_list,
            html_message=html_message,
            fail_silently=False,
        )
    except Exception as e:
        logger.exception("Error al enviar notificación de cita: %s", e)
