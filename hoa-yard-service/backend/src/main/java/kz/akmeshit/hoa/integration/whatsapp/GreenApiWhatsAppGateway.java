package kz.akmeshit.hoa.integration.whatsapp;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.Map;

/**
 * Green API (green-api.com) реализация {@link WhatsAppGateway}.
 * Для официального WhatsApp Cloud API — отдельный класс {@code CloudApiWhatsAppGateway},
 * переключение через свойство {@code hoa.whatsapp.provider} (см. WhatsAppGatewayConfig).
 */
@Component
@EnableConfigurationProperties(WhatsAppProperties.class)
public class GreenApiWhatsAppGateway implements WhatsAppGateway {

    private final WhatsAppProperties properties;
    private final RestClient restClient;

    public GreenApiWhatsAppGateway(WhatsAppProperties properties) {
        this.properties = properties;
        this.restClient = RestClient.create();
    }

    @Override
    public void sendMessage(String phoneE164, String text) throws WhatsAppDeliveryException {
        String chatId = normalizeToChatId(phoneE164);
        String url = "%s/waInstance%s/sendMessage/%s"
                .formatted(properties.getBaseUrl(), properties.getInstanceId(), properties.getToken());

        try {
            restClient.post()
                    .uri(url)
                    .body(Map.of("chatId", chatId, "message", text))
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientException e) {
            throw new WhatsAppDeliveryException("Green API не доставил сообщение на " + phoneE164, e);
        }
    }

    private String normalizeToChatId(String phoneE164) {
        String digitsOnly = phoneE164.replaceAll("[^0-9]", "");
        return digitsOnly + "@c.us";
    }
}
