package com.rich.sodam.config;

import org.springframework.context.MessageSource;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.support.ResourceBundleMessageSource;
import org.springframework.web.servlet.LocaleResolver;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.i18n.AcceptHeaderLocaleResolver;
import org.springframework.web.servlet.i18n.LocaleChangeInterceptor;

import java.util.Arrays;
import java.util.Locale;

/**
 * 다국어 지원을 위한 메시지 소스 및 로케일 설정
 */
@Configuration
public class MessageConfig implements WebMvcConfigurer {

    /**
     * 메시지 소스 빈을 설정합니다.
     *
     * @return MessageSource 빈
     */
    @Bean
    public MessageSource messageSource() {
        ResourceBundleMessageSource messageSource = new ResourceBundleMessageSource();
        messageSource.setBasename("messages");
        messageSource.setDefaultEncoding("UTF-8");
        messageSource.setUseCodeAsDefaultMessage(true);
        return messageSource;
    }

    /**
     * 로케일 리졸버를 설정합니다.
     * Accept-Language 헤더를 기반으로 로케일을 결정합니다.
     *
     * @return LocaleResolver 빈
     */
    @Bean
    public LocaleResolver localeResolver() {
        AcceptHeaderLocaleResolver localeResolver = new AcceptHeaderLocaleResolver();
        localeResolver.setSupportedLocales(Arrays.asList(
                Locale.KOREAN,
                Locale.ENGLISH
        ));
        localeResolver.setDefaultLocale(Locale.KOREAN);
        return localeResolver;
    }

    /**
     * 로케일 변경 인터셉터를 설정합니다.
     * URL 파라미터 'lang'을 통해 로케일을 변경할 수 있습니다.
     *
     * @return LocaleChangeInterceptor 빈
     */
    @Bean
    public LocaleChangeInterceptor localeChangeInterceptor() {
        LocaleChangeInterceptor interceptor = new LocaleChangeInterceptor();
        interceptor.setParamName("lang");
        return interceptor;
    }

    /**
     * 로케일 변경 인터셉터를 등록합니다.
     *
     * @param registry 인터셉터 레지스트리
     */
    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(localeChangeInterceptor());
    }
}
