package kz.akmeshit.hoa.report;

import kz.akmeshit.hoa.report.dto.ReportRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.NoSuchElementException;
import java.util.UUID;

/** Выделен в отдельный бин, чтобы {@code @Async} перехватывался прокси Spring AOP. */
@Component
public class ReportRenderWorker {

    private static final Logger log = LoggerFactory.getLogger(ReportRenderWorker.class);

    private final ReportRepository reportRepository;
    private final ReportDataAggregator aggregator;
    private final PdfReportService pdfReportService;
    private final DocxReportService docxReportService;
    private final StorageService storageService;

    public ReportRenderWorker(ReportRepository reportRepository, ReportDataAggregator aggregator,
                               PdfReportService pdfReportService, DocxReportService docxReportService,
                               StorageService storageService) {
        this.reportRepository = reportRepository;
        this.aggregator = aggregator;
        this.pdfReportService = pdfReportService;
        this.docxReportService = docxReportService;
        this.storageService = storageService;
    }

    @Async
    @Transactional
    public void renderAsync(UUID reportId, ReportRequest request) {
        try {
            var data = aggregator.aggregate(request.dateFrom(), request.dateTo());
            byte[] content = switch (request.format()) {
                case PDF -> pdfReportService.render(data);
                case DOCX -> docxReportService.render(data);
            };
            String extension = request.format() == ReportFormat.PDF ? "pdf" : "docx";
            String key = "%s.%s".formatted(reportId, extension);
            String url = storageService.store(key, content);

            Report report = reportRepository.findById(reportId)
                    .orElseThrow(() -> new NoSuchElementException("Отчёт не найден: " + reportId));
            report.markReady(url);
            reportRepository.save(report);
        } catch (Exception e) {
            log.error("Не удалось сформировать отчёт {}", reportId, e);
            reportRepository.findById(reportId).ifPresent(r -> {
                r.markFailed(e.getMessage());
                reportRepository.save(r);
            });
        }
    }
}
