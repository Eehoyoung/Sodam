package com.rich.sodam.exception;

import com.rich.sodam.config.SentryReporter;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.core.MethodParameter;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.validation.BeanPropertyBindingResult;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.servlet.LocaleResolver;

import java.util.Locale;
import java.lang.reflect.Method;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(OutputCaptureExtension.class)
class GlobalExceptionHandlerSecurityTest {

    @Test
    void validationFailureDoesNotLogTheRejectedSecretValue(CapturedOutput output) throws Exception {
        String rejectedSecret = "Valid-looking-but-rejected-Password!123";
        BindingResult bindingResult = new BeanPropertyBindingResult(new Object(), "passwordReset");
        bindingResult.addError(new FieldError("passwordReset", "newPassword", rejectedSecret,
                false, null, null, "invalid password"));
        Method parameterSource = GlobalExceptionHandlerSecurityTest.class
                .getDeclaredMethod("validatedInput", String.class);
        MethodArgumentNotValidException exception = new MethodArgumentNotValidException(
                new MethodParameter(parameterSource, 0), bindingResult);
        MessageSource messageSource = mock(MessageSource.class);
        when(messageSource.getMessage(anyString(), any(), any(Locale.class))).thenReturn("invalid request");
        GlobalExceptionHandler handler = new GlobalExceptionHandler(messageSource,
                mock(LocaleResolver.class), mock(SentryReporter.class));
        LocaleContextHolder.setLocale(Locale.KOREAN);

        try {
            assertThat(handler.handleValidationException(exception).getStatusCode())
                    .isEqualTo(HttpStatus.BAD_REQUEST);
        } finally {
            LocaleContextHolder.resetLocaleContext();
        }

        assertThat(output).doesNotContain(rejectedSecret);
    }

    @SuppressWarnings("unused")
    private void validatedInput(String newPassword) {
    }

    @Test
    void databaseConstraintDiagnosticsDoNotLogTheDuplicateSensitiveValue(CapturedOutput output) {
        String duplicateEmail = "private.employee@sodam.example";
        DataIntegrityViolationException exception = new DataIntegrityViolationException(
                "duplicate entry", new RuntimeException("Duplicate entry '" + duplicateEmail + "'"));
        GlobalExceptionHandler handler = new GlobalExceptionHandler(mock(MessageSource.class),
                mock(LocaleResolver.class), mock(SentryReporter.class));

        assertThat(handler.handleDataIntegrityViolation(exception).getStatusCode())
                .isEqualTo(HttpStatus.CONFLICT);

        assertThat(output).doesNotContain(duplicateEmail);
    }
}
