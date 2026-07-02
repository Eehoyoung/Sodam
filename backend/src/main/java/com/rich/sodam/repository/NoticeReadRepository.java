package com.rich.sodam.repository;

import com.rich.sodam.domain.NoticeRead;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NoticeReadRepository extends JpaRepository<NoticeRead, Long> {

    boolean existsByNoticeIdAndEmployeeId(Long noticeId, Long employeeId);

    /** 한 공지의 읽음 건수(읽은 직원 수) — 집계 N/M의 N. */
    long countByNoticeId(Long noticeId);

    /** 한 공지의 읽음 기록(읽은 직원 목록용). */
    List<NoticeRead> findByNoticeId(Long noticeId);

    /** 직원이 읽은 공지 ID 목록 — 본인 공지 목록의 readByMe 판정용(N+1 회피). */
    List<NoticeRead> findByEmployeeIdAndNoticeIdIn(Long employeeId, List<Long> noticeIds);
}
