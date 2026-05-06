package MemorIA.service;

import MemorIA.dto.SignupRequest;
import MemorIA.entity.User;
import MemorIA.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

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

    private User patient;
    private User admin;

    @BeforeEach
    void setUp() {
        patient = new User();
        patient.setId(1L);
        patient.setNom("Doe");
        patient.setPrenom("John");
        patient.setEmail("john@test.com");
        patient.setTelephone("12345678");
        patient.setRole("PATIENT");
        patient.setActif(true);
        patient.setProfileCompleted(false);
        patient.setPassword("encoded");

        admin = new User();
        admin.setId(99L);
        admin.setNom("Admin");
        admin.setPrenom("Boss");
        admin.setEmail("admin@test.com");
        admin.setTelephone("12345678");
        admin.setRole("ADMINISTRATEUR");
        admin.setActif(true);
        admin.setProfileCompleted(true);
        admin.setPassword("adminEncoded");
    }

    @Test
    @DisplayName("register: creates a new patient with encoded password and inactive flag")
    void register_createsNewUser() {
        SignupRequest request = new SignupRequest(
                "Doe", "John", "new@test.com", "12345678", "PATIENT", "secret123");

        when(userRepository.findByEmail("new@test.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("secret123")).thenReturn("ENCODED");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        User result = userService.register(request);

        assertEquals("PATIENT", result.getRole());
        assertEquals("ENCODED", result.getPassword());
        assertFalse(result.getActif());
        assertFalse(result.getProfileCompleted());
        verify(userRepository).save(any(User.class));
    }

    @Test
    @DisplayName("register: throws CONFLICT when email already exists")
    void register_throwsConflictOnDuplicateEmail() {
        SignupRequest request = new SignupRequest(
                "Doe", "John", "john@test.com", "12345678", "PATIENT", "secret123");

        when(userRepository.findByEmail("john@test.com")).thenReturn(Optional.of(patient));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> userService.register(request));
        assertEquals(409, ex.getStatusCode().value());
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("register: forbids ADMINISTRATEUR role via signup")
    void register_forbidsAdminRole() {
        SignupRequest request = new SignupRequest(
                "Doe", "John", "new@test.com", "12345678", "ADMINISTRATEUR", "secret123");

        when(userRepository.findByEmail("new@test.com")).thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> userService.register(request));
        assertEquals(403, ex.getStatusCode().value());
    }

    @Test
    @DisplayName("register: rejects invalid roles")
    void register_rejectsInvalidRole() {
        SignupRequest request = new SignupRequest(
                "Doe", "John", "new@test.com", "12345678", "RANDOM", "secret123");

        when(userRepository.findByEmail("new@test.com")).thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> userService.register(request));
        assertEquals(400, ex.getStatusCode().value());
    }

    @Test
    @DisplayName("authenticate: returns user when credentials are valid and account is active")
    void authenticate_succeeds() {
        when(userRepository.findByEmail("john@test.com")).thenReturn(Optional.of(patient));
        when(passwordEncoder.matches("raw", "encoded")).thenReturn(true);

        User result = userService.authenticate("john@test.com", "raw");

        assertEquals(patient, result);
    }

    @Test
    @DisplayName("authenticate: throws UNAUTHORIZED when password mismatch")
    void authenticate_throwsOnWrongPassword() {
        when(userRepository.findByEmail("john@test.com")).thenReturn(Optional.of(patient));
        when(passwordEncoder.matches("bad", "encoded")).thenReturn(false);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> userService.authenticate("john@test.com", "bad"));
        assertEquals(401, ex.getStatusCode().value());
    }

    @Test
    @DisplayName("authenticate: throws UNAUTHORIZED when user not found")
    void authenticate_throwsWhenUserMissing() {
        when(userRepository.findByEmail("none@test.com")).thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> userService.authenticate("none@test.com", "any"));
        assertEquals(401, ex.getStatusCode().value());
    }

    @Test
    @DisplayName("authenticate: throws FORBIDDEN when account is not active")
    void authenticate_throwsWhenInactive() {
        patient.setActif(false);
        when(userRepository.findByEmail("john@test.com")).thenReturn(Optional.of(patient));
        when(passwordEncoder.matches("raw", "encoded")).thenReturn(true);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> userService.authenticate("john@test.com", "raw"));
        assertEquals(403, ex.getStatusCode().value());
    }

    @Test
    @DisplayName("getAllUsersForAdmin: returns all users when caller is active admin")
    void getAllUsersForAdmin_returnsAll() {
        when(userRepository.findByEmail("admin@test.com")).thenReturn(Optional.of(admin));
        when(userRepository.findAll()).thenReturn(Arrays.asList(patient, admin));

        List<User> result = userService.getAllUsersForAdmin("admin@test.com");

        assertEquals(2, result.size());
    }

    @Test
    @DisplayName("getAllUsersForAdmin: forbids non-admin caller")
    void getAllUsersForAdmin_forbidsNonAdmin() {
        when(userRepository.findByEmail("john@test.com")).thenReturn(Optional.of(patient));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> userService.getAllUsersForAdmin("john@test.com"));
        assertEquals(403, ex.getStatusCode().value());
    }

    @Test
    @DisplayName("getAllUsersForAdmin: forbids inactive admin")
    void getAllUsersForAdmin_forbidsInactiveAdmin() {
        admin.setActif(false);
        when(userRepository.findByEmail("admin@test.com")).thenReturn(Optional.of(admin));

        assertThrows(ResponseStatusException.class,
                () -> userService.getAllUsersForAdmin("admin@test.com"));
    }

    @Test
    @DisplayName("confirmUserByAdmin: activates user and sends confirmation email")
    void confirmUserByAdmin_activatesAndEmails() {
        patient.setActif(false);
        when(userRepository.findByEmail("admin@test.com")).thenReturn(Optional.of(admin));
        when(userRepository.findById(1L)).thenReturn(Optional.of(patient));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        User result = userService.confirmUserByAdmin(1L, "admin@test.com");

        assertTrue(result.getActif());
        verify(emailService).sendAccountConfirmation("john@test.com", "John Doe");
    }

    @Test
    @DisplayName("confirmUserByAdmin: swallows email errors and still activates user")
    void confirmUserByAdmin_swallowsEmailErrors() {
        patient.setActif(false);
        when(userRepository.findByEmail("admin@test.com")).thenReturn(Optional.of(admin));
        when(userRepository.findById(1L)).thenReturn(Optional.of(patient));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        doThrow(new RuntimeException("smtp down"))
                .when(emailService).sendAccountConfirmation(anyString(), anyString());

        User result = userService.confirmUserByAdmin(1L, "admin@test.com");

        assertTrue(result.getActif());
    }

    @Test
    @DisplayName("confirmUserByAdmin: throws NOT_FOUND when user does not exist")
    void confirmUserByAdmin_throwsWhenUserMissing() {
        when(userRepository.findByEmail("admin@test.com")).thenReturn(Optional.of(admin));
        when(userRepository.findById(404L)).thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> userService.confirmUserByAdmin(404L, "admin@test.com"));
        assertEquals(404, ex.getStatusCode().value());
    }

    @Test
    @DisplayName("getActiveUserForRole: returns user when role matches and user is active")
    void getActiveUserForRole_returnsUser() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(patient));

        User result = userService.getActiveUserForRole(1L, "PATIENT");

        assertEquals(patient, result);
    }

    @Test
    @DisplayName("getActiveUserForRole: forbids when role mismatch")
    void getActiveUserForRole_forbidsRoleMismatch() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(patient));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> userService.getActiveUserForRole(1L, "SOIGNANT"));
        assertEquals(403, ex.getStatusCode().value());
    }

    @Test
    @DisplayName("getActiveUserForRole: forbids inactive users")
    void getActiveUserForRole_forbidsInactive() {
        patient.setActif(false);
        when(userRepository.findById(1L)).thenReturn(Optional.of(patient));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> userService.getActiveUserForRole(1L, "PATIENT"));
        assertEquals(403, ex.getStatusCode().value());
    }

    @Test
    @DisplayName("markProfileCompleted: sets profileCompleted to true")
    void markProfileCompleted_setsTrue() {
        patient.setProfileCompleted(false);
        when(userRepository.findById(1L)).thenReturn(Optional.of(patient));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        userService.markProfileCompleted(1L);

        assertTrue(patient.getProfileCompleted());
        verify(userRepository).save(patient);
    }

    @Test
    @DisplayName("getUsersByRole: returns users filtered by role for any active caller")
    void getUsersByRole_returnsList() {
        when(userRepository.findByEmail("john@test.com")).thenReturn(Optional.of(patient));
        when(userRepository.findByRole("PATIENT")).thenReturn(List.of(patient));

        List<User> result = userService.getUsersByRole("PATIENT", "john@test.com");

        assertEquals(1, result.size());
    }

    @Test
    @DisplayName("updateUser: updates basic fields")
    void updateUser_updatesFields() {
        when(userRepository.findByEmail("admin@test.com")).thenReturn(Optional.of(admin));
        when(userRepository.findById(1L)).thenReturn(Optional.of(patient));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        User updates = new User();
        updates.setNom("NewName");
        updates.setPrenom("NewFirst");
        updates.setEmail("john@test.com");
        updates.setTelephone("99887766");
        updates.setRole("PATIENT");
        updates.setActif(true);

        User result = userService.updateUser(1L, updates, "admin@test.com");

        assertEquals("NewName", result.getNom());
        assertEquals("NewFirst", result.getPrenom());
        assertEquals("99887766", result.getTelephone());
    }

    @Test
    @DisplayName("updateUser: forbids escalating non-admin to admin")
    void updateUser_forbidsRoleEscalation() {
        when(userRepository.findByEmail("admin@test.com")).thenReturn(Optional.of(admin));
        when(userRepository.findById(1L)).thenReturn(Optional.of(patient));

        User updates = new User();
        updates.setNom("X");
        updates.setPrenom("Y");
        updates.setEmail("john@test.com");
        updates.setTelephone("12345678");
        updates.setRole("ADMINISTRATEUR");
        updates.setActif(true);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> userService.updateUser(1L, updates, "admin@test.com"));
        assertEquals(403, ex.getStatusCode().value());
    }

    @Test
    @DisplayName("findByEmail: delegates to repository")
    void findByEmail_delegates() {
        when(userRepository.findByEmail("john@test.com")).thenReturn(Optional.of(patient));

        Optional<User> result = userService.findByEmail("john@test.com");

        assertTrue(result.isPresent());
    }

    @Test
    @DisplayName("deleteUser: requires active admin")
    void deleteUser_requiresAdmin() {
        when(userRepository.findByEmail("admin@test.com")).thenReturn(Optional.of(admin));

        userService.deleteUser(1L, "admin@test.com");

        verify(userRepository).deleteById(1L);
    }
}
