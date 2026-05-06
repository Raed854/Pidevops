package MemorIA.service;

import MemorIA.dto.AdherenceStatsDTO;

public interface IAdherenceService {
    AdherenceStatsDTO calculateAdherenceStats(Long patientId, Integer period);
    void updatePatientAdherenceRate(Long patientId);
}