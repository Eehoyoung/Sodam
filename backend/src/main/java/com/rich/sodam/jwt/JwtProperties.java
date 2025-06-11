package com.rich.sodam.jwt;

public interface JwtProperties {

    String SECRET = "2b$12$KIX2P6E/7N9yC6n6t1eO9uY5tC6k0e9h8f0K1hY4kz0e9f8f5eF1O";
    int EXPIRATION_TIME = 864000000; //60000 1분 //864000000 10일
    String TOKEN_PREFIX = "Bearer ";
    String HEADER_STRING = "Authorization";
}