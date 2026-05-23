import {useState, useEffect} from 'react';

/**
 * 홈 화면 데이터를 관리하는 커스텀 훅
 *
 * 홈 화면에 표시되는 이벤트, 노동법 정보, 세금 정보, 정책 정보 등을 가져오고 관리합니다.
 */
export const useHomeData = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [events, setEvents] = useState<any[]>([]);
    const [laborInfo, setLaborInfo] = useState<any[]>([]);
    const [taxInfo, setTaxInfo] = useState<any[]>([]);
    const [policyInfo, setPolicyInfo] = useState<any[]>([]);
    const [tips, setTips] = useState<any[]>([]);

    useEffect(() => {
        const fetchHomeData = async () => {
            setIsLoading(true);
            setError(null);

            try {
                // 실제 구현에서는 API 호출을 통해 데이터를 가져옵니다.
                // 여기서는 예시 데이터를 사용합니다.

                // 이벤트 데이터 가져오기
                const eventsData = [
                    {id: '1', title: '소담 출시 기념 이벤트', imageUrl: 'https://example.com/event1.jpg'},
                    {id: '2', title: '프리미엄 구독 할인 이벤트', imageUrl: 'https://example.com/event2.jpg'},
                ];
                setEvents(eventsData);

                // 노동법 정보 가져오기
                const laborInfoData = [
                    {id: '1', title: '최저임금 인상 안내', summary: '2023년 최저임금 인상에 대한 안내입니다.'},
                    {id: '2', title: '근로계약서 작성 가이드', summary: '근로계약서 작성 시 주의사항 안내입니다.'},
                ];
                setLaborInfo(laborInfoData);

                // 세금 정보 가져오기
                const taxInfoData = [
                    {id: '1', title: '소득세 신고 안내', summary: '아르바이트 소득세 신고 방법 안내입니다.'},
                    {id: '2', title: '세금 공제 혜택', summary: '아르바이트 세금 공제 혜택에 대한 안내입니다.'},
                ];
                setTaxInfo(taxInfoData);

                // 정책 정보 가져오기
                const policyInfoData = [
                    {id: '1', title: '청년 일자리 지원 정책', summary: '청년 일자리 지원 정책에 대한 안내입니다.'},
                    {id: '2', title: '소상공인 지원 정책', summary: '소상공인 지원 정책에 대한 안내입니다.'},
                ];
                setPolicyInfo(policyInfoData);

                // 팁 정보 가져오기
                const tipsData = [
                    {id: '1', title: '효율적인 근무 시간 관리 팁', summary: '근무 시간을 효율적으로 관리하는 방법입니다.'},
                    {id: '2', title: '급여 협상 팁', summary: '급여 협상 시 유용한 팁입니다.'},
                ];
                setTips(tipsData);

            } catch (err: any) {
                setError(err.message || '데이터를 불러오는 중 오류가 발생했습니다.');
                console.error('홈 데이터 로딩 오류:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchHomeData();
    }, []);

    // 데이터 새로고침 함수
    const refreshData = async () => {
        setIsLoading(true);
        setError(null);

        try {
            // 실제 구현에서는 API 호출을 통해 데이터를 새로고침합니다.
            // 여기서는 예시로 동일한 데이터를 다시 설정합니다.

            // 이벤트 데이터 가져오기
            const eventsData = [
                {id: '1', title: '소담 출시 기념 이벤트', imageUrl: 'https://example.com/event1.jpg'},
                {id: '2', title: '프리미엄 구독 할인 이벤트', imageUrl: 'https://example.com/event2.jpg'},
            ];
            setEvents(eventsData);

            // 노동법 정보 가져오기
            const laborInfoData = [
                {id: '1', title: '최저임금 인상 안내', summary: '2023년 최저임금 인상에 대한 안내입니다.'},
                {id: '2', title: '근로계약서 작성 가이드', summary: '근로계약서 작성 시 주의사항 안내입니다.'},
            ];
            setLaborInfo(laborInfoData);

            // 세금 정보 가져오기
            const taxInfoData = [
                {id: '1', title: '소득세 신고 안내', summary: '아르바이트 소득세 신고 방법 안내입니다.'},
                {id: '2', title: '세금 공제 혜택', summary: '아르바이트 세금 공제 혜택에 대한 안내입니다.'},
            ];
            setTaxInfo(taxInfoData);

            // 정책 정보 가져오기
            const policyInfoData = [
                {id: '1', title: '청년 일자리 지원 정책', summary: '청년 일자리 지원 정책에 대한 안내입니다.'},
                {id: '2', title: '소상공인 지원 정책', summary: '소상공인 지원 정책에 대한 안내입니다.'},
            ];
            setPolicyInfo(policyInfoData);

            // 팁 정보 가져오기
            const tipsData = [
                {id: '1', title: '효율적인 근무 시간 관리 팁', summary: '근무 시간을 효율적으로 관리하는 방법입니다.'},
                {id: '2', title: '급여 협상 팁', summary: '급여 협상 시 유용한 팁입니다.'},
            ];
            setTips(tipsData);

        } catch (err: any) {
            setError(err.message || '데이터를 불러오는 중 오류가 발생했습니다.');
            console.error('홈 데이터 새로고침 오류:', err);
        } finally {
            setIsLoading(false);
        }
    };

    return {
        isLoading,
        error,
        events,
        laborInfo,
        taxInfo,
        policyInfo,
        tips,
        refreshData,
    };
};

export default useHomeData;
