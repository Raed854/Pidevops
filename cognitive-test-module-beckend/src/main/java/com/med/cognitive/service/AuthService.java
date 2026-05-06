package com.med.cognitive.service;

import com.med.cognitive.dto.LoginRequest;
import com.med.cognitive.dto.LoginResponse;
import com.med.cognitive.dto.UserDTO;
import com.med.cognitive.mysql.entity.User;
import com.med.cognitive.mysql.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;

    /**
     * Authenticate user with email and password
     */
    public LoginResponse login(LoginRequest request) {
        Optional<User> userOptional = userRepository.findByEmail(request.getEmail());
        
        if (userOptional.isEmpty()) {
            return new LoginResponse(null, request.getEmail(), null, null, null, null, null, "Invalid email or password");
        }

        User user = userOptional.get();

        // Simple password check (in production use BCryptPasswordEncoder)
        if (!user.getPassword().equals(request.getPassword())) {
            return new LoginResponse(null, request.getEmail(), null, null, null, null, null, "Invalid email or password");
        }

        if (!user.getActif()) {
            return new LoginResponse(null, request.getEmail(), null, null, null, null, null, "User account is inactive");
        }

        return new LoginResponse(
            user.getId(),
            user.getEmail(),
            user.getNom(),
            user.getPrenom(),
            user.getRole(),
            user.getAdresse(),
            user.getProfileCompleted(),
            "Login successful"
        );
    }

    /**
     * Get user by ID
     */
    public UserDTO getUserById(Long id) {
        Optional<User> user = userRepository.findById(id);
        return user.map(this::convertToDTO).orElse(null);
    }

    /**
     * Get all users by role
     */
    public List<UserDTO> getUsersByRole(String role) {
        return userRepository.findByRole(role).stream()
            .map(this::convertToDTO)
            .collect(Collectors.toList());
    }

    /**
     * Get all patients
     */
    public List<UserDTO> getAllPatients() {
        return getUsersByRole("PATIENT");
    }

    /**
     * Get all soignants (doctors)
     */
    public List<UserDTO> getAllSoignants() {
        return getUsersByRole("SOIGNANT");
    }

    /**
     * Get all aidants (caregivers)
     */
    public List<UserDTO> getAllAidants() {
        return getUsersByRole("AIDANT");
    }

    /**
     * Get patients for a soignant
     */
    public List<UserDTO> getPatientsForSoignant(Long soignantId) {
        // Find all patients where soignant_id = soignantId
        return userRepository.findAll().stream()
            .filter(u -> "PATIENT".equals(u.getRole()) && 
                    u.getSoignant() != null && 
                    u.getSoignant().getId().equals(soignantId))
            .map(this::convertToDTO)
            .collect(Collectors.toList());
    }

    /**
     * Get aidants for a patient
     */
    public List<UserDTO> getAidantsForPatient(Long patientId) {
        return userRepository.findAll().stream()
            .filter(u -> "AIDANT".equals(u.getRole()) && 
                    u.getPatient() != null && 
                    u.getPatient().getId().equals(patientId))
            .map(this::convertToDTO)
            .collect(Collectors.toList());
    }

    /**
     * Create or update user
     */
    public UserDTO createOrUpdateUser(User user) {
        User savedUser = userRepository.save(user);
        return convertToDTO(savedUser);
    }

    /**
     * Convert User entity to DTO
     */
    private UserDTO convertToDTO(User user) {
        UserDTO dto = new UserDTO();
        dto.setId(user.getId());
        dto.setNom(user.getNom());
        dto.setPrenom(user.getPrenom());
        dto.setEmail(user.getEmail());
        dto.setTelephone(user.getTelephone());
        dto.setRole(user.getRole());
        dto.setActif(user.getActif());
        dto.setAdresse(user.getAdresse());
        dto.setDateNaissance(user.getDateNaissance());
        dto.setSexe(user.getSexe());
        dto.setSpecialite(user.getSpecialite());
        dto.setMatricule(user.getMatricule());
        dto.setRelation(user.getRelation());
        dto.setProfileCompleted(user.getProfileCompleted());
        
        if (user.getPatient() != null) {
            dto.setPatientId(user.getPatient().getId());
        }
        if (user.getSoignant() != null) {
            dto.setSoignantId(user.getSoignant().getId());
        }
        
        return dto;
    }
}
