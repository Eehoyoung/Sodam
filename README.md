# 소상공인이 만든 소상공인을 위한 서비스 소삼공인을 담다(소담)

## 프로젝트 개요

소상공인을 위한 소상공인의 편의와 생활이익 증대를 위해 소상공인이 직접 기획부터 개발까지하여 타 서비스와 차별화 되어 살에 와닿는 프로젝트입니다.

## 기술 스택

- Backend: Java 17, Spring Boot 3.4.5
- Frontend: React
- Mobile: Android (Kotlin), iOS (Swift)
- Database: MySQL
- Cache: Redis
- Cloud: AWS

## 시작하기

### 필요 조건

- Java 17
- gradle 8.11.x
- MySQL 8.0.x
- Redis 6.x

### 설치 및 실행

1. 레포지토리 클론
   git clone https://github.com/Eehoyoung/sodam.git

2. 데이터베이스 설정
   mysql -u root -p
   CREATE DATABASE sodam

3. 애플리케이션 실행
   mvn spring-boot:run
