package MemorIA.repository;

import MemorIA.entity.User;
import MemorIA.entity.role.StatutDisponibilite;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    List<User> findByRole(String role);
    List<User> findByRoleAndActif(String role, Boolean actif);
    Optional<User> findByEmail(String email);
    
    @Query("SELECT DISTINCT u FROM User u " +
           "INNER JOIN Disponibilite d ON d.user.id = u.id " +
           "WHERE u.role = :role AND d.statut = :statut")
    List<User> findByRoleAndDisponibiliteStatut(@Param("role") String role, @Param("statut") StatutDisponibilite statut);
}
