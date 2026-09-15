package kz.akmeshit.hoa.integration.whatsapp;

/**
 * Абстракция над провайдером WhatsApp — позволяет переключаться между
 * Green API и WhatsApp Cloud API без изменения бизнес-логики (auth, dispatch).
 */
public interface WhatsAppGateway {

    /**
     * @param phoneE164 номер в формате +7XXXXXXXXXX
     * @param text      текст сообщения (magic link или OTP-код)
     * @throws WhatsAppDeliveryException при ошибке доставки — вызывающий код обязан её обработать,
     *                                   а не дать полю "SENT" молча остаться неверным
     */
    void sendMessage(String phoneE164, String text) throws WhatsAppDeliveryException;
}
