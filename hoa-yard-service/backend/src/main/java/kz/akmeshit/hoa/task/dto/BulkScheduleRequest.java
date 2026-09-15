package kz.akmeshit.hoa.task.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record BulkScheduleRequest(
        @NotNull UUID zoneId,
        @NotNull UUID workTemplateId,
        @NotNull UUID assigneeId,
        @NotEmpty List<LocalDate> dates
) {
}
