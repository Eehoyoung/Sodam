/* eslint-disable react-native/no-unused-styles -- styles built via makeStyles(theme) factory; the rule cannot statically track factory-created stylesheets and flags every (used) entry as unused */
import React, {useMemo} from 'react';
import {Image, StyleSheet, Text, View} from 'react-native';
import {ThemeColors, useThemeColors} from '../../../common/hooks/useThemeColors';

const Testimonials = () => {
    const c = useThemeColors();
    const styles = useMemo(() => makeStyles(c), [c]);

    const testimonials = [
        {
            id: 1,
            name: '김민수',
            business: '동네 카페 운영',
            comment: '근태관리 시스템 덕분에 아르바이트생 관리가 정말 편해졌어요. 급여 계산도 자동으로 되니 업무 시간이 크게 줄었습니다.',
            // image: require('../assets/testimonial1.jpg'),
        },
        {
            id: 2,
            name: '박지영',
            business: '의류 매장 점주',
            comment: '세무 관리 기능이 특히 유용해요. 세금 계산과 신고가 어려웠는데, 이제는 손쉽게 처리할 수 있게 됐어요.',
            // image: require('../assets/testimonial2.jpg'),
        },
        {
            id: 3,
            name: '이준호',
            business: '동네 식당 운영',
            comment: '상권 분석 리포트를 통해 새 지점 오픈 결정을 했어요. 데이터 기반 의사결정이 가능해져서 정말 만족합니다.',
            // image: require('../assets/testimonial3.jpg'),
        },
    ];

    return (
        <View style={styles.container}>
            <Text style={styles.sectionTitle}>고객 후기</Text>
            <Text style={styles.sectionSubtitle}>소담과 함께한 소상공인들의 이야기</Text>

            <View style={styles.testimonialContainer}>
                {testimonials.map(item => (
                    <View key={item.id} style={styles.testimonialCard}>
                        <View style={styles.testimonialHeader}>
                            <Image style={styles.testimonialImage}/>
                            {/*<Image source={item.image} style={styles.testimonialImage}/>*/}
                            <View>
                                <Text style={styles.testimonialName}>{item.name}</Text>
                                <Text style={styles.testimonialBusiness}>{item.business}</Text>
                            </View>
                        </View>
                        <Text style={styles.testimonialComment}>"{item.comment}"</Text>
                    </View>
                ))}
            </View>
        </View>
    );
};

const makeStyles = (c: ThemeColors) => StyleSheet.create({
    container: {
        width: '100%',
        backgroundColor: c.surface,
        padding: 30,
        marginVertical: 10,
        alignItems: 'center',
    },
    sectionTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: c.textPrimary,
        marginBottom: 5,
    },
    sectionSubtitle: {
        fontSize: 16,
        color: c.textSecondary,
        marginBottom: 30,
    },
    testimonialContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        maxWidth: 1200,
    },
    testimonialCard: {
        width: '30%',
        backgroundColor: c.surfaceSky,
        borderRadius: 10,
        padding: 20,
        elevation: 2,
    },
    testimonialHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    testimonialImage: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 10,
    },
    testimonialName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: c.textPrimary,
    },
    testimonialBusiness: {
        fontSize: 14,
        color: c.textSecondary,
    },
    testimonialComment: {
        fontSize: 14,
        color: c.textPrimary,
        lineHeight: 22,
        fontStyle: 'italic',
    },
});

export default Testimonials;
