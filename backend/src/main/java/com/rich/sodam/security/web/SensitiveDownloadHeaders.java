package com.rich.sodam.security.web;

import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;

/** Sensitive document/export responses must not outlive the authenticated request in browser caches. */
public final class SensitiveDownloadHeaders {

    private SensitiveDownloadHeaders() {
    }

    public static void apply(HttpHeaders headers) {
        headers.setCacheControl(CacheControl.noStore().cachePrivate().mustRevalidate());
        headers.setPragma("no-cache");
        headers.set("X-Content-Type-Options", "nosniff");
    }
}
