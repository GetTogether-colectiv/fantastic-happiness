package com.gettogether.users.internal;

import com.gettogether.shared.ConflictException;
import org.hibernate.exception.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;

@Service
class AuthService {

    private static final int BCRYPT_MAX_PASSWORD_BYTES = 72;
    private static final String EMAIL_UNIQUE_CONSTRAINT = "users_email_key";
    private static final String EMAIL_ALREADY_REGISTERED = "Email already registered";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Transactional
    AuthResponse register(RegisterRequest request) {
        if (request.password().getBytes(StandardCharsets.UTF_8).length > BCRYPT_MAX_PASSWORD_BYTES) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password exceeds the BCrypt length limit");
        }
        if (userRepository.existsByEmailIgnoreCase(request.email())) {
            throw new ConflictException(EMAIL_ALREADY_REGISTERED);
        }

        String passwordHash = passwordEncoder.encode(request.password());
        User user;
        try {
            user = userRepository.saveAndFlush(new User(request.name(), request.email(), passwordHash));
        } catch (DataIntegrityViolationException exception) {
            if (exception.getCause() instanceof ConstraintViolationException violation
                    && EMAIL_UNIQUE_CONSTRAINT.equals(violation.getConstraintName())) {
                throw new ConflictException(EMAIL_ALREADY_REGISTERED);
            }
            throw exception;
        }

        return new AuthResponse(jwtService.issueToken(user.getId()), UserResponse.from(user));
    }
}
