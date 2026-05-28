import {AppToast} from '../../../common/components/ds';
import React, {useState} from 'react';
import {Alert, Linking, Pressable, StyleSheet, View} from 'react-native';
import {
    AppBadge,
    AppButton,
    AppCard,
    AppHeader,
    AppInput,
    AppText,
    ScreenContainer,
} from '../../../common/components/ds';
import {spacing} from '../../../theme/tokens';

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
 * 37 QnA — 확정 시안.
 * FAQ 아코디언 + 1:1 문의 + 카카오 채팅. 토글/제출/링크 로직 보존.
 */
const QnAScreen: React.FC = () => {
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [inquiryName, setInquiryName] = useState('');
    const [inquiryEmail, setInquiryEmail] = useState('');
    const [inquiryContent, setInquiryContent] = useState('');

    const toggleFaq = (id: string) => setExpandedId(expandedId === id ? null : id);

    const handleInquirySubmit = () => {
        if (!inquiryName.trim() || !inquiryEmail.trim() || !inquiryContent.trim()) {
            AppToast.warn('모든 필드를 입력해 주세요.');
            return;
        }
        AppToast.success('문의가 접수됐어요. 빠른 시일 내에 답변 드릴게요.');
        setInquiryName('');
        setInquiryEmail('');
        setInquiryContent('');
    };

    const handleKakaoChat = () => {
        Linking.openURL('https://pf.kakao.com/_example/chat').catch(() => {
            AppToast.error('카카오톡 채팅을 열 수 없어요.');
        });
    };

    return (
        <ScreenContainer scroll header={<AppHeader title="Q&A" actions={[{label: '글쓰기', onPress: handleInquirySubmit}]} />}>
            <AppText variant="titleMd" style={styles.sectionTitle}>자주 묻는 질문</AppText>
            <View style={styles.list}>
                {faqData.map(faq => (
                    <AppCard key={faq.id} variant="flat" onPress={() => toggleFaq(faq.id)}>
                        <View style={styles.faqRow}>
                            <AppText variant="titleMd" style={styles.flex}>Q. {faq.question}</AppText>
                            <AppBadge label={expandedId === faq.id ? '접기' : '답변'} tone="info" />
                        </View>
                        {expandedId === faq.id ? (
                            <AppText variant="bodyMd" tone="secondary" style={styles.answer}>A. {faq.answer}</AppText>
                        ) : null}
                    </AppCard>
                ))}
            </View>

            <AppText variant="titleMd" style={styles.sectionTitle}>1:1 문의</AppText>
            <View style={styles.form}>
                <AppInput label="이름" value={inquiryName} onChangeText={setInquiryName} placeholder="이름을 입력하세요" />
                <AppInput label="이메일" value={inquiryEmail} onChangeText={setInquiryEmail} placeholder="이메일을 입력하세요" keyboardType="email-address" autoCapitalize="none" />
                <AppInput label="문의 내용" value={inquiryContent} onChangeText={setInquiryContent} placeholder="문의 내용을 입력하세요" multiline multilineMinHeight={120} />
                <AppButton label="문의하기" onPress={handleInquirySubmit} />
            </View>

            <AppText variant="titleMd" style={styles.sectionTitle}>카카오톡 채팅 문의</AppText>
            <Pressable onPress={handleKakaoChat} style={styles.kakaoBtn}>
                <AppText variant="titleMd" style={styles.kakaoText}>카카오톡 채팅 문의하기</AppText>
            </Pressable>
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    sectionTitle: {marginTop: spacing.lg, marginBottom: spacing.sm},
    list: {gap: spacing.sm},
    faqRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
    flex: {flex: 1},
    answer: {marginTop: spacing.sm},
    form: {gap: spacing.md},
    kakaoBtn: {
        minHeight: 52,
        borderRadius: 17,
        backgroundColor: '#FEE500',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
    },
    kakaoText: {color: '#3C1E1E'},
});

export default QnAScreen;
