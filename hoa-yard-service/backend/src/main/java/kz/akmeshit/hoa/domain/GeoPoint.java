package kz.akmeshit.hoa.domain;

import jakarta.persistence.Embeddable;

@Embeddable
public class GeoPoint {

    private Double lat;
    private Double lng;

    protected GeoPoint() {
    }

    public GeoPoint(Double lat, Double lng) {
        this.lat = lat;
        this.lng = lng;
    }

    public Double getLat() {
        return lat;
    }

    public Double getLng() {
        return lng;
    }

    /** Расстояние по формуле гаверсинуса, метры. */
    public double distanceMetersTo(GeoPoint other) {
        final double earthRadiusM = 6_371_000;
        double dLat = Math.toRadians(other.lat - this.lat);
        double dLng = Math.toRadians(other.lng - this.lng);
        double lat1 = Math.toRadians(this.lat);
        double lat2 = Math.toRadians(other.lat);

        double h = Math.pow(Math.sin(dLat / 2), 2)
                + Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin(dLng / 2), 2);
        return 2 * earthRadiusM * Math.asin(Math.sqrt(h));
    }
}
