package MemorIA.repository;

import MemorIA.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmailAndPassword(String email, String password);

    Optional<User> findByEmail(String email);

    java.util.List<User> findByFirstNameContainingIgnoreCaseOrLastNameContainingIgnoreCase(String firstName,
            String lastName);

    long countByRole(MemorIA.entity.Role role);

    java.util.List<User> findByRole(MemorIA.entity.Role role);
}