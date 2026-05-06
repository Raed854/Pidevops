package MemorIA.controller;

import MemorIA.entity.User;
import MemorIA.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    public ResponseEntity<List<User>> getAllUsers(@RequestHeader(value = "X-Admin-Email", required = false) String adminEmail) {
        if (adminEmail == null || adminEmail.isEmpty()) {
            throw new IllegalArgumentException("X-Admin-Email header is required");
        }
        return ResponseEntity.ok(userService.getAllUsersForAdmin(adminEmail));
    }

    @GetMapping("/{id}")
    public ResponseEntity<User> getUserById(@PathVariable Long id, @RequestHeader(value = "X-Admin-Email", required = false) String adminEmail) {
        if (adminEmail == null || adminEmail.isEmpty()) {
            throw new IllegalArgumentException("X-Admin-Email header is required");
        }
        return userService.getUserByIdForAdmin(id, adminEmail)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/role/{role}")
    public ResponseEntity<List<User>> getUsersByRole(@PathVariable String role, @RequestHeader(value = "X-Admin-Email", required = false) String adminEmail) {
        if (adminEmail == null || adminEmail.isEmpty()) {
            throw new IllegalArgumentException("X-Admin-Email header is required");
        }
        return ResponseEntity.ok(userService.getUsersByRole(role, adminEmail));
    }

    /**
     * Public endpoint — returns active users with the given role (no admin required).
     * Used by treatment and scheduling components to list e.g. active soignants.
     */
    @GetMapping("/public/role/{role}")
    public ResponseEntity<List<User>> getActiveUsersByRole(@PathVariable String role) {
        return ResponseEntity.ok(userService.getActiveUsersByRole(role));
    }

    /**
     * Public endpoint — returns users with given role that have LIBRE availability status
     */
    @GetMapping("/public/role/{role}/disponibilite/libres")
    public ResponseEntity<List<User>> getUsersByRoleAndLibreStatus(@PathVariable String role) {
        return ResponseEntity.ok(userService.getUsersByRoleAndDisponibiliteStatus(role));
    }

    @PostMapping
    public ResponseEntity<User> createUser(@Valid @RequestBody User user) {
        User saved = userService.saveUser(user);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<User> updateUser(@PathVariable Long id, @RequestHeader(value = "X-Admin-Email", required = false) String adminEmail, @RequestBody User user) {
        if (adminEmail == null || adminEmail.isEmpty()) {
            throw new IllegalArgumentException("X-Admin-Email header is required");
        }
        User updated = userService.updateUser(id, user, adminEmail);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id, @RequestHeader(value = "X-Admin-Email", required = false) String adminEmail) {
        if (adminEmail == null || adminEmail.isEmpty()) {
            throw new IllegalArgumentException("X-Admin-Email header is required");
        }
        userService.deleteUser(id, adminEmail);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/confirm")
    public ResponseEntity<User> confirmUser(@PathVariable Long id, @RequestHeader(value = "X-Admin-Email", required = false) String adminEmail) {
        if (adminEmail == null || adminEmail.isEmpty()) {
            throw new IllegalArgumentException("X-Admin-Email header is required");
        }
        User confirmed = userService.confirmUserByAdmin(id, adminEmail);
        return ResponseEntity.ok(confirmed);
    }
}
