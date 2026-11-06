[English](README.md) · **Deutsch** · [中文](README.zh.md) · [日本語](README.ja.md) · [Español](README.es.md) · [Français](README.fr.md)

# Garmin Health Sync

**Ein Begleiter für deine Daily Notes.** Garmin Health Sync bringt die Zahlen, auf die es ankommt, von deiner Garmin-Uhr in deine Obsidian Daily Notes und zeigt dir auf Wunsch, wie es dir im Vergleich zu deiner eigenen Normalität geht. Es ist keine Kopie von Garmin Connect: Ziel ist, dir bei den richtigen Entscheidungen für den Tag zu helfen.

**Zwei Arten, es zu nutzen**

- **Einfach halten.** Melde dich an und schalte die gewünschten Messwerte ein. Sie landen als Properties in deinen Daily Notes, die du mit Dataview abfragen kannst – die Auswertung machst du selbst.
- **Visualisierungen neben deinen Notizen.** Schalte in den Einstellungen das **Seitenpanel** ein: Karten zu Bereitschaft, Erholung, Schlaf, Energie, Bewegung und Training, eingeordnet in deinen eigenen üblichen Bereich. Die Glühbirne auf jeder Karte sagt, was deine Daten heute nahelegen. [Was jede Karte zeigt und wie sie berechnet wird](docs/panel-cards.md).

<p>
<img src="docs/screenshots/panel-today.png" width="280" alt="Bereitschafts- und Erholungskarten">
<img src="docs/screenshots/panel-insights.png" width="280" alt="Was deine Daten nahelegen, unter der Glühbirne">
<img src="docs/screenshots/panel-today-dark.png" width="280" alt="Dieselben Karten in einem dunklen Theme">
</p>

> **Funktioniert auf Desktop und Mobilgeräten** (Windows, macOS, Linux, iOS, Android). Dieses Plugin nutzt Garmins interne API — es gibt keine offizielle Drittanbieter-API. Du meldest dich mit deiner Garmin-E-Mail und deinem Passwort an (bei Bestätigung in zwei Schritten zusätzlich mit dem Bestätigungscode). Blockiert Garmin diesen Versuch, steht eine alternative Browser-Anmeldung zur Verfügung.

## Dokumentation

- [Einstellungen](docs/settings.md) — jede Einstellung
- [Messwerte](docs/metrics.md) — jede Property, die in deine Notizen geschrieben wird
- [Karten des Seitenpanels](docs/panel-cards.md) — was jede Karte zeigt, bei welcher Tagesentscheidung sie hilft und wie sie berechnet wird
- [Deutungen unter der Glühbirne](docs/panel-insights.md) — wann jede Aussage erscheint und worauf sie beruht
- [Verlaufsnotizen und Backfill](docs/history.md) — wie der Verlauf geführt und aufgebaut wird
- [Persönliches Bestes](docs/personal-best.md) — wie die Markierung der besten Tage und der Rang unter all deinen Tagen berechnet werden
- [Fehlersuche](docs/troubleshooting.md) — Anmeldung, fehlende Messwerte, Panel, Notizen und Backfill
- [Änderungsprotokoll](CHANGELOG.md) — was sich in jeder Version geändert hat

## Funktionen

- **Auto-Sync beim Start** — prüft die letzten 7 Tage und ergänzt fehlende Gesundheitsdaten
- **Auf-Note-warten-Modus** — der Auto-Sync kann optional warten, bis ein anderes Tool (Templater, Calendar, ein externer Sync) die Daily Note anlegt, statt sie selbst zu erstellen
- **Manueller Sync** — synchronisiere jede geöffnete Daily Note über die Befehlspalette
- **Backfill** — Massen-Sync eines Zeitraums (z.B. die letzten 3 Monate)
- **30+ Metriken** — Schritte, Schlaf-Score, HRV, Stress, Body Battery, SpO2, Gewicht und mehr
- **Aktivitäts-Tracking** — jedes Workout erscheint als gut lesbare Zusammenfassung
- **Workout-Standort** — per Reverse-Geocoding ermittelter Ortsname deiner ersten GPS-Aktivität
- **Intelligente Erkennung** — erkennt automatisch deinen Daily-Notes-Pfad und das Format aus Periodic Notes oder dem eingebauten Daily Notes Plugin
- **Unterordner-Unterstützung** — findet bestehende Daily Notes in verschachtelten Ordnern (z.B. `Journal/2024-07/`) und legt datumsbasierte Unterordner an, wenn das Dateinamen-Format ein `/` enthält (z.B. `YYYY/YYYY-MM-DD` → `Journal/2026/2026-08-04.md`)
- **Automatische Spracherkennung** — die UI-Sprache wird aus deiner Obsidian-Sprache übernommen (EN, DE, ZH, JA, ES, FR)
- **Optionale strukturierte Daten** — maschinenlesbares `trainings`-Feld für erweiterte Dataview-Abfragen
- **Property-Präfix** — fügt optional allen Frontmatter-Properties das Präfix `ohs_` hinzu, um Namenskonflikte mit anderen Plugins zu vermeiden
- **Lifestyle-Protokoll (Gewohnheiten)** — synchronisiert optional die Gewohnheiten, die du in Garmin Connect protokollierst (Ja/Nein oder eine Anzahl wie Tassen Kaffee), als `lifestyle_<name>`-Properties; die Karte Gewohnheiten im Seitenpanel zeigt jede Gewohnheit und, sobald genug Daten da sind, wie HRV und Ruhepuls in der Nacht danach aussehen
- **Gesundheits-Seitenpanel** — optionale rechte Seitenleiste mit Karten für Erholung, Schlaf, Energie, Bewegung, Fitness und Training im Vergleich zu deinem eigenen üblichen Bereich; tippe auf die Glühbirne einer Karte, um zu sehen, was deine Daten nahelegen und wie sie berechnet ist; einschalten unter **Einstellungen → Garmin Health Sync → Seitenpanel**
- **Verlaufsnotizen** — optional jeden geholten Tag in kleinen Monatsnotizen in Markdown speichern, damit das Panel auch für Tage ohne Daily Note funktioniert und die Daten mit deinem Vault synchronisiert werden
- **Eigenschaften der Daily Notes** — den Eigenschaftenblock beim Öffnen einklappen oder die Garmin-Eigenschaften ausblenden, die das Panel schon zeigt

## Frontmatter-Ausgabe

### Metriken

```yaml
---
steps: 15185
resting_hr: 69
sleep_score: 81
sleep_duration: 7h 43min
hrv: 39
stress: 30
vo2_max: 48
workout_location: Bad Honnef, Deutschland
---
```

**Body Battery:** `body_battery` ist Garmins *charged*-Wert, also die Summe aller Body-Battery-Zuwächse des Tages (überwiegend die nächtliche Aufladung), nicht der aktuelle Stand. Für den Tiefst- und Höchststand des Tages, wie ihn die Garmin-App im Verlauf zeigt, `body_battery_min` und `body_battery_max` aktivieren.

### Aktivitäten

Jedes Workout wird als Frontmatter-Key mit einer Zusammenfassungs-Zeichenkette geschrieben:

```yaml
---
hiking: 8.2 km · 157min · Ø105 bpm · 696 kcal
e_bike: 22.1 km · 65min · Ø112 bpm · 420 kcal
---
```

Nur Tage mit tatsächlichen Workouts erhalten Aktivitäts-Keys — das Plugin überschreibt niemals bestehende Inhalte deiner Notizen.

### Trainings (optional, maschinenlesbar)

Aktiviere "Maschinenlesbare Trainings" in den Einstellungen, um ein strukturiertes `trainings`-Feld für Dataview-Abfragen hinzuzufügen:

```yaml
---
trainings:
  - type: hiking
    category: outdoor
    distance_km: 8.2
    duration_min: 157
    avg_hr: 105
    calories: 696
  - type: e_bike
    category: cycling
    distance_km: 22.1
    duration_min: 65
    avg_hr: 112
    calories: 420
---
```

## Voraussetzungen

- **Obsidian** unter Windows, macOS, Linux, iOS oder Android
- **Garmin-Konto** mit Zugriff auf Garmin Connect
- **Daily Notes** oder **Periodic Notes** aktiviert (oder den Pfad manuell in den Einstellungen konfigurieren)

## Installation

### Über Community Plugins (empfohlen)

1. Öffne Obsidian-Einstellungen → Community Plugins → Durchsuchen
2. Suche nach "Garmin Health Sync"
3. Installiere und aktiviere das Plugin
4. Melde dich in den Plugin-Einstellungen bei Garmin Connect an

### Manuell

1. Lade `main.js` und `manifest.json` vom [neuesten Release](https://github.com/davadev/Garmin-Health-Sync/releases) herunter
2. Erstelle den Ordner `.obsidian/plugins/garmin-health-sync/` in deinem Vault
3. Kopiere beide Dateien in diesen Ordner
4. Aktiviere das Plugin unter Einstellungen → Community Plugins

## Verwendung

### Anmelden

Öffne die Plugin-Einstellungen und wähle **Garmin Connect**, dann gib deine Garmin-E-Mail und dein Passwort ein (und den Bestätigungscode, falls du die Bestätigung in zwei Schritten nutzt). Die Anmeldung funktioniert am Desktop und auf Mobilgeräten gleich.

Garmin kann wiederholte Anmeldeversuche von einem Gerät begrenzen; das Plugin zeigt dann einen Countdown bis zum nächsten Versuch. Ist die Anmeldung blockiert, nutze stattdessen **Browser-Anmeldung verwenden**: Du meldest dich auf Garmins Seite im Browser an, kopierst den Seitentext mit `ST-…` und tippst im Plugin auf die Schaltfläche für die Zwischenablage (oder fügst ihn ins Feld ein). Nach der Anmeldung erneuert das Plugin die Verbindung selbstständig, du musst dich nur selten erneut anmelden.

### Wo die Notizen liegen

Der **Daily-Notes-Pfad** ist der Ordner, das **Daily-Note-Format** der Dateiname in [moment.js](https://momentjs.com/docs/#/displaying/format/)-Syntax — dieselbe Konvention wie im eingebauten Daily Notes Plugin. Das Format darf selbst ein `/` enthalten und die Notizen so in datumsbasierte Unterordner legen; eckige Klammern übernehmen Text wörtlich:

| Pfad | Format | Ergebnis |
| --- | --- | --- |
| `Journal` | `YYYY-MM-DD` | `Journal/2026-08-04.md` |
| `Journal` | `YYYY/YYYY-MM-DD` | `Journal/2026/2026-08-04.md` |
| `Journal` | `YYYY/YYYY-MM/YYYY-MM-DD` | `Journal/2026/2026-08/2026-08-04.md` |
| `Journal` | `YYYY-MM-DD [Workout]` | `Journal/2026-08-04 Workout.md` |

Fehlende Unterordner werden automatisch angelegt.

### Auto-Sync

Bei jedem Obsidian-Start prüft das Plugin die letzten 7 Tage und ergänzt fehlende Gesundheitsdaten automatisch. Kein manuelles Zutun nötig. Standardmäßig legt es eine fehlende Daily Note selbst an.

Wenn ein anderes Tool deine Daily Notes verwaltet (Templater, das Calendar-Plugin, ein externer Sync), stelle **Tage ohne Daily Note** in den Einstellungen auf **Tag überspringen**. Der Auto-Sync wartet dann, bis eine echte (nicht-leere) Daily Note existiert, und synchronisiert, sobald sie erscheint — leere 0-Byte-Platzhalter werden ignoriert. Mit **In Verlaufsdateien speichern** legt das Plugin für einen Tag ohne Note keine Note an und speichert den Tag stattdessen in den Verlaufsnotizen (siehe unten). Ein manueller Sync schreibt immer in die geöffnete Note.

### Manueller Sync

Öffne eine Daily Note und führe **Garmin Health Sync: Aktuelle Notiz synchronisieren** über die Befehlspalette (Cmd/Ctrl+P) aus.

### Historische Daten nachträglich auffüllen (Backfill)

Du hast Jahre an Garmin-Daten? **Gesundheitsdaten nachträglich auffüllen** holt jeden beliebigen Zeitraum:

1. Öffne die Befehlspalette (Cmd/Strg+P) und suche nach **„Gesundheitsdaten nachträglich auffüllen“**
2. Wähle Start- und Enddatum oder schalte **Bis meine Daten beginnen** ein, um bis zu fünf Jahre zurückzugehen und zu stoppen, wenn deine Daten beginnen
3. Lege fest, was mit Tagen ohne Daily Note geschieht (**Tage ohne Daily Note**): Note anlegen, den Tag in Verlaufsdateien speichern oder überspringen
4. Schalte **Vollständige Tage erneut holen** ein, um bereits vorhandene Tage zu überschreiben

Die Tage werden vom neuesten an geholt, mit der Drosselung, die Garmin braucht. Eine Meldung oben zeigt den Tag, wie viele Tage fertig sind und die Restzeit, mit einer **Stopp**-Schaltfläche, am Desktop zeigt die Statusleiste den Prozentwert. Klickst du die Meldung weg, holt sie der Befehl **Fortschritt des laufenden Backfills anzeigen** (nur sichtbar, solange einer läuft) oder ein Klick auf die Statusleiste zurück. Es läuft immer nur ein Backfill. Ein gestoppter oder unterbrochener Backfill macht nach einem Neustart dort weiter, wo er aufgehört hat. Garmin-Fehler werden wiederholt, und ein Tag, den ein früherer Backfill mit allen aktivierten Metriken geholt hat, wird übersprungen, außer den letzten 3 Tagen, die sich noch ändern können.

### Gesundheits-Seitenpanel

Öffne es über das Ribbon-Symbol oder den Befehl **Gesundheitspanel öffnen**; das schaltet es ein, vorher muss nichts aktiviert werden (**Seitenpanel** in den Einstellungen schaltet es wieder aus). Die Karten vergleichen heute mit deinem eigenen üblichen Bereich (die letzten 30 Tage) und ändern deine Notizen nie. Tippe auf das Datum, um einen Tag zu wählen, wechsle mit den Pfeilen um einen Tag und ordne die Karten mit dem Stift-Knopf per Ziehen an. Jede Karte hat in den Einstellungen einen Schalter, der auch sagt, welche Metriken dafür aktiviert sein sollten. Tippe auf die Glühbirne einer Karte für **Was deine Daten andeuten** (Gründe und was hilft, aus deinen eigenen Daten) und **So liest du das**. Das Panel ist keine medizinische Beratung. Mit deinem Geburtsjahr (nur das Jahr) in den Einstellungen bekommst du Herzfrequenzzonen und altersabhängige Ziele. Siehe [was jede Karte zeigt und wie sie berechnet wird](docs/panel-cards.md).

<p>
<img src="docs/screenshots/panel-hydration.png" width="280" alt="Flüssigkeitskarte mit Erklärungen">
<img src="docs/screenshots/panel-sleep.png" width="280" alt="Schlaf und Schlafphasen">
<img src="docs/screenshots/panel-energy.png" width="280" alt="Body Battery, Stress und Flüssigkeit">
<img src="docs/screenshots/panel-training.png" width="280" alt="Schritte, Belastungsbalance, Wochenbelastung und Einheiten">
</p>

### Verlaufsnotizen

Steht **Tage ohne Daily Note** auf **In Verlaufsdateien speichern**, wird jeder geholte Tag zusätzlich in kleinen Monatsnotizen gespeichert (`Garmin history/Garmin history 2026-10.md`, eine Zeile pro Tag) in deinem Daily-Notes-Ordner. Sie sind reines Markdown, werden also mit deinem Vault synchronisiert, und das Panel liest sie für Tage ohne Note. Der Befehl **Verlauf aus Daily Notes importieren** kopiert die Garmin-Werte deiner vorhandenen Notes dorthin. Die Nachsynchronisierung kann sie in einem Zug bis zum Beginn deiner Daten füllen (**Bis meine Daten beginnen**). Änderst du deinen Daily-Notes-Ordner, ziehen die Verlaufsnotizen mit um.

### Eigenschaften der Daily Notes

Die Einstellung **Eigenschaften der Daily Notes** kann den Eigenschaftenblock einer Daily Note beim Öffnen einklappen, die vom Plugin geschriebenen Eigenschaften ausblenden (das Panel zeigt sie) oder beides. Aus einer Notiz wird nichts gelöscht. Das Einklappen und Ausblenden folgt den Ideen der Community-Plugins [Fold Properties By Default](https://obsidian.md/plugins?id=fold-properties-by-default) und [Extended Properties](https://obsidian.md/plugins?id=extended-properties); siehe Credits.

## Normalisierung der Aktivitäts-Keys

Garmins `typeKey`-Werte werden zu sauberen kanonischen Keys normalisiert:

| Provider Key | Kanonischer Key | Kategorie |
|---|---|---|
| `e_bike_fitness` | `e_bike` | cycling |
| `e_bike_mountain` | `e_mtb` | cycling |
| `resort_skiing_snowboarding` | `skiing` | winter |
| `backcountry_skiing_snowboarding` | `backcountry_skiing` | winter |
| `stand_up_paddleboarding` | `sup` | water |
| `fitness_equipment` | `gym_equipment` | gym |

Alle anderen Garmin-Keys werden unverändert übernommen (z.B. `hiking`, `running`, `cycling`, `swimming`, `strength_training`, `yoga`, ...).

### Aktivitäts-Kategorien

Jeder Aktivität wird eine Kategorie zugewiesen:

| Kategorie | Beispiele |
|---|---|
| `cycling` | cycling, e_bike, e_mtb, mountain_biking, indoor_cycling, road_biking, virtual_ride |
| `running` | running, trail_running, treadmill_running, indoor_running, ultra_run |
| `walking` | walking, indoor_walking |
| `outdoor` | hiking, mountaineering, rock_climbing, bouldering |
| `swimming` | swimming, lap_swimming, pool_swimming, open_water_swimming |
| `winter` | skiing, backcountry_skiing, cross_country_skiing, snowboarding |
| `water` | sup, rowing, kayaking, paddling, surfing, sailing |
| `gym` | strength_training, gym_equipment, elliptical, yoga, pilates, hiit, indoor_cardio |
| `racket` | tennis, badminton, squash, table_tennis, pickleball |
| `team` | soccer, basketball, volleyball, rugby |
| `recovery` | breathwork, meditation, stretching, mobility (zählen nicht zur Last) |
| `other` | golf, multi_sport, triathlon |

Neuere Sportarten tragen von Garmin ein Suffix (`kayaking_v2`, `skate_skiing_ws`); es wird für Name und Kategorie weggelassen, sie zählen also wie die einfache Sportart. Sitzungen zeigen den Namen der Sportart in der Plugin-Sprache; eine hier nicht aufgeführte Sportart erscheint als lesbarer Text und zählt als `other`. Die Wochenlast-Karte erfasst die Strecke von Laufen, Radfahren, Gehen, Outdoor-Sport und Schwimmen.

## Datenschutz

Dieses Plugin stellt Netzwerkverbindungen zu zwei externen Diensten her:

- **Garmin Connect** — du gibst E-Mail und Passwort (und ggf. einen Bestätigungscode) im Plugin ein. Sie werden nur an Garmins Anmeldeserver gesendet (`sso.garmin.com`, bzw. `sso.garmin.cn` für China) und vom Plugin weder gespeichert noch protokolliert. Nach der Anmeldung speichert das Plugin Garmin-Anmeldetokens im Secret Storage von Obsidian. Dieser bleibt auf dem Gerät, sodass die Tokens nicht mit anderen Geräten synchronisiert und nicht in Vault-Backups oder Git aufgenommen werden. Nur wenn der Secret Storage nicht verfügbar ist oder das Schreiben ablehnt, legt das Plugin sie in `data.json` ab. Behandle diese Tokens wie ein Login: Ihre Lebensdauer bestimmt Garmin. Jedes Gerät meldet sich separat an. Blockiert oder begrenzt Garmin die Anmeldung, wird eine Browser-Anmeldung angeboten (du meldest dich auf Garmins Seite im Browser an und fügst das einmalige Ticket ein). Die öffentlichen OAuth-Client-Schlüssel werden von `thegarth.s3.amazonaws.com` geladen (mit mitgelieferten Ersatzschlüsseln, falls der Host nicht erreichbar ist). **Abmelden** löscht die gespeicherten Tokens auf diesem Gerät.
- **Nominatim (OpenStreetMap)** — wenn **Workout-Ort** aktiviert ist, werden die GPS-Koordinaten deiner ersten Aktivität zur Rückwärts-Geokodierung an `nominatim.openstreetmap.org` gesendet. Du kannst dies in den Einstellungen unter **Workout-Ort** deaktivieren.

Es werden keine Daten an andere Server gesendet.

**Verlaufsnotizen:** Die optionalen Verlaufsnotizen enthalten deine Gesundheitswerte und liegen wie deine Daily Notes in deinem Vault. Das Plugin stellt dafür keine zusätzlichen Netzwerkanfragen.

**Zugriff auf den Vault:** Das Plugin listet die Dateien deines Vaults auf (`vault.getMarkdownFiles`), um deine Tagesnotizen und seine eigenen Verlaufsnotizen anhand von Pfad und datumsbasiertem Namen zu finden und dem Seitenpanel mitzuteilen, für welche Tage Daten vorliegen. Eigenschaften und Inhalt liest es nur von Notizen, die es als Tages- oder Verlaufsnotizen erkennt, und schreibt nur dorthin, in die Sicherung einer beschädigten Notiz und in seinen Verlaufsordner. Dateinamen und Notizinhalte verlassen dein Gerät nie.

**Zwischenablage:** Das Plugin nutzt die Zwischenablage nur, wenn du auf eine Schaltfläche klickst, nie im Hintergrund. **Browser-Anmeldung verwenden** liest sie einmal, wenn du auf **Aus Zwischenablage anmelden** klickst, um das einmalige Anmelde-Ticket zu übernehmen, das du aus dem Browser kopiert hast. Geschrieben wird, wenn du den Anmeldelink kopierst oder **Diagnose kopieren** wählst (in den Einstellungen und im Anmeldefenster). Die Diagnose enthält kein Passwort, keine Tokens, keine Kontodaten und keine Gesundheitswerte, nur technische Angaben zur letzten Anmeldung oder Synchronisierung: Namen der Datentypen, HTTP-Statuscodes, Antwortgrößen, Laufzeiten und den Aufbau der Garmin-Antworten (Feldnamen und Typen, niemals Werte).

## Entwicklung

```bash
npm install
npm run dev    # Watch-Modus
npm run build  # Produktions-Build
```

## Credits

Ursprünglich von [fcandi](https://github.com/fcandi) erstellt. Weiterentwickelt und gepflegt von [davadev](https://github.com/davadev).

Der Umgang mit Properties in Daily Notes (Eigenschaftenblock einklappen, vom Seitenpanel gezeigte Properties ausblenden) wurde von den Community-Plugins [Fold Properties By Default](https://obsidian.md/plugins?id=fold-properties-by-default) von Tommy Bergeron und [Extended Properties](https://obsidian.md/plugins?id=extended-properties) von electroluminescent inspiriert (beide MIT-lizenziert). Es wurde kein Code übernommen; siehe [NOTICE.md](NOTICE.md).
