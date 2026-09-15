package kz.akmeshit.hoa.task;

import jakarta.validation.Valid;
import kz.akmeshit.hoa.domain.GeoPoint;
import kz.akmeshit.hoa.domain.Task;
import kz.akmeshit.hoa.task.dto.BulkScheduleRequest;
import kz.akmeshit.hoa.task.dto.CheckItemRequest;
import kz.akmeshit.hoa.task.dto.DispatchResult;
import kz.akmeshit.hoa.task.dto.TaskDto;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/tasks")
public class TaskController {

    private final TaskService taskService;

    public TaskController(TaskService taskService) {
        this.taskService = taskService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','CHAIRMAN','CLEANER')")
    public List<TaskDto> list(
            @RequestParam LocalDate date,
            @RequestParam(required = false) UUID assigneeId
    ) {
        // TODO(security): для роли CLEANER assigneeId должен принудительно браться из JWT,
        // а не из query-параметра — иначе исполнитель может подставить чужой id и увидеть
        // чужие задачи. Нужен ArgumentResolver/аспект, читающий SecurityContext, до продакшена.
        return taskService.findByAssigneeAndDate(assigneeId, date).stream()
                .map(TaskDto::from)
                .toList();
    }

    @PostMapping("/bulk-schedule")
    @PreAuthorize("hasAnyRole('ADMIN','CHAIRMAN')")
    public ResponseEntity<List<TaskDto>> bulkSchedule(@Valid @RequestBody BulkScheduleRequest request) {
        List<Task> tasks = taskService.bulkSchedule(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(tasks.stream().map(TaskDto::from).toList());
    }

    @PatchMapping("/{taskId}/assign")
    @PreAuthorize("hasAnyRole('ADMIN','CHAIRMAN')")
    public TaskDto assign(@PathVariable UUID taskId, @RequestBody AssignRequest body) {
        return TaskDto.from(taskService.assign(taskId, body.assigneeId()));
    }

    @PostMapping("/{taskId}/start")
    @PreAuthorize("hasRole('CLEANER')")
    public TaskDto start(@PathVariable UUID taskId, @RequestBody(required = false) CheckItemRequest location) {
        GeoPoint point = location != null && location.lat() != null
                ? new GeoPoint(location.lat(), location.lng())
                : null;
        return TaskDto.from(taskService.start(taskId, point));
    }

    @PostMapping("/{taskId}/checklist/{itemId}/check")
    @PreAuthorize("hasRole('CLEANER')")
    public TaskDto checkItem(@PathVariable UUID taskId, @PathVariable UUID itemId) {
        return TaskDto.from(taskService.checkItem(taskId, itemId));
    }

    @PostMapping("/{taskId}/submit")
    @PreAuthorize("hasRole('CLEANER')")
    public TaskDto submit(@PathVariable UUID taskId) {
        return TaskDto.from(taskService.submitForReview(taskId));
    }

    @PostMapping("/{taskId}/approve")
    @PreAuthorize("hasAnyRole('ADMIN','CHAIRMAN')")
    public TaskDto approve(@PathVariable UUID taskId) {
        return TaskDto.from(taskService.approve(taskId));
    }

    @PostMapping("/{taskId}/dispatch-whatsapp")
    @PreAuthorize("hasAnyRole('ADMIN','CHAIRMAN')")
    public DispatchResult dispatch(@PathVariable UUID taskId) {
        return taskService.dispatchViaWhatsApp(taskId);
    }

    public record AssignRequest(UUID assigneeId) {
    }
}
