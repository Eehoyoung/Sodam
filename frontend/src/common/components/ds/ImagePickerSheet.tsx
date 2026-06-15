/**
 * 77 Image Picker Sheet (확정 시안) — 프로필 사진 변경.
 * 카메라/앨범/기본이미지 선택. 실제 picker 호출은 호출 측 핸들러.
 */
import React from 'react';
import {StyleSheet, View} from 'react-native';
import {AppBadge} from './AppBadge';
import {AppListItem} from './AppListItem';
import {BottomSheet} from './BottomSheet';
import {spacing} from '../../../theme/tokens';

interface Props {
    visible: boolean;
    onClose: () => void;
    onCamera: () => void;
    onAlbum: () => void;
    onReset?: () => void;
}

export const ImagePickerSheet: React.FC<Props> = ({visible, onClose, onCamera, onAlbum, onReset}) => (
    <BottomSheet visible={visible} onClose={onClose} title="사진 변경">
        <View style={styles.list}>
            <AppListItem title="카메라로 촬영" subtitle="새 사진 찍기" right="›" onPress={onCamera} />
            <AppListItem title="앨범에서 선택" subtitle="기존 사진 선택" right="›" onPress={onAlbum} />
            {onReset ? (
                <AppListItem title="기본 이미지로 변경" subtitle="사진 삭제" right={<AppBadge label="삭제" tone="warning" />} onPress={onReset} />
            ) : null}
        </View>
    </BottomSheet>
);

const styles = StyleSheet.create({
    list: {gap: spacing.sm, marginTop: spacing.xs},
});

export default ImagePickerSheet;
