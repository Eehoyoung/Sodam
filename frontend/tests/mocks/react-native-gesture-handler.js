// Lightweight stub for react-native-gesture-handler in Jest.
// Sodam: 컴포넌트 테스트에서 실제 제스처 동작은 검증하지 않음 — 명목상 mount 가능하면 충분.
module.exports = {
    GestureHandlerRootView: ({children}) => children,
    PanGestureHandler: ({children}) => children,
    TapGestureHandler: ({children}) => children,
    LongPressGestureHandler: ({children}) => children,
    State: {BEGAN: 0, ACTIVE: 1, END: 2, CANCELLED: 3, FAILED: 4, UNDETERMINED: 5},
    Directions: {UP: 1, DOWN: 2, LEFT: 4, RIGHT: 8},
    gestureHandlerRootHOC: (Component) => Component,
    Swipeable: ({children}) => children,
    DrawerLayout: ({children}) => children,
    ScrollView: 'ScrollView',
    Switch: 'Switch',
    TextInput: 'TextInput',
    TouchableHighlight: 'TouchableHighlight',
    TouchableNativeFeedback: 'TouchableNativeFeedback',
    TouchableOpacity: 'TouchableOpacity',
    TouchableWithoutFeedback: 'TouchableWithoutFeedback',
    FlatList: 'FlatList',
};
