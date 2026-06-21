package com.example.vruttaant.service

import com.example.mobile_app.BuildConfig
import com.example.vruttaant.data.AuthRepository
import com.example.vruttaant.data.api.NewsApiService
import com.example.vruttaant.data.model.DeviceRegisterRequest
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import kotlinx.serialization.json.Json

class MyFirebaseMessagingService : FirebaseMessagingService() {

    override fun onNewToken(token: String) {
        super.onNewToken(token)

        val authRepository = AuthRepository(applicationContext)
        val accessToken = authRepository.accessToken
        if (!accessToken.isNullOrEmpty()) {
            val baseUrl = BuildConfig.API_BASE_URL
            CoroutineScope(Dispatchers.IO).launch {
                try {
                    val client = OkHttpClient.Builder().addInterceptor { chain ->
                        chain.proceed(
                            chain.request().newBuilder()
                                .addHeader("Authorization", "Bearer $accessToken")
                                .build()
                        )
                    }.build()

                    val json = Json { ignoreUnknownKeys = true }
                    val retrofit = Retrofit.Builder()
                        .baseUrl(baseUrl)
                        .client(client)
                        .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
                        .build()

                    val api = retrofit.create(NewsApiService::class.java)
                    api.registerNotificationDevice(
                        DeviceRegisterRequest(
                            token = token,
                            platform = "android",
                            deviceName = "Android Native Device"
                        )
                    )
                } catch (e: Exception) {
                    // Ignore registration errors
                }
            }
        }
    }

    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)
    }
}
