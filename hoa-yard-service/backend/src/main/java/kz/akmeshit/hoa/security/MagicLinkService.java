package kz.akmeshit.hoa.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.UUID;

@Service
public class MagicLinkService {

    private final JwtService jwtService;
    private final String baseUrl;
    private final int ttlMinutes;

    public MagicLinkService(
            JwtService jwtService,
            @Value("${hoa.whatsapp.magic-link.base-url}") String baseUrl,
            @Value("${hoa.whatsapp.magic-link.ttl-minutes}") int ttlMinutes
    ) {
        this.jwtService = jwtService;
        this.baseUrl = baseUrl;
        this.ttlMinutes = ttlMinutes;
    }

    /** Ссылка вида https://.../m?task=<id>&token=<jwt> — открывает конкретную задачу без пароля. */
    public String buildTaskLink(UUID userId, UUID taskId) {
        String token = jwtService.issueMagicLinkToken(userId, taskId, Duration.ofMinutes(ttlMinutes));
        return baseUrl + "?task=" + taskId + "&token=" + token;
    }
}
