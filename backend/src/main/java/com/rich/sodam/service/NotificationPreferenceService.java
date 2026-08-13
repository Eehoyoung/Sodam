package com.rich.sodam.service;

import com.rich.sodam.domain.NotificationPreference;
import com.rich.sodam.dto.request.NotificationPreferenceUpdateRequest;
import com.rich.sodam.dto.response.NotificationPreferenceResponse;
import com.rich.sodam.repository.NotificationPreferenceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class NotificationPreferenceService {

    private final NotificationPreferenceRepository notificationPreferenceRepository;

    @Transactional(readOnly = true)
    public NotificationPreferenceResponse getPreferences(Long authenticatedUserId) {
        return notificationPreferenceRepository.findById(authenticatedUserId)
                .map(NotificationPreferenceResponse::from)
                .orElseGet(() -> NotificationPreferenceResponse.from(
                        NotificationPreference.defaultsFor(authenticatedUserId)));
    }

    @Transactional
    public NotificationPreferenceResponse updatePreferences(
            Long authenticatedUserId,
            NotificationPreferenceUpdateRequest request) {
        NotificationPreference preference = notificationPreferenceRepository.findById(authenticatedUserId)
                .orElseGet(() -> NotificationPreference.defaultsFor(authenticatedUserId));
        preference.update(request);
        return NotificationPreferenceResponse.from(notificationPreferenceRepository.save(preference));
    }
}
