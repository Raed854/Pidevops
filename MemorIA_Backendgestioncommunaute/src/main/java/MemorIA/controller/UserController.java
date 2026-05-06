package MemorIA.controller;

import MemorIA.entity.User;
import MemorIA.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping
    public List<User> findAll() {
        return userService.findAll();
    }

    @GetMapping("/search")
    public List<User> search(@RequestParam("query") String query) {
        return userService.search(query);
    }
}
