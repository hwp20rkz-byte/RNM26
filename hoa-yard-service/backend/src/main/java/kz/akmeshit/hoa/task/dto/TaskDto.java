package kz.akmeshit.hoa.task.dto;

import kz.akmeshit.hoa.domain.Task;
import kz.akmeshit.hoa.domain.TaskStatus;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record TaskDto(
        UUID id,
        UUID zoneId,
        String zoneName,
        UUID workTemplateId,
        String workTemplateName,
        UUID assigneeId,
        String assigneeName,
        LocalDate scheduledDate,
        TaskStatus status,
        Instant startedAt,
        Instant completedAt,
        boolean geoValidated
) {
    public static TaskDto from(Task task) {
        return new TaskDto(
                task.getId(),
                task.getZone().getId(),
                task.getZone().getName(),
                task.getWorkTemplate().getId(),
                task.getWorkTemplate().getName(),
                task.getAssignee() != null ? task.getAssignee().getId() : null,
                task.getAssignee() != null ? task.getAssignee().getFullName() : null,
                task.getScheduledDate(),
                task.getStatus(),
                task.getStartedAt(),
                task.getCompletedAt(),
                task.isGeoValidated()
        );
    }
}
