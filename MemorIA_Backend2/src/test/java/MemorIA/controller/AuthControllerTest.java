package MemorIA.controller;

import MemorIA.dto.LoginRequest;
import MemorIA.dto.SignupRequest;
import MemorIA.entity.User;
import MemorIA.service.UserService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.http.HttpStatus.CONFLICT;
import static org.springframework.http.HttpStatus.FORBIDDEN;
import static org.springframework.http.HttpStatus.UNAUTHORIZED;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuthController.class)
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private UserService userService;

    private User activeUser;

    @BeforeEach
    void setUp() {
        activeUser = new User();
        activeUser.setId(1L);
        activeUser.setEmail("user@example.com");
        activeUser.setNom("Doe");
        activeUser.setPrenom("John");
        activeUser.setTelephone("0612345678");
        activeUser.setRole("PATIENT");
        activeUser.setActif(true);
        activeUser.setProfileCompleted(false);
        activeUser.setPassword("$2a$10$encoded");
    }

    // ──────────────────────────────────────────────────────────────
    // POST /api/auth/login
    // ──────────────────────────────────────────────────────────────

    @Test
    void login_validCredentials_returns200WithUserData() throws Exception {
        LoginRequest request = new LoginRequest("user@example.com", "password123");
        when(userService.authenticate("user@example.com", "password123")).thenReturn(activeUser);

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.email").value("user@example.com"))
                .andExpect(jsonPath("$.nom").value("Doe"))
                .andExpect(jsonPath("$.prenom").value("John"))
                .andExpect(jsonPath("$.role").value("PATIENT"))
                .andExpect(jsonPath("$.actif").value(true))
                .andExpect(jsonPath("$.profileCompleted").value(false));
    }

    @Test
    void login_invalidCredentials_returns401() throws Exception {
        LoginRequest request = new LoginRequest("user@example.com", "wrongpass");
        when(userService.authenticate("user@example.com", "wrongpass"))
                .thenThrow(new ResponseStatusException(UNAUTHORIZED, "Invalid credentials"));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void login_inactiveAccount_returns403() throws Exception {
        LoginRequest request = new LoginRequest("user@example.com", "password123");
        when(userService.authenticate("user@example.com", "password123"))
                .thenThrow(new ResponseStatusException(FORBIDDEN, "Your account is pending admin confirmation"));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    @Test
    void login_blankEmail_returns400() throws Exception {
        String badJson = "{\"email\":\"\",\"password\":\"password123\"}";

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(badJson))
                .andExpect(status().isBadRequest());
    }

    @Test
    void login_blankPassword_returns400() throws Exception {
        String badJson = "{\"email\":\"user@example.com\",\"password\":\"\"}";

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(badJson))
                .andExpect(status().isBadRequest());
    }

    @Test
    void login_invalidEmailFormat_returns400() throws Exception {
        String badJson = "{\"email\":\"not-an-email\",\"password\":\"password123\"}";

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(badJson))
                .andExpect(status().isBadRequest());
    }

    // ──────────────────────────────────────────────────────────────
    // POST /api/auth/signup
    // ──────────────────────────────────────────────────────────────

    @Test
    void signup_validRequest_returns201WithUserData() throws Exception {
        SignupRequest request = new SignupRequest("Doe", "John", "john@example.com", "0612345678", "PATIENT", "password123");

        User newUser = new User();
        newUser.setId(2L);
        newUser.setEmail("john@example.com");
        newUser.setNom("Doe");
        newUser.setPrenom("John");
        newUser.setTelephone("0612345678");
        newUser.setRole("PATIENT");
        newUser.setActif(false);
        newUser.setProfileCompleted(false);
        newUser.setPassword("$2a$10$encoded");

        when(userService.register(any(SignupRequest.class))).thenReturn(newUser);

        mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email").value("john@example.com"))
                .andExpect(jsonPath("$.role").value("PATIENT"))
                .andExpect(jsonPath("$.actif").value(false))
                .andExpect(jsonPath("$.profileCompleted").value(false));
    }

    @Test
    void signup_duplicateEmail_returns409() throws Exception {
        SignupRequest request = new SignupRequest("Doe", "John", "existing@example.com", "0612345678", "PATIENT", "password123");
        when(userService.register(any(SignupRequest.class)))
                .thenThrow(new ResponseStatusException(CONFLICT, "Email already in use"));

        mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict());
    }

    @Test
    void signup_shortPassword_returns400() throws Exception {
        // password "abc" is less than @Size(min=6)
        String badJson = "{\"nom\":\"Doe\",\"prenom\":\"Jo\",\"email\":\"john@example.com\"," +
                "\"telephone\":\"06123456\",\"role\":\"PATIENT\",\"password\":\"abc\"}";

        mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(badJson))
                .andExpect(status().isBadRequest());
    }

    @Test
    void signup_blankNom_returns400() throws Exception {
        String badJson = "{\"nom\":\"\",\"prenom\":\"Jo\",\"email\":\"john@example.com\"," +
                "\"telephone\":\"06123456\",\"role\":\"PATIENT\",\"password\":\"password123\"}";

        mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(badJson))
                .andExpect(status().isBadRequest());
    }

    @Test
    void signup_invalidEmailFormat_returns400() throws Exception {
        String badJson = "{\"nom\":\"Doe\",\"prenom\":\"Jo\",\"email\":\"bad-email\"," +
                "\"telephone\":\"06123456\",\"role\":\"PATIENT\",\"password\":\"password123\"}";

        mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(badJson))
                .andExpect(status().isBadRequest());
    }

    @Test
    void signup_adminRoleAttempt_returns403() throws Exception {
        SignupRequest request = new SignupRequest("Evil", "Admin", "evil@example.com", "0612345678", "ADMINISTRATEUR", "password123");
        when(userService.register(any(SignupRequest.class)))
                .thenThrow(new ResponseStatusException(FORBIDDEN, "Admin accounts cannot be created via signup"));

        mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }
}
