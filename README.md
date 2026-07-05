# 🚴 OpenRadRoute

Ein kostenloser, quelloffener Fahrrad-Routenplaner auf Basis von
OpenStreetMap. Keine Anmeldung, kein Abo, keine Werbung – im Gegensatz zu
Komoot oder Strava ist die Turn-by-Turn-Routenplanung hier komplett frei
nutzbar, weil ausschließlich offene, kostenlose Dienste verwendet werden.

**Live-Demo:** nach dem Deployment unter `https://<dein-github-name>.github.io/<repo-name>/`

## Funktionen

- 🗺️ Karte mit [OpenFreeMap](https://openfreemap.org) (leichtgewichtig, kostenlos, kein API-Key) via [MapLibre GL JS](https://maplibre.org/)
- 🧭 Routing über [BRouter](https://github.com/abrensch/brouter) – kostenloser Open-Source-Router speziell für Fahrrad/Fuß-Navigation auf OSM-Basis
- 5 Routing-Profile: **Trekking**, **Rennrad** (bevorzugt Asphalt), **Kürzeste**, **Ruhig** (meidet befahrene Straßen), **MTB/Gravel**
- Start-, Ziel- und beliebig viele Zwischenstopps – per Klick auf die Karte, per Adresssuche oder per Drag der Marker
- Adresssuche über [Nominatim](https://nominatim.org/) (OSM-Geokodierung)
- Distanz, Fahrzeit, Höhenmeter bergauf/bergab
- Höhenprofil als SVG-Diagramm
- Bis zu 2 Alternativrouten zum Vergleich
- GPX-Export für Radcomputer, Komoot, OsmAnd, etc.
- Mobile-first Bedienung (Bottom Sheet wie bei Google Maps), auf Desktop feste Seitenleiste
- Installierbar als PWA ("Zum Startbildschirm hinzufügen")

## Warum diese Dienste?

| Baustein | Dienst | Warum |
|---|---|---|
| Kartenkacheln | OpenFreeMap | Kostenlos, kein Key, kein Rate-Limit, OSM-Daten |
| Routing | BRouter | Fahrradspezifisch, viele Profile, komplett kostenlos, Open Source |
| Adresssuche | Nominatim | Offizieller OSM-Geokodierungsdienst, kostenlos |

Alle drei Dienste sind öffentlich und kostenlos nutzbar, haben aber
Fair-Use-Regeln (siehe unten). Für den produktiven Einsatz mit vielen
Nutzer:innen empfiehlt es sich, BRouter und/oder Nominatim irgendwann auf
einem eigenen Server zu betreiben – beide Projekte sind dafür genau gemacht
(Docker-Images verfügbar).

## Lokale Entwicklung (VS Code)

Das Projekt ist reines HTML/CSS/JavaScript ganz ohne Build-Schritt – du
kannst also direkt loslegen.

1. Repository klonen bzw. diesen Ordner öffnen:
   ```bash
   code openradroute
   ```
2. Die Erweiterung **"Live Server"** von Ritwick Dey in VS Code installieren
   (falls noch nicht vorhanden).
3. Mit Rechtsklick auf `index.html` → **"Open with Live Server"**.
   Der Browser öffnet sich automatisch mit Hot-Reload bei Dateiänderungen.

   Alternativ ganz ohne Extension, z. B. mit Python (unter Windows in
   PowerShell):
   ```powershell
   py -m http.server 5500
   ```
   und dann `http://localhost:5500` im Browser öffnen.

> **Hinweis:** Öffne `index.html` nicht per Doppelklick direkt als
> `file://`-URL – manche Browser blockieren dann `fetch()`-Aufrufe
> (CORS). Immer über einen lokalen Webserver wie oben aufrufen.

## Deployment auf GitHub Pages

1. Neues GitHub-Repository anlegen und den Inhalt dieses Ordners pushen:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: OpenRadRoute"
   git branch -M main
   git remote add origin https://github.com/<dein-name>/<repo-name>.git
   git push -u origin main
   ```
2. Im Repository unter **Settings → Pages**:
   - "Source" auf **Deploy from a branch** stellen
   - Branch **main**, Ordner **/ (root)** auswählen
   - Speichern
3. Nach ein bis zwei Minuten ist die Seite unter
   `https://<dein-name>.github.io/<repo-name>/` erreichbar.

Da die App komplett clientseitig läuft (keine eigene Backend-Logik, nur
Aufrufe an öffentliche APIs), reicht das rein statische Hosting von GitHub
Pages vollständig aus.

## Projektstruktur

```
openradroute/
├── index.html            App-Gerüst
├── manifest.json         PWA-Manifest
├── sw.js                 Service Worker (cached nur die App-Hülle)
├── css/
│   └── style.css         Gesamtes Styling (mobile-first)
├── js/
│   ├── config.js         ⚙️ Kartenstil, API-URLs, Routing-Profile
│   ├── utils.js          Formatierung, Distanzberechnung, Debounce
│   ├── map.js             MapLibre-Karte, Marker, Routen-Layer
│   ├── geocoding.js       Adresssuche (Nominatim)
│   ├── routing.js         BRouter-Anfragen, GeoJSON-Auswertung, GPX-Export
│   ├── waypoints.js       Zustand der Wegpunkte (Start/Via/Ziel)
│   ├── elevation.js       SVG-Höhenprofil
│   ├── ui.js              Verdrahtung aller Module, Bottom Sheet, Events
│   └── main.js            Einstiegspunkt
└── icons/
    └── icon.svg           App-Icon
```

Die Aufteilung in kleine Module ohne Build-Tooling ist bewusst gewählt,
damit auch Mitstreiter:innen ohne JS-Build-Erfahrung (Webpack/Vite/etc.)
den Code direkt öffnen, verstehen und anpassen können. Jede Datei hat genau
eine Aufgabe.

## Eigene Routing-Profile anpassen

BRouter-Profile sind reine Textdateien (`.brf`). Die fünf Profile in
`js/config.js` (`trekking`, `fastbike`, `shortest`, `safety`, `mtb`) sind
Standardprofile des öffentlichen BRouter-Servers. Willst du eigene
Profile (z. B. "Lastenrad" oder "Kinderanhänger"), gibt es zwei Wege:

1. **Eigener BRouter-Server:** Du betreibst BRouter selbst per Docker
   (siehe [abrensch/brouter](https://github.com/abrensch/brouter)) und
   legst eigene `.brf`-Profile in den `profiles2`-Ordner. Dann in
   `CONFIG.BROUTER_API_URL` deine eigene Server-URL eintragen.
2. **Vorhandene Community-Profile:** In der
   [BRouter-Profiles-Sammlung](https://github.com/poutnikl/Brouter-profiles)
   gibt es viele weitere fertige Profile.

## Fair-Use-Hinweise zu den kostenlosen Diensten

- **Nominatim:** max. 1 Anfrage/Sekunde, siehe
  [Usage Policy](https://operations.osmfoundation.org/policies/nominatim/).
  Für viel Traffic besser einen eigenen Nominatim- oder
  [Photon](https://photon.komoot.io/)-Server betreiben.
- **BRouter:** der öffentliche Server ist für moderate Nutzung gedacht.
  Bei intensiver/kommerzieller Nutzung bitte einen eigenen Server
  betreiben (Docker-Image vorhanden).
- **OpenFreeMap:** explizit für unlimitierte, kostenlose Nutzung gedacht
  (auch produktiv), siehe [openfreemap.org](https://openfreemap.org).

## Mögliche nächste Schritte

- Eigene PNG-Icons (192px/512px) für bessere Android-"Installieren"-Banner
  ergänzen (aktuell nur SVG-Icon)
- Offline-Routing mit lokal gehosteten BRouter-Segmenten für dein Gebiet
- Höhenprofil interaktiv machen (Hover zeigt Position auf der Karte)
- Wegpunkte per echtem Drag & Drop in der Liste umsortieren
- Speichern/Teilen von Routen über einen Shortlink (bräuchte ein kleines Backend)

## Lizenz

MIT – siehe [LICENSE](./LICENSE). Kartendaten © OpenStreetMap-Mitwirkende.
