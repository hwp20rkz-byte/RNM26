package kz.akmeshit.hoa.report;

import kz.akmeshit.hoa.domain.Task;
import kz.akmeshit.hoa.domain.TaskStatus;
import kz.akmeshit.hoa.repository.TaskRepository;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.LocalDate;
import java.util.List;

@Component
public class ReportDataAggregator {

    private final TaskRepository taskRepository;

    public ReportDataAggregator(TaskRepository taskRepository) {
        this.taskRepository = taskRepository;
    }

    public ReportData aggregate(LocalDate from, LocalDate to) {
        List<Task> tasks = taskRepository.findByScheduledDateBetween(from, to);

        long total = tasks.size();
        long done = tasks.stream().filter(t -> t.getStatus() == TaskStatus.DONE).count();
        long overdue = tasks.stream()
                .filter(t -> t.getStatus() != TaskStatus.DONE && t.getScheduledDate().isBefore(LocalDate.now()))
                .count();
        double closureRate = total == 0 ? 0 : (double) done / total * 100;

        List<ReportData.Row> rows = tasks.stream()
                .map(t -> new ReportData.Row(
                        t.getScheduledDate(),
                        t.getAssignee() != null ? t.getAssignee().getFullName() : "—",
                        t.getZone().getName(),
                        t.getWorkTemplate().getName(),
                        t.getStatus(),
                        durationMinutes(t),
                        t.isGeoValidated()
                ))
                .toList();

        return new ReportData(from, to, total, done, overdue, closureRate, rows);
    }

    private Long durationMinutes(Task task) {
        if (task.getStartedAt() == null || task.getCompletedAt() == null) return null;
        return Duration.between(task.getStartedAt(), task.getCompletedAt()).toMinutes();
    }

    public record ReportData(
            LocalDate from,
            LocalDate to,
            long totalTasks,
            long doneTasks,
            long overdueTasks,
            double closureRatePercent,
            List<Row> rows
    ) {
        public record Row(
                LocalDate date,
                String assigneeName,
                String zoneName,
                String workTemplateName,
                TaskStatus status,
                Long durationMinutes,
                boolean geoValidated
        ) {
        }
    }
}
