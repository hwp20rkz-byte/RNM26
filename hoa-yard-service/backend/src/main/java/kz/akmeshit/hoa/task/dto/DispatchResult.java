package kz.akmeshit.hoa.task.dto;

import java.util.UUID;

public record DispatchResult(UUID taskId, String phone, String status, String error) {

    public static DispatchResult sent(UUID taskId, String phone) {
        return new DispatchResult(taskId, phone, "SENT", null);
    }

    public static DispatchResult failed(UUID taskId, String phone, String error) {
        return new DispatchResult(taskId, phone, "FAILED", error);
    }
}
