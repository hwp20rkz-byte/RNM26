package kz.akmeshit.hoa.domain;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "app_user")
public class User {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false)
    private String fullName;

    /** Короткий код персонала для UI (напр. N — Никита, W — Владимир). */
    @Column(nullable = false, unique = true)
    private String personnelCode;

    @Column(nullable = false, unique = true)
    private String phoneE164;

    @Column
    private String passwordHash; // null для CLEANER — вход только через WhatsApp

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @Column(nullable = false)
    private int gamificationScore = 0;

    @Column(nullable = false)
    private boolean active = true;

    protected User() {
    }

    public User(String fullName, String personnelCode, String phoneE164, Role role) {
        this.fullName = fullName;
        this.personnelCode = personnelCode;
        this.phoneE164 = phoneE164;
        this.role = role;
    }

    public UUID getId() {
        return id;
    }

    public String getFullName() {
        return fullName;
    }

    public String getPersonnelCode() {
        return personnelCode;
    }

    public String getPhoneE164() {
        return phoneE164;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public Role getRole() {
        return role;
    }

    public int getGamificationScore() {
        return gamificationScore;
    }

    public void addGamificationPoints(int points) {
        this.gamificationScore += points;
    }

    public boolean isActive() {
        return active;
    }
}
