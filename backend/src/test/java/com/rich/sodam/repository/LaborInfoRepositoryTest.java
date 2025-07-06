package com.rich.sodam.repository;

import com.rich.sodam.domain.LaborInfo;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
class LaborInfoRepositoryTest {

    @Autowired
    private LaborInfoRepository laborInfoRepository;

    @Test
    @DisplayName("노무 정보 저장 테스트")
    void saveLaborInfo() {
        // given
        LaborInfo laborInfo = new LaborInfo();
        laborInfo.setTitle("테스트 노무 정보");
        laborInfo.setContent("테스트 내용입니다.");
        laborInfo.setImagePath("uploads/test-image.jpg");

        // when
        LaborInfo savedLaborInfo = laborInfoRepository.save(laborInfo);

        // then
        assertThat(savedLaborInfo).isNotNull();
        assertThat(savedLaborInfo.getId()).isNotNull();
        assertThat(savedLaborInfo.getTitle()).isEqualTo("테스트 노무 정보");
        assertThat(savedLaborInfo.getContent()).isEqualTo("테스트 내용입니다.");
        assertThat(savedLaborInfo.getImagePath()).isEqualTo("uploads/test-image.jpg");
        assertThat(savedLaborInfo.getCreatedAt()).isNotNull();
    }

    @Test
    @DisplayName("노무 정보 조회 테스트")
    void findLaborInfo() {
        // given
        LaborInfo laborInfo = new LaborInfo();
        laborInfo.setTitle("테스트 노무 정보");
        laborInfo.setContent("테스트 내용입니다.");
        laborInfo.setImagePath("uploads/test-image.jpg");
        LaborInfo savedLaborInfo = laborInfoRepository.save(laborInfo);

        // when
        Optional<LaborInfo> foundLaborInfo = laborInfoRepository.findById(savedLaborInfo.getId());

        // then
        assertThat(foundLaborInfo).isPresent();
        assertThat(foundLaborInfo.get().getTitle()).isEqualTo("테스트 노무 정보");
        assertThat(foundLaborInfo.get().getContent()).isEqualTo("테스트 내용입니다.");
        assertThat(foundLaborInfo.get().getImagePath()).isEqualTo("uploads/test-image.jpg");
    }

    @Test
    @DisplayName("노무 정보 전체 조회 테스트")
    void findAllLaborInfos() {
        // given
        laborInfoRepository.deleteAll(); // 기존 데이터 삭제

        LaborInfo laborInfo1 = new LaborInfo();
        laborInfo1.setTitle("첫 번째 노무 정보");
        laborInfo1.setContent("첫 번째 내용입니다.");
        laborInfoRepository.save(laborInfo1);

        LaborInfo laborInfo2 = new LaborInfo();
        laborInfo2.setTitle("두 번째 노무 정보");
        laborInfo2.setContent("두 번째 내용입니다.");
        laborInfoRepository.save(laborInfo2);

        // when
        List<LaborInfo> laborInfos = laborInfoRepository.findAll();

        // then
        assertThat(laborInfos).hasSize(2);
        assertThat(laborInfos).extracting("title")
                .containsExactlyInAnyOrder("첫 번째 노무 정보", "두 번째 노무 정보");
    }

    @Test
    @DisplayName("최근 노무 정보 5개 조회 테스트")
    void findTop5ByOrderByIdDesc() {
        // given
        laborInfoRepository.deleteAll(); // 기존 데이터 삭제

        // 6개의 노무 정보 생성
        for (int i = 1; i <= 6; i++) {
            LaborInfo laborInfo = new LaborInfo();
            laborInfo.setTitle("노무 정보 " + i);
            laborInfo.setContent("내용 " + i);
            laborInfoRepository.save(laborInfo);
        }

        // when
        List<LaborInfo> recentLaborInfos = laborInfoRepository.findTop5ByOrderByIdDesc();

        // then
        assertThat(recentLaborInfos).hasSize(5);
        assertThat(recentLaborInfos.get(0).getTitle()).isEqualTo("노무 정보 6");
        assertThat(recentLaborInfos.get(4).getTitle()).isEqualTo("노무 정보 2");
    }

    @Test
    @DisplayName("노무 정보 수정 테스트")
    void updateLaborInfo() {
        // given
        LaborInfo laborInfo = new LaborInfo();
        laborInfo.setTitle("원본 노무 정보");
        laborInfo.setContent("원본 내용입니다.");
        LaborInfo savedLaborInfo = laborInfoRepository.save(laborInfo);

        // when
        savedLaborInfo.setTitle("수정된 노무 정보");
        savedLaborInfo.setContent("수정된 내용입니다.");
        LaborInfo updatedLaborInfo = laborInfoRepository.save(savedLaborInfo);

        // then
        assertThat(updatedLaborInfo.getId()).isEqualTo(savedLaborInfo.getId());
        assertThat(updatedLaborInfo.getTitle()).isEqualTo("수정된 노무 정보");
        assertThat(updatedLaborInfo.getContent()).isEqualTo("수정된 내용입니다.");
        assertThat(updatedLaborInfo.getUpdatedAt()).isNotNull();
    }

    @Test
    @DisplayName("노무 정보 삭제 테스트")
    void deleteLaborInfo() {
        // given
        LaborInfo laborInfo = new LaborInfo();
        laborInfo.setTitle("삭제할 노무 정보");
        laborInfo.setContent("삭제할 내용입니다.");
        LaborInfo savedLaborInfo = laborInfoRepository.save(laborInfo);

        // when
        laborInfoRepository.delete(savedLaborInfo);
        Optional<LaborInfo> deletedLaborInfo = laborInfoRepository.findById(savedLaborInfo.getId());

        // then
        assertThat(deletedLaborInfo).isEmpty();
    }
}
