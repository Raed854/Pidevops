package MemorIA.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class TestController {

    @GetMapping("/api/public")
    public String publicEndpoint() {
        return "Public endpoint";
    }

    @GetMapping("/api/user")
    public String userEndpoint() {
        return "User endpoint";
    }

    @GetMapping("/api/admin")
    public String adminEndpoint() {
        return "Admin endpoint";
    }
}
