import React, {useState} from 'react';
import {
    Alert,
    Linking,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import {Button} from '../../../common/components';

// FAQ 데이터
const faqData = [
    {
        id: '1',
        question: '소담 서비스는 어떤 서비스인가요?',
        answer: '소담은 아르바이트 근태 및 급여 관리를 위한 서비스입니다. 사장님은 직원들의 출퇴근 관리와 급여 계산을 쉽게 할 수 있고, 직원들은 자신의 근무 시간과 급여를 확인할 수 있습니다.',
    },
    {
        id: '2',
        question: '소담 서비스는 어떻게 이용할 수 있나요?',
        answer: '회원가입 후 사장님 또는 직원으로 역할을 선택하여 이용할 수 있습니다. 사장님은 매장을 등록하고 직원을 초대할 수 있으며, 직원은 초대를 받아 매장에 소속되어 근무할 수 있습니다.',
    },
    {
        id: '3',
        question: '서비스 이용 요금은 어떻게 되나요?',
        answer: '기본 서비스는 무료로 이용 가능하며, 추가 기능을 원하시는 경우 구독 서비스를 이용하실 수 있습니다. 자세한 요금 정보는 구독 페이지에서 확인하실 수 있습니다.',
    },
    {
        id: '4',
        question: '출퇴근 기록은 어떻게 관리되나요?',
        answer: '직원은 앱을 통해 출퇴근 시간을 기록할 수 있으며, 사장님은 이를 실시간으로 확인하고 관리할 수 있습니다. GPS 기반 위치 확인 기능도 제공됩니다.',
    },
    {
        id: '5',
        question: '급여 계산은 어떻게 이루어지나요?',
        answer: '등록된 근무 시간과 시급을 기준으로 자동으로 급여가 계산됩니다. 야간 수당, 주휴 수당 등 다양한 수당도 자동으로 계산됩니다.',
    },
    {
        id: '6',
        question: '개인정보는 안전하게 보호되나요?',
        answer: '네, 소담은 개인정보 보호를 최우선으로 생각합니다. 모든 데이터는 암호화되어 저장되며, 개인정보 보호법을 준수합니다.',
    },
    {
        id: '7',
        question: '비밀번호를 잊어버렸어요. 어떻게 해야 하나요?',
        answer: '로그인 화면에서 "비밀번호 찾기" 기능을 이용하시면 가입 시 등록한 이메일로 비밀번호 재설정 링크가 발송됩니다.',
    },
    {
        id: '8',
        question: '앱을 사용하다가 오류가 발생했어요.',
        answer: '앱 사용 중 오류가 발생한 경우, 1:1 문의 또는 카카오 채팅 문의를 통해 문제를 알려주시면 신속하게 해결해 드리겠습니다.',
    },
];

/**
 * Q&A 화면
 * 자주 묻는 질문(FAQ)과 1:1 문의, 카카오톡 채팅 문의 기능을 제공하는 화면
 */
const QnAScreen: React.FC = () => {
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [inquiryName, setInquiryName] = useState('');
    const [inquiryEmail, setInquiryEmail] = useState('');
    const [inquiryContent, setInquiryContent] = useState('');

    // FAQ 항목 토글 함수
    const toggleFaq = (id: string) => {
        setExpandedId(expandedId === id ? null : id);
    };

    // 1:1 문의 제출 함수
    const handleInquirySubmit = () => {
        if (!inquiryName.trim() || !inquiryEmail.trim() || !inquiryContent.trim()) {
            Alert.alert('입력 오류', '모든 필드를 입력해주세요.');
            return;
        }

        // 여기에 실제 API 호출 로직이 들어갈 예정
        Alert.alert(
            '문의가 접수되었습니다',
            '빠른 시일 내에 답변 드리겠습니다.',
            [
                {
                    text: '확인',
                    onPress: () => {
                        // 폼 초기화
                        setInquiryName('');
                        setInquiryEmail('');
                        setInquiryContent('');
                    },
                },
            ]
        );
    };

    // 카카오 채팅 문의 함수
    const handleKakaoChat = () => {
        // 실제 카카오 채팅 URL로 변경 필요
        Linking.openURL('https://pf.kakao.com/_example/chat')
            .catch(() => {
                Alert.alert('오류', '카카오톡 채팅을 열 수 없습니다.');
            });
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView>
                {/* 헤더 섹션 */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>고객센터</Text>
                    <Text style={styles.headerSubtitle}>
                        소담 서비스에 대한 궁금한 점을 확인하세요.
                    </Text>
                </View>

                {/* 자주 묻는 질문 섹션 */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>자주 묻는 질문</Text>

                    {faqData.map((faq) => (
                        <View key={faq.id} style={styles.faqItem}>
                            <TouchableOpacity
                                style={styles.faqQuestion}
                                onPress={() => toggleFaq(faq.id)}
                            >
                                <Text style={styles.faqQuestionText}>Q. {faq.question}</Text>
                                <Text style={styles.faqToggle}>
                                    {expandedId === faq.id ? '−' : '+'}
                                </Text>
                            </TouchableOpacity>

                            {expandedId === faq.id && (
                                <View style={styles.faqAnswer}>
                                    <Text style={styles.faqAnswerText}>A. {faq.answer}</Text>
                                </View>
                            )}
                        </View>
                    ))}
                </View>

                {/* 1:1 문의 섹션 */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>1:1 문의</Text>
                    <Text style={styles.sectionDescription}>
                        궁금한 점이나 문제가 있으시면 아래 양식을 작성해 주세요.
                    </Text>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>이름</Text>
                        <TextInput
                            style={styles.input}
                            value={inquiryName}
                            onChangeText={setInquiryName}
                            placeholder="이름을 입력하세요"
                        />
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>이메일</Text>
                        <TextInput
                            style={styles.input}
                            value={inquiryEmail}
                            onChangeText={setInquiryEmail}
                            placeholder="이메일을 입력하세요"
                            keyboardType="email-address"
                        />
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>문의 내용</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={inquiryContent}
                            onChangeText={setInquiryContent}
                            placeholder="문의 내용을 입력하세요"
                            multiline
                            numberOfLines={5}
                            textAlignVertical="top"
                        />
                    </View>

                    <Button
                        title="문의하기"
                        onPress={handleInquirySubmit}
                        type="primary"
                        style={styles.submitButton}
                    />
                </View>

                {/* 카카오 채팅 문의 섹션 */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>카카오톡 채팅 문의</Text>
                    <Text style={styles.sectionDescription}>
                        빠른 답변이 필요하시면 카카오톡으로 문의해 주세요.
                    </Text>

                    <Button
                        title="카카오톡 채팅 문의하기"
                        onPress={handleKakaoChat}
                        type="secondary"
                        style={styles.kakaoButton}
                        textStyle={styles.kakaoButtonText}
                    />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9f9f9',
    },
    header: {
        backgroundColor: '#3498db',
        padding: 20,
        paddingTop: 40,
        paddingBottom: 30,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
    },
    headerSubtitle: {
        fontSize: 16,
        color: '#fff',
        opacity: 0.9,
    },
    section: {
        backgroundColor: '#fff',
        padding: 20,
        marginTop: 15,
        borderRadius: 10,
        marginHorizontal: 15,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 1},
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
        marginBottom: 10,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        color: '#333',
    },
    sectionDescription: {
        fontSize: 14,
        color: '#666',
        marginBottom: 20,
    },
    faqItem: {
        borderBottomWidth: 1,
        borderBottomColor: '#eaeaea',
        marginBottom: 10,
    },
    faqQuestion: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
    },
    faqQuestionText: {
        fontSize: 16,
        fontWeight: '500',
        flex: 1,
        color: '#333',
    },
    faqToggle: {
        fontSize: 20,
        color: '#3498db',
        fontWeight: 'bold',
    },
    faqAnswer: {
        backgroundColor: '#f8f9fa',
        padding: 15,
        borderRadius: 8,
        marginBottom: 10,
    },
    faqAnswerText: {
        fontSize: 14,
        color: '#555',
        lineHeight: 20,
    },
    formGroup: {
        marginBottom: 15,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 8,
        color: '#333',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 10,
        fontSize: 14,
        backgroundColor: '#fff',
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    submitButton: {
        marginTop: 10,
    },
    kakaoButton: {
        backgroundColor: '#FEE500',
        borderWidth: 0,
    },
    kakaoButtonText: {
        color: '#3C1E1E',
    },
});

export default QnAScreen;
