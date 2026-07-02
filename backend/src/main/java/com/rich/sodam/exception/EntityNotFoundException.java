package com.rich.sodam.exception;

/**
 * 엔티티를 찾을 수 없을 때 발생하는 예외
 */
public class EntityNotFoundException extends BusinessException {

    public EntityNotFoundException(String message) {
        super(message, "ENTITY_NOT_FOUND");
    }

    public EntityNotFoundException(String entityName, Long id) {
        super(String.format("%s(ID: %d)를 찾을 수 없습니다.", entityName, id), "ENTITY_NOT_FOUND");
    }
}