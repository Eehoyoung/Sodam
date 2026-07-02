package com.sodam_front_end

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

/**
 * Custom ReactPackage for SafeArea functionality
 * This package provides the SafeAreaViewManager to resolve RNCSafeAreaProvider ViewManager issues
 */
class SafeAreaReactPackage : ReactPackage {

    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return emptyList()
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return listOf(SafeAreaViewManager())
    }
}
