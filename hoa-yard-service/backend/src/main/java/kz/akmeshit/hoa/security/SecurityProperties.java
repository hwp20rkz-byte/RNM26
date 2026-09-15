package kz.akmeshit.hoa.security;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "hoa.security.jwt")
public class SecurityProperties {

    private String secret;
    private int accessTtlMinutes = 15;
    private int refreshTtlDays = 14;

    public String getSecret() {
        return secret;
    }

    public void setSecret(String secret) {
        this.secret = secret;
    }

    public int getAccessTtlMinutes() {
        return accessTtlMinutes;
    }

    public void setAccessTtlMinutes(int accessTtlMinutes) {
        this.accessTtlMinutes = accessTtlMinutes;
    }

    public int getRefreshTtlDays() {
        return refreshTtlDays;
    }

    public void setRefreshTtlDays(int refreshTtlDays) {
        this.refreshTtlDays = refreshTtlDays;
    }
}
