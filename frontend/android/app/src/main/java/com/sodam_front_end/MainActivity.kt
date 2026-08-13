package com.sodam_front_end

import android.os.Handler
import android.os.Looper
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.ReactApplication
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

    private val handler = Handler(Looper.getMainLooper())
    private var pendingHasFocus = false
    private val dispatchPendingWindowFocus = Runnable { dispatchWindowFocusWhenReady() }

    override fun getMainComponentName(): String = "Sodam_Front_End"

    override fun createReactActivityDelegate(): ReactActivityDelegate =
        DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        pendingHasFocus = hasFocus
        handler.removeCallbacks(dispatchPendingWindowFocus)
        dispatchWindowFocusWhenReady()
    }

    private fun dispatchWindowFocusWhenReady() {
        val reactContext = (application as ReactApplication).reactHost?.currentReactContext
        if (reactContext == null) {
            handler.postDelayed(dispatchPendingWindowFocus, 100)
            return
        }

        super.onWindowFocusChanged(pendingHasFocus)
    }

    override fun onDestroy() {
        handler.removeCallbacks(dispatchPendingWindowFocus)
        super.onDestroy()
    }
}
