package kz.akmeshit.hoa.report;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * Локальная файловая реализация для разработки/single-instance деплоя.
 * [Предположение] Продакшен должен использовать S3-совместимое хранилище
 * (см. ARCHITECTURE.md §6) — эта реализация не переживёт рестарт контейнера
 * без примонтированного persistent volume.
 */
@Component
public class LocalFileStorageService implements StorageService {

    private final Path reportsDir;

    public LocalFileStorageService(@Value("${hoa.storage.reports-dir:./data/reports}") String reportsDir) {
        this.reportsDir = Path.of(reportsDir);
    }

    @Override
    public String store(String key, byte[] content) {
        try {
            Files.createDirectories(reportsDir);
            Path target = reportsDir.resolve(key);
            Files.write(target, content);
            return "/api/v1/reports/files/" + key;
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
