package com.med.cognitive.repository;

import com.med.cognitive.entity.RecMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository pour la gestion des messages de recommandation
 */
@Repository
public interface RecMessageRepository extends JpaRepository<RecMessage, Long> {

    /**
     * Récupère tous les messages d'une recommandation, triés par date d'envoi
     */
    @Query("SELECT m FROM RecMessage m WHERE m.recId = :recId ORDER BY m.sentAt ASC")
    List<RecMessage> findByRecommendationId(@Param("recId") Long recId);

    /**
     * Récupère les messages non lus d'une recommandation envoyés par l'aidant
     */
    @Query("SELECT m FROM RecMessage m WHERE m.recId = :recId AND m.from = 'AIDANT' AND m.read = false")
    List<RecMessage> findUnreadFromAidant(@Param("recId") Long recId);

    /**
     * Récupère les messages non lus d'une recommandation envoyés par le médecin
     */
    @Query("SELECT m FROM RecMessage m WHERE m.recId = :recId AND m.from = 'MEDECIN' AND m.read = false")
    List<RecMessage> findUnreadFromMedecin(@Param("recId") Long recId);

    /**
     * Compte les messages non lus pour un médecin sur toutes ses recommandations
     */
    @Query("SELECT COUNT(m) FROM RecMessage m " +
           "JOIN Recommendation r ON m.recId = r.id " +
           "WHERE r.clinicianId = :clinicianId AND m.from = 'AIDANT' AND m.read = false")
    Long countUnreadForDoctor(@Param("clinicianId") Long clinicianId);

    /**
     * Compte les messages non lus pour un aidant sur un patient
     */
    @Query("SELECT COUNT(m) FROM RecMessage m " +
           "JOIN Recommendation r ON m.recId = r.id " +
           "WHERE r.patientId = :patientId AND m.from = 'MEDECIN' AND m.read = false")
    Long countUnreadForAidant(@Param("patientId") Long patientId);
}
