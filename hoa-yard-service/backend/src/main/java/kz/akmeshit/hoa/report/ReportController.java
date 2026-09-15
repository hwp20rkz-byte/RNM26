package kz.akmeshit.hoa.report;

import jakarta.validation.Valid;
import kz.akmeshit.hoa.report.dto.ReportRequest;
import kz.akmeshit.hoa.report.dto.ReportStatusResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.nio.file.Path;
import java.util.NoSuchElementException;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/reports")
@PreAuthorize("hasAnyRole('ADMIN','CHAIRMAN')")
public class ReportController {

    private final ReportGenerationService generationService;
    private final ReportRepository reportRepository;
    private final Path reportsDir;

    public ReportController(ReportGenerationService generationService, ReportRepository reportRepository,
                             @Value("${hoa.storage.reports-dir:./data/reports}") String reportsDir) {
        this.generationService = generationService;
        this.reportRepository = reportRepository;
        this.reportsDir = Path.of(reportsDir).toAbsolutePath().normalize();
    }

    @PostMapping("/generate")
    public ResponseEntity<ReportStatusResponse> generate(@Valid @RequestBody ReportRequest request) {
        Report report = generationService.enqueue(request);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(toStatus(report));
    }

    @GetMapping("/{id}")
    public ReportStatusResponse status(@PathVariable UUID id) {
        Report report = reportRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Отчёт не найден: " + id));
        return toStatus(report);
    }

    /**
     * Выдача файла для {@link LocalFileStorageService} (dev/single-instance).
     * В продакшене с S3-хранилищем этот эндпоинт не используется — клиент
     * скачивает по presigned URL напрямую из бакета.
     */
    @GetMapping("/files/{key}")
    public ResponseEntity<Resource> downloadFile(@PathVariable String key) {
        if (key.contains("..") || key.contains("/")) {
            return ResponseEntity.badRequest().build();
        }
        Path target = reportsDir.resolve(key).normalize();
        if (!target.startsWith(reportsDir) || !target.toFile().exists()) {
            return ResponseEntity.notFound().build();
        }
        MediaType contentType = key.endsWith(".pdf") ? MediaType.APPLICATION_PDF : MediaType.APPLICATION_OCTET_STREAM;
        return ResponseEntity.ok()
                .contentType(contentType)
                .header("Content-Disposition", "attachment; filename=\"" + key + "\"")
                .body(new FileSystemResource(target));
    }

    private ReportStatusResponse toStatus(Report report) {
        String downloadUrl = report.getStatus() == Report.Status.READY ? report.getFileUrl() : null;
        return new ReportStatusResponse(report.getId(), report.getStatus().name(), downloadUrl);
    }
}
