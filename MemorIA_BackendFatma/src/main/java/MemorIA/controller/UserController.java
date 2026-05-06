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
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:4200"})
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    public ResponseEntity<List<User>> getAllUsers(@RequestHeader("X-Admin-Email") String adminEmail) {
        return ResponseEntity.ok(userService.getAllUsersForAdmin(adminEmail));
    }

    @GetMapping("/{id}")
    public ResponseEntity<User> getUserById(@PathVariable Long id, @RequestHeader("X-Admin-Email") String adminEmail) {
        return userService.getUserByIdForAdmin(id, adminEmail)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/role/{role}")
    public ResponseEntity<List<User>> getUsersByRole(@PathVariable String role, @RequestHeader("X-Admin-Email") String adminEmail) {
        return ResponseEntity.ok(userService.getUsersByRole(role, adminEmail));
    }

    @PostMapping
    public ResponseEntity<User> createUser(@Valid @RequestBody User user) {
        User saved = userService.saveUser(user);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<User> updateUser(@PathVariable Long id, @RequestHeader("X-Admin-Email") String adminEmail, @RequestBody User user) {
        User updated = userService.updateUser(id, user, adminEmail);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id, @RequestHeader("X-Admin-Email") String adminEmail) {
        userService.deleteUser(id, adminEmail);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/confirm")
    public ResponseEntity<User> confirmUser(@PathVariable Long id, @RequestHeader("X-Admin-Email") String adminEmail) {
        User confirmed = userService.confirmUserByAdmin(id, adminEmail);
        return ResponseEntity.ok(confirmed);
    }
}
