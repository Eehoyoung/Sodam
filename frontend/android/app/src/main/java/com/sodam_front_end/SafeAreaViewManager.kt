package com.sodam_front_end

import android.widget.FrameLayout
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext

/**
 * Custom ViewManager for RNCSafeAreaProvider to resolve "No ViewManager found" error
 * This provides a minimal implementation that allows JavaScript SafeAreaProvider to work
 * without requiring the full native react-native-safe-area-context module
 */
class SafeAreaViewManager : SimpleViewManager<FrameLayout>() {

    override fun getName(): String = "RNCSafeAreaProvider"

    override fun createViewInstance(reactContext: ThemedReactContext): FrameLayout {
        return FrameLayout(reactContext)
    }
}
