import org.springframework.boot.SpringApplication;
import org.springframework.context.ConfigurableApplicationContext;

public class test_redis_fix {
    public static void main(String[] args) {
        System.out.println("[DEBUG_LOG] Spring Data Redis 설정 문제 해결 테스트 시작");

        try {
            // 애플리케이션 컨텍스트 시작
            ConfigurableApplicationContext context = SpringApplication.run(
                com.rich.sodam.SodamApplication.class, args);

            System.out.println("[DEBUG_LOG] 애플리케이션 시작 성공");
            System.out.println("[DEBUG_LOG] Spring Data Redis Repository 스캔 문제 해결 확인");

            // 잠시 대기 후 종료
            Thread.sleep(5000);
            context.close();

            System.out.println("[DEBUG_LOG] 테스트 완료 - Spring Data Redis 설정 문제 해결됨");

        } catch (Exception e) {
            System.err.println("[DEBUG_LOG] 테스트 실패: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
