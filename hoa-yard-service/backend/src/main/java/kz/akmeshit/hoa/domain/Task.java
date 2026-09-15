package kz.akmeshit.hoa.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "task")
public class Task {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "zone_id")
    private Zone zone;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "work_template_id")
    private WorkTemplate workTemplate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assignee_id")
    private User assignee;

    @Column(nullable = false)
    private LocalDate scheduledDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TaskStatus status = TaskStatus.PLANNED;

    private Instant startedAt;
    private Instant completedAt;

    @Embedded
    @AttributeOverride(name = "lat", column = @Column(name = "check_in_lat"))
    @AttributeOverride(name = "lng", column = @Column(name = "check_in_lng"))
    private GeoPoint checkInLocation;

    @Column(nullable = false)
    private boolean geoValidated = false;

    @OneToMany(mappedBy = "task", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ChecklistItem> checklistItems = new ArrayList<>();

    protected Task() {
    }

    public Task(Zone zone, WorkTemplate workTemplate, User assignee, LocalDate scheduledDate) {
        this.zone = zone;
        this.workTemplate = workTemplate;
        this.assignee = assignee;
        this.scheduledDate = scheduledDate;
    }

    public void start(GeoPoint checkInLocation, boolean geoValidated) {
        if (this.status != TaskStatus.PLANNED) {
            throw new IllegalStateException("Задачу можно начать только из статуса PLANNED, текущий: " + status);
        }
        this.status = TaskStatus.IN_PROGRESS;
        this.startedAt = Instant.now();
        this.checkInLocation = checkInLocation;
        this.geoValidated = geoValidated;
    }

    /** Завершение исполнителем — уходит на проверку, а не сразу в DONE. */
    public void submitForReview() {
        if (this.status != TaskStatus.IN_PROGRESS) {
            throw new IllegalStateException("Задачу можно отправить на проверку только из IN_PROGRESS");
        }
        this.status = TaskStatus.IN_REVIEW;
        this.completedAt = Instant.now();
    }

    public void approve() {
        if (this.status != TaskStatus.IN_REVIEW) {
            throw new IllegalStateException("Подтвердить можно только задачу в статусе IN_REVIEW");
        }
        this.status = TaskStatus.DONE;
    }

    public void reassign(User newAssignee) {
        if (this.status == TaskStatus.DONE) {
            throw new IllegalStateException("Нельзя переназначить завершённую задачу");
        }
        this.assignee = newAssignee;
    }

    public UUID getId() {
        return id;
    }

    public Zone getZone() {
        return zone;
    }

    public WorkTemplate getWorkTemplate() {
        return workTemplate;
    }

    public User getAssignee() {
        return assignee;
    }

    public LocalDate getScheduledDate() {
        return scheduledDate;
    }

    public TaskStatus getStatus() {
        return status;
    }

    public Instant getStartedAt() {
        return startedAt;
    }

    public Instant getCompletedAt() {
        return completedAt;
    }

    public GeoPoint getCheckInLocation() {
        return checkInLocation;
    }

    public boolean isGeoValidated() {
        return geoValidated;
    }

    public List<ChecklistItem> getChecklistItems() {
        return checklistItems;
    }
}
