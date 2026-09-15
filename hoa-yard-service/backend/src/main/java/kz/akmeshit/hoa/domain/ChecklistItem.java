package kz.akmeshit.hoa.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "checklist_item")
public class ChecklistItem {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "task_id")
    private Task task;

    @Column(nullable = false)
    private String label;

    @Column(nullable = false)
    private boolean checked = false;

    private Instant checkedAt;

    protected ChecklistItem() {
    }

    public ChecklistItem(Task task, String label) {
        this.task = task;
        this.label = label;
    }

    public void check() {
        this.checked = true;
        this.checkedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public Task getTask() {
        return task;
    }

    public String getLabel() {
        return label;
    }

    public boolean isChecked() {
        return checked;
    }

    public Instant getCheckedAt() {
        return checkedAt;
    }
}
