package com.med.cognitive.controller;

import com.med.cognitive.dto.LoginRequest;
import com.med.cognitive.dto.LoginResponse;
import com.med.cognitive.dto.UserDTO;
import com.med.cognitive.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AuthController {

    private final AuthService authService;

    /**
     * User login endpoint
     */
    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest request) {
        LoginResponse response = authService.login(request);
        
        if (response.getId() == null) {
            return ResponseEntity.status(401).body(response);
        }
        
        return ResponseEntity.ok(response);
    }

    /**
     * Get user by ID
     */
    @GetMapping("/user/{id}")
    public ResponseEntity<UserDTO> getUser(@PathVariable Long id) {
        UserDTO user = authService.getUserById(id);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(user);
    }

    /**
     * Get all patients
     */
    @GetMapping("/patients")
    public ResponseEntity<List<UserDTO>> getAllPatients() {
        return ResponseEntity.ok(authService.getAllPatients());
    }

    /**
     * Get all soignants
     */
    @GetMapping("/soignants")
    public ResponseEntity<List<UserDTO>> getAllSoignants() {
        return ResponseEntity.ok(authService.getAllSoignants());
    }

    /**
     * Get all aidants
     */
    @GetMapping("/aidants")
    public ResponseEntity<List<UserDTO>> getAllAidants() {
        return ResponseEntity.ok(authService.getAllAidants());
    }

    /**
     * Get patients for a soignant
     */
    @GetMapping("/soignant/{soignantId}/patients")
    public ResponseEntity<List<UserDTO>> getPatientsForSoignant(@PathVariable Long soignantId) {
        return ResponseEntity.ok(authService.getPatientsForSoignant(soignantId));
    }

    /**
     * Get aidants for a patient
     */
    @GetMapping("/patient/{patientId}/aidants")
    public ResponseEntity<List<UserDTO>> getAidantsForPatient(@PathVariable Long patientId) {
        return ResponseEntity.ok(authService.getAidantsForPatient(patientId));
    }
}
