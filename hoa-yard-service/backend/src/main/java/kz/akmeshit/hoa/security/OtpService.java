package kz.akmeshit.hoa.security;

import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Хранение OTP в памяти процесса — достаточно для одного инстанса (MVP).
 * [Предположение] При горизонтальном масштабировании backend — вынести в Redis
 * с тем же TTL, иначе OTP, выданный одной репликой, не пройдёт проверку на другой.
 */
@Service
public class OtpService {

    private static final Duration OTP_TTL = Duration.ofMinutes(5);
    private static final Duration MIN_RESEND_INTERVAL = Duration.ofSeconds(60);

    private final SecureRandom random = new SecureRandom();
    private final ConcurrentHashMap<String, OtpEntry> otpByPhone = new ConcurrentHashMap<>();

    public String generateAndStore(String phoneE164) {
        OtpEntry existing = otpByPhone.get(phoneE164);
        if (existing != null && Duration.between(existing.issuedAt, Instant.now()).compareTo(MIN_RESEND_INTERVAL) < 0) {
            throw new OtpRateLimitException("Повторный запрос кода возможен через "
                    + (MIN_RESEND_INTERVAL.getSeconds() - Duration.between(existing.issuedAt, Instant.now()).getSeconds())
                    + " сек");
        }
        String code = String.format("%06d", random.nextInt(1_000_000));
        otpByPhone.put(phoneE164, new OtpEntry(code, Instant.now()));
        return code;
    }

    public boolean verify(String phoneE164, String code) {
        OtpEntry entry = otpByPhone.get(phoneE164);
        if (entry == null) return false;
        boolean expired = Duration.between(entry.issuedAt, Instant.now()).compareTo(OTP_TTL) > 0;
        boolean matches = entry.code.equals(code);
        if (matches && !expired) {
            otpByPhone.remove(phoneE164); // одноразовый
            return true;
        }
        return false;
    }

    private record OtpEntry(String code, Instant issuedAt) {
    }

    public static class OtpRateLimitException extends RuntimeException {
        public OtpRateLimitException(String message) {
            super(message);
        }
    }
}
