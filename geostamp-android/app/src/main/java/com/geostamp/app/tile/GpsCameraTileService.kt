package com.geostamp.app.tile

import android.annotation.SuppressLint
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.location.LocationManager
import android.os.Build
import android.service.quicksettings.Tile
import android.service.quicksettings.TileService
import androidx.core.location.LocationManagerCompat
import com.geostamp.app.MainActivity

/**
 * Плитка в шторке уведомлений: один тап — камера с GPS. Если геолокация выключена,
 * приложение сразу покажет системный диалог включения GPS.
 */
class GpsCameraTileService : TileService() {

    override fun onStartListening() {
        val tile = qsTile ?: return
        val lm = getSystemService(Context.LOCATION_SERVICE) as LocationManager
        val on = LocationManagerCompat.isLocationEnabled(lm)
        tile.state = if (on) Tile.STATE_ACTIVE else Tile.STATE_INACTIVE
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) tile.subtitle = if (on) "GPS включён" else "GPS выключен"
        tile.updateTile()
    }

    @SuppressLint("StartActivityAndCollapseDeprecated")
    override fun onClick() {
        val intent = Intent(this, MainActivity::class.java)
            .setAction(MainActivity.ACTION_QUICK_PHOTO)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        if (Build.VERSION.SDK_INT >= 34) {
            val pi = PendingIntent.getActivity(this, 0, intent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
            startActivityAndCollapse(pi)
        } else {
            @Suppress("DEPRECATION")
            startActivityAndCollapse(intent)
        }
    }
}
