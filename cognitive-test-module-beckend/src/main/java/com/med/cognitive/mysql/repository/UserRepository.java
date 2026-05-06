package com.med.cognitive.mysql.repository;

import com.med.cognitive.mysql.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    List<User> findByRole(String role);
    Optional<User> findByIdAndRole(Long id, String role);
    Optional<User> findByEmailAndPassword(String email, String password);
}
