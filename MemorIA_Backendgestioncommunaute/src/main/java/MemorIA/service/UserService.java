package MemorIA.service;

import MemorIA.entity.User;
import MemorIA.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    public User login(String email, String password) {
        return userRepository
                .findByEmailAndPassword(email, password)
                .orElseThrow(() -> new RuntimeException("Invalid credentials"));
    }

    public java.util.List<User> search(String query) {
        return userRepository.findByFirstNameContainingIgnoreCaseOrLastNameContainingIgnoreCase(query, query);
    }

    public java.util.List<User> findAll() {
        return userRepository.findAll();
    }
}