package com.rich.sodam.service;

import com.rich.sodam.config.integration.PushNotifier;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class ManagerSupervisionNotificationService {
    private final StoreAccessGuard guard;
    private final StorePermissionRecipientService recipients;
    private final NotificationService notifications;

    public void notifyIfManager(Long actorUserId, Long storeId, String actionLabel) {
        if (guard.isMasterOwner(actorUserId, storeId)) return;
        for (Long ownerId : recipients.owners(storeId)) {
            notifications.push(ownerId, PushNotifier.PushMessage.builder()
                    .title("매니저 처리 알림")
                    .body("매니저가 " + actionLabel + " 작업을 처리했습니다.")
                    .deepLink("sodam://manager-audit")
                    .data(Map.of("type", "MANAGER_ACTION_SUPERVISION"))
                    .build());
        }
    }
}
