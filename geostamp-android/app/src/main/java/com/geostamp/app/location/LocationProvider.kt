package com.geostamp.app.location

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.location.Address
import android.location.Geocoder
import android.location.Location
import android.location.LocationManager
import android.os.Build
import android.os.Looper
import androidx.core.content.ContextCompat
import androidx.core.location.LocationManagerCompat
import com.google.android.gms.common.api.ResolvableApiException
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.LocationSettingsRequest
import com.google.android.gms.location.Priority
import com.geostamp.app.stamp.StampFormat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.flow.channelFlow
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.flowOn
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withContext
import kotlin.coroutines.resume

data class GeoAddress(val full: String, val locality: String?)

data class GeoFix(
    val location: Location? = null,
    val address: GeoAddress? = null,
    val gpsEnabled: Boolean = true,
    val permission: Boolean = false,
) {
    /** Свежая точная позиция: моложе 2 минут и точнее 50 м. */
    val isGood: Boolean
        get() = location != null && location.accuracy <= 50f &&
            System.currentTimeMillis() - location.time < 120_000
}

/**
 * Один общий поток геопозиции на всё приложение: активен, пока есть подписчики (экран камеры/главный),
 * и выключается через 5 с после ухода — батарея не тратится в фоне.
 */
class LocationProvider(private val context: Context, scope: CoroutineScope) {

    private val fused = LocationServices.getFusedLocationProviderClient(context)
    private val trigger = MutableStateFlow(0)

    private val request: LocationRequest =
        LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 2_000L)
            .setMinUpdateIntervalMillis(1_000L)
            .setWaitForAccurateLocation(false)
            .build()

    @OptIn(ExperimentalCoroutinesApi::class)
    val state: StateFlow<GeoFix> = trigger
        .flatMapLatest { if (hasPermission()) tracking() else flowOf(GeoFix(gpsEnabled = isGpsEnabled(), permission = false)) }
        .stateIn(scope, SharingStarted.WhileSubscribed(5_000), GeoFix(gpsEnabled = isGpsEnabled(), permission = hasPermission()))

    /** Перезапуск после выдачи разрешения / включения GPS / возврата на экран. */
    fun refresh() { trigger.value = trigger.value + 1 }

    fun hasPermission() = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
        ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED

    fun isGpsEnabled(): Boolean {
        val lm = context.getSystemService(Context.LOCATION_SERVICE) as LocationManager
        return LocationManagerCompat.isLocationEnabled(lm)
    }

    /**
     * Быстрое включение GPS: системный диалог «Включить геолокацию» в один тап (без перехода в настройки).
     * Возвращает исключение с resolution, если пользователю нужно подтвердить, иначе null (всё уже включено).
     */
    suspend fun checkGpsSettings(): ResolvableApiException? = try {
        LocationServices.getSettingsClient(context)
            .checkLocationSettings(LocationSettingsRequest.Builder().addLocationRequest(request).setAlwaysShow(true).build())
            .await()
        null
    } catch (e: ResolvableApiException) {
        e
    } catch (_: Exception) {
        null
    }

    private fun tracking(): Flow<GeoFix> = channelFlow {
        var last = GeoFix(gpsEnabled = isGpsEnabled(), permission = true)
        send(last)
        var geocodedAt: Location? = null
        updates().collect { loc ->
            last = last.copy(location = loc, gpsEnabled = isGpsEnabled())
            send(last)
            val prev = geocodedAt
            if (prev == null || prev.distanceTo(loc) > 40f) {
                geocodedAt = loc
                launch {
                    val a = geocode(loc.latitude, loc.longitude)
                    if (a != null) { last = last.copy(address = a); send(last) }
                }
            }
        }
    }.flowOn(Dispatchers.Main.immediate) // общий поток — без гонок за переменную last

    @SuppressLint("MissingPermission")
    private fun updates(): Flow<Location> = callbackFlow {
        fused.lastLocation.addOnSuccessListener { it?.let { l -> trySend(l) } }
        val cb = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                result.lastLocation?.let { trySend(it) }
            }
        }
        fused.requestLocationUpdates(request, cb, Looper.getMainLooper())
        awaitClose { fused.removeLocationUpdates(cb) }
    }

    suspend fun geocode(lat: Double, lon: Double): GeoAddress? = withContext(Dispatchers.IO) {
        if (!Geocoder.isPresent()) return@withContext null
        val g = Geocoder(context, StampFormat.RU)
        val list: List<Address> = runCatching {
            if (Build.VERSION.SDK_INT >= 33) {
                suspendCancellableCoroutine { cont ->
                    g.getFromLocation(lat, lon, 1, object : Geocoder.GeocodeListener {
                        override fun onGeocode(addresses: MutableList<Address>) { if (cont.isActive) cont.resume(addresses) }
                        override fun onError(errorMessage: String?) { if (cont.isActive) cont.resume(emptyList()) }
                    })
                }
            } else {
                @Suppress("DEPRECATION")
                g.getFromLocation(lat, lon, 1) ?: emptyList()
            }
        }.getOrDefault(emptyList())
        val a = list.firstOrNull() ?: return@withContext null
        val full = a.getAddressLine(0) ?: listOfNotNull(a.thoroughfare, a.subThoroughfare, a.locality).joinToString(", ")
        GeoAddress(full = full, locality = a.locality ?: a.subAdminArea ?: a.adminArea)
    }
}
