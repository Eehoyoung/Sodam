package com.rich.sodam.service.ai;

/** 매입장부가 Claude와 로컬 LLM을 같은 방식으로 호출하기 위한 최소 계약. */
public interface TextGenerationClient {
    boolean isReady();
    String complete(String prompt);
}
