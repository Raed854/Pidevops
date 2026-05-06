package MemorIA.service;

import MemorIA.entity.Traitements.HistoriquePosition;
import MemorIA.repository.LocationHistoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class LocationHistoryService {

    @Autowired
    private LocationHistoryRepository locationHistoryRepository;

    public List<HistoriquePosition> getAllLocationHistory() {
        return locationHistoryRepository.findAll();
    }

    public Optional<HistoriquePosition> getLocationHistoryById(Long id) {
        return locationHistoryRepository.findById(id);
    }

    public List<HistoriquePosition> getLocationHistoryByTraitementId(Long traitementId) {
        return locationHistoryRepository.findByTraitementsIdTraitement(traitementId);
    }

    public List<HistoriquePosition> getLocationHistoryByDateRange(LocalDateTime startDate, LocalDateTime endDate) {
        return locationHistoryRepository.findByDateEnregistrementBetween(startDate, endDate);
    }

    public List<HistoriquePosition> getLocationHistoryByTraitementAndDateRange(
            Long traitementId, LocalDateTime startDate, LocalDateTime endDate) {
        return locationHistoryRepository.findByTraitementsIdTraitementAndDateEnregistrementBetween(
                traitementId, startDate, endDate);
    }

    public HistoriquePosition createLocationHistory(HistoriquePosition locationHistory) {
        if (locationHistory.getDateEnregistrement() == null) {
            locationHistory.setDateEnregistrement(LocalDateTime.now());
        }
        return locationHistoryRepository.save(locationHistory);
    }

    public HistoriquePosition updateLocationHistory(Long id, HistoriquePosition details) {
        return locationHistoryRepository.findById(id).map(h -> {
            h.setLatitude(details.getLatitude());
            h.setLongitude(details.getLongitude());
            h.setDureeArretMinute(details.getDureeArretMinute());
            h.setHeureArrive(details.getHeureArrive());
            h.setHeureDepart(details.getHeureDepart());
            h.setDistancePointPrecedent(details.getDistancePointPrecedent());
            h.setDistancePointSuivant(details.getDistancePointSuivant());
            return locationHistoryRepository.save(h);
        }).orElse(null);
    }

    public void deleteLocationHistory(Long id) {
        locationHistoryRepository.deleteById(id);
    }
}
