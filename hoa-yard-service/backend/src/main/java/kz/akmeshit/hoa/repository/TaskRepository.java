package kz.akmeshit.hoa.repository;

import kz.akmeshit.hoa.domain.Task;
import kz.akmeshit.hoa.domain.TaskStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface TaskRepository extends JpaRepository<Task, UUID> {

    List<Task> findByScheduledDate(LocalDate scheduledDate);

    List<Task> findByScheduledDateBetween(LocalDate from, LocalDate to);

    List<Task> findByScheduledDateBetweenAndStatus(LocalDate from, LocalDate to, TaskStatus status);

    List<Task> findByAssignee_IdAndScheduledDate(UUID assigneeId, LocalDate scheduledDate);
}
