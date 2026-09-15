package kz.akmeshit.hoa.report;

public interface StorageService {
    /** @return публично разрешаемый (или presigned) URL сохранённого файла */
    String store(String key, byte[] content);
}
