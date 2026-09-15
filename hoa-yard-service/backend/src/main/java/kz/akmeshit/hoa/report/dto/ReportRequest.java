package kz.akmeshit.hoa.report.dto;

import jakarta.validation.constraints.NotNull;
import kz.akmeshit.hoa.report.ReportFormat;
import kz.akmeshit.hoa.report.ReportPeriod;

import java.time.LocalDate;

public record ReportRequest(
        @NotNull ReportPeriod period,
        @NotNull ReportFormat format,
        @NotNull LocalDate dateFrom,
        @NotNull LocalDate dateTo
) {
}
