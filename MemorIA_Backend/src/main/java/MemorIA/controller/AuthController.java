package MemorIA.controller;

import MemorIA.dto.LoginRequest;
import MemorIA.dto.LoginResponse;
import MemorIA.dto.SignupRequest;
import MemorIA.entity.User;
import MemorIA.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserService userService;

    public AuthController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        User user = userService.authenticate(request.email(), request.password());
        return ResponseEntity.ok(new LoginResponse(
                user.getId(),
                user.getEmail(),
                user.getNom(),
                user.getPrenom(),
                user.getRole(),
                user.getActif(),
                user.getProfileCompleted()
        ));
    }

    @PostMapping("/signup")
    public ResponseEntity<LoginResponse> signup(@Valid @RequestBody SignupRequest request) {
        User user = userService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(new LoginResponse(
                user.getId(),
                user.getEmail(),
                user.getNom(),
                user.getPrenom(),
                user.getRole(),
                user.getActif(),
                user.getProfileCompleted()
        ));
    }
}
