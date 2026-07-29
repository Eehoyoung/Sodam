/* eslint-disable react-native/no-color-literals -- 카카오 채널 버튼 브랜드 고정색(다크/라이트 무관) */
import {AppBadge, AppCard, AppHeader, AppInput, AppText, AppToast, BottomSheet, ScreenContainer} from '../../../common/components/ds';
import React, {useState} from 'react';
import {Linking, Pressable, StyleSheet, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {spacing} from '../../../theme/tokens';
import inquiryService from '../services/inquiryService';

const faqData = [
    {id: '1', question: '소담 서비스는 어떤 서비스인가요?', answer: '소담은 아르바이트 근태 및 급여 관리를 위한 서비스입니다. 사장님은 직원들의 출퇴근 관리와 급여 계산을 쉽게 할 수 있고, 직원들은 자신의 근무 시간과 급여를 확인할 수 있어요.'},
    {id: '2', question: '소담 서비스는 어떻게 이용할 수 있나요?', answer: '회원가입 후 사장님 또는 직원으로 역할을 선택하여 이용할 수 있어요. 사장님은 매장을 등록하고 직원을 초대할 수 있으며, 직원은 초대를 받아 매장에 소속되어 근무할 수 있어요.'},
    {id: '3', question: '서비스 이용 요금은 어떻게 되나요?', answer: '기본 서비스는 무료로 이용 가능하며, 추가 기능을 원하시는 경우 구독 서비스를 이용하실 수 있어요. 자세한 요금 정보는 구독 페이지에서 확인하실 수 있어요.'},
    {id: '4', question: '출퇴근 기록은 어떻게 관리되나요?', answer: '직원은 앱을 통해 출퇴근 시간을 기록할 수 있으며, 사장님은 이를 실시간으로 확인하고 관리할 수 있어요. GPS 기반 위치 확인 기능도 제공됩니다.'},
    {id: '5', question: '급여 계산은 어떻게 이루어지나요?', answer: '등록된 근무 시간과 시급을 기준으로 자동으로 급여가 계산됩니다. 야간 수당, 주휴 수당 등 다양한 수당도 자동으로 계산됩니다.'},
    {id: '6', question: '개인정보는 안전하게 보호되나요?', answer: '네, 소담은 개인정보 보호를 최우선으로 생각합니다. 모든 데이터는 암호화되어 저장되며, 개인정보 보호법을 준수합니다.'},
    {id: '7', question: '비밀번호를 잊어버렸어요. 어떻게 해야 하나요?', answer: '로그인 화면에서 "비밀번호 찾기" 기능을 이용하시면 가입 시 등록한 이메일로 비밀번호 재설정 링크가 발송됩니다.'},
    {id: '8', question: '앱을 사용하다가 오류가 발생했어요.', answer: '앱 사용 중 오류가 발생한 경우, 1:1 문의 또는 카카오 채팅 문의를 통해 문제를 알려주시면 신속하게 해결해 드릴게요.'},
];

/**
 * 37 QnA + 73 QnACompose — 확정 시안.
 * FAQ 아코디언 + 1:1 문의(하단 시트) + 카카오 채팅. 토글/제출/링크 로직 보존.
 * 헤더 "글쓰기"는 73 QnACompose 시트를 연다(이전엔 즉시 handleInquirySubmit 을 호출해
 * 빈 폼이면 곧장 경고 토스트만 뜨는 버그였음 — docs/260720 v3 감사 후속).
 * 시안의 제목/카테고리 선택 필드는 BE `/api/inquiries` 스키마(name/email/content 뿐)에
 * 대응하는 필드가 없어 실제 존재하는 이름/이메일/문의내용 3필드로 대체했다.
 */
interface Props {
    /** 개발용 시각 검증 전용 — 73 QnACompose 카드 재현을 위해 문의 작성 시트를 기본으로 연다. */
    visualComposeOpen?: boolean;
    captureMarker?: string;
}

const QnAScreen: React.FC<Props> = ({visualComposeOpen, captureMarker}) => {
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [query, setQuery] = useState('');
    const [composeVisible, setComposeVisible] = useState(!!visualComposeOpen);
    const [inquiryName, setInquiryName] = useState('');
    const [inquiryEmail, setInquiryEmail] = useState('');
    const [inquiryContent, setInquiryContent] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const toggleFaq = (id: string) => setExpandedId(expandedId === id ? null : id);

    // v3 아티팩트 37 QnA(sodam-v3-05-info.html)의 .field 검색창 — 질문/답변 텍스트로 클라이언트 필터.
    const visibleFaq = query.trim()
        ? faqData.filter(faq => {
            const q = query.trim().toLowerCase();
            return faq.question.toLowerCase().includes(q) || faq.answer.toLowerCase().includes(q);
        })
        : faqData;

    const handleInquirySubmit = async () => {
        if (!inquiryName.trim() || !inquiryEmail.trim() || !inquiryContent.trim()) {
            AppToast.warn('모든 필드를 입력해 주세요.');
            return;
        }
        if (submitting) {return;}
        setSubmitting(true);
        try {
            await inquiryService.submit({
                name: inquiryName.trim(),
                email: inquiryEmail.trim(),
                content: inquiryContent.trim(),
            });
            AppToast.success('문의가 접수됐어요. 빠른 시일 내에 답변 드릴게요.');
            setInquiryName('');
            setInquiryEmail('');
            setInquiryContent('');
            setComposeVisible(false);
        } catch (_e) {
            AppToast.error('문의 접수에 실패했어요. 잠시 후 다시 시도해 주세요.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleKakaoChat = () => {
        Linking.openURL('https://pf.kakao.com/_example/chat').catch(() => {
            AppToast.error('카카오톡 채팅을 열 수 없어요.');
        });
    };

    return (
        <ScreenContainer scroll header={<AppHeader title="Q&A" actions={[{label: '글쓰기', onPress: () => setComposeVisible(true)}]} />}>
            <AppInput
                placeholder="궁금한 내용을 검색하세요"
                value={query}
                onChangeText={setQuery}
                containerStyle={styles.searchInput}
            />

            <AppText variant="headingSm" style={styles.sectionTitle}>자주 묻는 질문</AppText>
            <View style={styles.list}>
                {visibleFaq.map(faq => {
                    const open = expandedId === faq.id;
                    return (
                        <AppCard key={faq.id} variant="plain" onPress={() => toggleFaq(faq.id)}>
                            <View style={styles.faqRow}>
                                <View style={styles.flex}>
                                    <AppText variant="titleMd" numberOfLines={1}>{faq.question}</AppText>
                                    {!open ? (
                                        <AppText variant="caption" tone="secondary" numberOfLines={1} style={styles.faqPreview}>
                                            {faq.answer}
                                        </AppText>
                                    ) : null}
                                </View>
                                {/* v3 아티팩트 37: list-item 우측 badge--teal "답변" */}
                                <AppBadge label="답변" tone="success" />
                            </View>
                            {open ? (
                                <AppText variant="bodyMd" tone="secondary" style={styles.answer}>{faq.answer}</AppText>
                            ) : null}
                        </AppCard>
                    );
                })}
                {visibleFaq.length === 0 ? (
                    <AppText variant="bodyMd" tone="tertiary" center style={styles.noResult}>
                        검색 결과가 없어요.
                    </AppText>
                ) : null}
            </View>

            <AppText variant="headingSm" style={styles.sectionTitle}>카카오톡 채팅 문의</AppText>
            <Pressable onPress={handleKakaoChat} style={({pressed}) => [styles.kakaoBtn, pressed && styles.kakaoPressed]}>
                <Ionicons name="chatbubble" size={20} color="#3C1E1E" />
                <AppText variant="titleMd" style={styles.kakaoText}>카카오톡 채팅 문의하기</AppText>
            </Pressable>

            {/* 73 QnACompose — 헤더 "글쓰기"로 진입하는 1:1 문의 작성 시트 */}
            <BottomSheet
                visible={composeVisible}
                onClose={() => setComposeVisible(false)}
                captureMarker={captureMarker}
                title="질문 남기기"
                scrollable
                primary={{
                    label: '질문 등록',
                    onPress: handleInquirySubmit,
                    loading: submitting,
                    testID: 'qna-inquiry-submit',
                }}
                secondary={{label: '닫기', onPress: () => setComposeVisible(false)}}>
                <View style={styles.form}>
                    <AppInput label="이름" value={inquiryName} onChangeText={setInquiryName} placeholder="이름을 입력하세요" />
                    <AppInput label="이메일" value={inquiryEmail} onChangeText={setInquiryEmail} placeholder="이메일을 입력하세요" keyboardType="email-address" autoCapitalize="none" />
                    <AppInput label="문의 내용" value={inquiryContent} onChangeText={setInquiryContent} placeholder="궁금한 내용을 적어 주세요" multiline multilineMinHeight={120} />
                </View>
            </BottomSheet>
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    searchInput: {marginTop: spacing.sm},
    sectionTitle: {marginTop: spacing.xxl, marginBottom: spacing.md},
    list: {gap: spacing.sm},
    faqRow: {flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm},
    flex: {flex: 1},
    faqPreview: {marginTop: 2},
    noResult: {paddingVertical: spacing.xl},
    answer: {marginTop: spacing.md, lineHeight: 22},
    form: {gap: spacing.md},
    kakaoBtn: {
        minHeight: 56,
        borderRadius: 18,
        backgroundColor: '#FEE500',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        marginBottom: spacing.lg,
    },
    kakaoPressed: {opacity: 0.9, transform: [{scale: 0.985}]},
    kakaoText: {color: '#3C1E1E'},
});

export default QnAScreen;
