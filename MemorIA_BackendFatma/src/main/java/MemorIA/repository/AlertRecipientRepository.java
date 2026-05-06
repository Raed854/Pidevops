package MemorIA.repository;

import MemorIA.entity.alerts.AlertRecipient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface AlertRecipientRepository extends JpaRepository<AlertRecipient, Long> {

    @Query("""
            SELECT ar FROM AlertRecipient ar
            JOIN FETCH ar.alert a
            JOIN FETCH a.patient p
            JOIN FETCH p.user
            LEFT JOIN FETCH a.createdBy
            LEFT JOIN FETCH a.assignedToUser
            LEFT JOIN FETCH a.resolvedByUser
            WHERE ar.user.id = :userId
            ORDER BY a.createdAt DESC
            """)
    List<AlertRecipient> findVisibleByUserId(@Param("userId") Long userId);

    @Modifying
    @Query("DELETE FROM AlertRecipient ar WHERE ar.alert.id = :alertId")
    int deleteByAlertId(@Param("alertId") Long alertId);
}
