package com.rich.sodam.personal.service;

import com.rich.sodam.personal.domain.PersonalAttendance;
import com.rich.sodam.personal.domain.PersonalUserProfile;
import com.rich.sodam.personal.domain.PersonalWorkplace;
import com.rich.sodam.personal.dto.PageResponse;
import com.rich.sodam.personal.dto.PersonalAttendanceRecordDto;
import com.rich.sodam.personal.dto.PersonalUserProfileDto;
import com.rich.sodam.personal.dto.PersonalWorkplaceDto;
import com.rich.sodam.personal.repository.PersonalAttendanceRepository;
import com.rich.sodam.personal.repository.PersonalUserProfileRepository;
import com.rich.sodam.personal.repository.PersonalWorkplaceRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * PersonalUser 도메인의 DB 기반 서비스 구현
 */
@Service
@Transactional
public class PersonalUserService {

    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");

    private final PersonalUserProfileRepository profileRepo;
    private final PersonalWorkplaceRepository workplaceRepo;
    private final PersonalAttendanceRepository attendanceRepo;

    public PersonalUserService(PersonalUserProfileRepository profileRepo,
                               PersonalWorkplaceRepository workplaceRepo,
                               PersonalAttendanceRepository attendanceRepo) {
        this.profileRepo = profileRepo;
        this.workplaceRepo = workplaceRepo;
        this.attendanceRepo = attendanceRepo;
    }

    // 프로필
    public PersonalUserProfileDto getOrCreateProfile(Long userId) {
        PersonalUserProfile entity = profileRepo.findById(userId).orElseGet(() -> {
            PersonalUserProfile p = new PersonalUserProfile();
            p.setUserId(userId);
            p.setDefaultHourlyWage(0);
            return profileRepo.save(p);
        });
        return toDto(entity);
    }

    public PersonalUserProfileDto updateProfile(Long userId, String nickname, Integer defaultHourlyWage) {
        PersonalUserProfile entity = profileRepo.findById(userId).orElseGet(() -> {
            PersonalUserProfile p = new PersonalUserProfile();
            p.setUserId(userId);
            return p;
        });
        if (nickname != null) entity.setNickname(nickname);
        if (defaultHourlyWage != null) entity.setDefaultHourlyWage(defaultHourlyWage);
        entity = profileRepo.save(entity);
        return toDto(entity);
    }

    // 근무지
    public PageResponse<PersonalWorkplaceDto> listWorkplaces(Long userId, Long cursor, int limit) {
        Pageable pageable = PageRequest.of(0, limit);
        List<PersonalWorkplace> entities = (cursor == null)
                ? workplaceRepo.findByUserIdOrderByIdDesc(userId, pageable)
                : workplaceRepo.findByUserIdAndIdLessThanOrderByIdDesc(userId, cursor, pageable);
        List<PersonalWorkplaceDto> items = entities.stream().map(this::toDto).collect(Collectors.toList());
        Long nextCursor = items.size() == limit ? items.get(items.size() - 1).getId() : null;
        return PageResponse.<PersonalWorkplaceDto>builder()
                .items(items)
                .meta(PageResponse.Meta.builder().limit(limit).nextCursor(nextCursor).build())
                .build();
    }

    public PersonalWorkplaceDto createWorkplace(Long userId, String name, String address, Integer hourlyWage) {
        if (name == null || name.isBlank()) throw new IllegalArgumentException("근무지 이름은 필수입니다.");
        if (hourlyWage == null) {
            Integer defaultWage = getOrCreateProfile(userId).getDefaultHourlyWage();
            hourlyWage = defaultWage != null ? defaultWage : 0;
        }
        PersonalWorkplace e = new PersonalWorkplace();
        e.setUserId(userId);
        e.setName(name);
        e.setAddress(address);
        e.setHourlyWage(hourlyWage);
        e = workplaceRepo.save(e);
        return toDto(e);
    }

    public PersonalWorkplaceDto updateWorkplace(Long userId, Long workplaceId, String name, String address, Integer hourlyWage) {
        PersonalWorkplace e = workplaceRepo.findByIdAndUserId(workplaceId, userId)
                .orElseThrow(() -> new NoSuchElementException("근무지를 찾을 수 없습니다."));
        if (name != null && !name.isBlank()) e.setName(name);
        if (address != null) e.setAddress(address);
        if (hourlyWage != null) e.setHourlyWage(hourlyWage);
        e = workplaceRepo.save(e);
        return toDto(e);
    }

    public void deleteWorkplace(Long userId, Long workplaceId) {
        long deleted = workplaceRepo.deleteByIdAndUserId(workplaceId, userId);
        if (deleted == 0) throw new NoSuchElementException("근무지를 찾을 수 없습니다.");
    }

    // 출퇴근
    public PageResponse<PersonalAttendanceRecordDto> listAttendance(Long userId, LocalDate from, LocalDate to, Long cursor, int limit) {
        Pageable pageable = PageRequest.of(0, limit);
        List<PersonalAttendance> entities;
        if (from != null || to != null) {
            OffsetDateTime start = from != null ? from.atStartOfDay(SEOUL).toOffsetDateTime() : OffsetDateTime.MIN;
            OffsetDateTime end = to != null ? to.plusDays(1).atStartOfDay(SEOUL).toOffsetDateTime().minusNanos(1) : OffsetDateTime.MAX;
            entities = (cursor == null)
                    ? attendanceRepo.findByUserIdAndCheckInAtBetweenOrderByIdDesc(userId, start, end, pageable)
                    : attendanceRepo.findByUserIdAndCheckInAtBetweenAndIdLessThanOrderByIdDesc(userId, start, end, cursor, pageable);
        } else {
            entities = (cursor == null)
                    ? attendanceRepo.findByUserIdOrderByIdDesc(userId, pageable)
                    : attendanceRepo.findByUserIdAndIdLessThanOrderByIdDesc(userId, cursor, pageable);
        }
        List<PersonalAttendanceRecordDto> items = entities.stream().map(this::toDto).collect(Collectors.toList());
        Long nextCursor = items.size() == limit ? items.get(items.size() - 1).getId() : null;

        int totalMinutes = items.stream().map(PersonalAttendanceRecordDto::getDurationMinutes)
                .filter(Objects::nonNull).mapToInt(Integer::intValue).sum();
        int daysCount = (int) items.stream()
                .filter(a -> a.getCheckInAt() != null)
                .map(a -> a.getCheckInAt().toLocalDate())
                .distinct().count();

        return PageResponse.<PersonalAttendanceRecordDto>builder()
                .items(items)
                .meta(PageResponse.Meta.builder()
                        .limit(limit)
                        .nextCursor(nextCursor)
                        .totalMinutes(totalMinutes)
                        .daysCount(daysCount)
                        .build())
                .build();
    }

    // 체크인/시드 생성(컨트롤러 호환을 위해 메서드명 유지)
    public PersonalAttendanceRecordDto seedAttendance(Long userId, Long workplaceId, OffsetDateTime in, OffsetDateTime out, Integer minutes, String note) {
        // 진행 중 세션이 있으면 그대로 반환
        java.util.Optional<PersonalAttendance> active = attendanceRepo.findFirstByUserIdAndCheckOutAtIsNullOrderByIdDesc(userId);
        if (active.isPresent()) {
            return toDto(active.get());
        }
        PersonalAttendance e = new PersonalAttendance();
        e.setUserId(userId);
        e.setWorkplaceId(workplaceId);
        e.setCheckInAt(in != null ? in : OffsetDateTime.now());
        e.setCheckOutAt(out);
        if (minutes == null && out != null && in != null) {
            minutes = (int) java.time.temporal.ChronoUnit.MINUTES.between(in, out);
        }
        e.setDurationMinutes(minutes);
        e.setNote(note);
        e = attendanceRepo.save(e);
        return toDto(e);
    }

    public PersonalAttendanceRecordDto checkOut(Long userId, Long attendanceId, OffsetDateTime out) {
        PersonalAttendance e = attendanceRepo.findByIdAndUserId(attendanceId, userId)
                .orElseThrow(() -> new NoSuchElementException("기록을 찾을 수 없습니다."));
        if (e.getCheckOutAt() != null) {
            throw new IllegalStateException("이미 퇴근 처리된 세션입니다.");
        }
        if (out.isBefore(e.getCheckInAt())) {
            throw new IllegalArgumentException("퇴근 시간이 출근 시간보다 이전입니다.");
        }
        e.setCheckOutAt(out);
        int minutes = (int) java.time.temporal.ChronoUnit.MINUTES.between(e.getCheckInAt(), out);
        e.setDurationMinutes(minutes);
        e = attendanceRepo.save(e);
        return toDto(e);
    }

    public PersonalAttendanceRecordDto patchAttendance(Long userId, Long attendanceId, Long workplaceId, String note, String checkInAt, String checkOutAt) {
        PersonalAttendance e = attendanceRepo.findByIdAndUserId(attendanceId, userId)
                .orElseThrow(() -> new NoSuchElementException("기록을 찾을 수 없습니다."));
        if (workplaceId != null) e.setWorkplaceId(workplaceId);
        if (note != null) e.setNote(note);
        if (checkInAt != null) e.setCheckInAt(OffsetDateTime.parse(checkInAt));
        if (checkOutAt != null) e.setCheckOutAt(OffsetDateTime.parse(checkOutAt));
        if (e.getCheckOutAt() != null && e.getCheckInAt() != null && e.getCheckOutAt().isBefore(e.getCheckInAt())) {
            throw new IllegalArgumentException("퇴근 시간이 출근 시간보다 이전입니다.");
        }
        if (e.getCheckOutAt() != null && e.getCheckInAt() != null) {
            int minutes = (int) java.time.temporal.ChronoUnit.MINUTES.between(e.getCheckInAt(), e.getCheckOutAt());
            e.setDurationMinutes(minutes);
        }
        e = attendanceRepo.save(e);
        return toDto(e);
    }

    // 매핑
    private PersonalUserProfileDto toDto(PersonalUserProfile e) {
        return PersonalUserProfileDto.builder()
                .userId(e.getUserId())
                .nickname(e.getNickname())
                .defaultHourlyWage(e.getDefaultHourlyWage())
                .createdAt(e.getCreatedAt())
                .updatedAt(e.getUpdatedAt())
                .build();
    }

    private PersonalWorkplaceDto toDto(PersonalWorkplace e) {
        return PersonalWorkplaceDto.builder()
                .id(e.getId())
                .userId(e.getUserId())
                .name(e.getName())
                .address(e.getAddress())
                .hourlyWage(e.getHourlyWage())
                .createdAt(e.getCreatedAt())
                .updatedAt(e.getUpdatedAt())
                .build();
    }

    private PersonalAttendanceRecordDto toDto(PersonalAttendance e) {
        return PersonalAttendanceRecordDto.builder()
                .id(e.getId())
                .userId(e.getUserId())
                .workplaceId(e.getWorkplaceId())
                .checkInAt(e.getCheckInAt())
                .checkOutAt(e.getCheckOutAt())
                .durationMinutes(e.getDurationMinutes())
                .note(e.getNote())
                .createdAt(e.getCreatedAt())
                .updatedAt(e.getUpdatedAt())
                .build();
    }
}
