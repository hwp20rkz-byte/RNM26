package kz.akmeshit.hoa.report;

import kz.akmeshit.hoa.report.dto.ReportRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReportGenerationService {

    private final ReportRepository reportRepository;
    private final ReportRenderWorker renderWorker;

    public ReportGenerationService(ReportRepository reportRepository, ReportRenderWorker renderWorker) {
        this.reportRepository = reportRepository;
        this.renderWorker = renderWorker;
    }

    @Transactional
    public Report enqueue(ReportRequest request) {
        Report report = new Report(request.period(), request.dateFrom(), request.dateTo(), request.format());
        report = reportRepository.save(report);
        // Вызов через отдельный бин, а не this.renderAsync(...) — @Async работает через
        // Spring AOP прокси и не перехватывает self-invocation внутри одного класса.
        renderWorker.renderAsync(report.getId(), request);
        return report;
    }
}
