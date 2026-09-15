package kz.akmeshit.hoa.report;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "report")
public class Report {

    public enum Status { PENDING, READY, FAILED }

    @Id
    @GeneratedValue
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ReportPeriod period;

    @Column(nullable = false)
    private LocalDate periodStart;

    @Column(nullable = false)
    private LocalDate periodEnd;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ReportFormat format;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status = Status.PENDING;

    private String fileUrl;
    private String failureReason;

    protected Report() {
    }

    public Report(ReportPeriod period, LocalDate periodStart, LocalDate periodEnd, ReportFormat format) {
        this.period = period;
        this.periodStart = periodStart;
        this.periodEnd = periodEnd;
        this.format = format;
    }

    public void markReady(String fileUrl) {
        this.status = Status.READY;
        this.fileUrl = fileUrl;
    }

    public void markFailed(String reason) {
        this.status = Status.FAILED;
        this.failureReason = reason;
    }

    public UUID getId() {
        return id;
    }

    public LocalDate getPeriodStart() {
        return periodStart;
    }

    public LocalDate getPeriodEnd() {
        return periodEnd;
    }

    public ReportFormat getFormat() {
        return format;
    }

    public Status getStatus() {
        return status;
    }

    public String getFileUrl() {
        return fileUrl;
    }
}
