package kz.akmeshit.hoa.repository;

import kz.akmeshit.hoa.domain.Zone;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface ZoneRepository extends JpaRepository<Zone, UUID> {
}
