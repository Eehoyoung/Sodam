import org.springframework.boot.SpringApplication;
import org.springframework.context.ConfigurableApplicationContext;

public class test_spring_data_web_fix {
    public static void main(String[] args) {
        System.out.println("[DEBUG_LOG] Spring Data Web 수정 테스트 시작");

        try {
            // Spring Boot 애플리케이션 컨텍스트 로드 테스트
            System.setProperty("spring.profiles.active", "test");
            System.setProperty("spring.main.web-application-type", "none");

            ConfigurableApplicationContext context = SpringApplication.run(
                com.rich.sodam.SodamApplication.class,
                "--spring.main.web-application-type=none",
                "--logging.level.org.springframework.data.web=DEBUG"
            );

            System.out.println("[DEBUG_LOG] 애플리케이션 컨텍스트 로드 성공");

            // Spring Data Web 관련 빈들이 정상적으로 등록되었는지 확인
            String[] beanNames = context.getBeanNamesForType(
                org.springframework.data.web.PageableHandlerMethodArgumentResolver.class
            );

            if (beanNames.length > 0) {
                System.out.println("[DEBUG_LOG] PageableHandlerMethodArgumentResolver 빈 발견: " + beanNames.length + "개");
                for (String beanName : beanNames) {
                    System.out.println("[DEBUG_LOG] - " + beanName);
                }
            } else {
                System.out.println("[DEBUG_LOG] PageableHandlerMethodArgumentResolver 빈을 찾을 수 없음");
            }

            // ProjectingArgumentResolver 관련 빈 확인
            try {
                String[] projectionBeans = context.getBeanNamesForType(
                    Class.forName("org.springframework.data.web.ProjectingArgumentResolver")
                );
                System.out.println("[DEBUG_LOG] ProjectingArgumentResolver 빈 개수: " + projectionBeans.length);
            } catch (ClassNotFoundException e) {
                System.out.println("[DEBUG_LOG] ProjectingArgumentResolver 클래스를 찾을 수 없음 (정상적일 수 있음)");
            }

            context.close();
            System.out.println("[DEBUG_LOG] 테스트 완료 - ProjectingArgumentResolverBeanPostProcessor 오류 해결됨");

        } catch (Exception e) {
            System.err.println("[DEBUG_LOG] 테스트 실패: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
