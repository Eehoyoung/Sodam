/**
 * AttendanceCreditPopupHost — 사장 홈 진입 시 출석체크 팝업 자동 노출 게이트(§5 진입 규칙:
 * "앱 실행 시 오늘 미출석이면 홈 화면 진입 직후 팝업(1일 1회, 닫아도 마이페이지 상단 배너로
 * 상시 노출)"). `OwnerDashboardContent`(사장 홈, 매니저 모드 제외 — 이 API는 `@MasterOnly`)에
 * 마운트해두면 데이터 로드/자동 오픈/재노출 방지를 전부 스스로 처리한다.
 *
 * "1일 1회" 판정은 기기 타임존이 아니라 서버 응답(`weeklyGrid[].isToday` 항목의 `date`,
 * Asia/Seoul 기준)을 키로 써서 로컬에 "오늘 이미 자동으로 띄웠는지"를 저장한다 — 이렇게 하면
 * 같은 하루 안에 홈 화면을 여러 번 재방문해도 팝업이 매번 강제로 뜨지 않고, 마이페이지의
 * 상시 카드(`AttendanceCreditSummaryCard`)로만 접근 가능해진다.
 */
import React, {useEffect, useState} from 'react';
import {unifiedStorage} from '../../../common/utils/unifiedStorage';
import {useAttendanceCreditSummary} from '../hooks/useAttendanceCreditQueries';
import {AttendanceCheckInSheet} from './AttendanceCheckInSheet';

const SHOWN_KEY_PREFIX = 'attendanceCreditPopupShown:';

export const AttendanceCreditPopupHost: React.FC = () => {
    const {data: summary} = useAttendanceCreditSummary();
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (!summary || summary.checkedInToday) {
            return;
        }
        const todayEntry = summary.weeklyGrid.find(d => d.isToday);
        const todayKey = todayEntry?.date;
        if (!todayKey) {
            return;
        }
        let cancelled = false;
        (async () => {
            const shown = await unifiedStorage.getItem(`${SHOWN_KEY_PREFIX}${todayKey}`);
            if (cancelled || shown) {
                return;
            }
            await unifiedStorage.setItem(`${SHOWN_KEY_PREFIX}${todayKey}`, '1');
            if (!cancelled) {
                setVisible(true);
            }
        })();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- summary 객체 참조는 매 조회마다 새로 생성되어 date/checkedInToday 값만 의존성으로 좁힌다
    }, [summary?.checkedInToday, summary?.weeklyGrid]);

    if (!summary) {
        return null;
    }

    return <AttendanceCheckInSheet visible={visible} onClose={() => setVisible(false)} summary={summary} />;
};

export default AttendanceCreditPopupHost;
