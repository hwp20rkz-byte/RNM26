package kz.akmeshit.hoa.domain;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "building")
public class Building {

    @Id
    @GeneratedValue
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, unique = true)
    private BuildingCode code;

    @Column(nullable = false)
    private String address;

    @Column(nullable = false)
    private int entrances;

    protected Building() {
    }

    public Building(BuildingCode code, String address, int entrances) {
        this.code = code;
        this.address = address;
        this.entrances = entrances;
    }

    public UUID getId() {
        return id;
    }

    public BuildingCode getCode() {
        return code;
    }

    public String getAddress() {
        return address;
    }

    public int getEntrances() {
        return entrances;
    }
}
