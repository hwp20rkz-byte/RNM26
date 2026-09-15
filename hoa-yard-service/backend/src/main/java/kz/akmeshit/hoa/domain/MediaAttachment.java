package kz.akmeshit.hoa.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "media_attachment")
public class MediaAttachment {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "task_id")
    private Task task;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "checklist_item_id")
    private ChecklistItem checklistItem; // nullable — фото До/После на всю задачу

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MediaPhase phase;

    @Column(nullable = false)
    private String storageUrl;

    @Column(nullable = false)
    private Instant capturedAt;

    @Embedded
    @AttributeOverride(name = "lat", column = @Column(name = "captured_lat"))
    @AttributeOverride(name = "lng", column = @Column(name = "captured_lng"))
    private GeoPoint capturedLocation;

    protected MediaAttachment() {
    }

    public MediaAttachment(Task task, ChecklistItem checklistItem, MediaPhase phase,
                            String storageUrl, Instant capturedAt, GeoPoint capturedLocation) {
        this.task = task;
        this.checklistItem = checklistItem;
        this.phase = phase;
        this.storageUrl = storageUrl;
        this.capturedAt = capturedAt;
        this.capturedLocation = capturedLocation;
    }

    public UUID getId() {
        return id;
    }

    public Task getTask() {
        return task;
    }

    public ChecklistItem getChecklistItem() {
        return checklistItem;
    }

    public MediaPhase getPhase() {
        return phase;
    }

    public String getStorageUrl() {
        return storageUrl;
    }

    public Instant getCapturedAt() {
        return capturedAt;
    }

    public GeoPoint getCapturedLocation() {
        return capturedLocation;
    }
}
