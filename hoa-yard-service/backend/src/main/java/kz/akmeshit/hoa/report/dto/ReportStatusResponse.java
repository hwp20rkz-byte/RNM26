package kz.akmeshit.hoa.report.dto;

import java.util.UUID;

public record ReportStatusResponse(UUID reportId, String status, String downloadUrl) {
}
