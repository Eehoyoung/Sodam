package com.rich.sodam.config;

import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.util.ClassUtils;

import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 모든 {@code @Scheduled} 배치가 분산 락으로 보호되는지 강제한다 (SV-07).
 *
 * <p>인스턴스를 2대 이상으로 늘리면 락 없는 배치는 같은 시각에 두 번 돈다. 정기결제·월 급여
 * 계산이 그중에 있어 중복 실행이 곧 이중 청구·이중 지급이다. 새 스케줄러를 추가하면서 락을
 * 잊는 것을 사람이 매번 기억하는 대신 여기서 막는다.</p>
 */
@SpringBootTest
@ActiveProfiles("test")
class SchedulerLockCoverageTest {

    /**
     * 락을 걸면 <b>안 되는</b> 배치. 그 인스턴스 자신의 JVM 상태를 다루므로 인스턴스마다 각자
     * 돌아야 한다 — 락을 걸면 여러 대 중 한 대만 관측·정리된다.
     */
    private static final Set<String> INSTANCE_LOCAL_TASKS = Set.of(
            "logSystemPerformance",
            "performGarbageCollection"
    );

    @Autowired
    private ApplicationContext applicationContext;

    @Test
    @DisplayName("@Scheduled 배치는 인스턴스 로컬 작업을 빼고 모두 @SchedulerLock 을 가진다")
    void 모든_스케줄러가_분산락으로_보호된다() {
        List<String> unprotected = new ArrayList<>();

        for (String beanName : applicationContext.getBeanDefinitionNames()) {
            Object bean;
            try {
                bean = applicationContext.getBean(beanName);
            } catch (RuntimeException lazyOrAbstractBean) {
                continue;
            }
            Class<?> targetClass = ClassUtils.getUserClass(bean.getClass());
            if (!targetClass.getName().startsWith("com.rich.sodam")) {
                continue;
            }
            for (Method method : targetClass.getDeclaredMethods()) {
                if (!method.isAnnotationPresent(Scheduled.class)) {
                    continue;
                }
                if (INSTANCE_LOCAL_TASKS.contains(method.getName())) {
                    continue;
                }
                if (!method.isAnnotationPresent(SchedulerLock.class)) {
                    unprotected.add(targetClass.getSimpleName() + "#" + method.getName());
                }
            }
        }

        assertThat(unprotected)
                .as("분산 락이 없는 스케줄러 — 다중 인스턴스에서 중복 실행된다. "
                        + "인스턴스마다 돌아야 하는 작업이면 INSTANCE_LOCAL_TASKS 에 사유와 함께 추가할 것")
                .isEmpty();
    }

    @Test
    @DisplayName("락 이름이 중복되면 서로 다른 배치가 서로를 막는다")
    void 락_이름은_배치마다_고유하다() {
        List<String> names = new ArrayList<>();

        for (String beanName : applicationContext.getBeanDefinitionNames()) {
            Object bean;
            try {
                bean = applicationContext.getBean(beanName);
            } catch (RuntimeException lazyOrAbstractBean) {
                continue;
            }
            Class<?> targetClass = ClassUtils.getUserClass(bean.getClass());
            if (!targetClass.getName().startsWith("com.rich.sodam")) {
                continue;
            }
            for (Method method : targetClass.getDeclaredMethods()) {
                SchedulerLock lock = method.getAnnotation(SchedulerLock.class);
                if (lock != null) {
                    names.add(lock.name());
                }
            }
        }

        assertThat(names).isNotEmpty();
        assertThat(names).doesNotHaveDuplicates();
    }
}
