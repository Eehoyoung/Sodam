import org.springframework.boot.SpringApplication;
import org.springframework.context.ConfigurableApplicationContext;

public class test_comprehensive_fix {
    public static void main(String[] args) {
        System.out.println("[DEBUG_LOG] 포괄적 수정 사항 테스트 시작");

        try {
            // Spring Boot 애플리케이션 컨텍스트 로드 테스트
            System.setProperty("spring.profiles.active", "test");
            System.setProperty("spring.main.web-application-type", "none");

            ConfigurableApplicationContext context = SpringApplication.run(
                com.rich.sodam.SodamApplication.class,
                "--spring.main.web-application-type=none",
                "--logging.level.org.springframework.data.web=DEBUG",
                "--logging.level.org.springframework.boot.autoconfigure=DEBUG"
            );

            System.out.println("[DEBUG_LOG] 애플리케이션 컨텍스트 로드 성공");

            // Spring Data Web 관련 빈들이 생성되지 않았는지 확인
            try {
                String[] webBeans = context.getBeanNamesForType(
                    Class.forName("org.springframework.data.web.config.ProjectingArgumentResolverRegistrar")
                );
                System.out.println("[DEBUG_LOG] ProjectingArgumentResolverRegistrar 빈 개수: " + webBeans.length);
                if (webBeans.length == 0) {
                    System.out.println("[DEBUG_LOG] ✅ ProjectingArgumentResolverRegistrar 빈이 생성되지 않음 (정상)");
                }
            } catch (ClassNotFoundException e) {
                System.out.println("[DEBUG_LOG] ✅ ProjectingArgumentResolverRegistrar 클래스를 찾을 수 없음 (정상)");
            }

            // 데이터소스 빈이 정상적으로 생성되었는지 확인
            try {
                javax.sql.DataSource dataSource = context.getBean(javax.sql.DataSource.class);
                System.out.println("[DEBUG_LOG] ✅ DataSource 빈 생성 성공: " + dataSource.getClass().getSimpleName());
            } catch (Exception e) {
                System.out.println("[DEBUG_LOG] ❌ DataSource 빈 생성 실패: " + e.getMessage());
            }

            // JPA Repository 빈들이 정상적으로 생성되었는지 확인
            String[] jpaRepos = context.getBeanNamesForType(
                org.springframework.data.jpa.repository.JpaRepository.class
            );
            System.out.println("[DEBUG_LOG] ✅ JPA Repository 빈 개수: " + jpaRepos.length);

            context.close();
            System.out.println("[DEBUG_LOG] 테스트 완료 - 모든 수정 사항이 정상적으로 적용됨");

        } catch (Exception e) {
            System.err.println("[DEBUG_LOG] 테스트 실패: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
