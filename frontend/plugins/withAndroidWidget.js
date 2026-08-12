const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

const PACKAGE = 'com.roisoyboy.psycholyrics';
const WIDGET_CLASS = '.WordWidget';

// ── Kotlin source ─────────────────────────────────────────────────────────────

const WORD_WIDGET_KT = `package ${PACKAGE}

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.widget.RemoteViews

class WordWidget : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        appWidgetIds.forEach { id -> updateWidget(context, appWidgetManager, id) }
    }

    override fun onEnabled(context: Context) {
        // Register a SharedPreferences listener so the widget refreshes immediately
        // when the React Native app writes new word data.
        val prefs = context.getSharedPreferences(PREFS_FILE, Context.MODE_PRIVATE)
        prefs.registerOnSharedPreferenceChangeListener { _, key ->
            if (key == KEY) {
                val manager = AppWidgetManager.getInstance(context)
                val ids = manager.getAppWidgetIds(
                    android.content.ComponentName(context, WordWidget::class.java)
                )
                ids.forEach { id -> updateWidget(context, manager, id) }
            }
        }
    }

    companion object {
        const val PREFS_FILE = "widget_prefs"
        const val KEY = "lyriclearn_widget_word"

        fun updateWidget(context: Context, appWidgetManager: AppWidgetManager, widgetId: Int) {
            val prefs: SharedPreferences =
                context.getSharedPreferences(PREFS_FILE, Context.MODE_PRIVATE)

            val raw = prefs.getString(KEY, null)
            val word = raw?.let { parseField(it, "word") } ?: "Persevere"
            val hebrew = raw?.let { parseField(it, "hebrewShort") } ?: "להתמיד"
            val pos = raw?.let { parseField(it, "partOfSpeech") } ?: ""
            val tier = raw?.let { parseField(it, "frequencyTier") } ?: "MEDIUM"
            val isPinned = raw?.contains("\\"isPinned\\":true") == true

            val views = RemoteViews(context.packageName, R.layout.word_widget)
            views.setTextViewText(R.id.widget_word, word + if (isPinned) "  📌" else "")
            views.setTextViewText(R.id.widget_hebrew, hebrew)
            views.setTextViewText(R.id.widget_pos, pos)

            val badgeColor = when (tier) {
                "HIGH" -> 0xFFF76A8A.toInt()
                "LOW" -> 0xFF6AF7C8.toInt()
                else -> 0xFFFFC832.toInt()
            }
            views.setTextColor(R.id.widget_tier, badgeColor)
            views.setTextViewText(R.id.widget_tier, tier)

            // Tap widget → open app
            val intent = Intent(context, MainActivity::class.java).apply {
                action = Intent.ACTION_MAIN
                addCategory(Intent.CATEGORY_LAUNCHER)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED
            }
            val pendingIntent = PendingIntent.getActivity(
                context, 0, intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_root, pendingIntent)

            appWidgetManager.updateAppWidget(widgetId, views)
        }

        // Minimal JSON field extractor — avoids pulling in a JSON lib
        private fun parseField(json: String, key: String): String? {
            val pattern = Regex("\\"$key\\":\\"([^\\"]*)\\"")
            return pattern.find(json)?.groupValues?.get(1)
        }
    }
}
`;

// ── Layout XML ────────────────────────────────────────────────────────────────

const WORD_WIDGET_LAYOUT_XML = `<?xml version="1.0" encoding="utf-8"?>
<FrameLayout
    xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/widget_root"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:padding="12dp"
    android:background="@drawable/widget_background">

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_gravity="center_vertical"
        android:orientation="vertical">

        <TextView
            android:id="@+id/widget_word"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:text="Persevere"
            android:textColor="#F0EEFF"
            android:textSize="22sp"
            android:textStyle="bold"
            android:maxLines="1"
            android:ellipsize="end" />

        <LinearLayout
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:orientation="horizontal"
            android:layout_marginTop="3dp"
            android:gravity="center_vertical">

            <TextView
                android:id="@+id/widget_pos"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="verb"
                android:textColor="#6AF7C8"
                android:textSize="12sp"
                android:textStyle="italic" />

            <TextView
                android:id="@+id/widget_tier"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:layout_marginStart="8dp"
                android:text="MEDIUM"
                android:textSize="10sp"
                android:textAllCaps="true" />

        </LinearLayout>

        <TextView
            android:id="@+id/widget_hebrew"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:layout_marginTop="6dp"
            android:text="להתמיד"
            android:textColor="#F0EEFF"
            android:textSize="16sp"
            android:gravity="end"
            android:layoutDirection="rtl" />

    </LinearLayout>

</FrameLayout>
`;

// ── Widget info XML ───────────────────────────────────────────────────────────

const WORD_WIDGET_INFO_XML = `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider
    xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="180dp"
    android:minHeight="110dp"
    android:targetCellWidth="3"
    android:targetCellHeight="2"
    android:updatePeriodMillis="0"
    android:initialLayout="@layout/word_widget"
    android:resizeMode="horizontal|vertical"
    android:widgetCategory="home_screen" />
`;

// ── Background drawable ───────────────────────────────────────────────────────

const WIDGET_BACKGROUND_XML = `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="rectangle">
    <solid android:color="#1C1C28" />
    <corners android:radius="16dp" />
</shape>
`;

// ── Plugin ────────────────────────────────────────────────────────────────────

function withAndroidWidget(config) {
  // 1. Register receiver in AndroidManifest.xml
  config = withAndroidManifest(config, (c) => {
    const app = c.modResults.manifest.application[0];
    if (!app.receiver) app.receiver = [];

    const alreadyAdded = app.receiver.some(
      (r) => r.$?.['android:name'] === WIDGET_CLASS
    );
    if (!alreadyAdded) {
      app.receiver.push({
        $: {
          'android:name': WIDGET_CLASS,
          'android:exported': 'true',
          'android:label': 'LyricLearn Word',
        },
        'intent-filter': [
          {
            action: [
              { $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' } },
            ],
          },
        ],
        'meta-data': [
          {
            $: {
              'android:name': 'android.appwidget.provider',
              'android:resource': '@xml/word_widget_info',
            },
          },
        ],
      });
    }
    return c;
  });

  // 2. Write native files into the android source tree
  config = withDangerousMod(config, [
    'android',
    async (c) => {
      const root = c.modRequest.platformProjectRoot; // android/

      const javaDir = path.join(root, 'app', 'src', 'main', 'java', ...PACKAGE.split('.'));
      const layoutDir = path.join(root, 'app', 'src', 'main', 'res', 'layout');
      const xmlDir = path.join(root, 'app', 'src', 'main', 'res', 'xml');
      const drawableDir = path.join(root, 'app', 'src', 'main', 'res', 'drawable');

      for (const dir of [javaDir, layoutDir, xmlDir, drawableDir]) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(path.join(javaDir, 'WordWidget.kt'), WORD_WIDGET_KT);
      fs.writeFileSync(path.join(layoutDir, 'word_widget.xml'), WORD_WIDGET_LAYOUT_XML);
      fs.writeFileSync(path.join(xmlDir, 'word_widget_info.xml'), WORD_WIDGET_INFO_XML);
      fs.writeFileSync(path.join(drawableDir, 'widget_background.xml'), WIDGET_BACKGROUND_XML);

      return c;
    },
  ]);

  return config;
}

module.exports = withAndroidWidget;
