import io.github.cdimascio.dotenv.Dotenv;

public class test_dotenv_loading {
    public static void main(String[] args) {
        System.out.println("=== .env File Loading Test ===");

        try {
            Dotenv dotenv = Dotenv.configure()
                    .directory(".")
                    .filename(".env")
                    .ignoreIfMalformed()
                    .ignoreIfMissing()
                    .load();

            // Check key environment variables
            String[] testKeys = {
                "DB_URL", "DB_USERNAME", "DB_PASSWORD", "DB_DRIVER_CLASS_NAME",
                "JWT_SECRET", "REDIS_HOST", "REDIS_PORT"
            };

            System.out.println("Environment variables loading result:");
            for (String key : testKeys) {
                String value = dotenv.get(key);
                if (value != null) {
                    // Mask sensitive information
                    if (key.toLowerCase().contains("password") || key.toLowerCase().contains("secret")) {
                        System.out.println("  " + key + " = ***");
                    } else {
                        System.out.println("  " + key + " = " + value);
                    }
                } else {
                    System.out.println("  " + key + " = [NOT FOUND]");
                }
            }

            System.out.println("\nTotal " + dotenv.entries().size() + " environment variables loaded.");
            System.out.println("\n=== Test Completed ===");

        } catch (Exception e) {
            System.err.println("Error occurred: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
