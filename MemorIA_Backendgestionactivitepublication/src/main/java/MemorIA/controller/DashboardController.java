package MemorIA.controller;

import MemorIA.dto.DashboardStatsDTO;
import MemorIA.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/soignant/{soignantId}")
    public ResponseEntity<DashboardStatsDTO> getSoignantStats(@PathVariable Long soignantId) {
        return ResponseEntity.ok(dashboardService.getSoignantStats(soignantId));
    }
}
