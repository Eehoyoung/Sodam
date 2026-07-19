package com.rich.sodam.architecture;

import org.junit.jupiter.api.Test;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.core.io.support.ResourcePatternResolver;
import org.springframework.core.type.classreading.MetadataReader;
import org.springframework.core.type.classreading.SimpleMetadataReaderFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import java.lang.reflect.Method;
import java.lang.reflect.ParameterizedType;
import java.lang.reflect.Type;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * WP-09 3단계 — {@code com.rich.sodam.controller} 패키지의 모든 {@code @RestController}가
 * {@code com.rich.sodam.domain} 패키지의 JPA 엔티티를 {@link ResponseEntity} 반환형에 직접
 * 노출하지 않는지 검증한다(엔티티 직접 응답 회귀 방지 — WP-09 1단계에서 정리한 11곳이 다시
 * 생기지 않도록 아키텍처 규칙으로 고정).
 *
 * <p>{@code ResponseEntity<T>}/{@code List<T>}/{@code java.util.Optional<T>}의 제네릭 인자까지
 * 재귀적으로 풀어서 검사한다 — {@code ResponseEntity<List<Store>>} 같은 중첩 형태도 잡아낸다.
 * {@code Map}·원시 타입·{@code dto} 패키지·엔티티가 아닌 타입은 대상이 아니다.</p>
 */
class EntityResponseArchitectureTest {

    private static final String CONTROLLER_PACKAGE = "com.rich.sodam.controller";
    private static final String DOMAIN_PACKAGE_PREFIX = "com.rich.sodam.domain.";
    private static final String DOMAIN_PACKAGE_EXACT = "com.rich.sodam.domain";

    @Test
    void controllersDoNotReturnDomainEntitiesDirectly() throws Exception {
        List<String> violations = new ArrayList<>();

        for (Class<?> controllerClass : findControllerClasses()) {
            if (controllerClass.getAnnotation(RestController.class) == null) {
                continue;
            }
            for (Method method : controllerClass.getDeclaredMethods()) {
                if (!java.lang.reflect.Modifier.isPublic(method.getModifiers())) {
                    continue;
                }
                Type returnType = method.getGenericReturnType();
                Class<?> leakedEntity = findLeakedDomainEntity(returnType);
                if (leakedEntity != null) {
                    violations.add(controllerClass.getSimpleName() + "#" + method.getName()
                            + "() → " + leakedEntity.getName());
                }
            }
        }

        assertThat(violations)
                .as("컨트롤러가 domain 엔티티를 ResponseEntity 로 직접 반환하면 안 된다"
                        + "(WP-09 — 대신 dto.response 패키지의 DTO로 감싸서 반환할 것)")
                .isEmpty();
    }

    /** {@code ResponseEntity<T>}/{@code List<T>}/{@code Optional<T>} 를 재귀적으로 풀어 domain 엔티티를 찾는다. */
    private static Class<?> findLeakedDomainEntity(Type type) {
        if (type instanceof ParameterizedType parameterized) {
            Class<?> raw = (Class<?>) parameterized.getRawType();
            if (raw == ResponseEntity.class || raw == List.class || raw == java.util.Optional.class
                    || raw == java.util.Collection.class || raw == Iterable.class) {
                for (Type arg : parameterized.getActualTypeArguments()) {
                    Class<?> found = findLeakedDomainEntity(arg);
                    if (found != null) {
                        return found;
                    }
                }
                return null;
            }
            return isDomainEntity(raw) ? raw : null;
        }
        if (type instanceof Class<?> clazz) {
            return isDomainEntity(clazz) ? clazz : null;
        }
        return null;
    }

    private static boolean isDomainEntity(Class<?> clazz) {
        String pkg = clazz.getPackageName();
        return pkg.equals(DOMAIN_PACKAGE_EXACT) || pkg.startsWith(DOMAIN_PACKAGE_PREFIX);
    }

    /** 클래스패스에서 {@link #CONTROLLER_PACKAGE} 패키지(하위 포함)의 모든 클래스를 로드한다. */
    private static List<Class<?>> findControllerClasses() throws Exception {
        ResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();
        String pattern = "classpath*:" + CONTROLLER_PACKAGE.replace('.', '/') + "/**/*.class";
        var resources = resolver.getResources(pattern);
        var metadataReaderFactory = new SimpleMetadataReaderFactory(resolver);

        List<Class<?>> classes = new ArrayList<>();
        for (var resource : resources) {
            MetadataReader metadataReader = metadataReaderFactory.getMetadataReader(resource);
            String className = metadataReader.getClassMetadata().getClassName();
            try {
                classes.add(Class.forName(className, false, Thread.currentThread().getContextClassLoader()));
            } catch (Throwable ignored) {
                // 익명/합성 클래스 등 로드 불가 항목은 컨트롤러 대상이 아니므로 건너뛴다.
            }
        }
        return classes;
    }
}
