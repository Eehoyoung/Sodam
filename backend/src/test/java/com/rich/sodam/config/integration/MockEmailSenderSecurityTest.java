package com.rich.sodam.config.integration;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;

import static org.assertj.core.api.Assertions.assertThat;

class MockEmailSenderSecurityTest {

    @Test
    void passwordResetOtpAndRecipientAreNotWrittenToLogs() {
        Logger logger = (Logger) LoggerFactory.getLogger(MockEmailSender.class);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        try {
            new MockEmailSender().sendPasswordResetCode("person@example.com", "918273");

            String output = appender.list.stream()
                    .map(ILoggingEvent::getFormattedMessage)
                    .reduce("", (all, message) -> all + "\n" + message);
            assertThat(output).doesNotContain("918273").doesNotContain("person@example.com");
        } finally {
            logger.detachAppender(appender);
            appender.stop();
        }
    }
}
