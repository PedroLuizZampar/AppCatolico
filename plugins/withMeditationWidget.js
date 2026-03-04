/**
 * Expo Config Plugin — Widget de Meditação Rápida (Android)
 *
 * Injeta todos os arquivos nativos necessários durante `expo prebuild`.
 */

const {
  withAndroidManifest,
  withDangerousMod,
} = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

// ─── helpers ─────────────────────────────────────────────────────────────────

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function writeIfChanged(filePath, content) {
  ensureDir(path.dirname(filePath));
  if (fs.existsSync(filePath) && fs.readFileSync(filePath, "utf-8") === content) return;
  fs.writeFileSync(filePath, content, "utf-8");
}

// ─── Manifest ────────────────────────────────────────────────────────────────

function addWidgetToManifest(config) {
  return withAndroidManifest(config, async (cfg) => {
    const manifest = cfg.modResults;
    const app = manifest.manifest.application?.[0];
    if (!app) return cfg;

    // Receiver do widget
    const receiverName = ".MeditationWidget";
    const receivers = (app.receiver = app.receiver || []);
    if (!receivers.find((r) => r.$?.["android:name"] === receiverName)) {
      receivers.push({
        $: {
          "android:name": receiverName,
          "android:exported": "true",
          "android:label": "Meditação Rápida",
        },
        "intent-filter": [
          {
            action: [{ $: { "android:name": "android.appwidget.action.APPWIDGET_UPDATE" } }],
          },
          {
            action: [{ $: { "android:name": "com.pedro_luiz_zampar.AppCatolico.WIDGET_RELOAD" } }],
          },
        ],
        "meta-data": [
          {
            $: {
              "android:name": "android.appwidget.provider",
              "android:resource": "@xml/meditation_widget_info",
            },
          },
        ],
      });
    }

    return cfg;
  });
}

// ─── Dangerous mod — grava arquivos nativos ──────────────────────────────────

function writeNativeFiles(config) {
  return withDangerousMod(config, [
    "android",
    async (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot;
      const androidRoot = path.join(projectRoot, "android");
      const pkg = "com.pedro_luiz_zampar.AppCatolico";
      const pkgPath = pkg.replace(/\./g, "/");
      const srcMain = path.join(androidRoot, "app", "src", "main");
      const javaDir = path.join(srcMain, "java", pkgPath);
      const resDir = path.join(srcMain, "res");

      // ─── Kotlin: MeditationWidget.kt ──────────────────────────────
      writeIfChanged(
        path.join(javaDir, "MeditationWidget.kt"),
        KOTLIN_WIDGET(pkg)
      );

      // ─── Kotlin: MeditationWidgetData.kt ──────────────────────────
      writeIfChanged(
        path.join(javaDir, "MeditationWidgetData.kt"),
        KOTLIN_DATA(pkg)
      );

      // ─── XML: layout ──────────────────────────────────────────────
      writeIfChanged(
        path.join(resDir, "layout", "meditation_widget.xml"),
        XML_LAYOUT
      );

      // ─── XML: widget info ─────────────────────────────────────────
      writeIfChanged(
        path.join(resDir, "xml", "meditation_widget_info.xml"),
        XML_WIDGET_INFO
      );

      // ─── Drawable: widget background ──────────────────────────────
      writeIfChanged(
        path.join(resDir, "drawable", "widget_background.xml"),
        XML_DRAWABLE_BG
      );

      writeIfChanged(
        path.join(resDir, "drawable", "widget_reload_bg.xml"),
        XML_DRAWABLE_RELOAD
      );

      // ─── Kotlin: MeditationWidgetModule.kt (ponte RN → widget) ───
      writeIfChanged(
        path.join(javaDir, "MeditationWidgetModule.kt"),
        KOTLIN_MODULE(pkg)
      );

      // ─── Kotlin: MeditationWidgetPackage.kt ───────────────────────
      writeIfChanged(
        path.join(javaDir, "MeditationWidgetPackage.kt"),
        KOTLIN_PACKAGE(pkg)
      );

      // ─── Patch MainApplication para registrar o Package ───────────
      const mainAppPath = path.join(javaDir, "MainApplication.kt");
      if (fs.existsSync(mainAppPath)) {
        let mainApp = fs.readFileSync(mainAppPath, "utf-8");
        const packageImport = `import ${pkg}.MeditationWidgetPackage`;
        const packageAdd = `packages.add(MeditationWidgetPackage())`;

        if (!mainApp.includes("MeditationWidgetPackage")) {
          // Adiciona import
          mainApp = mainApp.replace(
            /(package\s+[^\n]+\n)/,
            `$1\n${packageImport}\n`
          );
          // Adiciona ao getPackages
          mainApp = mainApp.replace(
            /(override fun getPackages\(\)[\s\S]*?val packages\s*=\s*PackageList\(this\)\.packages)/,
            `$1\n            ${packageAdd}`
          );
          fs.writeFileSync(mainAppPath, mainApp, "utf-8");
        }
      }

      return cfg;
    },
  ]);
}

// ─── Kotlin source strings ───────────────────────────────────────────────────

const KOTLIN_WIDGET = (pkg) => `package ${pkg}

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews

class MeditationWidget : AppWidgetProvider() {

    companion object {
        const val ACTION_RELOAD = "${pkg}.WIDGET_RELOAD"
    }

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == ACTION_RELOAD) {
            // Pega um novo parágrafo aleatório
            MeditationWidgetData.refreshRandom(context)
            // Atualiza todos os widgets
            val mgr = AppWidgetManager.getInstance(context)
            val ids = mgr.getAppWidgetIds(ComponentName(context, MeditationWidget::class.java))
            for (id in ids) {
                updateWidget(context, mgr, id)
            }
        }
    }

    private fun updateWidget(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int
    ) {
        val data = MeditationWidgetData.getCurrent(context)

        val views = RemoteViews(context.packageName, R.layout.meditation_widget)
        views.setTextViewText(R.id.widget_book_title, data.bookTitle)
        views.setTextViewText(R.id.widget_text, data.text)
        views.setTextViewText(R.id.widget_reference, data.reference)

        // Intent de reload
        val reloadIntent = Intent(context, MeditationWidget::class.java).apply {
            action = ACTION_RELOAD
        }
        val reloadPending = PendingIntent.getBroadcast(
            context, 0, reloadIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.widget_reload_button, reloadPending)

        // Intent para abrir o app
        val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
        if (launchIntent != null) {
            val openPending = PendingIntent.getActivity(
                context, 1, launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_content_area, openPending)
        }

        appWidgetManager.updateAppWidget(appWidgetId, views)
    }
}
`;

const KOTLIN_DATA = (pkg) => `package ${pkg}

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

data class MeditationEntry(
    val bookTitle: String,
    val text: String,
    val reference: String,
)

object MeditationWidgetData {

    private const val PREFS_NAME = "meditation_widget_prefs"
    private const val KEY_BOOK = "current_book"
    private const val KEY_TEXT = "current_text"
    private const val KEY_REF = "current_ref"
    private const val KEY_PARAGRAPHS = "paragraphs_json"

    /** Retorna a meditação atual (ou gera uma nova se não existir). */
    fun getCurrent(context: Context): MeditationEntry {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val book = prefs.getString(KEY_BOOK, null)
        val text = prefs.getString(KEY_TEXT, null)
        val ref = prefs.getString(KEY_REF, null)

        if (book != null && text != null && ref != null) {
            return MeditationEntry(book, text, ref)
        }

        return refreshRandom(context)
    }

    /** Escolhe um parágrafo aleatório e persiste. */
    fun refreshRandom(context: Context): MeditationEntry {
        val paragraphs = loadParagraphs(context)
        val entry = if (paragraphs.isNotEmpty()) {
            paragraphs.random()
        } else {
            MeditationEntry(
                "Sanctus",
                "Puxe para baixo para carregar uma nova meditação.",
                "Abra o app para configurar"
            )
        }

        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_BOOK, entry.bookTitle)
            .putString(KEY_TEXT, entry.text)
            .putString(KEY_REF, entry.reference)
            .apply()

        return entry
    }

    /** Salva a lista de parágrafos vindos do React Native. */
    fun saveParagraphs(context: Context, json: String) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_PARAGRAPHS, json)
            .apply()
    }

    private fun loadParagraphs(context: Context): List<MeditationEntry> {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val raw = prefs.getString(KEY_PARAGRAPHS, null) ?: return emptyList()
        return try {
            val arr = JSONArray(raw)
            (0 until arr.length()).map { i ->
                val obj = arr.getJSONObject(i)
                MeditationEntry(
                    bookTitle = obj.optString("bookTitle", ""),
                    text = obj.optString("text", ""),
                    reference = obj.optString("reference", ""),
                )
            }
        } catch (_: Exception) {
            emptyList()
        }
    }
}
`;

const KOTLIN_MODULE = (pkg) => `package ${pkg}

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Intent
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class MeditationWidgetModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "MeditationWidgetModule"

    @ReactMethod
    fun syncParagraphs(json: String, promise: Promise) {
        try {
            MeditationWidgetData.saveParagraphs(reactApplicationContext, json)

            // Também atualiza o widget atual se não houver nenhum salvo
            MeditationWidgetData.refreshRandom(reactApplicationContext)

            // Força atualização visual de todos os widgets
            val mgr = AppWidgetManager.getInstance(reactApplicationContext)
            val ids = mgr.getAppWidgetIds(
                ComponentName(reactApplicationContext, MeditationWidget::class.java)
            )
            if (ids.isNotEmpty()) {
                val intent = Intent(reactApplicationContext, MeditationWidget::class.java).apply {
                    action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                    putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
                }
                reactApplicationContext.sendBroadcast(intent)
            }

            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("WIDGET_SYNC_ERROR", e.message, e)
        }
    }
}
`;

const KOTLIN_PACKAGE = (pkg) => `package ${pkg}

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class MeditationWidgetPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(MeditationWidgetModule(reactContext))
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}
`;

// ─── XML strings ─────────────────────────────────────────────────────────────

const XML_LAYOUT = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/widget_root"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="@drawable/widget_background"
    android:orientation="vertical"
    android:padding="16dp">

    <!-- Área clicável que abre o app -->
    <LinearLayout
        android:id="@+id/widget_content_area"
        android:layout_width="match_parent"
        android:layout_height="0dp"
        android:layout_weight="1"
        android:orientation="vertical">

        <!-- Título do livro -->
        <TextView
            android:id="@+id/widget_book_title"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:text="Meditação Rápida"
            android:textColor="#4A7BA7"
            android:textSize="13sp"
            android:textStyle="bold"
            android:letterSpacing="0.05"
            android:textAllCaps="true"
            android:maxLines="1"
            android:ellipsize="end" />

        <!-- Separador -->
        <View
            android:layout_width="40dp"
            android:layout_height="2dp"
            android:layout_marginTop="8dp"
            android:layout_marginBottom="10dp"
            android:background="#4A7BA7" />

        <!-- Texto da meditação -->
        <TextView
            android:id="@+id/widget_text"
            android:layout_width="match_parent"
            android:layout_height="0dp"
            android:layout_weight="1"
            android:text="Abra o app para carregar meditações."
            android:textColor="#1A1A1A"
            android:textSize="14sp"
            android:lineSpacingMultiplier="1.4"
            android:maxLines="8"
            android:ellipsize="end"
            android:gravity="start" />

        <!-- Referência -->
        <TextView
            android:id="@+id/widget_reference"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:layout_marginTop="8dp"
            android:text=""
            android:textColor="#8A8A8A"
            android:textSize="11sp"
            android:textStyle="italic"
            android:maxLines="1"
            android:ellipsize="end" />
    </LinearLayout>

    <!-- Botão de reload -->
    <LinearLayout
        android:id="@+id/widget_reload_button"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_marginTop="10dp"
        android:background="@drawable/widget_reload_bg"
        android:gravity="center"
        android:orientation="horizontal"
        android:paddingVertical="8dp">

        <TextView
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="↻"
            android:textColor="#4A7BA7"
            android:textSize="16sp"
            android:textStyle="bold"
            android:layout_marginEnd="6dp" />

        <TextView
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="Nova meditação"
            android:textColor="#4A7BA7"
            android:textSize="12sp"
            android:textStyle="bold" />
    </LinearLayout>
</LinearLayout>
`;

const XML_WIDGET_INFO = `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:initialLayout="@layout/meditation_widget"
    android:minWidth="250dp"
    android:minHeight="180dp"
    android:resizeMode="horizontal|vertical"
    android:updatePeriodMillis="3600000"
    android:widgetCategory="home_screen"
    android:description="@string/app_name" />
`;

const XML_DRAWABLE_BG = `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="rectangle">
    <solid android:color="#F7F8FA" />
    <corners android:radius="16dp" />
    <stroke
        android:width="1dp"
        android:color="#D5DCE3" />
</shape>
`;

const XML_DRAWABLE_RELOAD = `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="rectangle">
    <solid android:color="#EBF2F9" />
    <corners android:radius="8dp" />
</shape>
`;

// ─── Combina tudo ────────────────────────────────────────────────────────────

module.exports = function withMeditationWidget(config) {
  config = addWidgetToManifest(config);
  config = writeNativeFiles(config);
  return config;
};
