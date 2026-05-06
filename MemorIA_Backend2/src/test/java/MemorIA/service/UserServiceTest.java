package MemorIA.service;

import MemorIA.dto.SignupRequest;
import MemorIA.entity.User;
import MemorIA.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private EmailService emailService;

    @InjectMocks
    private UserService userService;

    private User adminUser;
    private User regularUser;

    @BeforeEach
    void setUp() {
        adminUser = new User();
        adminUser.setId(1L);
        adminUser.setEmail("admin@memoria.com");
        adminUser.setNom("Admin");
        adminUser.setPrenom("System");
        adminUser.setTelephone("00000000");
        adminUser.setRole("ADMINISTRATEUR");
        adminUser.setActif(true);
        adminUser.setProfileCompleted(true);
        adminUser.setPassword("$2a$10$hashedpassword1234567890123456789012345678901234567890ab");

        regularUser = new User();
        regularUser.setId(2L);
        regularUser.setEmail("patient@example.com");
        regularUser.setNom("Doe");
        regularUser.setPrenom("John");
        regularUser.setTelephone("0612345678");
        regularUser.setRole("PATIENT");
        regularUser.setActif(false);
        regularUser.setProfileCompleted(false);
        regularUser.setPassword("$2a$10$hashedpassword1234567890123456789012345678901234567890ab");
    }

    // ──────────────────────────────────────────────────────────────
    // register
    // ──────────────────────────────────────────────────────────────

    @Test
    void register_success_patientRole() {
        SignupRequest req = new SignupRequest("Doe", "John", "john@example.com", "0612345678", "PATIENT", "password123");

        when(userRepository.findByEmail("john@example.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("password123")).thenReturn("$2a$10$encoded");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(10L);
            return u;
        });

        User result = userService.register(req);

        assertThat(result.getEmail()).isEqualTo("john@example.com");
        assertThat(result.getRole()).isEqualTo("PATIENT");
        assertThat(result.getActif()).isFalse();
        assertThat(result.getProfileCompleted()).isFalse();
        verify(passwordEncoder).encode("password123");
    }

    @Test
    void register_success_soignantRole() {
        SignupRequest req = new SignupRequest("Martin", "Claire", "claire@example.com", "0699887766", "soignant", "securePass1");

        when(userRepository.findByEmail("claire@example.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("securePass1")).thenReturn("$2a$10$encoded");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        User result = userService.register(req);
        assertThat(result.getRole()).isEqualTo("SOIGNANT");
    }

    @Test
    void register_duplicateEmail_throwsConflict() {
        SignupRequest req = new SignupRequest("Doe", "John", "john@example.com", "0612345678", "PATIENT", "password123");
        when(userRepository.findByEmail("john@example.com")).thenReturn(Optional.of(regularUser));

        assertThatThrownBy(() -> userService.register(req))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Email already in use");
    }

    @Test
    void register_adminRole_throwsForbidden() {
        SignupRequest req = new SignupRequest("Evil", "Admin", "evil@example.com", "0600000000", "ADMINISTRATEUR", "password123");
        when(userRepository.findByEmail("evil@example.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.register(req))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Admin accounts cannot be created via signup");
    }

    @Test
    void register_invalidRole_throwsBadRequest() {
        SignupRequest req = new SignupRequest("Doe", "John", "john@example.com", "0612345678", "SUPERUSER", "password123");
        when(userRepository.findByEmail("john@example.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.register(req))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Invalid role");
    }

    // ──────────────────────────────────────────────────────────────
    // authenticate
    // ──────────────────────────────────────────────────────────────

    @Test
    void authenticate_success() {
        regularUser.setActif(true);
        when(userRepository.findByEmail("patient@example.com")).thenReturn(Optional.of(regularUser));
        when(passwordEncoder.matches("rawPassword", regularUser.getPassword())).thenReturn(true);

        User result = userService.authenticate("patient@example.com", "rawPassword");
        assertThat(result.getEmail()).isEqualTo("patient@example.com");
    }

    @Test
    void authenticate_wrongPassword_throwsUnauthorized() {
        when(userRepository.findByEmail("patient@example.com")).thenReturn(Optional.of(regularUser));
        when(passwordEncoder.matches(anyString(), anyString())).thenReturn(false);

        assertThatThrownBy(() -> userService.authenticate("patient@example.com", "wrongpass"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Invalid credentials");
    }

    @Test
    void authenticate_inactiveAccount_throwsForbidden() {
        regularUser.setActif(false);
        when(userRepository.findByEmail("patient@example.com")).thenReturn(Optional.of(regularUser));
        when(passwordEncoder.matches(anyString(), anyString())).thenReturn(true);

        assertThatThrownBy(() -> userService.authenticate("patient@example.com", "rawPassword"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("pending admin confirmation");
    }

    @Test
    void authenticate_userNotFound_throwsUnauthorized() {
        when(userRepository.findByEmail("notexist@example.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.authenticate("notexist@example.com", "pass"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Invalid credentials");
    }

    // ──────────────────────────────────────────────────────────────
    // confirmUserByAdmin
    // ──────────────────────────────────────────────────────────────

    @Test
    void confirmUserByAdmin_success() {
        when(userRepository.findByEmail("admin@memoria.com")).thenReturn(Optional.of(adminUser));
        when(userRepository.findById(2L)).thenReturn(Optional.of(regularUser));
        when(userRepository.save(any(User.class))).thenReturn(regularUser);
        doNothing().when(emailService).sendAccountConfirmation(anyString(), anyString());

        User result = userService.confirmUserByAdmin(2L, "admin@memoria.com");
        assertThat(result.getActif()).isTrue();
        verify(emailService).sendAccountConfirmation(regularUser.getEmail(), regularUser.getPrenom() + " " + regularUser.getNom());
    }

    @Test
    void confirmUserByAdmin_userNotFound_throwsNotFound() {
        when(userRepository.findByEmail("admin@memoria.com")).thenReturn(Optional.of(adminUser));
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.confirmUserByAdmin(99L, "admin@memoria.com"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("User not found");
    }

    @Test
    void confirmUserByAdmin_nonAdminCaller_throwsForbidden() {
        when(userRepository.findByEmail("patient@example.com")).thenReturn(Optional.of(regularUser));

        assertThatThrownBy(() -> userService.confirmUserByAdmin(2L, "patient@example.com"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Admin privileges");
    }

    // ──────────────────────────────────────────────────────────────
    // getAllUsersForAdmin
    // ──────────────────────────────────────────────────────────────

    @Test
    void getAllUsersForAdmin_success() {
        when(userRepository.findByEmail("admin@memoria.com")).thenReturn(Optional.of(adminUser));
        when(userRepository.findAll()).thenReturn(List.of(adminUser, regularUser));

        List<User> users = userService.getAllUsersForAdmin("admin@memoria.com");
        assertThat(users).hasSize(2);
    }

    @Test
    void getAllUsersForAdmin_nonAdmin_throwsForbidden() {
        when(userRepository.findByEmail("patient@example.com")).thenReturn(Optional.of(regularUser));

        assertThatThrownBy(() -> userService.getAllUsersForAdmin("patient@example.com"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Admin privileges");
    }

    // ──────────────────────────────────────────────────────────────
    // deleteUser
    // ──────────────────────────────────────────────────────────────

    @Test
    void deleteUser_success() {
        when(userRepository.findByEmail("admin@memoria.com")).thenReturn(Optional.of(adminUser));
        doNothing().when(userRepository).deleteById(2L);

        userService.deleteUser(2L, "admin@memoria.com");
        verify(userRepository).deleteById(2L);
    }

    // ──────────────────────────────────────────────────────────────
    // markProfileCompleted
    // ──────────────────────────────────────────────────────────────

    @Test
    void markProfileCompleted_success() {
        when(userRepository.findById(2L)).thenReturn(Optional.of(regularUser));
        when(userRepository.save(any(User.class))).thenReturn(regularUser);

        userService.markProfileCompleted(2L);
        assertThat(regularUser.getProfileCompleted()).isTrue();
    }

    @Test
    void markProfileCompleted_userNotFound_throwsNotFound() {
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.markProfileCompleted(99L))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("User not found");
    }

    // ──────────────────────────────────────────────────────────────
    // getActiveUserForRole
    // ──────────────────────────────────────────────────────────────

    @Test
    void getActiveUserForRole_success() {
        regularUser.setActif(true);
        when(userRepository.findById(2L)).thenReturn(Optional.of(regularUser));

        User result = userService.getActiveUserForRole(2L, "PATIENT");
        assertThat(result.getRole()).isEqualTo("PATIENT");
    }

    @Test
    void getActiveUserForRole_roleMismatch_throwsForbidden() {
        regularUser.setActif(true);
        when(userRepository.findById(2L)).thenReturn(Optional.of(regularUser));

        assertThatThrownBy(() -> userService.getActiveUserForRole(2L, "SOIGNANT"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("role does not match");
    }

    @Test
    void getActiveUserForRole_inactiveUser_throwsForbidden() {
        regularUser.setActif(false);
        when(userRepository.findById(2L)).thenReturn(Optional.of(regularUser));

        assertThatThrownBy(() -> userService.getActiveUserForRole(2L, "PATIENT"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("pending admin confirmation");
    }

    // ──────────────────────────────────────────────────────────────
    // getUsersByRole
    // ──────────────────────────────────────────────────────────────

    @Test
    void getUsersByRole_success() {
        when(userRepository.findByEmail("admin@memoria.com")).thenReturn(Optional.of(adminUser));
        when(userRepository.findByRole("PATIENT")).thenReturn(List.of(regularUser));

        List<User> result = userService.getUsersByRole("PATIENT", "admin@memoria.com");
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getRole()).isEqualTo("PATIENT");
    }
}
