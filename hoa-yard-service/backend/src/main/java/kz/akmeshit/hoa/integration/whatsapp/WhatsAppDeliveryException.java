package kz.akmeshit.hoa.integration.whatsapp;

public class WhatsAppDeliveryException extends Exception {
    public WhatsAppDeliveryException(String message, Throwable cause) {
        super(message, cause);
    }

    public WhatsAppDeliveryException(String message) {
        super(message);
    }
}
