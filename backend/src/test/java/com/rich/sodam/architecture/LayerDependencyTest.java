package com.rich.sodam.architecture;

import org.junit.jupiter.api.Test;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.core.io.support.ResourcePatternResolver;
import org.springframework.core.type.classreading.MetadataReader;
import org.springframework.core.type.classreading.SimpleMetadataReaderFactory;

import java.lang.reflect.Constructor;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * WP-10 — 계층 경계를 리플렉션으로 고정한다(ArchUnit 의존성 추가 없이 EntityResponseArchitectureTest와
 * 동일한 접근). 필드·생성자 파라미터·메서드 파라미터/반환형에 선언된 타입만 검사한다 — 메서드 본문
 * 안에서 지역변수로만 쓰이는 참조는 못 잡지만, 이 프로젝트의 지배적 패턴(생성자/필드 주입)은
 * 전부 선언부에 드러나므로 실질적인 경계 위반은 충분히 잡아낸다.
 */
class LayerDependencyTest {

    private static final String CONTROLLER_PACKAGE = "com.rich.sodam.controller";
    private static final String REPOSITORY_PACKAGE = "com.rich.sodam.repository";
    private static final String CORE_PACKAGE = "com.rich.sodam.core";
    private static final String SECURITY_PACKAGE = "com.rich.sodam.security";
    private static final String INTEGRATION_PACKAGE = "com.rich.sodam.config.integration";

    @Test
    void controllersDoNotDependOnRepositoriesDirectly() throws Exception {
        List<String> violations = new ArrayList<>();
        for (Class<?> controller : findClasses(CONTROLLER_PACKAGE)) {
            for (Class<?> referenced : declaredTypes(controller)) {
                if (belongsTo(referenced, REPOSITORY_PACKAGE)) {
                    violations.add(controller.getSimpleName() + " → " + referenced.getSimpleName());
                }
            }
        }
        assertThat(violations)
                .as("controller는 repository를 직접 참조하지 않는다(WP-09 — application service를 경유할 것)")
                .isEmpty();
    }

    @Test
    void coreDoesNotDependOnSecurityOrIntegrationOrController() throws Exception {
        List<String> violations = new ArrayList<>();
        for (Class<?> coreClass : findClasses(CORE_PACKAGE)) {
            for (Class<?> referenced : declaredTypes(coreClass)) {
                if (belongsTo(referenced, SECURITY_PACKAGE)
                        || belongsTo(referenced, INTEGRATION_PACKAGE)
                        || belongsTo(referenced, CONTROLLER_PACKAGE)) {
                    violations.add(coreClass.getSimpleName() + " → " + referenced.getName());
                }
            }
        }
        assertThat(violations)
                .as("core는 순수 도메인 규칙 계층이다 — security/config.integration/controller를 직접"
                        + " 참조하지 않고, 필요하면 core가 소유한 포트 인터페이스를 통해서만 연결한다"
                        + "(WP-10, SensitiveReferenceKeySource 참고)")
                .isEmpty();
    }

    /** 필드·생성자 파라미터·메서드 파라미터/반환형에 선언된 모든 타입(제네릭 인자 포함 1단계). */
    private static Set<Class<?>> declaredTypes(Class<?> target) {
        Set<Class<?>> types = new LinkedHashSet<>();
        for (Field f : target.getDeclaredFields()) {
            types.add(f.getType());
        }
        for (Constructor<?> c : target.getDeclaredConstructors()) {
            types.addAll(List.of(c.getParameterTypes()));
        }
        for (Method m : target.getDeclaredMethods()) {
            types.addAll(List.of(m.getParameterTypes()));
            types.add(m.getReturnType());
        }
        if (target.getSuperclass() != null) {
            types.add(target.getSuperclass());
        }
        types.addAll(List.of(target.getInterfaces()));
        return types;
    }

    private static boolean belongsTo(Class<?> clazz, String packageName) {
        String pkg = clazz.getPackageName();
        return pkg.equals(packageName) || pkg.startsWith(packageName + ".");
    }

    private static List<Class<?>> findClasses(String basePackage) throws Exception {
        ResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();
        String pattern = "classpath*:" + basePackage.replace('.', '/') + "/**/*.class";
        var resources = resolver.getResources(pattern);
        var metadataReaderFactory = new SimpleMetadataReaderFactory(resolver);

        List<Class<?>> classes = new ArrayList<>();
        for (var resource : resources) {
            MetadataReader metadataReader = metadataReaderFactory.getMetadataReader(resource);
            String className = metadataReader.getClassMetadata().getClassName();
            // 테스트 클래스는 프로덕션 컨트롤러/core와 같은 패키지 경로에 컴파일되지만(src/test/java
            // 미러 구조) @MockBean/@Autowired repository는 테스트 스캐폴딩일 뿐 실제 경계 위반이
            // 아니다 — 이름 규칙(*Test)으로 제외한다.
            if (className.endsWith("Test")) {
                continue;
            }
            try {
                classes.add(Class.forName(className, false, Thread.currentThread().getContextClassLoader()));
            } catch (Throwable ignored) {
                // 익명/합성 클래스 등 로드 불가 항목은 대상이 아니므로 건너뛴다.
            }
        }
        return classes;
    }
}
