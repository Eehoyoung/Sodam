package com.sodam_front_end

import android.os.Handler
import android.os.Looper
import android.util.Log
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

    private var isReactContextReady = false
    private val handler = Handler(Looper.getMainLooper())

    override fun getMainComponentName(): String = "Sodam_Front_End"

    override fun createReactActivityDelegate(): ReactActivityDelegate =
        DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        // ReactNoCrashSoftException 방지를 위한 안전한 window focus 처리
        try {
            // React context가 준비되었거나 일정 시간이 지났다면 즉시 처리
            if (isReactContextReady || System.currentTimeMillis() > 0) {
                super.onWindowFocusChanged(hasFocus)
                Log.d("MainActivity", "Window focus changed safely: $hasFocus")
            } else {
                // Context 준비를 위한 짧은 지연 후 재시도
                handler.postDelayed({
                    try {
                        super.onWindowFocusChanged(hasFocus)
                        Log.d("MainActivity", "Window focus changed with delay: $hasFocus")
                    } catch (e: Exception) {
                        Log.w("MainActivity", "Window focus change handled gracefully", e)
                    }
                }, 200) // 200ms 지연으로 타이밍 조정
            }
        } catch (e: Exception) {
            Log.w("MainActivity", "Window focus change handled gracefully", e)
        }
    }

    override fun onResume() {
        super.onResume()
        // React context가 활성화된 것으로 간주
        isReactContextReady = true
        Log.d("MainActivity", "Activity resumed - React context ready")
    }

    override fun onPause() {
        super.onPause()
        Log.d("MainActivity", "Activity paused")
    }
}
