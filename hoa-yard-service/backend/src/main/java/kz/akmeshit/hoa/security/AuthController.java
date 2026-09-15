package kz.akmeshit.hoa.security;

import io.jsonwebtoken.Claims;
import jakarta.validation.constraints.NotBlank;
import kz.akmeshit.hoa.domain.Role;
import kz.akmeshit.hoa.domain.User;
import kz.akmeshit.hoa.integration.whatsapp.WhatsAppDeliveryException;
import kz.akmeshit.hoa.integration.whatsapp.WhatsAppGateway;
import kz.akmeshit.hoa.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.NoSuchElementException;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final UserRepository userRepository;
    private final OtpService otpService;
    private final WhatsAppGateway whatsAppGateway;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;

    public AuthController(UserRepository userRepository, OtpService otpService, WhatsAppGateway whatsAppGateway,
                           JwtService jwtService, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.otpService = otpService;
        this.whatsAppGateway = whatsAppGateway;
        this.jwtService = jwtService;
        this.passwordEncoder = passwordEncoder;
    }

    @PostMapping("/whatsapp/request-otp")
    public ResponseEntity<Void> requestOtp(@RequestBody PhoneRequest body) {
        // Исполнитель должен уже существовать в справочнике персонала — самозапись запрещена.
        User user = userRepository.findByPhoneE164(body.phone())
                .orElseThrow(() -> new NoSuchElementException("Номер не найден в справочнике персонала"));
        if (!user.isActive()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        String code = otpService.generateAndStore(body.phone());
        try {
            whatsAppGateway.sendMessage(body.phone(), "Код входа в приложение двора: " + code);
        } catch (WhatsAppDeliveryException e) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).build();
        }
        return ResponseEntity.accepted().build();
    }

    @PostMapping("/whatsapp/verify")
    public ResponseEntity<TokenPair> verifyOtp(@RequestBody OtpVerifyRequest body) {
        if (!otpService.verify(body.phone(), body.otp())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        User user = userRepository.findByPhoneE164(body.phone())
                .orElseThrow(() -> new NoSuchElementException("Пользователь не найден"));
        return ResponseEntity.ok(issueTokenPair(user));
    }

    /** Обмен magic-link токена (из ссылки WhatsApp) на полноценную сессию. */
    @PostMapping("/whatsapp/magic-link/exchange")
    public ResponseEntity<TokenPair> exchangeMagicLink(@RequestBody MagicLinkExchangeRequest body) {
        var claims = jwtService.parseMagicLink(body.token());
        UUID userId = UUID.fromString((String) claims.get("userId"));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NoSuchElementException("Пользователь не найден"));
        return ResponseEntity.ok(issueTokenPair(user));
    }

    @PostMapping("/login")
    public ResponseEntity<TokenPair> login(@RequestBody LoginRequest body) {
        User user = userRepository.findByPhoneE164(body.phone())
                .orElseThrow(() -> new NoSuchElementException("Пользователь не найден"));
        if (user.getPasswordHash() == null
                || !passwordEncoder.matches(body.password(), user.getPasswordHash())
                || user.getRole() == Role.CLEANER) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(issueTokenPair(user));
    }

    @PostMapping("/refresh")
    public ResponseEntity<TokenPair> refresh(@RequestBody RefreshRequest body) {
        Claims claims;
        try {
            claims = jwtService.parse(body.refreshToken());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        if (!"refresh".equals(claims.get("type"))) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        User user = userRepository.findById(UUID.fromString(claims.getSubject()))
                .orElseThrow(() -> new NoSuchElementException("Пользователь не найден"));
        return ResponseEntity.ok(issueTokenPair(user));
    }

    private TokenPair issueTokenPair(User user) {
        return new TokenPair(
                jwtService.issueAccessToken(user.getId(), user.getRole()),
                jwtService.issueRefreshToken(user.getId()),
                user.getRole()
        );
    }

    public record PhoneRequest(@NotBlank String phone) {
    }

    public record OtpVerifyRequest(@NotBlank String phone, @NotBlank String otp) {
    }

    public record MagicLinkExchangeRequest(@NotBlank String token) {
    }

    public record LoginRequest(@NotBlank String phone, @NotBlank String password) {
    }

    public record RefreshRequest(@NotBlank String refreshToken) {
    }

    public record TokenPair(String accessToken, String refreshToken, Role role) {
    }
}
