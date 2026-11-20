package com.gettogether.users.internal;

import com.gettogether.shared.ConflictException;
import com.gettogether.shared.UnauthorizedException;
import org.hibernate.exception.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

@Service
class AuthService {

    private static final int BCRYPT_MAX_PASSWORD_BYTES = 72;
    private static final String EMAIL_UNIQUE_CONSTRAINT = "users_email_key";
    private static final String EMAIL_ALREADY_REGISTERED = "Email already registered";
    private static final String INVALID_CREDENTIALS = "Email or password is incorrect";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final String unknownUserPasswordHash;

    AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.unknownUserPasswordHash = passwordEncoder.encode(UUID.randomUUID().toString());
    }

    @Transactional
    AuthResponse register(RegisterRequest request) {
        if (exceedsBcryptLimit(request.password())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password is too long");
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

        return authResponse(user);
    }

    AuthResponse login(LoginRequest request) {
        String password = request.password();
        if (exceedsBcryptLimit(password)) {
            throw new UnauthorizedException(INVALID_CREDENTIALS);
        }

        User user = userRepository.findByEmailIgnoreCase(request.email()).orElse(null);
        String passwordHash = user == null ? unknownUserPasswordHash : user.getPasswordHash();
        if (!passwordEncoder.matches(password, passwordHash) || user == null) {
            throw new UnauthorizedException(INVALID_CREDENTIALS);
        }

        return authResponse(user);
    }

    private AuthResponse authResponse(User user) {
        return new AuthResponse(jwtService.issueToken(user.getId()), UserResponse.from(user));
    }

    private static boolean exceedsBcryptLimit(String password) {
        return password.length() > BCRYPT_MAX_PASSWORD_BYTES
                || password.getBytes(StandardCharsets.UTF_8).length > BCRYPT_MAX_PASSWORD_BYTES;
    }
}
