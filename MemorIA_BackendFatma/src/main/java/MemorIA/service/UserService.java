package MemorIA.service;

import MemorIA.dto.SignupRequest;
import MemorIA.entity.User;
import MemorIA.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder, EmailService emailService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
    }

    public List<User> getAllUsersForAdmin(String adminEmail) {
        requireActiveAdmin(adminEmail);
        return userRepository.findAll();
    }

    public Optional<User> getUserByIdForAdmin(Long id, String adminEmail) {
        requireActiveAdmin(adminEmail);
        return userRepository.findById(id);
    }

    public User saveUser(User user) {
        if (userRepository.findByEmail(user.getEmail()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already in use");
        }
        if ("ADMINISTRATEUR".equalsIgnoreCase(user.getRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin accounts cannot be created via signup");
        }
        user.setActif(false);
        user.setProfileCompleted(Boolean.FALSE);
        user.setPassword(encodeIfNeeded(user.getPassword()));
        return userRepository.save(user);
    }

    public User register(SignupRequest request) {
        if (userRepository.findByEmail(request.email()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already in use");
        }
        if ("ADMINISTRATEUR".equalsIgnoreCase(request.role())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin accounts cannot be created via signup");
        }

        String normalizedRole = request.role() != null ? request.role().toUpperCase() : "";
        if (!normalizedRole.equals("PATIENT")
                && !normalizedRole.equals("SOIGNANT")
                && !normalizedRole.equals("ACCOMPAGNANT")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Invalid role. Allowed values: PATIENT, SOIGNANT, ACCOMPAGNANT.");
        }

        User user = new User();
        user.setNom(request.nom());
        user.setPrenom(request.prenom());
        user.setEmail(request.email());
        user.setTelephone(request.telephone());
        user.setRole(normalizedRole);
        user.setActif(false);
        user.setProfileCompleted(Boolean.FALSE);
        user.setPassword(passwordEncoder.encode(request.password()));
        return userRepository.save(user);
    }

    public User updateUser(Long id, User userDetails, String adminEmail) {
        requireActiveAdmin(adminEmail);
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found with id: " + id));

        user.setNom(userDetails.getNom());
        user.setPrenom(userDetails.getPrenom());
        if (!user.getEmail().equals(userDetails.getEmail())
                && userRepository.findByEmail(userDetails.getEmail()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already in use");
        }
        user.setEmail(userDetails.getEmail());
        user.setTelephone(userDetails.getTelephone());
        if ("ADMINISTRATEUR".equalsIgnoreCase(userDetails.getRole()) && !"ADMINISTRATEUR".equalsIgnoreCase(user.getRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Role escalation to admin is not allowed");
        }
        user.setRole(userDetails.getRole());
        user.setActif(userDetails.getActif());
        if (userDetails.getProfileCompleted() != null) {
            user.setProfileCompleted(userDetails.getProfileCompleted());
        }
        if (userDetails.getPassword() != null && !userDetails.getPassword().isBlank()) {
            user.setPassword(encodeIfNeeded(userDetails.getPassword()));
        }

        return userRepository.save(user);
    }

    public void deleteUser(Long id, String adminEmail) {
        requireActiveAdmin(adminEmail);
        userRepository.deleteById(id);
    }

    public List<User> getUsersByRole(String role, String adminEmail) {
        requireActiveAdmin(adminEmail);
        return userRepository.findByRole(role);
    }

    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    public User authenticate(String email, String password) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));

        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }
        if (!Boolean.TRUE.equals(user.getActif())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Your account is pending admin confirmation");
        }
        return user;
    }

    public User confirmUserByAdmin(Long userId, String adminEmail) {
        requireActiveAdmin(adminEmail);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found with id: " + userId));

        user.setActif(true);
        User saved = userRepository.save(user);
        emailService.sendAccountConfirmation(saved.getEmail(), saved.getPrenom() + " " + saved.getNom());
        return saved;
    }

    public User getActiveUserForRole(Long userId, String expectedRole) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found with id: " + userId));

        if (!expectedRole.equalsIgnoreCase(user.getRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "User role does not match requested profile type");
        }
        if (!Boolean.TRUE.equals(user.getActif())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Your account is pending admin confirmation");
        }
        return user;
    }

    public void markProfileCompleted(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found with id: " + userId));
        user.setProfileCompleted(Boolean.TRUE);
        userRepository.save(user);
    }

    private void requireActiveAdmin(String adminEmail) {
        User admin = userRepository.findByEmail(adminEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin privileges are required"));

        boolean isAdmin = "ADMINISTRATEUR".equalsIgnoreCase(admin.getRole());
        boolean isActive = Boolean.TRUE.equals(admin.getActif());
        if (!isAdmin || !isActive) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin privileges are required");
        }
    }

    private String encodeIfNeeded(String rawPassword) {
        if (rawPassword == null || rawPassword.isBlank()) {
            return rawPassword;
        }
        if (rawPassword.matches("^\\$2[aby]\\$.{56}$")) {
            return rawPassword;
        }
        return passwordEncoder.encode(rawPassword);
    }
}
