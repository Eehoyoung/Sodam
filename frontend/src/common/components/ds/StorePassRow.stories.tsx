import React, {useState} from 'react';
import type {Meta, StoryObj} from '@storybook/react-native-web-vite';
import {StyleSheet, View} from 'react-native';
import {colors} from '../../../theme/tokens';
import {StorePassRow, StorePassItem} from './StorePassRow';

const SAMPLE_STORES: StorePassItem[] = [
    {id: 1, name: '강남점'},
    {id: 2, name: '홍대점'},
    {id: 3, name: '성수점'},
];

/** 실제 화면과 동일하게 탭하면 선택 매장이 바뀌는 상태를 갖는 wrapper. */
const InteractiveStorePassRow: React.FC<{items: StorePassItem[]}> = ({items}) => {
    const [selectedId, setSelectedId] = useState<number | null>(items[0]?.id ?? null);
    return <StorePassRow items={items} selectedId={selectedId} onSelect={setSelectedId} />;
};

const styles = StyleSheet.create({
    canvas: {padding: 16, maxWidth: 400, backgroundColor: colors.surfaceCanvas},
});

const meta: Meta<typeof StorePassRow> = {
    title: 'DS/StorePassRow',
    component: StorePassRow,
    decorators: [
        Story => (
            <View style={styles.canvas}>
                <Story />
            </View>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof StorePassRow>;

/** 칩을 탭하면 실제로 선택 매장이 전환된다(직원의 멀티매장 소속 UI). */
export const MultiStore: Story = {
    render: () => <InteractiveStorePassRow items={SAMPLE_STORES} />,
};

export const TwoStores: Story = {
    render: () => <InteractiveStorePassRow items={SAMPLE_STORES.slice(0, 2)} />,
};

/** 소속 매장이 1곳뿐이면 컴포넌트가 아무것도 렌더링하지 않는다(전환할 대상이 없으므로). */
export const SingleStoreRendersNothing: Story = {
    render: () => <InteractiveStorePassRow items={SAMPLE_STORES.slice(0, 1)} />,
};
