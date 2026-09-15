package kz.akmeshit.hoa.repository;

import kz.akmeshit.hoa.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByPhoneE164(String phoneE164);
}
