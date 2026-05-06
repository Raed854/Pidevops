package MemorIA.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardStatsDTO {
    
    // Cards Data
    private long totalActivities;
    private long totalSessions;
    private long availableSessions;
    private long reservedSessions;
    private long cancelledSessions;
    private long totalReservations;

    // Per Activity Stats
    private Map<String, Long> reservationsPerActivity; // Titre -> Nombre

    // Detailed Subscribers List for Doctor
    private List<SubscriberStats> subscribers;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SubscriberStats {
        private String fullUserName;
        private String typePack;
        private String statut;
        private int seancesTotal;
        private int seancesUsed;
        private int seancesRestantes;
        private String dateFin;
    }
}
