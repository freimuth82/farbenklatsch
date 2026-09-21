
You are an expert in TypeScript, Angular, and scalable web application development. You write functional, maintainable, performant, and accessible code following Angular and TypeScript best practices.

## TypeScript Best Practices

- Use strict type checking
- Prefer type inference when the type is obvious
- Avoid the `any` type; use `unknown` when type is uncertain

## Angular Best Practices

- Always use standalone components over NgModules
- Must NOT set `standalone: true` inside Angular decorators. It's the default in Angular v20+.
- Do NOT set `changeDetection: ChangeDetectionStrategy.OnPush` explicitly. `OnPush` is the default in Angular v22+.
- Use signals for state management
- Implement lazy loading for feature routes
- Do NOT use the `@HostBinding` and `@HostListener` decorators. Put host bindings inside the `host` object of the `@Component` or `@Directive` decorator instead
- Use `NgOptimizedImage` for all static images.
  - `NgOptimizedImage` does not work for inline base64 images.

## Accessibility Requirements

- It MUST pass all AXE checks.
- It MUST follow all WCAG AA minimums, including focus management, color contrast, and ARIA attributes.

### Components

- Keep components small and focused on a single responsibility
- Use `input()` and `output()` functions instead of decorators
- Use `model()` for two-way bound properties with `[(prop)]` syntax instead of pairing `input()` with `output()`
- Use `computed()` for derived state
- Use `linkedSignal()` for state derived from multiple reactive sources that must stay synchronized
- Prefer inline templates for small components
- Prefer Signal Forms (`@angular/forms/signals`) for new forms. They are stable in Angular v22+ and provide signal-based state, type-safe field access, and schema-based validation
- When not using Signal Forms, prefer Reactive forms instead of Template-driven ones
- Do NOT use `ngClass`, use `class` bindings instead
- Do NOT use `ngStyle`, use `style` bindings instead
- Do NOT import `CommonModule`, import only the directives and pipes the template uses, such as `AsyncPipe` or `DatePipe`
- When using external templates/styles, use paths relative to the component TS file.

## Styling

- Use BEM (Block Element Modifier) naming conventions for SCSS classes
- use CSS variables for all colors and values, which have a relation to something else, like a distance, a padding, a margin. Try to use values dividable by 4 for numeric units. Avoid odd numeric values, except for font sizes.

## State Management

- Use signals for local component state
- Use `computed()` for derived state
- Keep state transformations pure and predictable
- Do NOT use `mutate` on signals, use `update` or `set` instead

## Templates

- Keep templates simple and avoid complex logic
- Use native control flow (`@if`, `@for`, `@switch`) instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- Use the async pipe to handle observables
- Do not assume globals like (`new Date()`) are available.

## Services

- Design services around a single responsibility
- Use the `providedIn: 'root'` option for singleton services
- Prefer the `@Service` decorator over `@Injectable({providedIn: 'root'})` for new singleton services (Angular v22+)
- Use the `inject()` function instead of constructor injection

# Project information:

# Farbenklatsch

Kartenspiel für zwei Spieler (Stapelspiel mit Farb- und optionalem Wert-Matching), das als Web-App umgesetzt wird.

## Aktueller Fokus (MVP)

Nur die Kern-Spielregeln implementieren:

- lokal spielbar, ohne Server und ohne Internet, mit zwei Spielmodi:
  - Mensch gegen Computer (der Computer ersetzt Spieler 2)
  - zwei Menschen an einem Gerät (wie an einem Pokertisch)
- ohne Badges, ohne Freundesystem, ohne Online-Multiplayer
- Alles aus dem Abschnitt „Geplante Features" ist bewusst **nicht** Teil des MVP und soll nicht vorab gebaut werden.

## Tech-Stack

Ziel: eine einzige Codebasis für Web, Android und iOS.

- **Angular** (TypeScript) als Web-App. Das ist die Hauptplattform und der erste Schritt.
- **Capacitor** verpackt die fertige Web-App später als Android- und iOS-App und liefert bei Bedarf native Funktionen (z. B. Push-Benachrichtigungen).
- Keine separaten nativen Codebasen (kein Swift, kein Kotlin). Native Details laufen ausschließlich über Capacitor und dessen Plugins.
- Die Entwicklung startet mit der reinen Web-Version. Die Capacitor-Wrapper kommen erst nach dem MVP dazu. Die Architektur muss das aber von Anfang an erlauben.

Hinweise für die Umsetzung:
- Der Entwickler kennt Angular seit vielen Jahren sehr gut. Code und Erklärungen dürfen entsprechend auf hohem Niveau sein, Standardwissen muss nicht erklärt werden.
- Spiellogik als reines TypeScript ohne Angular- oder DOM-Abhängigkeiten schreiben (eigenes Modul bzw. eigene Library), damit sie einfach testbar ist und später ohne Umbau auf einem Server (Online-Multiplayer) laufen kann.
- Die Kartendarstellung (siehe unten) bleibt rein in CSS und Unicode, damit sie in der WebView auf allen Plattformen identisch aussieht.
- Die Spiellogik soll jeden Spielzug als Ereignis nachvollziehbar machen (Spieler, gelegte Karte, Zeitpunkt, Stapelgewinn, Kartenzahlen beider Spieler danach), auch wenn die Historie erst nach dem MVP angezeigt wird. So lässt sie sich später ohne Umbau der Logik ergänzen.
- Die Spiellogik soll zusätzlich mitzählen: gelegte Karten insgesamt (Partielänge), gewonnene Stiche pro Spieler und die Größe des größten erbeuteten Stapels pro Spieler. Sie muss außerdem ohne UI und Zeitabhängigkeit vollständig durchspielbar sein, damit später 10.000 Spiele simuliert werden können. Der Zufall (Mischen) sollte dafür austauschbar sein (z. B. Seed), damit Simulationen reproduzierbar sind.
- Zwischen zwei Zügen können Tage liegen (Reaktionszeit ohne Begrenzung als Default). Der Spielzustand muss deshalb vollständig serialisierbar und jederzeit wiederherstellbar sein. Zeitlimits und Timer gehören nicht in die Spiellogik selbst, sondern in die umgebende Schicht, die die Logik aufruft. Die Logik bleibt zeitunabhängig.
- Vor größeren Architekturentscheidungen, die vom obigen Stack abweichen, bitte nachfragen.

## Start-Screen und Spielstart

### Start-Screen
Der Start-Screen zeigt den Spieltitel „Farbenklatsch" und die möglichen Optionen. Nach der Auswahl der Optionen kann ein Spiel gestartet werden. Zu den Optionen gehören nach heutigem Stand:
- Spielmodus: Mensch gegen Computer oder zwei Menschen an einem Gerät (beides im MVP), später zusätzlich online
- Spielername: Er muss eingegeben werden. Im Modus „zwei Menschen an einem Gerät" werden beide Namen eingegeben. Gegen den Computer wird nur der Name des Menschen eingegeben, der Computer braucht keinen Namen.
- Sitzordnung (nur im Modus „zwei Menschen an einem Gerät"): Die Spieler sitzen sich gegenüber oder nebeneinander
- Kartendeck: Altenburger Blatt oder 52er-Deck
- Wert-Regel: an oder aus
- Reaktionszeit pro Zug (Default: keine Begrenzung)
- später: HARD-Modus

### Spielmodus „Mensch gegen Computer"
Der Computer ersetzt Spieler 2. Er beantragt niemals ein vorzeitiges Spielende, stimmt einem Antrag des Menschen aber immer zu. Er reagiert immer sofort, abzüglich der Animationszeit der Karte (siehe „Reaktionszeit pro Zug"). Es wird kein Internet benötigt.

### Spielmodus „zwei Menschen an einem Gerät"
- Es gibt keinen Computergegner und es wird kein Internet benötigt.
- Die Situation ähnelt einem Pokertisch: Beide Spieler sitzen gemeinsam am selben Tisch bzw. Gerät.
- Da alle Karten verdeckt liegen und niemand Karten auf der Hand hält, gibt es keine versteckten Informationen, die vor dem jeweils anderen Spieler geschützt werden müssen.
- Es gibt zwei Sitzordnungen, die auf dem Start-Screen gewählt werden: Die Spieler sitzen sich gegenüber oder nebeneinander. Die Karten und Stapel im UI werden entsprechend dargestellt, sodass jeder Spieler sein Spielfeld aus seiner Blickrichtung sieht.
- Bei „nebeneinander" blicken beide Spieler aus derselben Richtung auf das Gerät. Die Stapel der Spieler liegen links und rechts, alle Karten stehen in derselben Ausrichtung.
- Bei „gegenüber" (Spieler sitzen sich 180° gegenüber) bekommt der gegenübersitzende Spieler seine Karten aus seiner Sicht angezeigt, für den anderen also auf dem Kopf. Das ist nur für die Animation der Karten wichtig. Der Stapel in der Mitte wird um 90° gedreht dargestellt, sodass beide Spieler dieselbe Sicht auf die Karten haben.
- Die Reaktionszeit pro Zug gilt auch in diesem Modus, obwohl beide am selben Gerät spielen.

### Ablauf beim Spielstart
1. Optionen wählen, Spielernamen eingeben und das Spiel starten.
2. Animation: Die Karten werden ausgeteilt. Sie kann übersprungen werden (Skip-Option).
3. Beide Spieler würfeln (Annahme: ein Würfel pro Spieler). Die höhere Augenzahl entscheidet. Bei Gleichstand wird so lange erneut gewürfelt, bis einer gewonnen hat. Wer gewonnen hat, ist der Startspieler und deckt die erste Karte auf. Gegen den Computer würfelt der Computer automatisch.
4. Das Spiel beginnt.

Umsetzungshinweis: Das Austeilen und das Würfeln (samt Wiederholung bei Gleichstand) sind in der Spiellogik ein einziger sofortiger Schritt. Der Zufall dafür muss austauschbar sein (z. B. Seed). Die Austeil-Animation ist reine Darstellung und darf das Ergebnis nicht beeinflussen, auch nicht beim Überspringen.

## Bedienung im Spiel

- **Zug auslösen:** Um eine Karte aufzudecken bzw. zu legen, drückt der Spieler auf seinen eigenen Kartenstapel.
- **Zuganzeige:** Wer als Nächstes am Zug ist, wird durch eine pulsierende Animation auf dem jeweiligen Kartenstapel angezeigt. Das gilt auch, wenn der Computer dran ist.
- Die Zuganzeige ist reine Darstellung und gehört nicht in die Spiellogik. Die Logik liefert lediglich, welcher Spieler am Zug ist.

## Regeln in der App

Sämtliche Regeln des Spiels müssen in der App unter einem Link zum Nachlesen zur Verfügung stehen.
- Die Regelseite enthält alle Regeln: Grundablauf, Decks, Wert-Regel, Spielende (regulär, Perfect Match, vorzeitig, Reaktionszeit) und alles, was sonst zu den Regeln gehört.
- Wo der Link platziert wird (z. B. auf dem Start-Screen und während des Spiels), ist bei der Umsetzung zu entscheiden.
- Bei jeder Regeländerung oder neuen Regel muss die Regelseite mit angepasst werden. Sie darf nicht von der Spiellogik abweichen.
- Die Regelseite beschreibt nur Funktionen, die es in der App tatsächlich gibt. Regeln für spätere Features (z. B. HARD-Modus) kommen erst mit dem jeweiligen Feature dazu.

## Spielregeln

### Deck
Zwei Varianten, wählbar:
- Altenburger Blatt: 7, 8, 9, 10, Bube, Dame, König, Ass
- Klassisches 52er-Deck: 2 bis Ass

Farben: Pik, Kreuz, Herz, Karo.

### Ablauf
1. Zwei Spieler. Die Karten werden gemischt und verdeckt aufgeteilt (jeder hat einen eigenen Stapel).
2. Der Startspieler (im ersten Zug der, der beim Würfeln die höhere Zahl hatte, siehe „Ablauf beim Spielstart") deckt die oberste Karte seines Stapels auf. Deren Farbe ist die geforderte Farbe. Diese Karte liegt zuunterst im offenen Stapel.
3. Die Spieler legen abwechselnd verdeckte Karten auf den offenen Stapel.
4. Sobald jemand eine Karte mit der geforderten (zuunterst liegenden) Farbe legt, gewinnt dieser Spieler den kompletten Stapel und nimmt ihn zu sich.
5. Der eingesammelte Stapel wird nicht gemischt. Das ist Teil der Spiellogik: Er wird genau in der Reihenfolge, wie er gelegt wurde, zuunterst unter den eigenen Kartenstapel des Gewinners geschoben. Der Gewinner ist danach als Nächster dran: Er nimmt die oberste Karte seines Stapels und deckt sie auf. Deren Farbe ist die neue geforderte Farbe (weiter wie ab Schritt 2, nur mit dem Gewinner als Startspieler).

### Spielende
Es gibt drei Wege, ein Spiel zu beenden: regulär, vorzeitig oder durch Überschreiten der Reaktionszeit.

**Regulär:** Legt ein Spieler seine letzte Karte, ohne dass diese die geforderte Farbe trifft, gehen ihm die Karten aus. Er hat verloren und der andere Spieler hat gewonnen. Der Gewinner ist aber noch einmal am Zug und legt danach eine Karte (siehe „Perfect Match").
- Die Karten im Stapel in der Mitte zählen nicht zu den Karten des Gewinners, da sie nicht gewonnen wurden. Sie werden niemandem zugeordnet.
- Der Endstand ist die Anzahl der Karten, die der Gewinner am Ende in der Hand hat. Sie ist je nach Spiel unterschiedlich, z. B. 27 von 32 Karten beim Altenburger Blatt.
- Trifft die letzte Karte des Spielers, dem die Karten ausgehen, die geforderte Farbe, sammelt er den Stapel ein und hat wieder Karten. Das Spiel geht dann normal weiter.

**Perfect Match (Sonderfall des regulären Endes):** Der Gegner legt seine letzte Karte, und der Spieler, der danach am Zug ist, legt genau die Farbe der zuunterst liegenden Karte. Er gewinnt damit im letzten Zug den kompletten Stapel und damit das Spiel vollständig, mit der maximal möglichen Anzahl an Karten: 32 Karten beim Altenburger Blatt, 52 beim klassischen Deck.
- Das Perfect Match wird im UI entsprechend hervorgehoben (Highlight).
- Dafür gibt es später auch ein Badge (siehe „Geplante Features").
- Alle anderen Siege durch fehlende Karten des Gegners sind normale reguläre Siege mit weniger als der maximalen Kartenanzahl.

**Vorzeitig:** Ein Spieler (der Herausforderer) kann das Spiel jederzeit vorzeitig beenden wollen. Dann gewinnt, wer die meisten Karten hat. Ein Unentschieden (gleich viele Karten) ist nur bei einem vorzeitigen Ende möglich. Der Stapel in der Mitte zählt dabei nicht mit. Ablauf:
- Der Gegenüber hat 60 Sekunden Zeit, dem Ende zuzustimmen. Verstreichen die 60 Sekunden, gilt das Ende als angenommen.
- Er kann stattdessen abbrechen. Das zeigt dem Herausforderer, dass er weiterspielen möchte. Der Herausforderer kann das Spielende in diesem Fall nach 15 Sekunden trotzdem erzwingen, es braucht also keine Zustimmung des Gegenübers.
- Ist der Gegner ein Computer, stimmt dieser einem Antrag immer zu. Der Computer beantragt selbst niemals ein vorzeitiges Ende.
- HARD-Modus: Der Stapel in der Mitte zählt zu dem Gegenüber, der das Beenden NICHT beantragt hat.

**Durch Überschreiten der Reaktionszeit:** Wurde vorher eine Reaktionszeit pro Zug festgelegt und wird sie überschritten, kann der Gegenüber (der wartende Spieler) entscheiden, ob das Spiel beendet werden soll. Die Wertung erfolgt nach Kartenanzahl wie beim vorzeitigen Ende. In der Statistik wird dieses Ende als eigene Kategorie „Timeout“ geführt (weder einvernehmlich noch erzwungen). „Technischer KO“ ist nur der Anzeigename für „Timeout“ im UI und ändert nichts an der Wertung. Der Stapel in der Mitte zählt dabei nicht mit. Auch im HARD-Modus wird er in diesem Fall niemandem zugeordnet, also auch nicht dem Gegner.

**Statistik:** Für die Spieler-Statistik wird unterschieden, ob ein Spiel vorzeitig oder regulär gewonnen bzw. verloren wurde. Beim vorzeitigen Ende wird außerdem zwischen einvernehmlichem Ende (der Gegenüber hat zugestimmt) und erzwungenem Ende (der Herausforderer hat es trotz Abbruch oder ohne Zustimmung durchgesetzt) unterschieden. Das soll auch dazu dienen, unzuverlässige Spieler herauszufiltern. Beides ist später für die Badges wichtig. Das Spielergebnis muss deshalb von Anfang an die Art des Endes enthalten (regulär, Perfect Match, vorzeitig einvernehmlich, vorzeitig erzwungen, Timeout), nicht nur Sieg, Niederlage oder Unentschieden.

### Reaktionszeit pro Zug
Die Spieler einigen sich vorab auf einen Modus, wie schnell der Gegenüber reagieren muss, also wie viel Zeit zwischen einer aufgedeckten oder gelegten Karte und dem nächsten Zug höchstens liegen darf.
- Vorerst ist der Default-Wert „keine Begrenzung". Es darf also auch Tage zwischen zwei Zügen liegen.
- Langfristig soll der nächste Zug aber innerhalb einer vorgegebenen Zeit erfolgen. Die Reaktionszeit ist dafür eine wählbare Einstellung der Partie.
- Die Reaktionszeit gilt in allen Spielmodi, auch wenn beide Spieler am selben Gerät spielen.
- Computer-Gegner reagieren immer sofort, abzüglich der Animationszeit für die Karte.
- Diese Reaktionszeit ist unabhängig von den 60 Sekunden, die der Gegenüber beim Antrag auf ein vorzeitiges Ende zum Zustimmen hat.
- Was bei Überschreitung passiert, steht unter „Spielende“ (Ende durch Überschreiten der Reaktionszeit).

### Optionale erweiterte Regel (Wert-Regel)
Zusätzlich zur Farbe zählt auch der passende Wert (z. B. eine 7 auf eine 7). Beide Trigger (Farbe oder Wert) führen zum Einsammeln des Stapels. Als optionale Einstellung umsetzen, nicht als Standard.

### Noch nicht festgelegt
Im Regelwerk ist bisher nicht geklärt:
- was nach der letzten Karte des Gegners passiert, wenn der Spieler mit seinem letzten Zug die Farbe nicht trifft (Annahme: die gelegte Karte bleibt im Stapel in der Mitte, das Spiel endet sofort und der Endstand ist die Anzahl der Karten, die der Spieler dann noch in der Hand hat)
- ob bei aktiver Wert-Regel auch der passende Wert (statt nur der Farbe) für ein Perfect Match reicht (Annahme: ja, jeder Treffer, der den Stapel einsammelt, zählt)
- welche Zeitvorgaben zur Auswahl stehen, sobald der Default „keine Begrenzung" abgelöst wird

Bei Bedarf nachfragen und die Entscheidung hier ergänzen. Bei den Annahmen oben ist die Umsetzung vorläufig, bis sie bestätigt sind.

## Kartendarstellung (technische Idee)

Ziel: Das Kartendeck wird komplett ohne Bilddateien dargestellt.

- Farben als Unicode-Symbole (♠ ♣ ♥ ♦), Wert als Text
- Kartenoptik rein mit CSS: Rahmen, abgerundete Ecken, Schatten, klassische Aufteilung mit Wert oben links und großem Symbol in der Mitte
- Später möglich: CSS-Animationen fürs Umdrehen und Stapeln der Karten

## Geplante Features (nach dem MVP)

- Online-Multiplayer mit Matchmaking per Zufallslosung
- Badge-System (z. B. erstes Spiel gespielt, 10 Spiele, 10 Siege, 10 Niederlagen in Folge, Perfect Match). Die Statistik unterscheidet dabei zwischen regulären und vorzeitigen Siegen bzw. Niederlagen, das kann für einzelne Badges relevant sein.
- Nutzerprofile
- Freundesystem: Finden und Hinzufügen per Nutzername
- Bewusst **kein** Chat und kein Messaging zwischen Nutzern, das Spiel soll simpel bleiben

### Ideen zur Kartenanzeige (nach dem MVP)
- Die Anzahl der Karten wird nicht live als Zahl angezeigt. Die Spieler müssen nach Gefühl entscheiden, ob sie das Spiel jetzt beenden (und damit evtl. gewonnen oder verloren haben). Die Kartenstapel werden aber weiterhin visuell dargestellt: übereinander, leicht versetzt.
- HARD-Modus: Der Spieler sieht die Anzahl der Karten nicht. Besonderheiten bei der Wertung des Stapels in der Mitte beim Spielende stehen unter „Spielende“. Ob im HARD-Modus auch die visuelle Stapelhöhe verborgen bleibt, ist noch offen und soll bei der Umsetzung geklärt werden.

### Spielhistorie und Auswertung (nach dem MVP)
Nach dem Spiel lässt sich die Historie anschauen:
- wer wann welche Karte gelegt hat
- wer welchen Stapel gewonnen hat

Dazu eine Auswertung, die für jeden Spieler einzeln angezeigt wird:
- der größte Stapel, den der jeweilige Spieler erbeutet hat (Kartenanzahl), und damit auch, wer von beiden den größten Stapel gewonnen hat
- wann der Spieler die wenigsten und wann die meisten Karten hatte

Beides gehört nicht zum MVP, soll aber bei Architekturentscheidungen im Hinterkopf bleiben.

### Partielänge, Titel und Extrem-Badges (nach dem MVP)

**Partielänge:** Die Länge einer Partie wird nicht in Zeit gemessen, sondern in ausgetauschten Karten (Annahme: die Summe aller gelegten Karten beider Spieler, inklusive der jeweils aufgedeckten Startkarte einer Runde).

**Titel:** Jede Partie erhält je nach Länge einen Titel: kurz, mittel, lang, episch oder legendär. Oberhalb des Spielfelds wird der aktuelle Titel mit einem Fortschrittsbalken angezeigt, dazu die Anzahl der Karten, die noch getauscht werden müssen, bis der nächste Titel erreicht ist. Die Anzeige ist nur während des Spiels sichtbar. Vergeben wird der Titel nur am Ende einer regulär beendeten Partie, bei vorzeitig beendeten Spielen wird kein Titel vergeben.

**Schwellenwerte per Simulation:** Die Grenzen zwischen den Titeln werden nicht geraten, sondern vorab in 10.000 simulierten Spielen ermittelt. Daraus ergibt sich die Verteilung der Partielängen und damit, ab wie vielen ausgetauschten Karten eine Partie z. B. als lang, episch oder legendär gilt (die genauen Perzentile pro Titel sind noch festzulegen).
- Die Simulation läuft als eigenes Skript auf der reinen TypeScript-Spiellogik, ohne UI.
- Die Verteilung hängt von der Konfiguration ab und muss deshalb getrennt ermittelt werden: Altenburger Blatt vs. 52er-Deck, mit und ohne Wert-Regel. Jede Konfiguration bekommt ihre eigenen Schwellenwerte.
- Die Simulation braucht eine Obergrenze für die Spiellänge, damit sie nicht endlos läuft, falls es Partien gibt, die sich im Kreis drehen. Wie viele Spiele diese Grenze erreichen, soll in der Auswertung berichtet werden.
- Die ermittelten Schwellenwerte werden als feste Konfiguration im Projekt abgelegt (z. B. JSON) und mit dem Skript reproduzierbar gehalten.

**Extrem-Badges:** Beide Fälle sind theoretisch möglich, sollen aber äußerst selten vorkommen. Sie werden nur für regulär beendete Spiele vergeben, nie bei vorzeitigem Ende:
- kein einziger Stich gewonnen
- jeden einzelnen Stich gewonnen

Ein „Stich" ist hier ein eingesammelter Stapel. Die Spiellogik muss dafür pro Spieler zählen, wie viele Stiche er gewonnen hat.

**Höchster Titel:** Ist „legendär" erreicht, zeigt der Fortschrittsbalken statt der Restanzahl „∞" (infinity) an, weil es keinen nächsten Schritt mehr gibt.

Alles hier gehört nicht zum MVP, soll aber bei Architekturentscheidungen im Hinterkopf bleiben.

## Arbeitsweise

- Das Regelwerk oben ist die maßgebliche Quelle. Bei Widersprüchen oder Lücken nachfragen und die Klärung hier eintragen.
- Regeln und Spiellogik von der Darstellung trennen, damit die Logik ohne UI testbar ist.

## Coding

Gib bei jedem Arbeitsschritt, den du ausführst, mit an, wieviele Tokens dieser verbraucht hat.
