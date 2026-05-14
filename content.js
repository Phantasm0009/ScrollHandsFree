/**
 * ScrollHands Free - Content Script
 * Implements auto-scrolling, voice commands, Reading Focus, and basic accessibility hints.
 * Injected on demand after a user action.
 */

(() => {
  'use strict';

  // Prevent multiple instances
  if (window.scrollHandsContentScript) {
    return;
  }
  window.scrollHandsContentScript = true;

  // Auto-scroll state
  let scrollFrameId = null;
  let currentSpeed = 50; // pixels per second
  let isScrolling = false;
  let isPaused = false;
  let hasActiveScrollSession = false;
  let scrollDirection = 1; // 1 for down, -1 for up
  let scrollTarget = null;
  let scrollLastFrameTime = null;
  let scrollRemainder = 0;
  let scrollStatus = 'stopped'; // stopped, scrolling, paused, ended
  let lastScrollMessage = 'Ready on this page';
  let endBehavior = 'stop'; // stop, loop, reverse
  let readingMode = 'custom';
  let focusBandEnabled = false;
  let miniControllerEnabled = false;
  let hudEnabled = false;
  let focusBandHeight = 24;
  let focusDimOpacity = 0.08;
  let autoPauseAtHeadings = false;
  let headingPauseSeconds = 2;
  let autoPauseOnUserScroll = true;
  let userScrollPauseSeconds = 2.5;
  let readingRhythm = 'smooth';
  let voiceLanguage = 'auto';
  let customVoiceAliases = {};
  let disabledVoiceCommands = {};
  let voiceCommandCooldowns = {};
  let scrollContainerSelector = '';
  let chooseScrollAreaMode = false;
  let lastVoiceCommandText = '';
  let focusBandElement = null;
  let miniControllerElement = null;
  let miniControllerHideTimer = null;
  let miniControllerMouseListenerActive = false;
  let hudPosition = null;
  let hudDragState = null;
  let lastMiniControllerReveal = 0;
  let lastRealtimeStateSent = 0;
  let lastHeadingPauseCheck = 0;
  let lastContentBreakCheck = 0;
  let pausedHeadingElements = new WeakSet();
  let pausedBreakElements = new WeakSet();
  let autoPauseResumeTimer = null;
  let autoPauseToken = 0;
  let scrollStartedAt = 0;
  let lastProgrammaticScrollTime = 0;
  let observedScrollTarget = null;

  const SPEED_PRESETS = {
    slow: 20,
    reading: 45,
    fast: 75,
    skim: 100
  };

  const HEADING_PAUSE_CHECK_INTERVAL_MS = 350;
  const CONTENT_BREAK_CHECK_INTERVAL_MS = 500;
  const MAX_PAUSE_CANDIDATES = 350;

  const READING_MODE_PRESETS = {
    custom: {
      label: 'Custom'
    },
    article: {
      label: 'Article',
      speed: 45,
      endBehavior: 'stop',
      focusBandEnabled: true,
      miniControllerEnabled: false,
      autoPauseAtHeadings: true,
      headingPauseSeconds: 1.2
    },
    recipe: {
      label: 'Recipe',
      speed: 25,
      endBehavior: 'stop',
      focusBandEnabled: false,
      miniControllerEnabled: true,
      autoPauseAtHeadings: true,
      headingPauseSeconds: 2.5
    },
    documentation: {
      label: 'Documentation',
      speed: 38,
      endBehavior: 'stop',
      focusBandEnabled: true,
      miniControllerEnabled: false,
      autoPauseAtHeadings: true,
      headingPauseSeconds: 1.8
    },
    study: {
      label: 'Study',
      speed: 30,
      endBehavior: 'stop',
      focusBandEnabled: true,
      miniControllerEnabled: true,
      autoPauseAtHeadings: true,
      headingPauseSeconds: 2.5,
      readingRhythm: 'deliberate'
    },
    fastSkim: {
      label: 'Fast skim',
      speed: 85,
      endBehavior: 'stop',
      focusBandEnabled: false,
      miniControllerEnabled: true,
      autoPauseAtHeadings: false,
      headingPauseSeconds: 0,
      readingRhythm: 'smooth'
    },
    teleprompter: {
      label: 'Presentation',
      speed: 32,
      endBehavior: 'stop',
      focusBandEnabled: true,
      miniControllerEnabled: true,
      autoPauseAtHeadings: false,
      headingPauseSeconds: 0,
      readingRhythm: 'smooth'
    }
  };

  // Voice command state
  let recognition = null;
  let voiceRecognitionEnabled = false;
  let isRecognitionActive = false;
  let voiceRestartFailures = 0;

  // Voice command configuration - Multi-language support
  const MULTILINGUAL_VOICE_COMMANDS = {
    // Core Controls - Start Commands
    start: {
      patterns: {
        'en': ['start', 'begin', 'resume', 'continue scrolling', 'go', 'play'],
        'es': ['empezar', 'comenzar', 'iniciar', 'continuar', 'reanudar', 'ir'],
        'fr': ['commencer', 'débuter', 'démarrer', 'continuer', 'reprendre', 'aller'],
        'de': ['starten', 'beginnen', 'anfangen', 'fortsetzen', 'weitermachen', 'los'],
        'it': ['iniziare', 'cominciare', 'partire', 'continuare', 'riprendere', 'vai'],
        'pt': ['começar', 'iniciar', 'continuar', 'retomar', 'prosseguir', 'ir'],
        'ru': ['начать', 'старт', 'запустить', 'продолжить', 'возобновить'],
        'ja': ['開始', 'スタート', '始める', '続ける', '再開'],
        'zh': ['开始', '启动', '继续', '恢复', '开启'],
        'ko': ['시작', '스타트', '계속', '재개', '시작해'],
        'ar': ['ابدأ', 'بداية', 'استمر', 'متابعة'],
        'hi': ['शुरू', 'प्रारंभ', 'जारी', 'आगे'],
        'nl': ['starten', 'beginnen', 'doorgaan', 'hervatten'],
        'sv': ['starta', 'börja', 'fortsätt', 'återuppta'],
        'da': ['start', 'begynd', 'fortsæt', 'genoptag'],
        'no': ['start', 'begynn', 'fortsett', 'gjenoppta']
      },
      action: () => {
        startAutoScroll(currentSpeed, hasActiveScrollSession ? scrollDirection : 1);
        return scrollDirection > 0 ? 'Started scrolling down' : 'Started scrolling up';
      }
    },

    // Pause Commands
    pause: {
      patterns: {
        'en': ['pause', 'hold', 'wait'],
        'es': ['pausar', 'esperar'],
        'fr': ['pause', 'attendre'],
        'de': ['pausieren', 'warten'],
        'it': ['pausa', 'aspettare'],
        'pt': ['pausar', 'esperar'],
        'ru': ['пауза', 'ждать'],
        'ja': ['一時停止', '待つ'],
        'zh': ['暂停', '等待'],
        'ko': ['일시정지', '기다려'],
        'ar': ['وقفة', 'انتظر'],
        'hi': ['विराम', 'रुकें'],
        'nl': ['pauzeren', 'wachten'],
        'sv': ['pausa', 'vänta'],
        'da': ['pause', 'vent'],
        'no': ['pause', 'vent']
      },
      action: () => pauseAutoScroll(),
      feedback: 'Paused scrolling'
    },

    // Stop Commands
    stop: {
      patterns: {
        'en': ['stop', 'halt', 'pause', 'freeze', 'cease'],
        'es': ['parar', 'detener', 'alto', 'pausar', 'cesar'],
        'fr': ['arrêter', 'stop', 'pause', 'cesser', 'halte'],
        'de': ['stoppen', 'halt', 'anhalten', 'pausieren', 'aufhören'],
        'it': ['fermare', 'stop', 'pausa', 'cessare', 'basta'],
        'pt': ['parar', 'stop', 'pausar', 'cessar', 'interromper'],
        'ru': ['стоп', 'остановить', 'пауза', 'прекратить'],
        'ja': ['停止', 'ストップ', '止める', '一時停止'],
        'zh': ['停止', '暂停', '结束', '停下'],
        'ko': ['정지', '스톱', '멈춤', '일시정지'],
        'ar': ['توقف', 'إيقاف', 'وقفة'],
        'hi': ['रोकें', 'बंद', 'विराम'],
        'nl': ['stoppen', 'halt', 'pauzeren'],
        'sv': ['stoppa', 'halt', 'pausa'],
        'da': ['stop', 'halt', 'pause'],
        'no': ['stopp', 'halt', 'pause']
      },
      action: () => stopAutoScroll(),
      feedback: 'Stopped scrolling'
    },

    // Direction - Up
    up: {
      patterns: {
        'en': ['up', 'backward', 'scroll up', 'reverse', 'back'],
        'es': ['arriba', 'hacia arriba', 'atrás', 'reversa'],
        'fr': ['haut', 'vers le haut', 'arrière', 'retour'],
        'de': ['hoch', 'nach oben', 'rückwärts', 'zurück'],
        'it': ['su', 'verso l\'alto', 'indietro', 'dietro'],
        'pt': ['cima', 'para cima', 'para trás', 'reverso'],
        'ru': ['вверх', 'наверх', 'назад', 'обратно'],
        'ja': ['上', '上に', '戻る', '逆'],
        'zh': ['向上', '上面', '返回', '倒退'],
        'ko': ['위', '위로', '뒤로', '역방향'],
        'ar': ['أعلى', 'فوق', 'للخلف'],
        'hi': ['ऊपर', 'वापस', 'पीछे'],
        'nl': ['omhoog', 'naar boven', 'achteruit'],
        'sv': ['upp', 'uppåt', 'bakåt'],
        'da': ['op', 'opad', 'tilbage'],
        'no': ['opp', 'oppover', 'tilbake']
      },
      action: () => startAutoScroll(currentSpeed, -1),
      feedback: 'Scrolling up'
    },

    // Direction - Down
    down: {
      patterns: {
        'en': ['down', 'forward', 'scroll down', 'advance'],
        'es': ['abajo', 'hacia abajo', 'adelante', 'avanzar'],
        'fr': ['bas', 'vers le bas', 'avant', 'avancer'],
        'de': ['runter', 'nach unten', 'vorwärts', 'weiter'],
        'it': ['giù', 'verso il basso', 'avanti', 'avanzare'],
        'pt': ['baixo', 'para baixo', 'para frente', 'avançar'],
        'ru': ['вниз', 'вперёд', 'дальше'],
        'ja': ['下', '下に', '前進', '進む'],
        'zh': ['向下', '下面', '前进', '继续'],
        'ko': ['아래', '아래로', '앞으로', '전진'],
        'ar': ['أسفل', 'تحت', 'للأمام'],
        'hi': ['नीचे', 'आगे', 'अग्रसर'],
        'nl': ['omlaag', 'naar beneden', 'vooruit'],
        'sv': ['ner', 'neråt', 'framåt'],
        'da': ['ned', 'nedad', 'fremad'],
        'no': ['ned', 'nedover', 'fremover']
      },
      action: () => startAutoScroll(currentSpeed, 1),
      feedback: 'Scrolling down'
    },

    // Speed Control - Faster
    faster: {
      patterns: {
        'en': ['faster', 'speed up', 'increase speed', 'accelerate', 'quicker'],
        'es': ['más rápido', 'acelerar', 'aumentar velocidad', 'más veloz'],
        'fr': ['plus vite', 'accélérer', 'augmenter vitesse', 'plus rapide'],
        'de': ['schneller', 'beschleunigen', 'tempo erhöhen', 'zügiger'],
        'it': ['più veloce', 'accelerare', 'aumentare velocità', 'più rapido'],
        'pt': ['mais rápido', 'acelerar', 'aumentar velocidade', 'mais veloz'],
        'ru': ['быстрее', 'ускорить', 'увеличить скорость'],
        'ja': ['速く', 'スピードアップ', '加速', '早く'],
        'zh': ['快一点', '加速', '提高速度', '更快'],
        'ko': ['빠르게', '가속', '속도 증가', '더 빨리'],
        'ar': ['أسرع', 'تسريع', 'زيادة السرعة'],
        'hi': ['तेज़', 'गति बढ़ाएं', 'जल्दी'],
        'nl': ['sneller', 'versnellen', 'tempo verhogen'],
        'sv': ['snabbare', 'accelerera', 'öka hastigheten'],
        'da': ['hurtigere', 'accelerer', 'øg hastigheden'],
        'no': ['raskere', 'aksellerer', 'øk hastigheten']
      },
      action: () => {
        const newSpeed = Math.min(100, currentSpeed + 15);
        setScrollSpeed(newSpeed);
        return `Speed increased to ${newSpeed}%`;
      }
    },

    // Speed Control - Slower
    slower: {
      patterns: {
        'en': ['slower', 'slow down', 'decrease speed', 'decelerate'],
        'es': ['más lento', 'desacelerar', 'disminuir velocidad', 'reducir'],
        'fr': ['plus lent', 'ralentir', 'diminuer vitesse', 'décélérer'],
        'de': ['langsamer', 'verlangsamen', 'tempo reduzieren', 'bremsen'],
        'it': ['più lento', 'rallentare', 'diminuire velocità', 'decelerare'],
        'pt': ['mais lento', 'desacelerar', 'diminuir velocidade', 'reduzir'],
        'ru': ['медленнее', 'замедлить', 'уменьшить скорость'],
        'ja': ['遅く', 'スローダウン', '減速', 'ゆっくり'],
        'zh': ['慢一点', '减速', '降低速度', '更慢'],
        'ko': ['느리게', '감속', '속도 감소', '천천히'],
        'ar': ['أبطأ', 'تبطيء', 'تقليل السرعة'],
        'hi': ['धीमा', 'गति कम करें', 'आराम से'],
        'nl': ['langzamer', 'vertragen', 'tempo verlagen'],
        'sv': ['långsammare', 'bromsa', 'minska hastigheten'],
        'da': ['langsommere', 'brems', 'reducer hastigheden'],
        'no': ['saktere', 'brems', 'reduser hastigheten']
      },
      action: () => {
        const newSpeed = Math.max(1, currentSpeed - 15);
        setScrollSpeed(newSpeed);
        return `Speed decreased to ${newSpeed}%`;
      }
    },

    // Navigation - Top
    top: {
      patterns: {
        'en': ['top', 'beginning', 'start of page', 'go to top'],
        'es': ['arriba', 'inicio', 'principio', 'ir arriba'],
        'fr': ['haut', 'début', 'commencement', 'aller en haut'],
        'de': ['oben', 'anfang', 'seitenanfang', 'nach oben'],
        'it': ['cima', 'inizio', 'principio', 'vai in cima'],
        'pt': ['topo', 'início', 'começo', 'ir para o topo'],
        'ru': ['верх', 'начало', 'в начало страницы'],
        'ja': ['トップ', '始まり', 'ページの先頭', '上へ'],
        'zh': ['顶部', '开始', '页面顶端', '到顶部'],
        'ko': ['맨 위', '시작', '페이지 상단', '위로'],
        'ar': ['أعلى الصفحة', 'بداية', 'قمة'],
        'hi': ['टॉप', 'शुरुआत', 'ऊपर जाएं'],
        'nl': ['bovenkant', 'begin', 'naar boven'],
        'sv': ['toppen', 'början', 'gå till toppen'],
        'da': ['toppen', 'begyndelsen', 'gå til toppen'],
        'no': ['toppen', 'begynnelsen', 'gå til toppen']
      },
      action: () => {
        const target = scrollTarget || findScrollableTarget();
        setScrollPosition(target, 0);
        notifyScrollState('Jumped to top');
        return 'Jumped to top';
      }
    },

    // Navigation - Bottom
    bottom: {
      patterns: {
        'en': ['bottom', 'end', 'end of page', 'go to bottom'],
        'es': ['abajo', 'final', 'fin de página', 'ir abajo'],
        'fr': ['bas', 'fin', 'fin de page', 'aller en bas'],
        'de': ['unten', 'ende', 'seitenende', 'nach unten'],
        'it': ['fondo', 'fine', 'fine pagina', 'vai in fondo'],
        'pt': ['fundo', 'fim', 'final da página', 'ir para o fundo'],
        'ru': ['низ', 'конец', 'в конец страницы'],
        'ja': ['ボトム', '終わり', 'ページの終端', '下へ'],
        'zh': ['底部', '结束', '页面底端', '到底部'],
        'ko': ['맨 아래', '끝', '페이지 하단', '아래로'],
        'ar': ['أسفل الصفحة', 'نهاية', 'قاع'],
        'hi': ['बॉटम', 'अंत', 'नीचे जाएं'],
        'nl': ['onderkant', 'einde', 'naar beneden'],
        'sv': ['botten', 'slutet', 'gå till botten'],
        'da': ['bunden', 'slutningen', 'gå til bunden'],
        'no': ['bunnen', 'slutten', 'gå til bunnen']
      },
      action: () => {
        const target = scrollTarget || findScrollableTarget();
        setScrollPosition(target, getScrollMetrics(target).max);
        notifyScrollState('Jumped to bottom');
        return 'Jumped to bottom';
      }
    },

    // Max Speed
    turbo: {
      patterns: {
        'en': ['turbo', 'max speed', 'maximum speed', 'full speed'],
        'es': ['turbo', 'velocidad máxima', 'máximo', 'toda velocidad'],
        'fr': ['turbo', 'vitesse maximale', 'maximum', 'pleine vitesse'],
        'de': ['turbo', 'höchstgeschwindigkeit', 'maximum', 'vollgas'],
        'it': ['turbo', 'velocità massima', 'massimo', 'tutta velocità'],
        'pt': ['turbo', 'velocidade máxima', 'máximo', 'toda velocidade'],
        'ru': ['турбо', 'максимальная скорость', 'полная скорость'],
        'ja': ['ターボ', '最高速度', 'マックス', 'フルスピード'],
        'zh': ['涡轮', '最高速度', '最大', '全速'],
        'ko': ['터보', '최고 속도', '최대', '풀스피드'],
        'ar': ['توربو', 'أقصى سرعة', 'سرعة كاملة'],
        'hi': ['टर्बो', 'अधिकतम गति', 'पूरी गति'],
        'nl': ['turbo', 'maximale snelheid', 'topsnelheid'],
        'sv': ['turbo', 'maxhastighet', 'full fart'],
        'da': ['turbo', 'maksimal hastighed', 'fuld fart'],
        'no': ['turbo', 'maksimal hastighet', 'full fart']
      },
      action: () => {
        setScrollSpeed(100);
        return 'Maximum speed activated';
      }
    },

    // Help
    help: {
      patterns: {
        'en': ['help', 'what can I say', 'list commands', 'show commands', 'commands'],
        'es': ['ayuda', 'qué puedo decir', 'comandos', 'mostrar comandos'],
        'fr': ['aide', 'que puis-je dire', 'commandes', 'montrer commandes'],
        'de': ['hilfe', 'was kann ich sagen', 'befehle', 'kommandos'],
        'it': ['aiuto', 'cosa posso dire', 'comandi', 'mostra comandi'],
        'pt': ['ajuda', 'o que posso dizer', 'comandos', 'mostrar comandos'],
        'ru': ['помощь', 'что я могу сказать', 'команды'],
        'ja': ['ヘルプ', '何が言えますか', 'コマンド', 'ヘルプを表示'],
        'zh': ['帮助', '我能说什么', '命令', '显示命令'],
        'ko': ['도움말', '무엇을 말할 수 있나요', '명령어', '도움'],
        'ar': ['مساعدة', 'ماذا يمكنني أن أقول', 'أوامر'],
        'hi': ['सहायता', 'मैं क्या कह सकता हूं', 'कमांड'],
        'nl': ['help', 'wat kan ik zeggen', 'commando\'s'],
        'sv': ['hjälp', 'vad kan jag säga', 'kommandon'],
        'da': ['hjælp', 'hvad kan jeg sige', 'kommandoer'],
        'no': ['hjelp', 'hva kan jeg si', 'kommandoer']
      },
      action: () => showHelpPopup()
    },

    // Status
    speed: {
      patterns: {
        'en': ['current speed', 'what speed', 'speed status'],
        'es': ['velocidad actual', 'qué velocidad', 'estado velocidad'],
        'fr': ['vitesse actuelle', 'quelle vitesse', 'statut vitesse'],
        'de': ['aktuelle geschwindigkeit', 'welche geschwindigkeit', 'tempo status'],
        'it': ['velocità attuale', 'che velocità', 'stato velocità'],
        'pt': ['velocidade atual', 'que velocidade', 'status velocidade'],
        'ru': ['текущая скорость', 'какая скорость', 'статус скорости'],
        'ja': ['現在の速度', '速度はいくつ', 'スピード状況'],
        'zh': ['当前速度', '什么速度', '速度状态'],
        'ko': ['현재 속도', '속도가 얼마', '속도 상태'],
        'ar': ['السرعة الحالية', 'ما هي السرعة'],
        'hi': ['वर्तमान गति', 'गति क्या है'],
        'nl': ['huidige snelheid', 'welke snelheid'],
        'sv': ['nuvarande hastighet', 'vilken hastighet'],
        'da': ['nuværende hastighed', 'hvilken hastighed'],
        'no': ['nåværende hastighet', 'hvilken hastighet']
      },
      action: () => `Current speed: ${currentSpeed}%`
    },

    position: {
      patterns: {
        'en': ['where am I', 'current position', 'page position'],
        'es': ['dónde estoy', 'posición actual', 'posición página'],
        'fr': ['où suis-je', 'position actuelle', 'position page'],
        'de': ['wo bin ich', 'aktuelle position', 'seitenposition'],
        'it': ['dove sono', 'posizione attuale', 'posizione pagina'],
        'pt': ['onde estou', 'posição atual', 'posição página'],
        'ru': ['где я', 'текущая позиция', 'позиция страницы'],
        'ja': ['どこにいる', '現在位置', 'ページ位置'],
        'zh': ['我在哪里', '当前位置', '页面位置'],
        'ko': ['어디에 있나요', '현재 위치', '페이지 위치'],
        'ar': ['أين أنا', 'الموقع الحالي'],
        'hi': ['मैं कहां हूं', 'वर्तमान स्थिति'],
        'nl': ['waar ben ik', 'huidige positie'],
        'sv': ['var är jag', 'nuvarande position'],
        'da': ['hvor er jeg', 'nuværende position'],
        'no': ['hvor er jeg', 'nåværende posisjon']
      },
      action: () => {
        const scrollPercent = getScrollPositionPercent(scrollTarget || findScrollableTarget());
        return `Position: ${scrollPercent}% down`;
      }
    }
  };

  const SUPPORTED_LANGUAGE_CODES = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'zh', 'ko', 'ar', 'hi', 'nl', 'sv', 'da', 'no'];

  const VOICE_LANGUAGE_LOCALES = {
    auto: 'auto',
    en: 'en-US',
    'en-US': 'en-US',
    'en-GB': 'en-GB',
    es: 'es-ES',
    'es-ES': 'es-ES',
    fr: 'fr-FR',
    'fr-FR': 'fr-FR',
    de: 'de-DE',
    'de-DE': 'de-DE',
    it: 'it-IT',
    'it-IT': 'it-IT',
    pt: 'pt-BR',
    'pt-BR': 'pt-BR',
    ja: 'ja-JP',
    'ja-JP': 'ja-JP',
    zh: 'zh-CN',
    'zh-CN': 'zh-CN',
    ko: 'ko-KR',
    'ko-KR': 'ko-KR',
    hi: 'hi-IN',
    'hi-IN': 'hi-IN'
  };

  // Auto-detect user's browser language for voice commands
  let detectedLanguage = 'en'; // Default to English
  try {
    // Try to detect user's preferred language
    const browserLang = navigator.language || navigator.userLanguage || 'en';
    const langCode = browserLang.split('-')[0].toLowerCase();

    // Check if we support this language
    if (SUPPORTED_LANGUAGE_CODES.includes(langCode)) {
      detectedLanguage = langCode;
    }
    console.log(`ScrollHands: Detected language ${detectedLanguage} for voice commands`);
  } catch (error) {
    console.warn('ScrollHands: Could not detect language, using English', error);
  }

  function resolveVoiceRecognitionLanguage(language = voiceLanguage) {
    const selected = language || 'auto';
    if (selected === 'auto') {
      return navigator.language || navigator.userLanguage || 'en-US';
    }
    return VOICE_LANGUAGE_LOCALES[selected] || selected;
  }

  function updateDetectedLanguageFromLocale(locale) {
    const langCode = (locale || 'en-US').split('-')[0].toLowerCase();
    detectedLanguage = SUPPORTED_LANGUAGE_CODES.includes(langCode) ? langCode : 'en';
  }

  function applyVoiceLanguage(language) {
    voiceLanguage = typeof language === 'string' && language ? language : 'auto';
    const locale = resolveVoiceRecognitionLanguage(voiceLanguage);
    updateDetectedLanguageFromLocale(locale);
    if (recognition) {
      recognition.lang = locale;
    }
    return locale;
  }

  // CSS for help popup and voice feedback
  const POPUP_CSS = `

    /* On-screen help popup */
    .scrollhands-help-popup {
      position: fixed;
      top: 20px;
      right: 20px;
      max-width: 400px;
      background: rgba(26, 115, 232, 0.95);
      color: white;
      padding: 16px 20px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.4;
      z-index: 1000000;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      border: 2px solid rgba(255, 255, 255, 0.2);
      animation: scrollhandsPopupSlideIn 0.3s ease-out;
    }

    .scrollhands-help-popup h3 {
      margin: 0 0 8px 0;
      font-size: 16px;
      font-weight: 600;
    }

    .scrollhands-help-popup ul {
      margin: 8px 0;
      padding-left: 16px;
    }

    .scrollhands-help-popup li {
      margin: 4px 0;
    }

    .scrollhands-help-popup .command {
      background: rgba(255, 255, 255, 0.2);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 12px;
    }

    .scrollhands-help-note {
      margin-top: 8px;
      font-size: 12px;
      opacity: 0.9;
    }

    /* Voice feedback popup */
    .scrollhands-voice-feedback {
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(34, 139, 34, 0.9);
      color: white;
      padding: 12px 20px;
      border-radius: 6px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 500;
      z-index: 1000001;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
      animation: scrollhandsPopupSlideIn 0.3s ease-out;
    }

    .scrollhands-voice-feedback.error {
      background: rgba(220, 53, 69, 0.9);
    }

    .scrollhands-voice-feedback.info {
      background: rgba(0, 123, 255, 0.9);
    }

    .scrollhands-focus-band {
      position: fixed;
      inset: 0;
      z-index: 999998;
      pointer-events: none;
      display: none;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .scrollhands-focus-band.active {
      display: block;
    }

    .scrollhands-focus-band::before,
    .scrollhands-focus-band::after {
      content: '';
      position: fixed;
      left: 0;
      right: 0;
      background: rgba(17, 24, 39, var(--scrollhands-focus-opacity, 0.08));
    }

    .scrollhands-focus-band::before {
      top: 0;
      height: calc((100vh - var(--scrollhands-focus-height, 24vh)) / 2);
    }

    .scrollhands-focus-band::after {
      top: calc((100vh + var(--scrollhands-focus-height, 24vh)) / 2);
      bottom: 0;
    }

    .scrollhands-focus-band-line {
      position: fixed;
      left: 0;
      right: 0;
      top: calc((100vh - var(--scrollhands-focus-height, 24vh)) / 2);
      height: var(--scrollhands-focus-height, 24vh);
      border-top: 1px solid rgba(26, 115, 232, 0.18);
      border-bottom: 1px solid rgba(26, 115, 232, 0.18);
      background: rgba(255, 255, 255, 0.06);
      box-shadow: inset 0 8px 18px rgba(255, 255, 255, 0.05), inset 0 -8px 18px rgba(255, 255, 255, 0.05);
    }

    .scrollhands-mini-controller {
      position: fixed;
      left: 50%;
      bottom: 18px;
      transform: translateX(-50%);
      z-index: 1000002;
      display: none;
      width: min(92vw, 520px);
      flex-direction: column;
      gap: 8px;
      padding: 10px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.98);
      color: #0f172a;
      border: 1px solid rgba(148, 163, 184, 0.38);
      box-shadow: 0 14px 36px rgba(15, 23, 42, 0.2);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      transition: opacity 0.18s ease, transform 0.18s ease;
      cursor: grab;
      user-select: none;
      touch-action: none;
      backdrop-filter: blur(10px);
    }

    .scrollhands-mini-controller.active {
      display: flex;
    }

    .scrollhands-mini-controller.dragging {
      cursor: grabbing;
      transition: none;
    }

    .scrollhands-mini-controller.hidden {
      opacity: 0;
      pointer-events: none;
      transform: translateX(-50%) translateY(8px);
    }

    .scrollhands-mini-controller[style*="left"] {
      transform: none;
    }

    .scrollhands-mini-controller[style*="left"].hidden {
      transform: translateY(8px);
    }

    .scrollhands-hud-top {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 10px;
      align-items: center;
      width: 100%;
    }

    .scrollhands-mini-controller button {
      min-width: 44px;
      min-height: 34px;
      padding: 0 10px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      background: #f8fafc;
      color: #0f172a;
      font-size: 12px;
      font-weight: 750;
      line-height: 1.15;
      cursor: pointer;
      user-select: none;
    }

    .scrollhands-mini-controller button:hover {
      background: #eff6ff;
      border-color: rgba(37, 99, 235, 0.35);
      color: #2563eb;
    }

    .scrollhands-hud-status {
      min-width: 0;
      color: #475569;
      font-size: 12px;
      line-height: 1.25;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .scrollhands-hud-status strong {
      color: #0f172a;
      font-size: 13px;
    }

    .scrollhands-hud-progress {
      width: 100%;
      height: 7px;
      border-radius: 999px;
      background: #e2e8f0;
      overflow: hidden;
    }

    .scrollhands-hud-progress span {
      display: block;
      height: 100%;
      width: var(--scrollhands-progress, 0%);
      background: linear-gradient(90deg, #2563eb, #0f766e);
      transition: width 0.18s ease;
    }

    .scrollhands-hud-controls {
      display: grid;
      grid-template-columns: repeat(7, minmax(0, 1fr));
      gap: 6px;
      width: 100%;
    }

    .scrollhands-hud-controls button {
      min-width: 0;
    }

    .scrollhands-hud-stop {
      color: #b91c1c !important;
      border-color: rgba(220, 38, 38, 0.24) !important;
      background: #fef2f2 !important;
    }

    .scrollhands-hud-hide {
      min-width: 34px !important;
      width: 34px;
      padding: 0 !important;
      color: #64748b !important;
    }

    .scrollhands-choose-area-outline {
      position: fixed;
      inset: 0;
      z-index: 1000003;
      pointer-events: none;
      border: 2px solid #2563eb;
      background: rgba(37, 99, 235, 0.08);
      border-radius: 8px;
      display: none;
    }

    @keyframes scrollhandsPopupSlideIn {
      from {
        opacity: 0;
        transform: translateX(-50%) translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
    }

    @keyframes scrollhandsPopupFadeOut {
      from {
        opacity: 1;
      }
      to {
        opacity: 0;
      }
    }

    .scrollhands-popup-exiting {
      animation: scrollhandsPopupFadeOut 0.3s ease-in forwards;
    }

    /* High contrast mode support */
    @media (prefers-contrast: high) {
      .scrollhands-help-popup {
        background: rgba(0, 0, 0, 0.95);
        border: 2px solid #ffffff;
      }

      .scrollhands-voice-feedback {
        background: rgba(0, 0, 0, 0.95);
        border: 1px solid #ffffff;
      }

      .scrollhands-mini-controller {
        background: #ffffff;
        border: 2px solid #000000;
      }

      .scrollhands-focus-band::before,
      .scrollhands-focus-band::after {
        background: rgba(0, 0, 0, 0.14);
      }
    }

    /* Reduced motion support */
    @media (prefers-reduced-motion: reduce) {
      .scrollhands-help-popup,
      .scrollhands-voice-feedback {
        animation: none;
      }
    }
  `;

  /**
   * Initialize the content script
   */
  function initializeContentScript() {
    try {
      injectPopupCSS();
      initializeVoiceRecognition();
      setupMessageListener();
      setupPageLifecycleVoiceCleanup();

      // Auto-enable voice commands if they were previously enabled
      checkAndRestoreVoiceControl();

      console.log('ScrollHands Free content script initialized');
    } catch (error) {
      console.error('Error initializing ScrollHands Free:', error);
    }
  }

  /**
   * Check if voice commands were enabled for this specific tab.
   * Note: Auto-restore is now disabled for tab-specific voice commands.
   */
  async function checkAndRestoreVoiceControl() {
    // Tab-specific voice commands - no auto-restore.
    // Voice commands must be manually enabled from popup for each tab.
    console.log('ScrollHands: Tab-specific voice commands mode - no auto-restore');
  }

  function toDisplayText(value, fallback = '') {
    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    if (value && typeof value === 'object') {
      const preferred = value.message ?? value.status ?? value.feedback ?? value.text ?? value.error ?? value.command;
      if (preferred !== undefined) {
        return toDisplayText(preferred, fallback);
      }
    }

    return fallback;
  }

  /**
   * Show voice feedback popup on screen
   * @param {string} message - Message to display
   * @param {string} type - Type of message ('success', 'error', 'info')
   * @param {number} duration - Duration in milliseconds (default 2000)
   */
  function showVoiceFeedback(message, type = 'success', duration = 2000) {
    try {
      const feedbackText = toDisplayText(message, 'Voice command');

      // Remove any existing feedback popup
      const existingPopup = document.querySelector('.scrollhands-voice-feedback');
      if (existingPopup) {
        existingPopup.remove();
      }

      // Create new feedback popup
      const popup = document.createElement('div');
      popup.className = `scrollhands-voice-feedback ${type}`;
      popup.textContent = feedbackText;
      popup.setAttribute('aria-live', 'polite');
      popup.setAttribute('role', 'status');

      document.body.appendChild(popup);

      // Auto-remove after duration
      setTimeout(() => {
        if (popup && popup.parentNode) {
          popup.classList.add('scrollhands-popup-exiting');
          setTimeout(() => {
            if (popup && popup.parentNode) {
              popup.remove();
            }
          }, 300);
        }
      }, duration);

      // Send feedback to popup if it's open
      notifyBackgroundScript('voiceFeedback', {
        message: feedbackText,
        commandType: type
      });

    } catch (error) {
      console.error('Error showing voice feedback:', error);
    }
  }

  /**
   * Show help popup with available commands
   */
  function showHelpPopup() {
    try {
      // Remove any existing help popup
      const existingPopup = document.querySelector('.scrollhands-help-popup');
      if (existingPopup) {
        existingPopup.remove();
      }

      // Create help popup
      const popup = document.createElement('div');
      popup.className = 'scrollhands-help-popup';
      popup.setAttribute('role', 'dialog');
      popup.setAttribute('aria-label', 'Voice commands help');

      const title = document.createElement('h3');
      title.textContent = 'Voice Commands';
      popup.appendChild(title);

      const commandList = document.createElement('div');
      const groups = [
        ['Control', ['start', 'pause', 'resume', 'stop']],
        ['Direction', ['up', 'down', 'backward', 'forward']],
        ['Speed', ['faster', 'slower', 'max speed']],
        ['Navigate', ['top', 'bottom', 'beginning', 'end']],
        ['Reading Focus', ['focus on', 'focus off', 'bigger focus', 'smaller focus']],
        ['Status', ['current speed', 'where am I']],
        ['Help', ['help', 'what can I say']]
      ];

      groups.forEach(([label, commands], groupIndex) => {
        const strong = document.createElement('strong');
        strong.textContent = `${label}:`;
        commandList.appendChild(strong);
        commandList.appendChild(document.createTextNode(' '));
        commands.forEach((command, index) => {
          const commandChip = document.createElement('span');
          commandChip.className = 'command';
          commandChip.textContent = command;
          commandList.appendChild(commandChip);
          if (index < commands.length - 1) {
            commandList.appendChild(document.createTextNode(', '));
          }
        });
        if (groupIndex < groups.length - 1) {
          commandList.appendChild(document.createElement('br'));
        }
      });
      popup.appendChild(commandList);

      const note = document.createElement('div');
      note.className = 'scrollhands-help-note';
      note.textContent = 'Say any command naturally. This popup will close automatically.';
      popup.appendChild(note);

      document.body.appendChild(popup);

      // Auto-remove after 4 seconds
      setTimeout(() => {
        if (popup && popup.parentNode) {
          popup.classList.add('scrollhands-popup-exiting');
          setTimeout(() => {
            if (popup && popup.parentNode) {
              popup.remove();
            }
          }, 300);
        }
      }, 4000);

    } catch (error) {
      console.error('Error showing help popup:', error);
    }
  }

  /**
   * Inject CSS for focus mode
   */
  function injectPopupCSS() {
    const style = document.createElement('style');
    style.textContent = POPUP_CSS;
    document.head.appendChild(style);
  }

  function ensureFocusBand() {
    if (focusBandElement) {
      return focusBandElement;
    }

    focusBandElement = document.createElement('div');
    focusBandElement.className = 'scrollhands-focus-band';
    focusBandElement.setAttribute('aria-hidden', 'true');

    const bandLine = document.createElement('div');
    bandLine.className = 'scrollhands-focus-band-line';
    focusBandElement.appendChild(bandLine);
    document.body.appendChild(focusBandElement);

    return focusBandElement;
  }

  function updateFocusBandStyle() {
    const band = ensureFocusBand();
    band.style.setProperty('--scrollhands-focus-height', `${Math.max(12, Math.min(60, focusBandHeight))}vh`);
    band.style.setProperty('--scrollhands-focus-opacity', String(Math.max(0, Math.min(0.35, focusDimOpacity))));
  }

  function setFocusBand(enabled) {
    readingMode = 'custom';
    focusBandEnabled = Boolean(enabled);
    updateFocusBandStyle();
    ensureFocusBand().classList.toggle('active', focusBandEnabled);
    notifyScrollState(focusBandEnabled ? 'Focus band on' : 'Focus band off');
    return getScrollState();
  }

  function adjustFocusBand(delta) {
    focusBandHeight = Math.max(12, Math.min(60, focusBandHeight + delta));
    updateFocusBandStyle();
    notifyScrollState(`Focus band ${focusBandHeight}%`);
    return getScrollState();
  }

  function isHudVisibleEnabled() {
    return Boolean(miniControllerEnabled || hudEnabled);
  }

  function createMiniButton(label, title, onClick, className = '') {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.title = title;
    if (className) {
      button.className = className;
    }
    button.setAttribute('aria-label', title);
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      onClick();
      updateMiniController();
    });
    return button;
  }

  function scheduleMiniControllerHide(delay = 4200) {
    if (miniControllerHideTimer) {
      clearTimeout(miniControllerHideTimer);
      miniControllerHideTimer = null;
    }

    if (!isHudVisibleEnabled() || !isScrolling || !miniControllerElement) {
      return;
    }

    miniControllerHideTimer = setTimeout(() => {
      if (isHudVisibleEnabled() && isScrolling && miniControllerElement) {
        miniControllerElement.classList.add('hidden');
      }
    }, delay);
  }

  function revealMiniController(delay = 4200) {
    if (!miniControllerElement || !isHudVisibleEnabled()) {
      return;
    }

    miniControllerElement.classList.remove('hidden');
    scheduleMiniControllerHide(delay);
  }

  function handleMiniControllerMouseMove() {
    if (!isHudVisibleEnabled() || !miniControllerElement) {
      return;
    }

    const now = Date.now();
    if (now - lastMiniControllerReveal < 900) {
      return;
    }

    lastMiniControllerReveal = now;
    revealMiniController();
  }

  function setMiniControllerMouseListener(enabled) {
    if (enabled && !miniControllerMouseListenerActive) {
      document.addEventListener('mousemove', handleMiniControllerMouseMove, { passive: true });
      miniControllerMouseListenerActive = true;
    } else if (!enabled && miniControllerMouseListenerActive) {
      document.removeEventListener('mousemove', handleMiniControllerMouseMove);
      miniControllerMouseListenerActive = false;
    }
  }

  function applyHudPosition() {
    if (!miniControllerElement) {
      return;
    }

    if (!hudPosition || typeof hudPosition.x !== 'number' || typeof hudPosition.y !== 'number') {
      miniControllerElement.style.left = '';
      miniControllerElement.style.top = '';
      miniControllerElement.style.right = '';
      miniControllerElement.style.bottom = '';
      return;
    }

    const rect = miniControllerElement.getBoundingClientRect();
    const left = Math.max(8, Math.min(window.innerWidth - rect.width - 8, hudPosition.x));
    const top = Math.max(8, Math.min(window.innerHeight - rect.height - 8, hudPosition.y));
    hudPosition = { x: left, y: top };
    miniControllerElement.style.left = `${left}px`;
    miniControllerElement.style.top = `${top}px`;
    miniControllerElement.style.right = 'auto';
    miniControllerElement.style.bottom = 'auto';
  }

  function handleHudPointerDown(event) {
    if (event.button !== 0 || event.target.closest('button')) {
      return;
    }

    const rect = miniControllerElement.getBoundingClientRect();
    hudDragState = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top
    };
    miniControllerElement.classList.add('dragging');
    miniControllerElement.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  }

  function handleHudPointerMove(event) {
    if (!hudDragState || hudDragState.pointerId !== event.pointerId) {
      return;
    }

    const rect = miniControllerElement.getBoundingClientRect();
    hudPosition = {
      x: Math.max(8, Math.min(window.innerWidth - rect.width - 8, event.clientX - hudDragState.offsetX)),
      y: Math.max(8, Math.min(window.innerHeight - rect.height - 8, event.clientY - hudDragState.offsetY))
    };
    applyHudPosition();
    revealMiniController(9000);
  }

  function handleHudPointerUp(event) {
    if (!hudDragState || hudDragState.pointerId !== event.pointerId) {
      return;
    }

    miniControllerElement.releasePointerCapture?.(event.pointerId);
    miniControllerElement.classList.remove('dragging');
    hudDragState = null;
    notifyScrollState('HUD position saved for this site');
  }

  function ensureMiniController() {
    if (miniControllerElement) {
      return miniControllerElement;
    }

    miniControllerElement = document.createElement('div');
    miniControllerElement.className = 'scrollhands-mini-controller';
    miniControllerElement.setAttribute('role', 'toolbar');
    miniControllerElement.setAttribute('aria-label', 'ScrollHandsFree on-page HUD');
    miniControllerElement.addEventListener('mouseenter', () => revealMiniController(9000));
    miniControllerElement.addEventListener('focusin', () => revealMiniController(9000));
    miniControllerElement.addEventListener('mouseleave', () => scheduleMiniControllerHide());
    miniControllerElement.addEventListener('focusout', () => scheduleMiniControllerHide());
    miniControllerElement.addEventListener('pointerdown', handleHudPointerDown);
    miniControllerElement.addEventListener('pointermove', handleHudPointerMove);
    miniControllerElement.addEventListener('pointerup', handleHudPointerUp);
    miniControllerElement.addEventListener('pointercancel', handleHudPointerUp);

    const topRow = document.createElement('div');
    topRow.className = 'scrollhands-hud-top';

    const status = document.createElement('div');
    status.className = 'scrollhands-hud-status';
    status.setAttribute('aria-live', 'polite');
    status.textContent = 'Ready on this page';
    topRow.appendChild(status);

    topRow.appendChild(createMiniButton('x', 'Hide on-page HUD', () => {
      miniControllerEnabled = false;
      hudEnabled = false;
      setMiniControllerMouseListener(false);
      if (miniControllerHideTimer) {
        clearTimeout(miniControllerHideTimer);
        miniControllerHideTimer = null;
      }
      notifyBackgroundScript('miniControllerClosed', {
        state: getScrollState()
      });
      notifyScrollState('HUD hidden');
    }, 'scrollhands-hud-hide'));
    miniControllerElement.appendChild(topRow);

    const progress = document.createElement('div');
    progress.className = 'scrollhands-hud-progress';
    progress.setAttribute('aria-hidden', 'true');
    const progressFill = document.createElement('span');
    progress.appendChild(progressFill);
    miniControllerElement.appendChild(progress);

    const controls = document.createElement('div');
    controls.className = 'scrollhands-hud-controls';

    controls.appendChild(createMiniButton('Pause', 'Pause or resume scrolling', () => {
      toggleAutoScroll();
      revealMiniController(9000);
    }, 'scrollhands-hud-pause'));
    controls.appendChild(createMiniButton('Stop', 'Stop scrolling', () => {
      stopAutoScroll();
      revealMiniController(9000);
    }, 'scrollhands-hud-stop'));
    controls.appendChild(createMiniButton('Slower', 'Slow down', () => {
      setScrollSpeed(currentSpeed - 10);
      revealMiniController(9000);
    }));
    controls.appendChild(createMiniButton('Faster', 'Speed up', () => {
      setScrollSpeed(currentSpeed + 10);
      revealMiniController(9000);
    }));
    controls.appendChild(createMiniButton('Up', 'Scroll upward', () => {
      startAutoScroll(currentSpeed, -1, endBehavior);
      revealMiniController(9000);
    }));
    controls.appendChild(createMiniButton('Down', 'Scroll downward', () => {
      startAutoScroll(currentSpeed, 1, endBehavior);
      revealMiniController(9000);
    }));
    controls.appendChild(createMiniButton('Top', 'Jump to top', () => {
      jumpToBoundary('top');
      revealMiniController(9000);
    }));
    miniControllerElement.appendChild(controls);

    document.body.appendChild(miniControllerElement);
    applyHudPosition();
    return miniControllerElement;
  }

  function updateMiniController(reveal = true) {
    const controller = ensureMiniController();
    const shouldShow = isHudVisibleEnabled();
    controller.classList.toggle('active', shouldShow);
    controller.classList.toggle('hidden', !shouldShow);
    applyHudPosition();
    setMiniControllerMouseListener(shouldShow);

    const pauseButton = controller.querySelector('.scrollhands-hud-pause');
    if (pauseButton) {
      pauseButton.textContent = isScrolling ? 'Pause' : 'Resume';
      pauseButton.title = isScrolling ? 'Pause scrolling' : 'Resume scrolling';
      pauseButton.setAttribute('aria-label', pauseButton.title);
    }

    const status = controller.querySelector('.scrollhands-hud-status');
    const progress = controller.querySelector('.scrollhands-hud-progress span');
    const state = getScrollState();
    if (status) {
      const directionLabel = state.direction === -1 ? 'up' : 'down';
      const timeLabel = state.timeRemainingSeconds > 0 ? ` · ${formatDuration(state.timeRemainingSeconds)} left` : '';
      const headingLabel = state.currentHeading ? ` · ${state.currentHeading}` : '';
      const stateLabel = state.status === 'scrolling' ? 'Scrolling' : state.status;
      status.textContent = `${stateLabel} ${directionLabel} · ${state.currentSpeed} px/sec · ${state.positionPercent}%${timeLabel}${headingLabel}`;
    }
    if (progress) {
      progress.style.setProperty('--scrollhands-progress', `${state.positionPercent}%`);
    }

    if (shouldShow && reveal) {
      revealMiniController(isScrolling ? 4200 : 9000);
    }
  }

  function publishRealtimeScrollState(timestamp = performance.now()) {
    if (timestamp - lastRealtimeStateSent < 250) {
      return;
    }

    lastRealtimeStateSent = timestamp;
    if (miniControllerElement || isHudVisibleEnabled()) {
      updateMiniController(false);
    }

    notifyBackgroundScript('scrollStateUpdate', {
      state: getScrollState(),
      transient: true
    });
  }

  function setMiniController(enabled) {
    readingMode = 'custom';
    miniControllerEnabled = Boolean(enabled);
    hudEnabled = Boolean(enabled);
    updateMiniController();
    notifyScrollState(isHudVisibleEnabled() ? 'HUD on' : 'HUD off');
    return getScrollState();
  }

  /**
   * Setup message listener for background script communication
   */
  function setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      try {
        if (!message?.command || message.target !== 'content') {
          return false;
        }

        if (message.settings) {
          applyRuntimeSettings(message.settings);
        }

        switch (message.command) {
          case 'ping':
            // Health check response
            sendResponse({ success: true, status: 'content_script_ready' });
            return true;
          case 'startScroll':
            sendResponse({
              success: true,
              state: startAutoScroll(message.speed, message.direction, message.endBehavior)
            });
            break;
          case 'toggleScroll':
            sendResponse({ success: true, state: toggleAutoScroll() });
            break;
          case 'pauseScroll':
            sendResponse({ success: true, state: pauseAutoScroll() });
            break;
          case 'stopScroll':
            sendResponse({ success: true, state: stopAutoScroll() });
            break;
          case 'setSpeed':
            sendResponse({ success: true, state: setScrollSpeed(message.speed) });
            break;
          case 'setSpeedPreset':
            sendResponse({ success: true, state: setSpeedPreset(message.preset) });
            break;
          case 'setEndBehavior':
            sendResponse({ success: true, state: setEndBehavior(message.endBehavior) });
            break;
          case 'setReadingMode':
            sendResponse({ success: true, state: applyReadingMode(message.mode) });
            break;
          case 'setFocusBand':
            sendResponse({ success: true, state: setFocusBand(message.enabled) });
            break;
          case 'setMiniController':
            sendResponse({ success: true, state: setMiniController(message.enabled) });
            break;
          case 'chooseScrollArea':
            sendResponse({ success: true, state: startChooseScrollArea() });
            break;
          case 'jumpToTop':
            sendResponse({ success: true, state: jumpToBoundary('top') });
            break;
          case 'jumpToBottom':
            sendResponse({ success: true, state: jumpToBoundary('bottom') });
            break;
          case 'jumpToNextHeading':
            sendResponse({ success: true, state: jumpToPageElement('heading') });
            break;
          case 'jumpBackParagraph':
            sendResponse({ success: true, state: jumpToPageElement('paragraph') });
            break;
          case 'resumePosition':
            sendResponse({ success: true, state: resumePosition(message.positionPercent) });
            break;
          case 'applyRuntimeSettings':
            sendResponse({ success: true, state: applyRuntimeSettings(message.settings || {}) });
            break;
          case 'getScrollState':
            sendResponse({ success: true, state: getScrollState() });
            break;
          case 'getAccessibilityHints':
            sendResponse({ success: true, hints: runAccessibilityChecks() });
            break;
          case 'getDiagnostics':
            sendResponse({ success: true, diagnostics: getDiagnostics() });
            break;
          case 'toggleVoice':
            // Handle tab-specific voice commands
            if (message.tabSpecific) {
              // Tab-specific mode - handle forced stop for cross-tab cleanup
              if (message.forceStop && !message.enabled) {
                forceStopVoiceRecognition(message.reason || 'forced stop');
              } else {
                // Normal toggle
                toggleVoiceRecognition(message.enabled);
                console.log(`Voice commands ${message.enabled ? 'enabled' : 'disabled'} for this tab only`);
              }
            } else {
              // Legacy mode for backwards compatibility
              toggleVoiceRecognition(message.enabled);
            }
            sendResponse({ success: true });
            break;
          case 'restoreVoice':
            // Tab-specific mode - ignore restore requests
            console.log('Voice restore ignored in tab-specific mode');
            sendResponse({ success: true });
            break;
          case 'showHelp':
            showHelpPopup();
            sendResponse({ success: true });
            break;
          case 'checkAccessibility':
            checkAccessibility();
            sendResponse({ success: true });
            break;
          default:
            return false;
        }
      } catch (error) {
        console.error('Error handling message:', error);
        sendResponse({ success: false, error: error.message });
      }
    });
  }

  function setupPageLifecycleVoiceCleanup() {
    const stopForPageExit = () => {
      forceStopVoiceRecognition('page navigation');
    };
    window.addEventListener('pagehide', stopForPageExit, { capture: true });
    window.addEventListener('beforeunload', stopForPageExit, { capture: true });
  }

  function forceStopVoiceRecognition(reason = 'forced stop') {
    voiceRecognitionEnabled = false;
    if (isRecognitionActive && recognition) {
      try {
        recognition.stop();
      } catch (error) {
        console.warn('Error force-stopping voice recognition:', error);
      }
    }
    isRecognitionActive = false;
    voiceRestartFailures = 0;
    console.log(`Voice commands force-stopped: ${reason}`);
  }

  function clampSpeed(speed) {
    const parsedSpeed = parseInt(speed, 10);
    if (Number.isNaN(parsedSpeed)) {
      return currentSpeed;
    }
    return Math.max(1, Math.min(100, parsedSpeed));
  }

  function getDocumentScrollTarget() {
    return document.scrollingElement || document.documentElement || document.body;
  }

  function isDocumentScrollTarget(target) {
    const documentTarget = getDocumentScrollTarget();
    return !target || target === documentTarget || target === document.documentElement || target === document.body;
  }

  function getScrollMetrics(target = scrollTarget) {
    if (isDocumentScrollTarget(target)) {
      const documentTarget = getDocumentScrollTarget();
      const maxScrollTop = Math.max(0, documentTarget.scrollHeight - window.innerHeight);
      return {
        top: Math.max(window.scrollY, documentTarget.scrollTop),
        max: maxScrollTop,
        height: window.innerHeight,
        scrollHeight: documentTarget.scrollHeight
      };
    }

    return {
      top: target.scrollTop,
      max: Math.max(0, target.scrollHeight - target.clientHeight),
      height: target.clientHeight,
      scrollHeight: target.scrollHeight
    };
  }

  function setScrollPosition(target, top) {
    lastProgrammaticScrollTime = performance.now();
    if (isDocumentScrollTarget(target)) {
      window.scrollTo({ top, behavior: 'auto' });
      return;
    }
    target.scrollTop = top;
  }

  function scrollTargetBy(target, amount) {
    lastProgrammaticScrollTime = performance.now();
    if (isDocumentScrollTarget(target)) {
      window.scrollBy(0, amount);
      return;
    }
    target.scrollTop += amount;
  }

  function isScrollableElement(element) {
    if (!element || element === document.body || element === document.documentElement) {
      return false;
    }

    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    const overflowY = style.overflowY;
    const hasScrollableOverflow = element.scrollHeight > element.clientHeight + 24;
    const allowsScroll = /(auto|scroll|overlay|hidden)/i.test(overflowY);

    return Boolean(
      allowsScroll &&
      hasScrollableOverflow &&
      rect.width >= 120 &&
      rect.height >= 120 &&
      style.display !== 'none' &&
      style.visibility !== 'hidden'
    );
  }

  function buildElementSelector(element) {
    if (!element || isDocumentScrollTarget(element)) {
      return '';
    }

    if (element.id && document.querySelectorAll(`#${CSS.escape(element.id)}`).length === 1) {
      return `#${CSS.escape(element.id)}`;
    }

    const parts = [];
    let current = element;
    while (current && current !== document.body && parts.length < 4) {
      const tag = current.tagName ? current.tagName.toLowerCase() : '';
      if (!tag) break;
      const classes = typeof current.className === 'string'
        ? current.className.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(name => `.${CSS.escape(name)}`).join('')
        : '';
      const parent = current.parentElement;
      const siblings = parent ? Array.from(parent.children).filter(child => child.tagName === current.tagName) : [];
      const nth = siblings.length > 1 ? `:nth-of-type(${siblings.indexOf(current) + 1})` : '';
      parts.unshift(`${tag}${classes}${nth}`);
      current = parent;
    }

    return parts.join(' > ');
  }

  function findConfiguredScrollTarget() {
    if (!scrollContainerSelector) {
      return null;
    }

    try {
      const candidate = document.querySelector(scrollContainerSelector);
      return isScrollableElement(candidate) ? candidate : null;
    } catch (error) {
      return null;
    }
  }

  function findScrollableTarget() {
    try {
      const configuredTarget = findConfiguredScrollTarget();
      if (configuredTarget) {
        return configuredTarget;
      }

      const centerElement = document.elementFromPoint(
        Math.max(1, Math.floor(window.innerWidth / 2)),
        Math.max(1, Math.floor(window.innerHeight / 2))
      );

      for (let element = centerElement; element && element !== document.body; element = element.parentElement) {
        if (isScrollableElement(element)) {
          return element;
        }
      }

      const focusedElement = document.activeElement;
      for (let element = focusedElement; element && element !== document.body; element = element.parentElement) {
        if (isScrollableElement(element)) {
          return element;
        }
      }

      const candidates = Array.from(document.querySelectorAll('main, article, section, div, [role="main"]'));
      let bestCandidate = null;
      let bestScore = 0;

      for (const candidate of candidates.slice(0, 1200)) {
        if (!isScrollableElement(candidate)) {
          continue;
        }

        const rect = candidate.getBoundingClientRect();
        const visibleWidth = Math.max(0, Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0));
        const visibleHeight = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0));
        const visibleArea = visibleWidth * visibleHeight;
        const scrollRange = candidate.scrollHeight - candidate.clientHeight;
        const score = visibleArea + scrollRange;

        if (score > bestScore) {
          bestCandidate = candidate;
          bestScore = score;
        }
      }

      if (bestCandidate) {
        return bestCandidate;
      }
    } catch (error) {
      console.warn('ScrollHands: Could not detect nested scroll area, using page scroll', error);
    }

    return getDocumentScrollTarget();
  }

  function startChooseScrollArea() {
    chooseScrollAreaMode = true;
    showVoiceFeedback('Click the area you want ScrollHandsFree to scroll.', 'info', 3500);
    document.addEventListener('mousemove', handleChooseAreaMove, true);
    document.addEventListener('click', handleChooseAreaClick, true);
    notifyScrollState('Choose a scroll area');
    return getScrollState();
  }

  function stopChooseScrollArea() {
    chooseScrollAreaMode = false;
    document.removeEventListener('mousemove', handleChooseAreaMove, true);
    document.removeEventListener('click', handleChooseAreaClick, true);
    const outline = document.querySelector('.scrollhands-choose-area-outline');
    if (outline) {
      outline.remove();
    }
  }

  function getScrollableAncestorFromPoint(clientX, clientY) {
    const element = document.elementFromPoint(clientX, clientY);
    for (let current = element; current && current !== document.body; current = current.parentElement) {
      if (isScrollableElement(current)) {
        return current;
      }
    }
    return getDocumentScrollTarget();
  }

  function ensureChooseAreaOutline() {
    let outline = document.querySelector('.scrollhands-choose-area-outline');
    if (!outline) {
      outline = document.createElement('div');
      outline.className = 'scrollhands-choose-area-outline';
      document.body.appendChild(outline);
    }
    return outline;
  }

  function handleChooseAreaMove(event) {
    if (!chooseScrollAreaMode) return;
    const target = getScrollableAncestorFromPoint(event.clientX, event.clientY);
    const outline = ensureChooseAreaOutline();
    if (isDocumentScrollTarget(target)) {
      outline.style.display = 'none';
      return;
    }
    const rect = target.getBoundingClientRect();
    outline.style.display = 'block';
    outline.style.left = `${Math.max(0, rect.left)}px`;
    outline.style.top = `${Math.max(0, rect.top)}px`;
    outline.style.width = `${Math.max(0, rect.width)}px`;
    outline.style.height = `${Math.max(0, rect.height)}px`;
  }

  function handleChooseAreaClick(event) {
    if (!chooseScrollAreaMode) return;
    event.preventDefault();
    event.stopPropagation();
    const target = getScrollableAncestorFromPoint(event.clientX, event.clientY);
    scrollTarget = target;
    scrollContainerSelector = buildElementSelector(target);
    stopChooseScrollArea();
    notifyScrollState(isDocumentScrollTarget(target) ? 'Using page scroll' : `Using ${describeScrollTarget(target)}`);
  }

  function describeScrollTarget(target = scrollTarget) {
    if (isDocumentScrollTarget(target)) {
      return 'page';
    }

    const tag = target.tagName ? target.tagName.toLowerCase() : 'element';
    const id = target.id ? `#${target.id}` : '';
    const className = typeof target.className === 'string'
      ? target.className.trim().split(/\s+/).slice(0, 2).map(name => `.${name}`).join('')
      : '';

    return `${tag}${id}${className}` || 'scroll area';
  }

  function getScrollPositionPercent(target = scrollTarget) {
    const metrics = getScrollMetrics(target);
    if (metrics.max <= 0) {
      return 0;
    }
    return Math.round((metrics.top / metrics.max) * 100);
  }

  function getTimeRemainingSeconds(target = scrollTarget) {
    if (!currentSpeed || currentSpeed <= 0) {
      return 0;
    }

    const metrics = getScrollMetrics(target);
    const remainingPixels = scrollDirection > 0 ? metrics.max - metrics.top : metrics.top;
    return Math.max(0, Math.round(remainingPixels / currentSpeed));
  }

  function formatDuration(seconds) {
    const safeSeconds = Math.max(0, Math.round(seconds));
    if (safeSeconds < 60) {
      return `${safeSeconds}s`;
    }
    const minutes = Math.floor(safeSeconds / 60);
    const remainder = safeSeconds % 60;
    return remainder ? `${minutes}m ${remainder}s` : `${minutes}m`;
  }

  function getCurrentHeading(target = scrollTarget) {
    const root = target && !isDocumentScrollTarget(target) ? target : document;
    const headings = Array.from(root.querySelectorAll('h1, h2, h3, h4, h5, h6, [role="heading"]'));
    const bandY = getReadingBandY();
    let bestHeading = '';
    let bestDistance = Infinity;

    for (const heading of headings.slice(0, 600)) {
      const rect = heading.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0 || rect.bottom < 0 || rect.top > window.innerHeight) {
        continue;
      }
      const distance = Math.abs(rect.top - bandY);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestHeading = (heading.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80);
      }
    }

    return bestHeading;
  }

  function getScrollState() {
    return {
      status: scrollStatus,
      isScrolling,
      isPaused,
      hasActiveSession: hasActiveScrollSession,
      currentSpeed,
      direction: scrollDirection,
      endBehavior,
      readingMode,
      focusBandEnabled,
      miniControllerEnabled,
      hudEnabled,
      hudPosition,
      focusBandHeight,
      focusDimOpacity,
      autoPauseAtHeadings,
      autoPauseOnUserScroll,
      readingRhythm,
      target: describeScrollTarget(scrollTarget),
      positionPercent: getScrollPositionPercent(scrollTarget),
      timeRemainingSeconds: getTimeRemainingSeconds(scrollTarget),
      currentHeading: getCurrentHeading(scrollTarget),
      lastKnownUrl: window.location.href,
      scrollContainerSelector,
      listening: voiceRecognitionEnabled,
      lastVoiceCommand: lastVoiceCommandText,
      voiceMessage: voiceRecognitionEnabled ? 'Listening' : 'Off',
      message: toDisplayText(lastScrollMessage, 'Ready on this page')
    };
  }

  function notifyScrollState(message) {
    if (message) {
      lastScrollMessage = toDisplayText(message, 'Ready');
    }

    if (miniControllerElement || isHudVisibleEnabled()) {
      updateMiniController();
    }

    notifyBackgroundScript('scrollStateUpdate', {
      state: getScrollState()
    });
  }

  function cancelScrollFrame() {
    if (scrollFrameId !== null) {
      cancelAnimationFrame(scrollFrameId);
      scrollFrameId = null;
    }
  }

  function clearAutoPauseResume() {
    autoPauseToken += 1;
    if (autoPauseResumeTimer) {
      clearTimeout(autoPauseResumeTimer);
      autoPauseResumeTimer = null;
    }
  }

  function temporarilyPauseAutoScroll(seconds, message) {
    if (!isScrolling || seconds <= 0) {
      return getScrollState();
    }

    const resumeDirection = scrollDirection;
    const resumeSpeed = currentSpeed;
    const resumeBehavior = endBehavior;
    const token = autoPauseToken + 1;
    autoPauseToken = token;

    cancelScrollFrame();
    isScrolling = false;
    isPaused = true;
    hasActiveScrollSession = true;
    scrollStatus = 'paused';
    scrollLastFrameTime = null;
    scrollRemainder = 0;
    notifyScrollState(message);

    autoPauseResumeTimer = setTimeout(() => {
      if (autoPauseToken !== token || !hasActiveScrollSession || scrollStatus !== 'paused') {
        return;
      }
      autoPauseResumeTimer = null;
      startAutoScroll(resumeSpeed, resumeDirection, resumeBehavior);
    }, seconds * 1000);

    return getScrollState();
  }

  function getReadingBandY() {
    if (scrollTarget && !isDocumentScrollTarget(scrollTarget)) {
      const rect = scrollTarget.getBoundingClientRect();
      if (rect.height > 0) {
        return rect.top + (rect.height * 0.38);
      }
    }
    return window.innerHeight * 0.42;
  }

  function maybePauseAtHeading(timestamp = performance.now()) {
    if (!autoPauseAtHeadings || headingPauseSeconds <= 0 || !isScrolling) {
      return;
    }

    if (timestamp - scrollStartedAt < 700) {
      return;
    }

    if (timestamp - lastHeadingPauseCheck < HEADING_PAUSE_CHECK_INTERVAL_MS) {
      return;
    }
    lastHeadingPauseCheck = timestamp;

    const headingRoot = scrollTarget && !isDocumentScrollTarget(scrollTarget) ? scrollTarget : document;
    const headings = Array.from(headingRoot.querySelectorAll('h1, h2, h3, h4, [role="heading"]')).slice(0, MAX_PAUSE_CANDIDATES);
    const bandY = getReadingBandY();

    for (const heading of headings) {
      if (pausedHeadingElements.has(heading)) {
        continue;
      }

      const rect = heading.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        continue;
      }

      const nearBand = rect.top >= bandY - 12 && rect.top <= bandY + 14;
      const visible = rect.bottom > 0 && rect.top < window.innerHeight;

      if (nearBand && visible) {
        pausedHeadingElements.add(heading);
        temporarilyPauseAutoScroll(headingPauseSeconds, 'Paused at heading');
        return;
      }
    }
  }

  function maybePauseAtContentBreak(timestamp = performance.now()) {
    if (readingRhythm === 'smooth' || !isScrolling) {
      return;
    }

    if (timestamp - scrollStartedAt < 1200) {
      return;
    }

    if (timestamp - lastContentBreakCheck < CONTENT_BREAK_CHECK_INTERVAL_MS) {
      return;
    }
    lastContentBreakCheck = timestamp;

    const root = scrollTarget && !isDocumentScrollTarget(scrollTarget) ? scrollTarget : document;
    const selector = readingRhythm === 'deliberate'
      ? 'p, figure, img, video, form, table, blockquote'
      : 'figure, video, form, table, blockquote';
    const candidates = Array.from(root.querySelectorAll(selector)).slice(0, MAX_PAUSE_CANDIDATES);
    const bandY = getReadingBandY();
    const pauseSeconds = readingRhythm === 'deliberate' ? 1.4 : 0.8;

    for (const node of candidates) {
      if (pausedBreakElements.has(node)) {
        continue;
      }
      const rect = node.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0 || rect.bottom < 0 || rect.top > window.innerHeight) {
        continue;
      }
      const nearBand = rect.top >= bandY - 8 && rect.top <= bandY + 10;
      if (nearBand) {
        pausedBreakElements.add(node);
        temporarilyPauseAutoScroll(pauseSeconds, 'Paused at natural break');
        return;
      }
    }
  }

  function handlePotentialUserScroll(event) {
    if (hasActiveScrollSession || isHudVisibleEnabled()) {
      publishRealtimeScrollState();
    }

    if (!autoPauseOnUserScroll || !isScrolling) {
      return;
    }

    const now = performance.now();
    if (now - lastProgrammaticScrollTime < 180) {
      return;
    }

    if (observedScrollTarget && event.target !== document && event.target !== observedScrollTarget && event.target !== document.scrollingElement) {
      return;
    }

    temporarilyPauseAutoScroll(userScrollPauseSeconds, 'Paused for manual scroll');
  }

  function observeScrollTarget(target) {
    if (observedScrollTarget && observedScrollTarget !== window && observedScrollTarget !== target) {
      observedScrollTarget.removeEventListener('scroll', handlePotentialUserScroll);
    }

    window.removeEventListener('scroll', handlePotentialUserScroll);
    window.addEventListener('scroll', handlePotentialUserScroll, { passive: true });

    if (target && !isDocumentScrollTarget(target)) {
      target.removeEventListener('scroll', handlePotentialUserScroll);
      target.addEventListener('scroll', handlePotentialUserScroll, { passive: true });
      observedScrollTarget = target;
    } else {
      observedScrollTarget = window;
    }
  }

  function completeScrollAtBoundary(message) {
    cancelScrollFrame();
    isScrolling = false;
    isPaused = false;
    hasActiveScrollSession = false;
    scrollStatus = 'ended';
    scrollLastFrameTime = null;
    scrollRemainder = 0;
    notifyScrollState(message);
    showVoiceFeedback(message, 'info');
  }

  function handleScrollBoundary() {
    const metrics = getScrollMetrics(scrollTarget);
    const reachedEnd = scrollDirection > 0;
    const message = reachedEnd ? 'Reached end' : 'Reached top';

    if (endBehavior === 'loop') {
      setScrollPosition(scrollTarget, reachedEnd ? 0 : metrics.max);
      scrollLastFrameTime = null;
      scrollRemainder = 0;
      notifyScrollState(reachedEnd ? 'Looped to top' : 'Looped to bottom');
      return;
    }

    if (endBehavior === 'reverse') {
      scrollDirection *= -1;
      scrollLastFrameTime = null;
      scrollRemainder = 0;
      notifyScrollState(`${message}. Reversing direction`);
      return;
    }

    completeScrollAtBoundary(message);
  }

  function isAtScrollBoundary() {
    const metrics = getScrollMetrics(scrollTarget);
    return scrollDirection > 0
      ? metrics.top >= metrics.max - 1
      : metrics.top <= 1;
  }

  function stepAutoScroll(timestamp) {
    if (!isScrolling) {
      return;
    }

    if (scrollLastFrameTime === null) {
      scrollLastFrameTime = timestamp;
    }

    const elapsedSeconds = Math.min((timestamp - scrollLastFrameTime) / 1000, 0.1);
    scrollLastFrameTime = timestamp;

    const requestedPixels = (currentSpeed * elapsedSeconds * scrollDirection) + scrollRemainder;
    const wholePixels = requestedPixels > 0 ? Math.floor(requestedPixels) : Math.ceil(requestedPixels);
    scrollRemainder = requestedPixels - wholePixels;

    if (wholePixels !== 0) {
      scrollTargetBy(scrollTarget, wholePixels);
    }

    if (isAtScrollBoundary()) {
      handleScrollBoundary();
    }

    if (isScrolling) {
      maybePauseAtHeading(timestamp);
    }

    if (isScrolling) {
      maybePauseAtContentBreak(timestamp);
    }

    if (isScrolling) {
      publishRealtimeScrollState(timestamp);
    }

    if (isScrolling) {
      scrollFrameId = requestAnimationFrame(stepAutoScroll);
    }
  }

  /**
   * Start or resume auto-scrolling with specified speed.
   * @param {number} speed - Scroll speed in pixels per second
   * @param {number} direction - Scroll direction (1 for down, -1 for up)
   * @param {string} behavior - End-of-page behavior: stop, loop, or reverse
   */
  function startAutoScroll(speed = currentSpeed, direction = scrollDirection, behavior = endBehavior) {
    try {
      clearAutoPauseResume();
      cancelScrollFrame();

      currentSpeed = clampSpeed(speed);
      scrollDirection = direction === -1 ? -1 : 1;
      endBehavior = ['stop', 'loop', 'reverse'].includes(behavior) ? behavior : endBehavior;
      scrollTarget = findScrollableTarget();
      observeScrollTarget(scrollTarget);

      if (getScrollMetrics(scrollTarget).max <= 0) {
        isScrolling = false;
        isPaused = false;
        hasActiveScrollSession = false;
        scrollStatus = 'stopped';
        const documentTarget = getDocumentScrollTarget();
        const shortPage = documentTarget.scrollHeight <= window.innerHeight + 120;
        notifyScrollState(shortPage
          ? 'This page is already short. Auto-scroll may not be useful.'
          : 'No scrollable content detected.');
        return getScrollState();
      }

      isScrolling = true;
      isPaused = false;
      hasActiveScrollSession = true;
      scrollStatus = 'scrolling';
      scrollLastFrameTime = null;
      scrollRemainder = 0;
      scrollStartedAt = performance.now();
      lastHeadingPauseCheck = 0;
      lastContentBreakCheck = 0;
      notifyScrollState(scrollDirection > 0 ? 'Scrolling down' : 'Scrolling up');
      scrollFrameId = requestAnimationFrame(stepAutoScroll);

      console.log(`Auto-scroll started at ${currentSpeed} pixels/second on ${describeScrollTarget(scrollTarget)}`);
      return getScrollState();
    } catch (error) {
      console.error('Error starting auto-scroll:', error);
      notifyScrollState("Couldn't start scrolling on this page.");
      return getScrollState();
    }
  }

  function pauseAutoScroll() {
    try {
      clearAutoPauseResume();
      if (!isScrolling) {
        return getScrollState();
      }

      cancelScrollFrame();
      isScrolling = false;
      isPaused = true;
      hasActiveScrollSession = true;
      scrollStatus = 'paused';
      scrollLastFrameTime = null;
      scrollRemainder = 0;
      notifyScrollState('Paused');
      console.log('Auto-scroll paused');
      return getScrollState();
    } catch (error) {
      console.error('Error pausing auto-scroll:', error);
      notifyScrollState('Error pausing scroll');
      return getScrollState();
    }
  }

  /**
   * Stop auto-scrolling and end the current session.
   */
  function stopAutoScroll(message = 'Stopped') {
    try {
      clearAutoPauseResume();
      cancelScrollFrame();
      isScrolling = false;
      isPaused = false;
      hasActiveScrollSession = false;
      scrollStatus = 'stopped';
      scrollLastFrameTime = null;
      scrollRemainder = 0;
      notifyScrollState(message);
      console.log('Auto-scroll stopped');
      return getScrollState();
    } catch (error) {
      console.error('Error stopping auto-scroll:', error);
      notifyScrollState('Error stopping scroll');
      return getScrollState();
    }
  }

  function toggleAutoScroll() {
    if (isScrolling) {
      return pauseAutoScroll();
    }
    return startAutoScroll(currentSpeed, scrollDirection, endBehavior);
  }

  /**
   * Set scroll speed while preserving current session state.
   * @param {number} speed - New speed in pixels per second
   */
  function setScrollSpeed(speed) {
    try {
      readingMode = 'custom';
      currentSpeed = clampSpeed(speed);
      notifyScrollState(`Speed set to ${currentSpeed}`);
      console.log(`Scroll speed set to ${currentSpeed} pixels/second`);
      return getScrollState();
    } catch (error) {
      console.error('Error setting scroll speed:', error);
      notifyScrollState('Error setting speed');
      return getScrollState();
    }
  }

  function setSpeedPreset(preset) {
    if (!Object.prototype.hasOwnProperty.call(SPEED_PRESETS, preset)) {
      return getScrollState();
    }
    return setScrollSpeed(SPEED_PRESETS[preset]);
  }

  function setEndBehavior(behavior) {
    if (['stop', 'loop', 'reverse'].includes(behavior)) {
      readingMode = 'custom';
      endBehavior = behavior;
      notifyScrollState(`End behavior: ${behavior}`);
    }
    return getScrollState();
  }

  function jumpToBoundary(boundary) {
    scrollTarget = scrollTarget || findScrollableTarget();
    const metrics = getScrollMetrics(scrollTarget);
    setScrollPosition(scrollTarget, boundary === 'top' ? 0 : metrics.max);
    notifyScrollState(boundary === 'top' ? 'Jumped to top' : 'Jumped to bottom');
    return getScrollState();
  }

  function jumpToPageElement(kind) {
    scrollTarget = scrollTarget || findScrollableTarget();
    const metrics = getScrollMetrics(scrollTarget);
    const selector = kind === 'heading' ? 'h1, h2, h3, h4, h5, h6' : 'p, li';
    const elements = Array.from(document.querySelectorAll(selector))
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      })
      .map((element) => ({
        element,
        top: getElementScrollTop(element, scrollTarget)
      }));

    const target = kind === 'heading'
      ? elements.find((item) => item.top > metrics.top + 32)
      : elements.reverse().find((item) => item.top < metrics.top - Math.max(60, metrics.height * 0.25));

    if (!target) {
      notifyScrollState(kind === 'heading' ? 'No next heading found' : 'No previous paragraph found');
      return getScrollState();
    }

    setScrollPosition(scrollTarget, Math.max(0, target.top - 18));
    notifyScrollState(kind === 'heading' ? 'Jumped to next heading' : 'Jumped back one paragraph');
    return getScrollState();
  }

  function getElementScrollTop(element, target) {
    if (isDocumentScrollTarget(target)) {
      return element.getBoundingClientRect().top + window.scrollY;
    }

    const elementRect = element.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    return elementRect.top - targetRect.top + target.scrollTop;
  }

  function resumePosition(positionPercent) {
    scrollTarget = scrollTarget || findScrollableTarget();
    const metrics = getScrollMetrics(scrollTarget);
    const percent = Math.max(0, Math.min(100, Number(positionPercent) || 0));
    setScrollPosition(scrollTarget, Math.round(metrics.max * (percent / 100)));
    notifyScrollState(`Resumed from ${Math.round(percent)}%`);
    return getScrollState();
  }

  function getDiagnostics() {
    const target = scrollTarget || findScrollableTarget();
    const metrics = getScrollMetrics(target);
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    return {
      contentScriptActive: true,
      pageScrollable: metrics.max > 0,
      scrollContainerDetected: !isDocumentScrollTarget(target),
      detectedTarget: describeScrollTarget(target),
      positionPercent: getScrollPositionPercent(target),
      voiceSupported: Boolean(SpeechRecognition),
      micPermissionState: voiceRecognitionEnabled ? 'active' : 'not requested',
      currentSpeed,
      currentState: getScrollState(),
      url: window.location.href
    };
  }

  function applyRuntimeSettings(settings = {}) {
    let shouldUpdateHud = false;
    if (typeof settings.currentSpeed === 'number') {
      currentSpeed = clampSpeed(settings.currentSpeed);
    }
    if (typeof settings.direction === 'number') {
      scrollDirection = settings.direction === -1 ? -1 : 1;
    }
    if (['stop', 'loop', 'reverse'].includes(settings.endBehavior)) {
      endBehavior = settings.endBehavior;
    }
    if (typeof settings.focusBandEnabled === 'boolean') {
      focusBandEnabled = settings.focusBandEnabled;
      updateFocusBandStyle();
      ensureFocusBand().classList.toggle('active', focusBandEnabled);
    }
    if (typeof settings.miniControllerEnabled === 'boolean') {
      miniControllerEnabled = settings.miniControllerEnabled;
      shouldUpdateHud = true;
    }
    if (typeof settings.hudEnabled === 'boolean') {
      hudEnabled = settings.hudEnabled;
      shouldUpdateHud = true;
    }
    if (settings.hudPosition && typeof settings.hudPosition === 'object') {
      hudPosition = {
        x: Number(settings.hudPosition.x) || 18,
        y: Number(settings.hudPosition.y) || 18
      };
      shouldUpdateHud = true;
    }
    if (typeof settings.focusBandHeight === 'number') {
      focusBandHeight = Math.max(12, Math.min(60, settings.focusBandHeight));
      updateFocusBandStyle();
    }
    if (typeof settings.focusDimOpacity === 'number') {
      focusDimOpacity = Math.max(0, Math.min(0.35, settings.focusDimOpacity));
      updateFocusBandStyle();
    }
    if (typeof settings.autoPauseAtHeadings === 'boolean') {
      autoPauseAtHeadings = settings.autoPauseAtHeadings;
    }
    if (typeof settings.headingPauseSeconds === 'number') {
      headingPauseSeconds = Math.max(0, Math.min(10, settings.headingPauseSeconds));
    }
    if (typeof settings.autoPauseOnUserScroll === 'boolean') {
      autoPauseOnUserScroll = settings.autoPauseOnUserScroll;
    }
    if (typeof settings.userScrollPauseSeconds === 'number') {
      userScrollPauseSeconds = Math.max(0.5, Math.min(10, settings.userScrollPauseSeconds));
    }
    if (typeof settings.readingRhythm === 'string') {
      readingRhythm = settings.readingRhythm;
    }
    if (typeof settings.voiceLanguage === 'string') {
      applyVoiceLanguage(settings.voiceLanguage);
    }
    if (settings.voiceAliases && typeof settings.voiceAliases === 'object') {
      customVoiceAliases = settings.voiceAliases;
    }
    if (settings.disabledCommands && typeof settings.disabledCommands === 'object') {
      disabledVoiceCommands = settings.disabledCommands;
    }
    if (typeof settings.scrollContainerSelector === 'string') {
      scrollContainerSelector = settings.scrollContainerSelector;
    }
    if (settings.readingMode && Object.prototype.hasOwnProperty.call(READING_MODE_PRESETS, settings.readingMode)) {
      readingMode = settings.readingMode;
    }
    if (shouldUpdateHud) {
      updateMiniController(true);
    }
    return getScrollState();
  }

  function applyReadingMode(mode) {
    if (!Object.prototype.hasOwnProperty.call(READING_MODE_PRESETS, mode)) {
      return getScrollState();
    }

    readingMode = mode;
    const preset = READING_MODE_PRESETS[mode];

    if (typeof preset.speed === 'number') {
      currentSpeed = clampSpeed(preset.speed);
    }
    if (preset.endBehavior) {
      endBehavior = preset.endBehavior;
    }
    if (typeof preset.focusBandEnabled === 'boolean') {
      focusBandEnabled = preset.focusBandEnabled;
      updateFocusBandStyle();
      ensureFocusBand().classList.toggle('active', focusBandEnabled);
    }
    if (typeof preset.miniControllerEnabled === 'boolean') {
      miniControllerEnabled = preset.miniControllerEnabled;
      hudEnabled = preset.miniControllerEnabled;
      updateMiniController();
    }
    if (typeof preset.autoPauseAtHeadings === 'boolean') {
      autoPauseAtHeadings = preset.autoPauseAtHeadings;
    }
    if (typeof preset.headingPauseSeconds === 'number') {
      headingPauseSeconds = preset.headingPauseSeconds;
    }
    if (typeof preset.readingRhythm === 'string') {
      readingRhythm = preset.readingRhythm;
    }

    notifyScrollState(mode === 'custom' ? 'Custom mode' : `${preset.label} mode`);
    return getScrollState();
  }

  /**
   * Initialize voice recognition
   */
  function initializeVoiceRecognition() {
    try {
      // Check if speech recognition is available
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

      if (!SpeechRecognition) {
        console.warn('Speech recognition not supported in this browser');
        return;
      }

      recognition = new SpeechRecognition();

      // Enhanced configuration for better accuracy
      recognition.continuous = true;
      recognition.lang = applyVoiceLanguage(voiceLanguage);
      recognition.interimResults = true; // Enable interim results for faster response
      recognition.maxAlternatives = 5; // Get more alternatives for better accuracy

      // Set speech recognition grammar for better command recognition
      if ('webkitSpeechGrammarList' in window) {
        const grammar = '#JSGF V1.0; grammar commands; public <command> = start | stop | faster | slower | up | down | top | bottom | focus on | focus off | bigger focus | smaller focus | help | speed | turbo;';
        const speechRecognitionList = new window.webkitSpeechGrammarList();
        speechRecognitionList.addFromString(grammar, 1);
        recognition.grammars = speechRecognitionList;
      }

      recognition.onresult = (event) => {
        try {
          // Process both interim and final results for faster response
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];

            // Process multiple alternatives for better accuracy
            let bestCommand = null;
            let bestConfidence = 0;

            for (let j = 0; j < result.length; j++) {
              const alternative = result[j];
              const command = alternative.transcript.trim().toLowerCase();
              const confidence = alternative.confidence || 0.8; // Default confidence

              // Check if this command is recognizable and has good confidence
              if (confidence > bestConfidence && isRecognizableCommand(command)) {
                bestCommand = command;
                bestConfidence = confidence;
              }
            }

            if (bestCommand) {
              if (result.isFinal) {
                processVoiceCommand(bestCommand, bestConfidence);
              } else {
                // Process interim results for quick commands with high confidence
                if (isQuickCommand(bestCommand) && bestConfidence > 0.7) {
                  processVoiceCommand(bestCommand, bestConfidence);
                }
              }
            }
          }
        } catch (error) {
          console.error('Error processing voice recognition result:', error);
        }
      };

      recognition.onstart = () => {
        console.log('Speech recognition started successfully');
        isRecognitionActive = true;
        voiceRestartFailures = 0;
        notifyBackgroundScript('voiceStatusUpdate', {
          status: 'Listening',
          enabled: true
        });
      };

      recognition.onerror = (event) => {
        const speechError = event.error || 'unknown';
        if (speechError === 'aborted') {
          console.log('Speech recognition aborted');
        } else if (speechError === 'no-speech') {
          console.log('No speech detected, continuing to listen...');
        } else {
          console.error('Speech recognition error:', speechError);
        }

        // Handle specific errors gracefully
        switch (speechError) {
          case 'no-speech':
            break;
          case 'audio-capture':
            console.error('Microphone access denied or unavailable');
            showVoiceFeedback('Microphone permission denied. You can still use auto-scroll.', 'error');
            voiceRecognitionEnabled = false;
            isRecognitionActive = false;
            break;
          case 'not-allowed':
            console.error('Speech recognition not allowed');
            showVoiceFeedback('Microphone permission denied. You can still use auto-scroll.', 'error');
            voiceRecognitionEnabled = false;
            isRecognitionActive = false;
            break;
          case 'aborted':
            isRecognitionActive = false;
            // Don't show error for aborted - it's usually from rapid restarts or tab switching
            // Only restart if voice is still enabled and we're not switching tabs
            if (voiceRecognitionEnabled) {
              setTimeout(() => {
                if (voiceRecognitionEnabled && !isRecognitionActive) {
                  try {
                    isRecognitionActive = true;
                    recognition.start();
                    console.log('Restarted speech recognition after abort');
                  } catch (restartError) {
                    console.warn('Could not restart speech recognition:', restartError);
                    isRecognitionActive = false;
                  }
                }
              }, 1000); // Longer delay for abort recovery
            }
            break;
          case 'network':
            console.error('Network error in speech recognition');
            showVoiceFeedback('Network error - speech recognition offline', 'error');
            break;
          default:
            console.error('Unknown speech recognition error:', event.error);
        }
      };

      recognition.onend = () => {
        console.log('Speech recognition ended');
        isRecognitionActive = false;

        // Only restart if voice is still enabled and not manually stopped
        if (voiceRecognitionEnabled) {
          // Add a longer delay to prevent rapid restart cycles and conflicts
          setTimeout(() => {
            try {
              // Double-check conditions before restarting
              if (voiceRecognitionEnabled && recognition && !isRecognitionActive && voiceRestartFailures < 3) {
                console.log('Restarting speech recognition...');
                isRecognitionActive = true;
                recognition.start();
              }
            } catch (error) {
              console.warn('Error restarting voice recognition:', error);
              isRecognitionActive = false;
              voiceRestartFailures += 1;

              // If restart fails, try one more time with even longer delay
              if (voiceRecognitionEnabled && voiceRestartFailures < 3) {
                setTimeout(() => {
                  try {
                    if (voiceRecognitionEnabled && !isRecognitionActive) {
                      isRecognitionActive = true;
                      recognition.start();
                      console.log('Speech recognition restarted after retry');
                    }
                  } catch (retryError) {
                    console.error('Failed to restart voice recognition after retry:', retryError);
                    isRecognitionActive = false;
                    voiceRestartFailures += 1;
                    showVoiceFeedback('Voice recognition stopped - click voice toggle to restart', 'error');
                  }
                }, 3000); // Much longer delay for retry
              } else if (voiceRestartFailures >= 3) {
                voiceRecognitionEnabled = false;
                showVoiceFeedback('Voice recognition stopped after repeated browser errors.', 'error');
              }
            }
          }, 1000); // Increased delay from 500ms to 1000ms
        }
      };

    } catch (error) {
      console.error('Error initializing voice recognition:', error);
    }
  }

  /**
   * Check if command is a quick action that should respond to interim results
   * @param {string} command - The voice command to check
   * @returns {boolean} - Whether this is a quick command
   */
  function isQuickCommand(command) {
    const quickCommands = [
      // Core controls
      'stop', 'halt', 'pause', 'freeze', 'hold',
      'start', 'begin', 'go', 'resume', 'continue',
      // Direction
      'up', 'down', 'forward', 'backward',
      // Speed
      'faster', 'slower', 'speed', 'turbo', 'slow', 'max', 'minimum', 'normal',
      // Position
      'top', 'bottom', 'middle',
      // Focus
      'focus', 'cinema', 'reader'
    ];
    return quickCommands.some(cmd => command.includes(cmd));
  }

  /**
   * Check if command contains recognizable voice patterns (multilingual support)
   * @param {string} command - The voice command to check
   * @returns {boolean} - Whether this command might be valid
   */
  function isRecognizableCommand(command) {
    if (!command || typeof command !== 'string') return false;

    const cleanCommand = command.trim().toLowerCase();
    for (const aliases of Object.values(customVoiceAliases || {})) {
      if (Array.isArray(aliases) && aliases.some(alias => cleanCommand.includes(String(alias).toLowerCase()))) {
        return true;
      }
    }

    // Check against all language patterns in our multilingual commands
    for (const [commandKey, commandData] of Object.entries(MULTILINGUAL_VOICE_COMMANDS)) {
      for (const [lang, patterns] of Object.entries(commandData.patterns)) {
        if (patterns.some(pattern =>
          cleanCommand.includes(pattern.toLowerCase()) ||
          pattern.toLowerCase().includes(cleanCommand)
        )) {
          return true;
        }
      }
    }

    // Also check for numbers which might be part of commands
    const numberWords = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0',
      'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
      'один', 'два', 'три', 'четыре', 'пять', // Russian
      'un', 'dos', 'tres', 'cuatro', 'cinco', // Spanish
      'un', 'deux', 'trois', 'quatre', 'cinq', // French
      'eins', 'zwei', 'drei', 'vier', 'fünf', // German
      'uno', 'due', 'tre', 'quattro', 'cinque', // Italian
      'um', 'dois', 'três', 'quatro', 'cinco' // Portuguese
    ];

    return numberWords.some(word => cleanCommand.includes(word));
  }

  function getVoiceAliases(commandKey) {
    const aliases = customVoiceAliases?.[commandKey];
    return Array.isArray(aliases)
      ? aliases.map(alias => String(alias).trim().toLowerCase()).filter(Boolean)
      : [];
  }

  function shouldProcessVoiceCommand(commandKey) {
    if (disabledVoiceCommands?.[commandKey]) {
      showVoiceFeedback(`Voice command "${commandKey}" is disabled.`, 'info');
      return false;
    }

    const now = Date.now();
    const cooldown = ['start', 'pause', 'stop', 'faster', 'slower'].includes(commandKey) ? 1100 : 800;
    if (voiceCommandCooldowns[commandKey] && now - voiceCommandCooldowns[commandKey] < cooldown) {
      return false;
    }
    voiceCommandCooldowns[commandKey] = now;
    return true;
  }

  /**
   * Process voice commands with enhanced matching and confidence handling
   * @param {string} command - The voice command to process
   * @param {number} confidence - Confidence level of the recognition (0-1)
   */
  function processVoiceCommand(command, confidence = 0.8) {
    try {
      // Only process high-confidence commands or known quick commands
      if (confidence < 0.6 && !isQuickCommand(command)) {
        console.log('Low confidence voice command ignored');
        return;
      }

      // Normalize command for better matching
      const normalizedCommand = command.toLowerCase().trim();
      lastVoiceCommandText = '';

      if (/^(focus on|reading focus on|focus mode on|focus)$/i.test(normalizedCommand)) {
        if (shouldProcessVoiceCommand('focusOn')) {
          setFocusBand(true);
          showVoiceFeedback('Reading Focus on');
        }
        return;
      }

      if (/^(focus off|reading focus off|focus mode off)$/i.test(normalizedCommand)) {
        if (shouldProcessVoiceCommand('focusOff')) {
          setFocusBand(false);
          showVoiceFeedback('Reading Focus off');
        }
        return;
      }

      if (/^(bigger focus|larger focus|increase focus)$/i.test(normalizedCommand)) {
        if (shouldProcessVoiceCommand('focusBigger')) {
          adjustFocusBand(6);
          showVoiceFeedback('Reading Focus bigger');
        }
        return;
      }

      if (/^(smaller focus|decrease focus|narrower focus)$/i.test(normalizedCommand)) {
        if (shouldProcessVoiceCommand('focusSmaller')) {
          adjustFocusBand(-6);
          showVoiceFeedback('Reading Focus smaller');
        }
        return;
      }

      // Check for percentage-based commands first (multilingual support)
      const speedMatch = normalizedCommand.match(/\b(?:faster|más rápido|plus vite|schneller|più veloce|mais rápido|быстрее|速く|快一点|빠르게|أسرع|तेज़|sneller|slower|más lento|plus lent|langsamer|più lento|mais lento|медленнее|遅く|慢一点|느리게|أبطأ|धीमा|langzamer|speed|velocidad|vitesse|geschwindigkeit|velocità|velocidade|скорость|速度|속도|سرعة|गति|snelheid)\s+(\d+)/);
      if (speedMatch) {
        const action = speedMatch[1].toLowerCase();
        const value = parseInt(speedMatch[2], 10);

        let newSpeed;
        // Check if it's a "set speed" command or a "faster/slower" command
        const isSetSpeed = ['speed', 'velocidad', 'vitesse', 'geschwindigkeit', 'velocità', 'velocidade', 'скорость', '速度', '속도', 'سرعة', 'गति', 'snelheid'].includes(action);
        const isFaster = ['faster', 'más rápido', 'plus vite', 'schneller', 'più veloce', 'mais rápido', 'быстрее', '速く', '快一点', '빠르게', 'أسرع', 'तेज़', 'sneller'].includes(action);

        if (isSetSpeed) {
          newSpeed = Math.max(1, Math.min(100, value));
        } else if (isFaster) {
          newSpeed = Math.min(100, value);
        } else {
          newSpeed = Math.max(1, value);
        }

        const commandKey = isSetSpeed ? 'speed' : (isFaster ? 'faster' : 'slower');
        if (!shouldProcessVoiceCommand(commandKey)) {
          return;
        }
        setScrollSpeed(newSpeed);
        lastVoiceCommandText = isSetSpeed ? 'speed' : (isFaster ? 'faster' : 'slower');
        notifyBackgroundScript('voiceFeedback', {
          message: `Command recognized: ${lastVoiceCommandText}`,
          commandType: 'success'
        });
        showVoiceFeedback(`Speed set to ${newSpeed}%`);
        return;
      }

      // Check for pause with duration (multilingual support)
      const pauseMatch = normalizedCommand.match(/\b(?:pause|pausar|pause|pausieren|pausa|pausar|пауза|一時停止|暂停|일시정지|وقفة|विराम|pauzeren|wait|esperar|attendre|warten|aspettare|esperar|ждать|待つ|等待|기다리다|انتظر|प्रतीक्षा|wachten|hold|mantener|tenir|halten|tenere|segurar|держать|保持|유지|احتفظ|पकड़ना|vasthouden)(?:\s+(?:for\s+)?(\d+)(?:\s*(seconds?|segundos?|secondes?|sekunden?|secondi?|segundos?|секунд|秒|초|ثواني|सेकंड|seconden|minutes?|minutos?|minutes?|minuten?|minuti?|minutos?|минут|分|분|دقائق|मिनट|minuten|mins?))?)?/);
      if (pauseMatch && pauseMatch[1]) {
        let seconds = parseInt(pauseMatch[1], 10);

        // Convert minutes to seconds
        if (pauseMatch[2] && (pauseMatch[2].includes('min') || pauseMatch[2].includes('分') || pauseMatch[2].includes('분') || pauseMatch[2].includes('دقائق') || pauseMatch[2].includes('मिनट'))) {
          seconds *= 60;
        }

        if (isScrolling) {
          if (!shouldProcessVoiceCommand('pause')) {
            return;
          }
          temporarilyPauseAutoScroll(seconds, `Pausing for ${seconds} seconds`);
        }
        lastVoiceCommandText = 'pause';
        notifyBackgroundScript('voiceFeedback', {
          message: 'Command recognized: pause',
          commandType: 'success'
        });
        showVoiceFeedback(`Pausing for ${seconds} seconds`);
        return;
      }

      // Match against defined multilingual voice commands
      for (const [commandKey, commandData] of Object.entries(MULTILINGUAL_VOICE_COMMANDS)) {
        const languagePatterns = commandData.patterns;

        // First try the active language, then fallback command dictionaries.
        const languagesToTry = [detectedLanguage, ...Object.keys(languagePatterns)];

        let matchFound = false;
        for (const lang of languagesToTry) {
          if (!languagePatterns[lang]) continue;

          const patterns = [...languagePatterns[lang], ...getVoiceAliases(commandKey)];
          matchFound = patterns.some(pattern => {
            const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            // Try both word boundary and simple inclusion for better matching
            const wordBoundaryRegex = new RegExp(`\\b${escapedPattern}\\b`, 'i');
            const inclusionMatch = normalizedCommand.includes(pattern.toLowerCase());
            return wordBoundaryRegex.test(normalizedCommand) || inclusionMatch;
          });

          if (matchFound) {
            console.log(`Matched "${commandKey}" command in language "${lang}"`);
            break;
          }
        }

        if (matchFound) {
          try {
            if (!shouldProcessVoiceCommand(commandKey)) {
              return;
            }
            lastVoiceCommandText = commandKey;
            notifyBackgroundScript('voiceFeedback', {
              message: `Command recognized: ${commandKey}`,
              commandType: 'success'
            });
            const result = commandData.action();
            const feedback = typeof result === 'string'
              ? result
              : commandData.feedback || `${commandKey} command executed`;
            showVoiceFeedback(feedback);
            return;
          } catch (error) {
            console.error(`Error executing command ${commandKey}:`, error);
            showVoiceFeedback(`Error executing ${commandKey}`, 'error');
            return;
          }
        }
      }

      // If no command matched, show help
      showVoiceFeedback("I didn't catch a ScrollHandsFree command. Try 'start,' 'stop,' or 'slower.'", 'error');
      console.log('Unrecognized voice command');

    } catch (error) {
      console.error('Error processing voice command:', error);
      showVoiceFeedback('Error processing voice command', 'error');
    }
  }

  /**
   * Toggle voice recognition on/off
   * @param {boolean} enabled - Whether to enable voice recognition
   */
  function toggleVoiceRecognition(enabled) {
    try {
      if (!recognition) {
        console.warn('Voice recognition not available');
        showVoiceFeedback('Voice commands are not supported in this browser, but auto-scroll still works.', 'error');
        notifyBackgroundScript('voiceStatusUpdate', {
          status: 'Voice commands are not supported in this browser, but auto-scroll still works.',
          enabled: false
        });
        return;
      }

      if (enabled && !voiceRecognitionEnabled) {
        // Enable voice recognition
        voiceRecognitionEnabled = true;

        // Force stop any existing recognition first to prevent conflicts
        if (isRecognitionActive) {
          try {
            recognition.stop();
            isRecognitionActive = false;
            console.log('Stopped existing recognition before starting new one');
          } catch (error) {
            console.warn('Error stopping existing recognition:', error);
          }
        }

        // Wait a moment before starting to ensure proper cleanup
        setTimeout(() => {
          if (!isRecognitionActive && voiceRecognitionEnabled) {
            try {
              isRecognitionActive = true;
              recognition.start();
              showVoiceFeedback('Voice commands are active for this tab.', 'info');
              console.log('Voice recognition started for this tab');

              // Save voice enabled state for persistence across pages
              saveVoiceState(true);

              // Notify background script if available
              notifyBackgroundScript('voiceStatusUpdate', {
                status: 'Voice commands are active for this tab.',
                enabled: true
              });
              notifyScrollState('Voice commands are active for this tab.');

            } catch (error) {
              console.error('Error starting voice recognition:', error);
              isRecognitionActive = false;
              voiceRecognitionEnabled = false;
              showVoiceFeedback('Failed to start voice commands', 'error');
            }
          }
        }, 200); // Increased delay to ensure proper cleanup

      } else if (!enabled && voiceRecognitionEnabled) {
        // Disable voice recognition
        voiceRecognitionEnabled = false;

        if (isRecognitionActive) {
          try {
            recognition.stop();
            isRecognitionActive = false;
            showVoiceFeedback('Voice commands disabled', 'info');
            console.log('Voice recognition stopped');

            // Save voice disabled state
            saveVoiceState(false);

            // Notify background script if available
            notifyBackgroundScript('voiceStatusUpdate', {
              status: 'Voice commands off',
              enabled: false
            });
            notifyScrollState('Voice commands off');

          } catch (error) {
            console.error('Error stopping voice recognition:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error toggling voice recognition:', error);
      showVoiceFeedback('Error toggling voice commands', 'error');
    }
  }

  /**
   * Tab-specific voice state - no global storage
   * Voice commands are now managed per-tab by the background script
   * @param {boolean} enabled - Voice recognition enabled state (ignored in tab-specific mode)
   */
  function saveVoiceState(enabled) {
    // Tab-specific mode: Don't save to global storage
    // Voice state is managed per-tab by the background script
    console.log(`Voice state for this tab: ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Safely notify background script if available
   * @param {string} command - Command to send
   * @param {object} data - Data to send
   */
  function notifyBackgroundScript(command, data) {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({
          target: 'background',
          command: command,
          ...data
        }).catch(() => {
          // Silently ignore if background script is not available
        });
      }
    } catch (error) {
      // Silently ignore messaging errors
    }
  }

  /**
   * Show basic accessibility hints using lightweight local checks.
   */
  async function checkAccessibility() {
    try {
      console.log('Running basic accessibility hint checks...');
      const results = runAccessibilityChecks();

      // Send results to background script
      chrome.runtime.sendMessage({
        target: 'background',
        command: 'accessibilityReport',
        data: results
      });

      console.log('Accessibility check completed:', results);

      // Show summary in console
      if (results.violations.length > 0) {
        console.warn(`Found ${results.violations.length} basic accessibility hint${results.violations.length === 1 ? '' : 's'}`);
        results.violations.forEach(violation => {
          console.warn(`- ${violation.description}`, violation.nodes);
        });
      } else {
        console.log('No basic issues found. This is not a full WCAG audit.');
      }

    } catch (error) {
      console.error('Error running accessibility check:', error);

      // Send error report
      chrome.runtime.sendMessage({
        target: 'background',
        command: 'accessibilityReport',
        data: {
          error: error.message,
          url: window.location.href,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  function runAccessibilityChecks() {
    const results = {
      violations: [],
      passes: [],
      incomplete: [],
      disclaimer: 'Basic hints only. This is not a full WCAG audit.',
      url: window.location.href,
      timestamp: new Date().toISOString()
    };

    const checks = [
      checkMissingAltText(),
      checkMissingHeadings(),
      checkColorContrast(),
      checkFormLabels(),
      checkKeyboardAccessibility(),
      checkAriaAttributes(),
      checkPageStructure()
    ];

    for (const check of checks) {
      if (check.violations.length > 0) {
        results.violations.push(...check.violations);
      } else {
        results.passes.push(check.rule);
      }
    }

    results.summary = results.violations.length === 0
      ? 'No basic issues found. This is not a full WCAG audit.'
      : `${results.violations.length} basic hint${results.violations.length === 1 ? '' : 's'} found.`;

    return results;
  }

  /**
   * Check for images without alt text
   */
  function checkMissingAltText() {
    const violations = [];
    const images = document.querySelectorAll('img');

    images.forEach((img, index) => {
      if (!img.alt && !img.getAttribute('aria-label') && !img.getAttribute('aria-labelledby')) {
        violations.push({
          id: 'image-alt',
          description: 'Images must have alternative text',
          impact: 'critical',
          nodes: [{
            element: 'img',
            target: `img:nth-of-type(${index + 1})`
          }]
        });
      }
    });

    return { rule: 'image-alt', violations };
  }

  /**
   * Check for proper heading structure
   */
  function checkMissingHeadings() {
    const violations = [];
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');

    if (headings.length === 0) {
      violations.push({
        id: 'page-has-heading-one',
        description: 'Page should have at least one heading',
        impact: 'moderate',
        nodes: [{
          element: 'html',
          target: 'html'
        }]
      });
    }

    // Check for h1
    const h1s = document.querySelectorAll('h1');
    if (h1s.length === 0) {
      violations.push({
        id: 'page-has-heading-one',
        description: 'Page should have exactly one h1 element',
        impact: 'moderate',
        nodes: [{
          element: 'html',
          target: 'html'
        }]
      });
    } else if (h1s.length > 1) {
      violations.push({
        id: 'page-has-heading-one',
        description: 'Page should have exactly one h1 element',
        impact: 'moderate',
        nodes: Array.from(h1s).map((h1, index) => ({
          element: 'h1',
          target: `h1:nth-of-type(${index + 1})`
        }))
      });
    }

    return { rule: 'heading-structure', violations };
  }

  /**
   * Check for basic color contrast issues
   */
  function checkColorContrast() {
    const violations = [];

    // Simple check for very light text on light backgrounds
    const textElements = document.querySelectorAll('p, span, div, a, button, input, label');

    textElements.forEach((element, index) => {
      const styles = window.getComputedStyle(element);
      const color = styles.color;
      const backgroundColor = styles.backgroundColor;

      // Basic check for very light colors (this is simplified)
      if (color.includes('rgb(255, 255, 255)') && backgroundColor.includes('rgb(255, 255, 255)')) {
        violations.push({
          id: 'color-contrast',
          description: 'Elements must have sufficient color contrast',
          impact: 'serious',
          nodes: [{
            element: element.tagName.toLowerCase(),
            target: element.tagName.toLowerCase() + ':nth-of-type(' + (index + 1) + ')'
          }]
        });
      }
    });

    return { rule: 'color-contrast', violations };
  }

  /**
   * Check for form labels
   */
  function checkFormLabels() {
    const violations = [];
    const inputs = document.querySelectorAll('input, select, textarea');

    inputs.forEach((input, index) => {
      const hasLabel = input.labels && input.labels.length > 0;
      const hasAriaLabel = input.getAttribute('aria-label');
      const hasAriaLabelledby = input.getAttribute('aria-labelledby');

      if (!hasLabel && !hasAriaLabel && !hasAriaLabelledby && input.type !== 'hidden' && input.type !== 'submit') {
        violations.push({
          id: 'label',
          description: 'Form elements must have labels',
          impact: 'critical',
          nodes: [{
            element: input.tagName.toLowerCase(),
            target: input.tagName.toLowerCase() + ':nth-of-type(' + (index + 1) + ')'
          }]
        });
      }
    });

    return { rule: 'form-labels', violations };
  }

  /**
   * Check for keyboard accessibility
   */
  function checkKeyboardAccessibility() {
    const violations = [];
    const interactiveElements = document.querySelectorAll('a, button, input, select, textarea, [tabindex]');

    interactiveElements.forEach((element, index) => {
      // Check if interactive elements are keyboard accessible
      const tabindex = element.getAttribute('tabindex');
      if (tabindex === '-1' && !element.disabled) {
        violations.push({
          id: 'keyboard-accessible',
          description: 'Interactive elements must be keyboard accessible',
          impact: 'serious',
          nodes: [{
            element: element.tagName.toLowerCase(),
            target: element.tagName.toLowerCase() + ':nth-of-type(' + (index + 1) + ')'
          }]
        });
      }
    });

    return { rule: 'keyboard-accessible', violations };
  }

  /**
   * Check for proper ARIA attributes
   */
  function checkAriaAttributes() {
    const violations = [];
    const elementsWithAria = document.querySelectorAll('[aria-label], [aria-labelledby], [aria-describedby], [role]');

    elementsWithAria.forEach((element, index) => {
      const ariaLabelledby = element.getAttribute('aria-labelledby');
      const ariaDescribedby = element.getAttribute('aria-describedby');

      // Check if referenced elements exist
      if (ariaLabelledby && !document.getElementById(ariaLabelledby)) {
        violations.push({
          id: 'aria-valid-attr-value',
          description: 'ARIA attributes must reference valid elements',
          impact: 'serious',
          nodes: [{
            element: element.tagName.toLowerCase(),
            target: element.tagName.toLowerCase() + ':nth-of-type(' + (index + 1) + ')'
          }]
        });
      }

      if (ariaDescribedby && !document.getElementById(ariaDescribedby)) {
        violations.push({
          id: 'aria-valid-attr-value',
          description: 'ARIA attributes must reference valid elements',
          impact: 'serious',
          nodes: [{
            element: element.tagName.toLowerCase(),
            target: element.tagName.toLowerCase() + ':nth-of-type(' + (index + 1) + ')'
          }]
        });
      }
    });

    return { rule: 'aria-attributes', violations };
  }

  /**
   * Check for proper page structure
   */
  function checkPageStructure() {
    const violations = [];

    // Check for main landmark
    const main = document.querySelector('main, [role="main"]');
    if (!main) {
      violations.push({
        id: 'landmark-main-is-top-level',
        description: 'Page should have a main landmark',
        impact: 'moderate',
        nodes: [{
          element: 'html',
          target: 'html'
        }]
      });
    }

    // Check for language attribute
    const html = document.documentElement;
    if (!html.getAttribute('lang')) {
      violations.push({
        id: 'html-has-lang',
        description: 'HTML element must have a lang attribute',
        impact: 'serious',
        nodes: [{
          element: 'html',
          target: 'html'
        }]
      });
    }

    return { rule: 'page-structure', violations };
  }

  /**
   * Test multilingual voice commands - for debugging
   * Call from browser console: window.testMultilingualCommands()
   */
  window.testMultilingualCommands = function() {
    console.log('Testing multilingual voice commands...');
    console.log('Detected language:', detectedLanguage);
    console.log('Available languages in MULTILINGUAL_VOICE_COMMANDS:');

    Object.keys(MULTILINGUAL_VOICE_COMMANDS).forEach(command => {
      const languages = Object.keys(MULTILINGUAL_VOICE_COMMANDS[command].patterns);
      console.log(`${command}: ${languages.join(', ')}`);
    });

    // Test a few commands in different languages
    const testCommands = [
      'start', // English
      'iniciar', // Spanish
      'commencer', // French
      'начать', // Russian
      '开始', // Chinese
      'शुरू करें' // Hindi
    ];

    testCommands.forEach((cmd, index) => {
      const recognized = isRecognizableCommand(cmd);
      console.log(`Test command ${index + 1}: ${recognized ? 'recognized' : 'not recognized'}`);
    });
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeContentScript);
  } else {
    initializeContentScript();
  }

})();
