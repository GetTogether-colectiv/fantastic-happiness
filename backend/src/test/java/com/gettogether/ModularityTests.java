package com.gettogether;

import org.junit.jupiter.api.Test;
import org.springframework.modulith.core.ApplicationModules;
import org.springframework.modulith.docs.Documenter;

class ModularityTests {

    private final ApplicationModules modules = ApplicationModules.of(GetTogetherApplication.class);

    @Test
    void verifiesModuleStructure() {
        modules.verify();
        modules.forEach(System.out::println);
    }

    @Test
    void writesModuleDocumentation() {
        new Documenter(modules).writeDocumentation();
    }
}
