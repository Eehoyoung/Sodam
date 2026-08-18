import React from 'react';
import {StyleSheet, View} from 'react-native';
import {AppButton, AppCard, AppText, CtaStack, StepScaffold} from '../../../../common/components/ds';
import {spacing} from '../../../../theme/tokens';

export interface SendContractEmployee {
    id: number;
    name: string;
    email: string;
}

interface Props {
    employees: SendContractEmployee[];
    selectedId?: number;
    onSelect: (id: number) => void;
    onNext: () => void;
    onBack: () => void;
}

/**
 * 근로계약서 발송 ① 대상 직원 선택 — SendContractScreen(H-7)에서 분리.
 * 화면 로직은 그대로이며 이 컴포넌트는 표시와 선택만 담당한다(검증은 부모의 goStep2).
 */
export const EmployeeSelectStep: React.FC<Props> = ({employees, selectedId, onSelect, onNext, onBack}) => (
    <StepScaffold
        progress={1 / 4}
        title="누구에게 보낼까요?"
        subtitle="근로계약서를 보낼 직원을 선택해 주세요."
        onBack={onBack}
        footer={
            <CtaStack>
                <AppButton label="다음" onPress={onNext} disabled={!selectedId} />
            </CtaStack>
        }>
        <View style={styles.list}>
            {employees.length === 0 ? (
                <AppText variant="bodyMd" tone="secondary">
                    매장에 등록된 직원이 없어요.
                </AppText>
            ) : (
                employees.map(emp => (
                    <AppCard
                        key={String(emp.id)}
                        variant="outlined"
                        selected={emp.id === selectedId}
                        onPress={() => onSelect(emp.id)}
                        accessibilityLabel={`${emp.name} 선택`}>
                        <AppText variant="titleMd">{emp.name}</AppText>
                        <AppText variant="caption" tone="secondary" style={styles.email}>
                            {emp.email.trim().length > 0 ? emp.email : '이메일 미등록'}
                        </AppText>
                    </AppCard>
                ))
            )}
        </View>
    </StepScaffold>
);

const styles = StyleSheet.create({
    list: {gap: spacing.sm},
    email: {marginTop: 2},
});

export default EmployeeSelectStep;
