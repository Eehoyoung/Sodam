/* eslint-disable react-native/no-unused-styles -- styles built via makeStyles(theme) factory; the rule cannot statically track factory-created stylesheets and flags every (used) entry as unused */
import React, { useMemo } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../../../common/components/logo/Colors';
import { ThemeColors, useThemeColors } from '../../../common/hooks/useThemeColors';

export type Purpose = 'personal' | 'employee' | 'boss';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelectPurpose: (purpose: Purpose) => void;
}

const PurposeSelectModal: React.FC<Props> = ({ visible, onClose, onSelectPurpose }) => {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>사용 목적을 선택해주세요</Text>
          <Text style={styles.subtitle}>정확한 권한 설정을 위해 한 번만 선택합니다.</Text>

          <TouchableOpacity style={[styles.option, styles.optionPersonal]} onPress={() => onSelectPurpose('personal')}>
            <Text style={[styles.optionTitle, { color: COLORS.SODAM_BLUE }]}>개인 사용자</Text>
            <Text style={styles.optionDesc}>혼자서 간편하게 출퇴근 기록</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.option, styles.optionEmployee]} onPress={() => onSelectPurpose('employee')}>
            <Text style={[styles.optionTitle, { color: COLORS.SODAM_GREEN }]}>직원</Text>
            <Text style={styles.optionDesc}>매장에 참여하여 근태 기록</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.option, styles.optionBoss]} onPress={() => onSelectPurpose('boss')}>
            <Text style={[styles.optionTitle, { color: COLORS.SODAM_ORANGE }]}>매장 대표</Text>
            <Text style={styles.optionDesc}>직원 관리와 급여 정산</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>닫기</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: c.overlayDark,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    backgroundColor: c.surface,
    borderRadius: 16,
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: c.textPrimary,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: c.textSecondary,
    marginBottom: 14,
  },
  option: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  optionPersonal: {
    backgroundColor: c.surfaceSky,
  },
  optionEmployee: {
    backgroundColor: c.successBg,
  },
  optionBoss: {
    backgroundColor: c.brandPrimarySoft,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  optionDesc: {
    fontSize: 13,
    color: c.textSecondary,
  },
  closeBtn: {
    alignSelf: 'center',
    marginTop: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  closeBtnText: {
    color: c.textSecondary,
  },
});

export default PurposeSelectModal;
