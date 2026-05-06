package MemorIA.repository;

import MemorIA.entity.community.Community;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface CommunityRepository extends JpaRepository<Community, Long> {

    @Query("SELECT c FROM Community c JOIN c.members m WHERE m.id = :userId")
    List<Community> findUserGroups(@Param("userId") Long userId);

    List<Community> findByIsPrivateFalse();

    List<Community> findByNameContainingIgnoreCase(String name);

    List<Community> findByNameContainingIgnoreCaseAndIsPrivateFalse(String name);

    long countByIsBlockedFalse();

    /** Count communities where a user is a member */
    long countByMembersId(Long userId);
}