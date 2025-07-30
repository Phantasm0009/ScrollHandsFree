/**
 * ScrollHands Free - Content Script
 * Implements auto-scrolling, voice control, and accessibility features
 * Runs on all web pages to provide hands-free browsing
 */

(() => {
  'use strict';

  // Prevent multiple instances
  if (window.scrollHandsContentScript) {
    return;
  }
  window.scrollHandsContentScript = true;

  // Auto-scroll state
  let scrollInterval = null;
  let currentSpeed = 50; // pixels per second
  let isScrolling = false;
  let scrollDirection = 1; // 1 for down, -1 for up

  // Voice control state
  let recognition = null;
  let voiceRecognitionEnabled = false;
  let isRecognitionActive = false;

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
      action: () => startAutoScroll(currentSpeed, 1),
      feedback: 'Started scrolling down'
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
        if (isScrolling) startAutoScroll(newSpeed, scrollDirection);
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
        if (isScrolling) startAutoScroll(newSpeed, scrollDirection);
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
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return 'Jumped to top of page';
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
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        return 'Jumped to bottom of page';
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
        if (isScrolling) startAutoScroll(100, scrollDirection);
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
        const scrollPercent = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
        return `Page position: ${scrollPercent}% down`;
      }
    }
  };

  // Auto-detect user's browser language for voice commands
  let detectedLanguage = 'en'; // Default to English
  try {
    // Try to detect user's preferred language
    const browserLang = navigator.language || navigator.userLanguage || 'en';
    const langCode = browserLang.split('-')[0].toLowerCase();
    
    // Check if we support this language
    const supportedLanguages = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'zh', 'ko', 'ar', 'hi', 'nl', 'sv', 'da', 'no'];
    if (supportedLanguages.includes(langCode)) {
      detectedLanguage = langCode;
    }
    console.log(`ScrollHands: Detected language ${detectedLanguage} for voice commands`);
  } catch (error) {
    console.warn('ScrollHands: Could not detect language, using English', error);
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
      
      // Auto-enable voice control if it was previously enabled
      checkAndRestoreVoiceControl();
      
      console.log('ScrollHands Free content script initialized');
    } catch (error) {
      console.error('Error initializing ScrollHands Free:', error);
    }
  }

  /**
   * Check if voice control was enabled for this specific tab
   * Note: Auto-restore is now disabled for tab-specific voice control
   */
  async function checkAndRestoreVoiceControl() {
    // Tab-specific voice control - no auto-restore
    // Voice control must be manually enabled from popup for each tab
    console.log('ScrollHands: Tab-specific voice control mode - no auto-restore');
  }

  /**
   * Show voice feedback popup on screen
   * @param {string} message - Message to display
   * @param {string} type - Type of message ('success', 'error', 'info')
   * @param {number} duration - Duration in milliseconds (default 2000)
   */
  function showVoiceFeedback(message, type = 'success', duration = 2000) {
    try {
      // Remove any existing feedback popup
      const existingPopup = document.querySelector('.scrollhands-voice-feedback');
      if (existingPopup) {
        existingPopup.remove();
      }

      // Create new feedback popup
      const popup = document.createElement('div');
      popup.className = `scrollhands-voice-feedback ${type}`;
      popup.textContent = message;
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
        message: message,
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

      popup.innerHTML = `
        <h3>🎤 Voice Commands</h3>
        <div>
          <strong>Control:</strong> <span class="command">start</span>, <span class="command">begin</span>, <span class="command">stop</span>, <span class="command">halt</span><br>
          <strong>Direction:</strong> <span class="command">up</span>, <span class="command">down</span>, <span class="command">backward</span>, <span class="command">forward</span><br>
          <strong>Speed:</strong> <span class="command">faster</span>, <span class="command">slower</span>, <span class="command">turbo</span>, <span class="command">max speed</span><br>
          <strong>Navigate:</strong> <span class="command">top</span>, <span class="command">bottom</span>, <span class="command">beginning</span>, <span class="command">end</span><br>
          <strong>Status:</strong> <span class="command">current speed</span>, <span class="command">where am I</span><br>
          <strong>Help:</strong> <span class="command">help</span>, <span class="command">what can I say</span>
        </div>
        <div style="margin-top: 8px; font-size: 12px; opacity: 0.9;">
          Say any command naturally. This popup will close automatically.
        </div>
      `;

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

  /**
   * Setup message listener for background script communication
   */
  function setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      try {
        switch (message.command) {
          case 'ping':
            // Health check response
            sendResponse({ success: true, status: 'content_script_ready' });
            return true;
          case 'startScroll':
            startAutoScroll(message.speed, message.direction);
            sendResponse({ success: true });
            break;
          case 'stopScroll':
            stopAutoScroll();
            sendResponse({ success: true });
            break;
          case 'setSpeed':
            setScrollSpeed(message.speed);
            sendResponse({ success: true });
            break;
          case 'toggleVoice':
            // Handle tab-specific voice control
            if (message.tabSpecific) {
              // Tab-specific mode - handle forced stop for cross-tab cleanup
              if (message.forceStop && !message.enabled) {
                // Force stop voice recognition immediately without feedback
                voiceRecognitionEnabled = false;
                if (isRecognitionActive && recognition) {
                  try {
                    recognition.stop();
                    isRecognitionActive = false;
                    console.log('Voice control force-stopped from another tab');
                  } catch (error) {
                    console.warn('Error force-stopping voice recognition:', error);
                    isRecognitionActive = false;
                  }
                }
              } else {
                // Normal toggle
                toggleVoiceRecognition(message.enabled);
                console.log(`Voice control ${message.enabled ? 'enabled' : 'disabled'} for this tab only`);
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
            console.warn('Unknown command:', message.command);
            sendResponse({ success: false, error: 'Unknown command' });
        }
      } catch (error) {
        console.error('Error handling message:', error);
        sendResponse({ success: false, error: error.message });
      }
    });
  }

  /**
   * Start auto-scrolling with specified speed
   * @param {number} speed - Scroll speed in pixels per second
   * @param {number} direction - Scroll direction (1 for down, -1 for up)
   */
  function startAutoScroll(speed = currentSpeed, direction = scrollDirection) {
    try {
      if (scrollInterval) {
        clearInterval(scrollInterval);
      }

      currentSpeed = Math.max(1, Math.min(100, speed));
      scrollDirection = direction;
      isScrolling = true;

      scrollInterval = setInterval(() => {
        // Scroll by direction (1 pixel up or down)
        window.scrollBy(0, scrollDirection * 1);

        // Check boundaries
        if (scrollDirection > 0) {
          // Scrolling down - check if at bottom
          const isAtBottom = (window.innerHeight + window.scrollY) >= 
            (document.documentElement.scrollHeight || document.body.scrollHeight);
          if (isAtBottom) {
            stopAutoScroll();
            console.log('Reached bottom of page');
          }
        } else {
          // Scrolling up - check if at top
          if (window.scrollY <= 0) {
            stopAutoScroll();
            console.log('Reached top of page');
          }
        }
      }, 1000 / currentSpeed);

      console.log(`Auto-scroll started at ${currentSpeed} pixels/second`);
    } catch (error) {
      console.error('Error starting auto-scroll:', error);
    }
  }

  /**
   * Stop auto-scrolling
   */
  function stopAutoScroll() {
    try {
      if (scrollInterval) {
        clearInterval(scrollInterval);
        scrollInterval = null;
      }
      isScrolling = false;
      console.log('Auto-scroll stopped');
    } catch (error) {
      console.error('Error stopping auto-scroll:', error);
    }
  }

  /**
   * Set scroll speed and restart if currently scrolling
   * @param {number} speed - New speed in pixels per second
   */
  function setScrollSpeed(speed) {
    try {
      currentSpeed = Math.max(1, Math.min(100, speed)); // Clamp between 1-100
      
      if (isScrolling) {
        stopAutoScroll();
        startAutoScroll(currentSpeed);
      }
      
      console.log(`Scroll speed set to ${currentSpeed} pixels/second`);
    } catch (error) {
      console.error('Error setting scroll speed:', error);
    }
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
      recognition.lang = 'en-US';
      recognition.interimResults = true; // Enable interim results for faster response
      recognition.maxAlternatives = 5; // Get more alternatives for better accuracy
      
      // Additional configuration for better performance
      if ('webkitSpeechRecognition' in window) {
        // Webkit-specific improvements
        recognition.serviceURI = 'wss://www.google.com/speech-api/v2/recognize';
      }
      
      // Set speech recognition grammar for better command recognition
      if ('webkitSpeechGrammarList' in window) {
        const grammar = '#JSGF V1.0; grammar commands; public <command> = start | stop | faster | slower | up | down | top | bottom | focus | help | speed | turbo;';
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
                console.log(`Final voice command: "${bestCommand}" (confidence: ${bestConfidence})`);
                processVoiceCommand(bestCommand, bestConfidence);
              } else {
                // Process interim results for quick commands with high confidence
                if (isQuickCommand(bestCommand) && bestConfidence > 0.7) {
                  console.log(`Quick interim command: "${bestCommand}" (confidence: ${bestConfidence})`);
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
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        
        // Handle specific errors gracefully
        switch (event.error) {
          case 'no-speech':
            console.log('No speech detected, continuing to listen...');
            break;
          case 'audio-capture':
            console.error('Microphone access denied or unavailable');
            showVoiceFeedback('Microphone access denied', 'error');
            voiceRecognitionEnabled = false;
            isRecognitionActive = false;
            break;
          case 'not-allowed':
            console.error('Speech recognition not allowed');
            showVoiceFeedback('Speech recognition not allowed', 'error');
            voiceRecognitionEnabled = false;
            isRecognitionActive = false;
            break;
          case 'aborted':
            console.log('Speech recognition aborted - likely due to tab switching or restart');
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
              if (voiceRecognitionEnabled && recognition && !isRecognitionActive) {
                console.log('Restarting speech recognition...');
                isRecognitionActive = true;
                recognition.start();
              }
            } catch (error) {
              console.warn('Error restarting voice recognition:', error);
              isRecognitionActive = false;
              
              // If restart fails, try one more time with even longer delay
              if (voiceRecognitionEnabled) {
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
                    showVoiceFeedback('Voice recognition stopped - click voice toggle to restart', 'error');
                  }
                }, 3000); // Much longer delay for retry
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

  /**
   * Process voice commands with enhanced matching and confidence handling
   * @param {string} command - The voice command to process
   * @param {number} confidence - Confidence level of the recognition (0-1)
   */
  function processVoiceCommand(command, confidence = 0.8) {
    try {
      console.log(`Processing voice command: "${command}" (confidence: ${confidence})`);
      
      // Only process high-confidence commands or known quick commands
      if (confidence < 0.6 && !isQuickCommand(command)) {
        console.log('Low confidence command ignored:', command);
        return;
      }
      
      // Normalize command for better matching
      const normalizedCommand = command.toLowerCase().trim();

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
        
        setScrollSpeed(newSpeed);
        if (isScrolling) startAutoScroll(newSpeed, scrollDirection);
        showVoiceFeedback(`Speed set to ${newSpeed}%`);
        return;
      }

      // Check for pause with duration (multilingual support)
      const pauseMatch = normalizedCommand.match(/\b(?:pause|pausar|pause|pausieren|pausa|pausar|пауза|一時停止|暂停|일시정지|وقفة|विराम|pauzeren|wait|esperar|attendre|warten|aspettare|esperar|ждать|待つ|等待|기다리다|انتظر|प्रतीक्षा|wachten|hold|mantener|tenir|halten|tenere|segurar|держать|保持|유지|احتفظ|पकड़ना|vasthouden)(?:\s+(?:for\s+)?(\d+)(?:\s*(seconds?|segundos?|secondes?|sekunden?|secondi?|segundos?|секунд|秒|초|ثواني|सेकंड|seconden|minutes?|minutos?|minutes?|minuten?|minuti?|minutos?|минут|分|분|دقائق|मिनट|minuten|mins?))?)?/);
      if (pauseMatch) {
        let seconds = pauseMatch[1] ? parseInt(pauseMatch[1], 10) : 5;
        
        // Convert minutes to seconds
        if (pauseMatch[2] && (pauseMatch[2].includes('min') || pauseMatch[2].includes('分') || pauseMatch[2].includes('분') || pauseMatch[2].includes('دقائق') || pauseMatch[2].includes('मिनट'))) {
          seconds *= 60;
        }
        
        const wasScrolling = isScrolling;
        const previousDirection = scrollDirection;
        
        stopAutoScroll();
        showVoiceFeedback(`Pausing for ${seconds} seconds`);
        
        setTimeout(() => {
          if (wasScrolling) {
            startAutoScroll(currentSpeed, previousDirection);
            showVoiceFeedback('Resuming auto-scroll');
          }
        }, seconds * 1000);
        return;
      }

      // Match against defined multilingual voice commands
      for (const [commandKey, commandData] of Object.entries(MULTILINGUAL_VOICE_COMMANDS)) {
        const languagePatterns = commandData.patterns;
        
        // First try the detected language, then try all languages
        const languagesToTry = [detectedLanguage, ...Object.keys(languagePatterns)];
        
        let matchFound = false;
        for (const lang of languagesToTry) {
          if (!languagePatterns[lang]) continue;
          
          const patterns = languagePatterns[lang];
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
            const result = commandData.action();
            const feedback = result || commandData.feedback || `${commandKey} command executed`;
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
      showVoiceFeedback('Command not recognized. Say "help" for available commands.', 'error');
      console.log('Unrecognized voice command:', normalizedCommand);
      
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
              showVoiceFeedback('Voice control enabled - This tab only', 'info');
              console.log('Voice recognition started for this tab');
              
              // Save voice enabled state for persistence across pages
              saveVoiceState(true);
              
              // Notify background script if available
              notifyBackgroundScript('voiceStatusUpdate', {
                status: 'Voice control active',
                enabled: true
              });
              
            } catch (error) {
              console.error('Error starting voice recognition:', error);
              isRecognitionActive = false;
              voiceRecognitionEnabled = false;
              showVoiceFeedback('Failed to start voice control', 'error');
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
            showVoiceFeedback('Voice control disabled', 'info');
            console.log('Voice recognition stopped');
            
            // Save voice disabled state
            saveVoiceState(false);
            
            // Notify background script if available
            notifyBackgroundScript('voiceStatusUpdate', {
              status: 'Voice control off',
              enabled: false
            });
            
          } catch (error) {
            console.error('Error stopping voice recognition:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error toggling voice recognition:', error);
      showVoiceFeedback('Error toggling voice control', 'error');
    }
  }

  /**
   * Tab-specific voice state - no global storage
   * Voice control is now managed per-tab by the background script
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
   * Check accessibility using built-in checks
   */
  async function checkAccessibility() {
    try {
      console.log('Running built-in accessibility check...');
      
      const results = {
        violations: [],
        passes: [],
        incomplete: [],
        url: window.location.href,
        timestamp: new Date().toISOString()
      };

      // Basic accessibility checks we can perform without external libraries
      const checks = [
        checkMissingAltText(),
        checkMissingHeadings(),
        checkColorContrast(),
        checkFormLabels(),
        checkKeyboardAccessibility(),
        checkAriaAttributes(),
        checkPageStructure()
      ];

      // Process all checks
      for (const check of checks) {
        if (check.violations.length > 0) {
          results.violations.push(...check.violations);
        } else {
          results.passes.push(check.rule);
        }
      }

      // Send results to background script
      chrome.runtime.sendMessage({
        type: 'accessibilityReport',
        data: results
      });

      console.log('Accessibility check completed:', results);
      
      // Show summary in console
      if (results.violations.length > 0) {
        console.warn(`Found ${results.violations.length} accessibility issues`);
        results.violations.forEach(violation => {
          console.warn(`- ${violation.description}`, violation.nodes);
        });
      } else {
        console.log('No accessibility violations found!');
      }

    } catch (error) {
      console.error('Error running accessibility check:', error);
      
      // Send error report
      chrome.runtime.sendMessage({
        type: 'accessibilityReport',
        data: {
          error: error.message,
          url: window.location.href,
          timestamp: new Date().toISOString()
        }
      });
    }
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
            html: img.outerHTML.substring(0, 100) + '...',
            target: `img:nth-child(${index + 1})`
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
          html: '<html>',
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
          html: '<html>',
          target: 'html'
        }]
      });
    } else if (h1s.length > 1) {
      violations.push({
        id: 'page-has-heading-one',
        description: 'Page should have exactly one h1 element',
        impact: 'moderate',
        nodes: Array.from(h1s).map((h1, index) => ({
          html: h1.outerHTML.substring(0, 100) + '...',
          target: `h1:nth-child(${index + 1})`
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
            html: element.outerHTML.substring(0, 100) + '...',
            target: element.tagName.toLowerCase() + ':nth-child(' + (index + 1) + ')'
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
            html: input.outerHTML.substring(0, 100) + '...',
            target: input.tagName.toLowerCase() + ':nth-child(' + (index + 1) + ')'
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
            html: element.outerHTML.substring(0, 100) + '...',
            target: element.tagName.toLowerCase() + ':nth-child(' + (index + 1) + ')'
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
            html: element.outerHTML.substring(0, 100) + '...',
            target: element.tagName.toLowerCase() + ':nth-child(' + (index + 1) + ')'
          }]
        });
      }
      
      if (ariaDescribedby && !document.getElementById(ariaDescribedby)) {
        violations.push({
          id: 'aria-valid-attr-value',
          description: 'ARIA attributes must reference valid elements',
          impact: 'serious',
          nodes: [{
            html: element.outerHTML.substring(0, 100) + '...',
            target: element.tagName.toLowerCase() + ':nth-child(' + (index + 1) + ')'
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
          html: '<html>',
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
          html: '<html>',
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
    
    testCommands.forEach(cmd => {
      console.log(`Testing command: "${cmd}"`);
      const recognized = isRecognizableCommand(cmd);
      console.log(`Recognized: ${recognized}`);
    });
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeContentScript);
  } else {
    initializeContentScript();
  }

})();
