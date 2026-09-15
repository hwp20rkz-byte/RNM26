package kz.akmeshit.hoa.domain;

import jakarta.persistence.*;
import java.util.UUID;

/**
 * Зона на карте двора. Геометрия хранится как GeoJSON-строка (jsonb в БД) —
 * серверу для гео-валидации чек-листа достаточно {@code centroid} + {@code radiusMeters},
 * полная геометрия нужна только для отрисовки на карте в UI-конструкторе.
 */
@Entity
@Table(name = "zone")
public class Zone {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "building_id")
    private Building building; // nullable — для дворовых зон вне конкретного здания

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ZoneType zoneType;

    @Column(nullable = false, columnDefinition = "jsonb")
    private String geometryGeoJson;

    @Embedded
    @AttributeOverride(name = "lat", column = @Column(name = "centroid_lat"))
    @AttributeOverride(name = "lng", column = @Column(name = "centroid_lng"))
    private GeoPoint centroid;

    @Column(nullable = false)
    private double radiusMeters = 25.0;

    protected Zone() {
    }

    public Zone(Building building, String name, ZoneType zoneType, String geometryGeoJson,
                GeoPoint centroid, double radiusMeters) {
        this.building = building;
        this.name = name;
        this.zoneType = zoneType;
        this.geometryGeoJson = geometryGeoJson;
        this.centroid = centroid;
        this.radiusMeters = radiusMeters;
    }

    public UUID getId() {
        return id;
    }

    public Building getBuilding() {
        return building;
    }

    public String getName() {
        return name;
    }

    public ZoneType getZoneType() {
        return zoneType;
    }

    public String getGeometryGeoJson() {
        return geometryGeoJson;
    }

    public GeoPoint getCentroid() {
        return centroid;
    }

    public double getRadiusMeters() {
        return radiusMeters;
    }
}
