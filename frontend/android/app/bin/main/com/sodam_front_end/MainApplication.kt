package com.sodam_front_end

import android.app.Application
import android.app.AlarmManager
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import androidx.core.content.ContextCompat
import com.facebook.react.*
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.react.soloader.OpenSourceMergedSoMapping
import com.facebook.soloader.SoLoader
import com.oblador.vectoricons.VectorIconsPackage
import com.swmansion.reanimated.ReanimatedPackage;
import com.BV.LinearGradient.LinearGradientPackage;

class MainApplication : Application(), ReactApplication {


    private val mReactNativeHost: ReactNativeHost? by lazy {
        if (!BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
            object : DefaultReactNativeHost(this) {
                override fun getPackages(): List<ReactPackage> =
                    PackageList(this).packages

                override fun getJSMainModuleName(): String = "index"

                override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

                override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
            }
        } else {
            null
        }
    }


    override val reactNativeHost: ReactNativeHost
        get() = mReactNativeHost ?: throw IllegalStateException(
            "ReactNativeHost should not be used with New Architecture enabled. Use ReactHost instead."
        )

    override val reactHost: ReactHost
        get() = getDefaultReactHost(
            applicationContext,
            if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
                object : DefaultReactNativeHost(this) {
                    override fun getPackages(): List<ReactPackage> =
                        PackageList(this).packages

                    override fun getJSMainModuleName(): String = "index"

                    override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

                    override val isNewArchEnabled: Boolean = true
                }
            } else {
                mReactNativeHost!!
            }
        )


    override fun onCreate() {
        super.onCreate()

        // 정확한 알람 권한 상태 체크 및 로깅 (Android 15 호환)
        checkExactAlarmPermissions()

        SoLoader.init(this, OpenSourceMergedSoMapping)
        if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
            load()
        }
    }

    /**
     * Android 15 호환 정확한 알람 권한 상태 체크
     * "lost permission to set exact alarms" 에러 방지를 위한 권한 모니터링
     */
    private fun checkExactAlarmPermissions() {
        try {
            Log.d("MainApplication", "=== EXACT ALARM PERMISSIONS CHECK START ===")

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val alarmManager = getSystemService(Context.ALARM_SERVICE) as AlarmManager
                val canScheduleExactAlarms = alarmManager.canScheduleExactAlarms()
                Log.i("MainApplication", "AlarmManager.canScheduleExactAlarms(): $canScheduleExactAlarms")
                if (!canScheduleExactAlarms) {
                    Log.w("MainApplication", "⚠️ Cannot schedule exact alarms - guide user to special app access screen")
                } else {
                    Log.i("MainApplication", "✅ Exact alarm scheduling is available")
                }
            } else {
                Log.i("MainApplication", "Device API level < 31, exact alarm permissions not required")
            }

            Log.d("MainApplication", "=== EXACT ALARM PERMISSIONS CHECK END ===")
        } catch (e: Exception) {
            Log.e("MainApplication", "Error checking exact alarm permissions: ${e.message}")
            e.printStackTrace()
        }
    }

}
