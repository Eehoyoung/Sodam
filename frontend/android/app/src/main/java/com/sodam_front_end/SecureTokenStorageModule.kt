package com.sodam_front_end

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.nio.charset.StandardCharsets
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/** Android Keystore 키로 bearer credential만 암호화해 저장하는 RN bridge. */
class SecureTokenStorageModule(
    private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val MODULE_NAME = "SodamSecureTokenStorage"
        private const val KEYSTORE_PROVIDER = "AndroidKeyStore"
        private const val KEY_ALIAS = "sodam_secure_token_store_v1"
        private const val PREFERENCES_NAME = "sodam_secure_tokens"
        private const val CIPHER_TRANSFORMATION = "AES/GCM/NoPadding"
        private const val FORMAT_PREFIX = "v1"
        private const val GCM_TAG_BITS = 128
        private val ALLOWED_KEYS = setOf("accessToken", "refreshToken", "offlineAttendanceQueue")
    }

    override fun getName(): String = MODULE_NAME

    @ReactMethod
    fun getItem(key: String, promise: Promise) {
        try {
            requireAllowedKey(key)
            val stored = preferences().getString(key, null)
            promise.resolve(stored?.let(::decrypt))
        } catch (error: Exception) {
            promise.reject("SECURE_STORAGE_READ_FAILED", "Secure token storage read failed", error)
        }
    }

    @ReactMethod
    fun setItem(key: String, value: String, promise: Promise) {
        try {
            requireAllowedKey(key)
            val committed = preferences().edit().putString(key, encrypt(value)).commit()
            if (!committed) {
                throw IllegalStateException("Secure token storage write was not committed")
            }
            promise.resolve(null)
        } catch (error: Exception) {
            promise.reject("SECURE_STORAGE_WRITE_FAILED", "Secure token storage write failed", error)
        }
    }

    @ReactMethod
    fun removeItem(key: String, promise: Promise) {
        try {
            requireAllowedKey(key)
            val committed = preferences().edit().remove(key).commit()
            if (!committed) {
                throw IllegalStateException("Secure token storage remove was not committed")
            }
            promise.resolve(null)
        } catch (error: Exception) {
            promise.reject("SECURE_STORAGE_REMOVE_FAILED", "Secure token storage remove failed", error)
        }
    }

    private fun preferences() = reactContext.getSharedPreferences(
        PREFERENCES_NAME,
        Context.MODE_PRIVATE,
    )

    private fun requireAllowedKey(key: String) {
        require(key in ALLOWED_KEYS) { "Unsupported secure token key" }
    }

    private fun encrypt(value: String): String {
        val cipher = Cipher.getInstance(CIPHER_TRANSFORMATION)
        cipher.init(Cipher.ENCRYPT_MODE, secretKey())
        val ciphertext = cipher.doFinal(value.toByteArray(StandardCharsets.UTF_8))
        return listOf(
            FORMAT_PREFIX,
            Base64.encodeToString(cipher.iv, Base64.NO_WRAP),
            Base64.encodeToString(ciphertext, Base64.NO_WRAP),
        ).joinToString(":")
    }

    private fun decrypt(stored: String): String {
        val parts = stored.split(":")
        require(parts.size == 3 && parts[0] == FORMAT_PREFIX) { "Invalid secure token storage format" }
        val iv = Base64.decode(parts[1], Base64.NO_WRAP)
        val ciphertext = Base64.decode(parts[2], Base64.NO_WRAP)
        val cipher = Cipher.getInstance(CIPHER_TRANSFORMATION)
        cipher.init(Cipher.DECRYPT_MODE, secretKey(), GCMParameterSpec(GCM_TAG_BITS, iv))
        return String(cipher.doFinal(ciphertext), StandardCharsets.UTF_8)
    }

    private fun secretKey(): SecretKey {
        val keyStore = KeyStore.getInstance(KEYSTORE_PROVIDER).apply { load(null) }
        val existing = keyStore.getKey(KEY_ALIAS, null)
        if (existing is SecretKey) {
            return existing
        }

        val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, KEYSTORE_PROVIDER)
        val spec = KeyGenParameterSpec.Builder(
            KEY_ALIAS,
            KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT,
        )
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setRandomizedEncryptionRequired(true)
            .build()
        generator.init(spec)
        return generator.generateKey()
    }
}
