package kz.akmeshit.hoa.domain;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "work_template")
public class WorkTemplate {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String category;

    @Column(nullable = false)
    private int estimatedMinutes;

    private String referencePhotoUrl;

    /** JSON-массив { key, label, requiresPhoto } — схема пунктов чек-листа. */
    @Column(nullable = false, columnDefinition = "jsonb")
    private String checklistSchemaJson;

    protected WorkTemplate() {
    }

    public WorkTemplate(String name, String category, int estimatedMinutes,
                         String referencePhotoUrl, String checklistSchemaJson) {
        this.name = name;
        this.category = category;
        this.estimatedMinutes = estimatedMinutes;
        this.referencePhotoUrl = referencePhotoUrl;
        this.checklistSchemaJson = checklistSchemaJson;
    }

    public UUID getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getCategory() {
        return category;
    }

    public int getEstimatedMinutes() {
        return estimatedMinutes;
    }

    public String getReferencePhotoUrl() {
        return referencePhotoUrl;
    }

    public String getChecklistSchemaJson() {
        return checklistSchemaJson;
    }
}
