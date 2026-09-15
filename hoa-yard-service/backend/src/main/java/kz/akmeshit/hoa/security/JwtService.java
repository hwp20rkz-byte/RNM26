package kz.akmeshit.hoa.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import kz.akmeshit.hoa.domain.Role;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.Map;
import java.util.UUID;

@Service
@EnableConfigurationProperties(SecurityProperties.class)
public class JwtService {

    private final SecretKey key;
    private final SecurityProperties properties;

    public JwtService(SecurityProperties properties) {
        this.properties = properties;
        this.key = Keys.hmacShaKeyFor(properties.getSecret().getBytes(StandardCharsets.UTF_8));
    }

    public String issueAccessToken(UUID userId, Role role) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(userId.toString())
                .claim("role", role.name())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(Duration.ofMinutes(properties.getAccessTtlMinutes()))))
                .signWith(key)
                .compact();
    }

    public String issueRefreshToken(UUID userId) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(userId.toString())
                .claim("type", "refresh")
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(Duration.ofDays(properties.getRefreshTtlDays()))))
                .signWith(key)
                .compact();
    }

    /** Короткоживущий токен для magic-link — привязан к задаче, не только к пользователю. */
    public String issueMagicLinkToken(UUID userId, UUID taskId, Duration ttl) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(userId.toString())
                .claim("purpose", "MAGIC_LINK")
                .claim("taskId", taskId.toString())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(ttl)))
                .signWith(key)
                .compact();
    }

    public Claims parse(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public Map<String, Object> parseMagicLink(String token) {
        Claims claims = parse(token);
        if (!"MAGIC_LINK".equals(claims.get("purpose"))) {
            throw new IllegalArgumentException("Токен не является magic-link");
        }
        return Map.of(
                "userId", claims.getSubject(),
                "taskId", claims.get("taskId", String.class)
        );
    }
}
