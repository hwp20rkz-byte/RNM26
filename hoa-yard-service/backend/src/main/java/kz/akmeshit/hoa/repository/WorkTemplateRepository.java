package kz.akmeshit.hoa.repository;

import kz.akmeshit.hoa.domain.WorkTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface WorkTemplateRepository extends JpaRepository<WorkTemplate, UUID> {
}
