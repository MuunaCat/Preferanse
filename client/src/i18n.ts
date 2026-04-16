// This file handles translations — all the text shown in the UI in 3 languages.
// To add a new language, copy one of the objects below and translate the values.

export type Lang = 'en' | 'lt' | 'pl';

// The shape of a translations object — every key must have a value in every language
export interface LangStrings {
  joinGame: string; startGame: string; yourName: string;
  taškaiTarget: string; set: string; rules: string;
  chat: string; send: string; typeMessage: string;
  hand: string; taskai: string; bid: string;
  home: string; bauda: string; whistPlus: string;
  total: string; wk: string; wd: string; pool: string;
  pickUpTalon: string; keepBid: string; updateBid: string;
  yourBid: string; pass: string; whist: string;
  open: string; closed: string; nextHand: string;
  selectDiscard: string; discardSelected: string;
  whistOrPass: string; openOrClosed: string;
  yourTurnPlay: string; raspasovkaMsg: string;
  waitingFor: string; waitingTalon: string; waitingRebid: string;
  talonOpen: string; bidderPickedUp: string; talonLabel: string;
  host: string; dealer: string; needPlayers: string;
  rulesTitle: string; close: string; rulesHtml: string;
  openHand: string; gameOver: string;
}

// English translations
const en: LangStrings = {
  joinGame: 'Join Game', startGame: 'Start Game', yourName: 'Your name',
  taškaiTarget: 'Taškai target', set: 'Set', rules: 'Rules',
  chat: 'Chat', send: 'Send', typeMessage: 'Type a message...',
  hand: 'Hand', taskai: 'Taškai', bid: 'Bid',
  home: 'Home', bauda: 'Bauda', whistPlus: 'Whist+',
  total: 'Total', wk: 'W-Left', wd: 'W-Right', pool: 'Pool',
  pickUpTalon: 'Pick up talon', keepBid: 'Keep', updateBid: 'Update your bid',
  yourBid: 'Your bid', pass: 'Pass', whist: 'Whist',
  open: 'Open', closed: 'Closed', nextHand: 'Next Hand',
  selectDiscard: 'Select 2 cards to discard', discardSelected: 'Discard selected',
  whistOrPass: 'Whist or pass?', openOrClosed: 'Play open or closed?',
  yourTurnPlay: 'Your turn — click a card to play',
  raspasovkaMsg: 'Raspasovka — take as few homes as possible',
  waitingFor: 'Waiting for', waitingTalon: 'to pick up the talon...',
  waitingRebid: 'to confirm their bid...',
  talonOpen: 'Talon (open):', bidderPickedUp: 'Bidder picked up:', talonLabel: 'Talon:',
  host: 'Host', dealer: '[D]', needPlayers: 'need 3 players',
  openHand: 'hand (open play):', gameOver: 'Game Over',
  rulesTitle: 'Preferanse Rules', close: 'Close',
  rulesHtml: `
    <h3>Setup</h3><ul>
      <li>3 players, 32-card deck (7 through Ace in all 4 suits)</li>
      <li>Each player gets <strong>10 cards</strong>; 2 go face-down as the <strong>Talon</strong></li>
    </ul>
    <h3>Bidding</h3><ul>
      <li>Starting left of dealer, players bid or pass</li>
      <li>Bids: <strong>6–10 in each suit (♠ ♣ ♦ ♥)</strong>, <strong>NS</strong> (No Suit / no trump), or <strong>Misère</strong></li>
      <li>Suit strength (weakest → strongest): ♠ ♣ ♦ ♥ NS</li>
      <li>Bidding ends when 2 players pass after the highest bidder</li>
      <li>If all 3 pass → <strong>Raspasovka</strong> (take as few homes as possible)</li>
    </ul>
    <h3>Talon & Discard</h3><ul>
      <li>The winning bidder picks up the 2 talon cards (everyone sees them)</li>
      <li>They may raise their bid, then discard 2 cards <strong>secretly</strong></li>
    </ul>
    <h3>Whisting</h3><ul>
      <li>The other 2 players each decide: <strong>Whist</strong> (play against bidder) or <strong>Pass</strong></li>
      <li>If only 1 whisters: they choose <strong>Open</strong> (show hand) or <strong>Closed</strong></li>
    </ul>
    <h3>Playing</h3><ul>
      <li>10 homes are played; trump = bid suit (none for NS or Misère)</li>
      <li>Must follow suit if possible; otherwise play any card</li>
      <li>Misère: bidder wins by taking <strong>0</strong> homes</li>
    </ul>
    <h3>Scoring</h3><ul>
      <li><strong>Bidder makes contract</strong> → earns Taškai points</li>
      <li><strong>Bidder fails</strong> → Bauda penalty added to their pool</li>
      <li><strong>Whisters</strong> earn Whist points for homes taken</li>
      <li><strong>Raspasovka</strong> → each home taken = penalty to that player</li>
      <li>Game ends when any player's Taškai reaches the target</li>
    </ul>
    <h3>Contract Values</h3><ul>
      <li>6 = 2 pts &nbsp; 7 = 4 pts &nbsp; 8 = 6 pts &nbsp; 9 = 8 pts &nbsp; 10 = 10 pts &nbsp; Misère = 10 pts</li>
    </ul>`,
};

// Lithuanian translations
const lt: LangStrings = {
  joinGame: 'Prisijungti', startGame: 'Pradėti žaidimą', yourName: 'Jūsų vardas',
  taškaiTarget: 'Taškų tikslas', set: 'Nustatyti', rules: 'Taisyklės',
  chat: 'Pokalbiai', send: 'Siųsti', typeMessage: 'Rašyti žinutę...',
  hand: 'Ranka', taskai: 'Taškai', bid: 'Aukcionas',
  home: 'Namai', bauda: 'Bauda', whistPlus: 'Vistai+',
  total: 'Viso', wk: 'VK', wd: 'VD', pool: 'Baudos',
  pickUpTalon: 'Paimti taloną', keepBid: 'Palikti', updateBid: 'Atnaujinti aukcioną',
  yourBid: 'Jūsų aukcionas', pass: 'Pasu', whist: 'Vistu',
  open: 'Atvirai', closed: 'Uždarai', nextHand: 'Kita ranka',
  selectDiscard: 'Pasirinkite 2 korteles atmesti', discardSelected: 'Atmesti',
  whistOrPass: 'Vistu ar pasu?', openOrClosed: 'Atvirai ar uždarai?',
  yourTurnPlay: 'Jūsų eilė — spustelėkite kortą',
  raspasovkaMsg: 'Raspasovka — paimkite kuo mažiau namų',
  waitingFor: 'Laukiama', waitingTalon: 'paima taloną...',
  waitingRebid: 'tvirtina aukcioną...',
  talonOpen: 'Talonas (atidarytas):', bidderPickedUp: 'Aukcionistas paėmė:', talonLabel: 'Talonas:',
  host: 'Šeimininkas', dealer: '[D]', needPlayers: 'reikia 3 žaidėjų',
  openHand: 'ranka (atvirai):', gameOver: 'Žaidimas baigtas',
  rulesTitle: 'Preferanso taisyklės', close: 'Uždaryti',
  rulesHtml: `
    <h3>Paruošimas</h3><ul>
      <li>3 žaidėjai, 32 kortelių kaladė (nuo 7 iki Tūzo visose 4 spalvose)</li>
      <li>Kiekvienas gauna <strong>10 kortelių</strong>; 2 kortelės yra <strong>Talonas</strong></li>
    </ul>
    <h3>Aukcionas</h3><ul>
      <li>Pradedant nuo kairės, žaidėjai siūlo kontraktus arba praeina</li>
      <li>Siūlymai: <strong>6–10 kiekvienoje spalvoje (♠ ♣ ♦ ♥)</strong>, <strong>NS</strong> (Be spalvos) arba <strong>Misère</strong></li>
      <li>Spalvų stiprumas (silpniausia → stipriausia): ♠ ♣ ♦ ♥ NS</li>
      <li>Aukcionas baigiasi kai 2 žaidėjai praeina po aukščiausio siūlymo</li>
      <li>Jei visi 3 praeina → <strong>Raspasovka</strong> (paimkite kuo mažiau namų)</li>
    </ul>
    <h3>Talonas ir atmetimas</h3><ul>
      <li>Laimėjęs aukcionistas paima 2 talono korteles (visi mato)</li>
      <li>Gali pakelti savo aukcioną, tada <strong>slaptai</strong> atmeta 2 korteles</li>
    </ul>
    <h3>Vistas</h3><ul>
      <li>Kiti 2 žaidėjai sprendžia: <strong>Vistu</strong> (žaisti prieš aukcionistą) arba <strong>Pasu</strong></li>
      <li>Jei vistu žaidžia tik vienas: jis renkasi <strong>Atvirai</strong> ar <strong>Uždarai</strong></li>
    </ul>
    <h3>Žaidimas</h3><ul>
      <li>Žaidžiami 10 namų; koziriai = aukcionuota spalva (nėra NS/Misère)</li>
      <li>Privaloma eiti spalva, jei yra</li>
      <li>Misère: aukcionistas laimi paimdamas <strong>0</strong> namų</li>
    </ul>
    <h3>Taškų skaičiavimas</h3><ul>
      <li><strong>Aukcionistas įvykdė kontraktą</strong> → gauna taškus</li>
      <li><strong>Aukcionistas neįvykdė</strong> → bauda įrašoma į baudų stulpelį</li>
      <li><strong>Vistai</strong> → gaunami vistų taškai už paimtus namus</li>
      <li><strong>Raspasovka</strong> → kiekvienas namas = bauda tam žaidėjui</li>
      <li>Žaidimas baigiasi kai kurio nors žaidėjo taškų suma pasiekia tikslą</li>
    </ul>
    <h3>Kontraktų vertės</h3><ul>
      <li>6 = 2 t. &nbsp; 7 = 4 t. &nbsp; 8 = 6 t. &nbsp; 9 = 8 t. &nbsp; 10 = 10 t. &nbsp; Misère = 10 t.</li>
    </ul>`,
};

// Polish translations
const pl: LangStrings = {
  joinGame: 'Dołącz do gry', startGame: 'Rozpocznij grę', yourName: 'Twoje imię',
  taškaiTarget: 'Cel punktów', set: 'Ustaw', rules: 'Zasady',
  chat: 'Czat', send: 'Wyślij', typeMessage: 'Wpisz wiadomość...',
  hand: 'Ręka', taskai: 'Punkty', bid: 'Kontrakt',
  home: 'Lewa', bauda: 'Kara', whistPlus: 'Wist+',
  total: 'Razem', wk: 'WL', wd: 'WP', pool: 'Pula',
  pickUpTalon: 'Weź talon', keepBid: 'Zostaw', updateBid: 'Zaktualizuj kontrakt',
  yourBid: 'Twój kontrakt', pass: 'Pas', whist: 'Wist',
  open: 'Otwarcie', closed: 'Zakrycie', nextHand: 'Następna ręka',
  selectDiscard: 'Wybierz 2 karty do odrzucenia', discardSelected: 'Odrzuć zaznaczone',
  whistOrPass: 'Wist czy pas?', openOrClosed: 'Otwarcie czy zakrycie?',
  yourTurnPlay: 'Twoja kolej — kliknij kartę',
  raspasovkaMsg: 'Raspasovka — weź jak najmniej lew',
  waitingFor: 'Czekam na', waitingTalon: 'bierze talon...',
  waitingRebid: 'potwierdza kontrakt...',
  talonOpen: 'Talon (otwarty):', bidderPickedUp: 'Grający wziął:', talonLabel: 'Talon:',
  host: 'Gospodarz', dealer: '[R]', needPlayers: 'potrzeba 3 graczy',
  openHand: 'ręka (otwarcie):', gameOver: 'Koniec gry',
  rulesTitle: 'Zasady Preferansa', close: 'Zamknij',
  rulesHtml: `
    <h3>Przygotowanie</h3><ul>
      <li>3 graczy, talia 32 kart (od 7 do Asa we wszystkich 4 kolorach)</li>
      <li>Każdy dostaje <strong>10 kart</strong>; 2 karty to <strong>Talon</strong></li>
    </ul>
    <h3>Licytacja</h3><ul>
      <li>Zaczynając od lewej, gracze licytują lub pasują</li>
      <li>Kontrakty: <strong>6–10 w każdym kolorze (♠ ♣ ♦ ♥)</strong>, <strong>NS</strong> (Bez atu) lub <strong>Misère</strong></li>
      <li>Siła kolorów (najsłabszy → najsilniejszy): ♠ ♣ ♦ ♥ NS</li>
      <li>Licytacja kończy się gdy 2 graczy spasują po najwyższej odzywce</li>
      <li>Jeśli wszyscy 3 pasują → <strong>Raspasovka</strong> (weź jak najmniej lew)</li>
    </ul>
    <h3>Talon i odrzut</h3><ul>
      <li>Zwycięzca licytacji bierze 2 karty talonu (wszyscy je widzą)</li>
      <li>Może podnieść kontrakt, potem <strong>tajnie</strong> odrzuca 2 karty</li>
    </ul>
    <h3>Wist</h3><ul>
      <li>Pozostałych 2 graczy decyduje: <strong>Wist</strong> (grać przeciw licytującemu) lub <strong>Pas</strong></li>
      <li>Jeśli tylko 1 wistuje: wybiera <strong>Otwarcie</strong> lub <strong>Zakrycie</strong></li>
    </ul>
    <h3>Gra</h3><ul>
      <li>Rozgrywa się 10 lew; atut = licytowany kolor (brak dla NS/Misère)</li>
      <li>Należy grać w kolor jeśli możliwe</li>
      <li>Misère: licytujący wygrywa biorąc <strong>0</strong> lew</li>
    </ul>
    <h3>Punktacja</h3><ul>
      <li><strong>Licytujący wypełnił kontrakt</strong> → zdobywa punkty</li>
      <li><strong>Licytujący nie wypełnił</strong> → kara dodana do puli</li>
      <li><strong>Wistujący</strong> → zdobywają punkty wistowe za lewy</li>
      <li><strong>Raspasovka</strong> → każda lewa = kara dla tego gracza</li>
      <li>Gra kończy się gdy suma punktów dowolnego gracza osiągnie cel</li>
    </ul>
    <h3>Wartości kontraktów</h3><ul>
      <li>6 = 2 pkt &nbsp; 7 = 4 pkt &nbsp; 8 = 6 pkt &nbsp; 9 = 8 pkt &nbsp; 10 = 10 pkt &nbsp; Misère = 10 pkt</li>
    </ul>`,
};

// All 3 languages bundled together
export const TRANSLATIONS: Record<Lang, LangStrings> = { en, lt, pl };

// The currently active language (saved in localStorage so it persists between sessions)
let currentLang: Lang = (localStorage.getItem('pref_lang') as Lang) || 'en';

// T is the shorthand used everywhere in the app to get translated text, e.g. T.joinGame
export let T: LangStrings = TRANSLATIONS[currentLang];

// Switches the active language and saves the choice
export function setLang(lang: Lang): void {
  currentLang = lang;
  localStorage.setItem('pref_lang', lang);
  T = TRANSLATIONS[lang];
}

// Returns the currently active language code
export function getLang(): Lang { return currentLang; }
