package com.gettogether;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;
import org.testcontainers.utility.MountableFile;

import java.nio.file.Path;

@TestConfiguration(proxyBeanMethods = false)
public class TestcontainersConfiguration {

    private static final String INIT_SCRIPTS_PATH = "/docker-entrypoint-initdb.d/";

    @Bean
    @ServiceConnection
    PostgreSQLContainer postgresContainer() {
        return new PostgreSQLContainer(DockerImageName.parse("postgres:16"))
                .withCopyFileToContainer(MountableFile.forHostPath(Path.of("../database")), INIT_SCRIPTS_PATH);
    }
}
