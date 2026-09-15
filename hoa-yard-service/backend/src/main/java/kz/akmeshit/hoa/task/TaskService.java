package kz.akmeshit.hoa.task;

import com.fasterxml.jackson.databind.ObjectMapper;
import kz.akmeshit.hoa.domain.*;
import kz.akmeshit.hoa.integration.whatsapp.WhatsAppDeliveryException;
import kz.akmeshit.hoa.integration.whatsapp.WhatsAppGateway;
import kz.akmeshit.hoa.repository.TaskRepository;
import kz.akmeshit.hoa.repository.UserRepository;
import kz.akmeshit.hoa.repository.WorkTemplateRepository;
import kz.akmeshit.hoa.repository.ZoneRepository;
import kz.akmeshit.hoa.security.MagicLinkService;
import kz.akmeshit.hoa.task.dto.BulkScheduleRequest;
import kz.akmeshit.hoa.task.dto.DispatchResult;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;

@Service
public class TaskService {

    private final TaskRepository taskRepository;
    private final ZoneRepository zoneRepository;
    private final WorkTemplateRepository workTemplateRepository;
    private final UserRepository userRepository;
    private final WhatsAppGateway whatsAppGateway;
    private final MagicLinkService magicLinkService;
    private final ObjectMapper objectMapper;

    public TaskService(TaskRepository taskRepository, ZoneRepository zoneRepository,
                        WorkTemplateRepository workTemplateRepository, UserRepository userRepository,
                        WhatsAppGateway whatsAppGateway, MagicLinkService magicLinkService,
                        ObjectMapper objectMapper) {
        this.taskRepository = taskRepository;
        this.zoneRepository = zoneRepository;
        this.workTemplateRepository = workTemplateRepository;
        this.userRepository = userRepository;
        this.whatsAppGateway = whatsAppGateway;
        this.magicLinkService = magicLinkService;
        this.objectMapper = objectMapper;
    }

    public List<Task> findByAssigneeAndDate(UUID assigneeId, LocalDate date) {
        return assigneeId != null
                ? taskRepository.findByAssignee_IdAndScheduledDate(assigneeId, date)
                : taskRepository.findByScheduledDate(date);
    }

    @Transactional
    public List<Task> bulkSchedule(BulkScheduleRequest request) {
        Zone zone = zoneRepository.findById(request.zoneId())
                .orElseThrow(() -> new NoSuchElementException("Зона не найдена: " + request.zoneId()));
        WorkTemplate template = workTemplateRepository.findById(request.workTemplateId())
                .orElseThrow(() -> new NoSuchElementException("Шаблон работ не найден: " + request.workTemplateId()));
        User assignee = userRepository.findById(request.assigneeId())
                .orElseThrow(() -> new NoSuchElementException("Исполнитель не найден: " + request.assigneeId()));

        List<ChecklistItemLabel> labels = parseChecklistLabels(template.getChecklistSchemaJson());

        return request.dates().stream()
                .map(date -> {
                    Task task = new Task(zone, template, assignee, date);
                    labels.forEach(l -> task.getChecklistItems().add(new ChecklistItem(task, l.label())));
                    return taskRepository.save(task);
                })
                .toList();
    }

    @Transactional
    public Task assign(UUID taskId, UUID assigneeId) {
        Task task = getOrThrow(taskId);
        User assignee = userRepository.findById(assigneeId)
                .orElseThrow(() -> new NoSuchElementException("Исполнитель не найден: " + assigneeId));
        task.reassign(assignee);
        return task;
    }

    @Transactional
    public Task start(UUID taskId, GeoPoint checkInLocation) {
        Task task = getOrThrow(taskId);
        boolean withinZone = checkInLocation != null
                && task.getZone().getCentroid().distanceMetersTo(checkInLocation) <= task.getZone().getRadiusMeters();
        task.start(checkInLocation, withinZone);
        return task;
    }

    @Transactional
    public Task checkItem(UUID taskId, UUID itemId) {
        Task task = getOrThrow(taskId);
        ChecklistItem item = task.getChecklistItems().stream()
                .filter(i -> i.getId().equals(itemId))
                .findFirst()
                .orElseThrow(() -> new NoSuchElementException("Пункт чек-листа не найден: " + itemId));
        item.check();
        return task;
    }

    @Transactional
    public Task submitForReview(UUID taskId) {
        Task task = getOrThrow(taskId);
        task.submitForReview();
        return task;
    }

    @Transactional
    public Task approve(UUID taskId) {
        Task task = getOrThrow(taskId);
        task.approve();
        return task;
    }

    /**
     * Отправляет персональную magic-link ссылку на задачу через WhatsApp.
     * Идемпотентность по task.id обеспечивается на уровне HTTP-слоя (Idempotency-Key),
     * здесь — просто повторная отправка того же по сути сообщения безопасна.
     */
    @Transactional(readOnly = true)
    public DispatchResult dispatchViaWhatsApp(UUID taskId) {
        Task task = getOrThrow(taskId);
        User assignee = task.getAssignee();
        if (assignee == null) {
            return DispatchResult.failed(taskId, null, "У задачи нет исполнителя");
        }
        String link = magicLinkService.buildTaskLink(assignee.getId(), taskId);
        String message = "Новая задача: %s (%s), %s\nОткрыть: %s".formatted(
                task.getWorkTemplate().getName(),
                task.getZone().getName(),
                task.getScheduledDate(),
                link
        );
        try {
            whatsAppGateway.sendMessage(assignee.getPhoneE164(), message);
            return DispatchResult.sent(taskId, assignee.getPhoneE164());
        } catch (WhatsAppDeliveryException e) {
            return DispatchResult.failed(taskId, assignee.getPhoneE164(), e.getMessage());
        }
    }

    private Task getOrThrow(UUID taskId) {
        return taskRepository.findById(taskId)
                .orElseThrow(() -> new NoSuchElementException("Задача не найдена: " + taskId));
    }

    private List<ChecklistItemLabel> parseChecklistLabels(String schemaJson) {
        try {
            return List.of(objectMapper.readValue(schemaJson, ChecklistItemLabel[].class));
        } catch (Exception e) {
            throw new IllegalStateException("Некорректная схема чек-листа в WorkTemplate: " + e.getMessage(), e);
        }
    }

    private record ChecklistItemLabel(String key, String label, boolean requiresPhoto) {
    }
}
