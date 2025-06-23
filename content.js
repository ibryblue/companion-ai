class AICompanion {
  constructor() {
    this.avatar = null;
    this.speechBubble = null;
    this.isMuted = false;
    this.useAI = true;
    this.character = 'Zoro'; // Default character
    this.speaking = false;

    this.lastMessageTime = { click: 0, scroll: 0, typing: 0 };
    this.cooldowns = { click: 8000, scroll: 10000, typing: 5000 }; // More relaxed timings

    this.lastScrollY = window.scrollY;
    this.scrollTriggerDelta = 200; // Scroll must move by 200px
    this.lastTypingField = null;
    this.typingTriggeredForField = false;
    this.typingTimeout = null;
    this.isDragging = false;
    this.dragOffset = { x: 0, y: 0 };
    this.lastTypingInputValue = '';
    this.typingStartTime = null;
    this.lastTypingTriggerTime = 0;
    this.idleAnimInterval = null;
    this.idleRemarkTimeout = null;
    this.lastUserActivity = Date.now();
    this.mood = {
      energy: 70,
      focus: 70,
      lastScrolls: 0,
      lastTyping: 0
    };
    this.walkingEnabled = true; // for future toggle
    this.walkTimeout = null;
    this.isHovered = false;
    this.lastWalkTime = Date.now();
    this.characters = {
      'Zoro': {
        avatar: 'zoro.gif',
        voice: 'gruff swordsman',
        lines: {
          scroll: [
            "Oi, you lost again? Pay attention to where you're going.",
            "You sure you know where you're headed?",
            "Don't get lost on the web too!"
          ],
          click: [
            "Three swords, one click. That's how it's done.",
            "Clicked like a true swordsman.",
            "Hope that was the right button."
          ],
          typing: [
            "You better not be writing directions...",
            "Don't write a novel, just a map.",
            "Typing, huh? Don't get lost in your words."
          ]
        }
      },
      'Batman': {
        avatar: 'batman.gif',
        voice: 'dark and brooding',
        lines: {
          scroll: [
            "Justice never sleeps. Neither do I.",
            "Scanning for crime as you scroll.",
            "Stay vigilant, even when scrolling."
          ],
          click: [
            "I am vengeance. I am the click.",
            "Clicked. Justice is served.",
            "Every click leaves a trace."
          ],
          typing: [
            "Are you hacking the Batcomputer again?",
            "Careful, the Joker might be watching your keystrokes.",
            "Type wisely. Gotham depends on it."
          ]
        }
      },
      'Morty': {
        avatar: 'morty.gif',
        voice: 'nervous and high-pitched',
        lines: {
          scroll: [
            "Aw jeez, you're scrolling kinda fast there!",
            "Whoa, slow down!",
            "Hope you don't get motion sickness, Morty!"
          ],
          click: [
            "Oh man, did you mean to click that?",
            "Uh, was that on purpose?",
            "Clicks make me nervous, Rick!"
          ],
          typing: [
            "Uh, what are you typing, exactly?",
            "Careful, don't type anything weird!",
            "Typing is harder than it looks, y'know?"
          ]
        }
      },
      'Maomao': {
        avatar: 'cheerful-girl.gif',
        voice: 'curious and smart',
        lines: {
          scroll: [
            "Hmm, scrolling again? Are you looking for herbs?",
            "Careful, you might miss something important!",
            "Are you searching for rare ingredients?"
          ],
          click: [
            "Be careful! You clicked... something strange!",
            "Click detected! Was it intentional?",
            "I hope that wasn't a poison trap."
          ],
          typing: [
            "Taking notes? Good. Keep writing!",
            "Writing a recipe, perhaps?",
            "Don't mind me, just analyzing toxins."
          ]
        }
      }
    };
    this.idleLines = {
      'Zoro': [
        'Where did everyone go?',
        'I could use a nap... or a map.',
        'Don\'t get lost now.'
      ],
      'Batman': [
        'Justice never takes a break.',
        'The night is quiet... too quiet.',
        'Stay vigilant.'
      ],
      'Morty': [
        'Uh, is anyone still here?',
        'Aw jeez, it\'s kinda quiet...',
        'Rick? You there?'
      ],
      'Maomao': [
        'Hmm… are you brewing something?',
        'Do you need some poison advice?',
        'It\'s so peaceful... almost suspicious.'
      ]
    };
    this.loadPreferences();
    this.init();
    this.chatLog = [];
    this.chatWindow = null;
    this.isChatOpen = false;
  }

  init() {
    this.createAvatar();
    this.createSpeechBubble();
    this.createSettingsPanel();
    this.attachEventListeners();
    this.updateBubblePosition();
    window.addEventListener('resize', () => this.updateBubblePosition());
  }

  loadPreferences() {
    try {
      const mute = localStorage.getItem('aiCompanionMute');
      const ai = localStorage.getItem('aiCompanionAI');
      const character = localStorage.getItem('aiCompanionCharacter');
      if (mute !== null) this.isMuted = mute === 'true';
      if (ai !== null) this.useAI = ai === 'true';
      if (character && this.characters[character]) this.character = character;
    } catch (e) {}
  }

  savePreferences() {
    try {
      localStorage.setItem('aiCompanionMute', this.isMuted);
      localStorage.setItem('aiCompanionAI', this.useAI);
      localStorage.setItem('aiCompanionCharacter', this.character);
    } catch (e) {}
  }
  
  createAvatar() {
    if (document.getElementById('ai-companion-avatar')) return;
    this.avatar = document.createElement('div');
    this.avatar.id = 'ai-companion-avatar';
    this.avatar.style.position = 'fixed';
    const saved = localStorage.getItem('aiCompanionAvatarPos');
    if (saved) {
      try {
        const pos = JSON.parse(saved);
        this.avatar.style.left = pos.left;
        this.avatar.style.top = pos.top;
        this.avatar.style.right = 'auto';
        this.avatar.style.bottom = 'auto';
      } catch (e) {}
    } else {
      this.avatar.style.bottom = '20px';
      this.avatar.style.right = '20px';
    }
    this.avatar.style.zIndex = '999999';
    this.avatar.style.transition = 'transform 0.2s cubic-bezier(.4,2,.6,1), opacity 0.5s';
    this.avatar.style.cursor = 'grab';
    this.avatar.style.opacity = '0';
    this.updateAvatarImage();
    document.body.appendChild(this.avatar);
    setTimeout(() => { this.avatar.style.opacity = '1'; }, 50);
    this.avatar.addEventListener('mousedown', (e) => this.startDrag(e));
    this.avatar.addEventListener('mouseenter', () => this.handlePetting());
    this.avatar.addEventListener('mouseleave', () => this.isHovered = false);
    this.avatar.addEventListener('click', () => this.toggleChatWindow());
    this.startIdleAnimation();
    this.startIdleRemarks();
    this.startRandomWalk();
  }

  updateAvatarImage() {
    if (!this.avatar) return;
    const char = this.characters[this.character];
    const imgPath = chrome.runtime.getURL('images/' + char.avatar);
    this.avatar.innerHTML = '';
    const img = document.createElement('img');
    img.src = imgPath;
    img.style.width = '60px';
    img.style.height = '60px';
    img.style.borderRadius = '50%';
    img.alt = this.character + ' avatar';
    this.avatar.appendChild(img);
    let ring = '';
    if (this.character === 'Maomao') ring = '0 0 8px 2px #a2f3b1';
    else if (this.character === 'Zoro') ring = '0 0 8px 2px #6fd3f7';
    else if (this.character === 'Batman') ring = '0 0 8px 2px #4444cc';
    else if (this.character === 'Morty') ring = '0 0 8px 2px #ffe066';
    this.avatar.style.boxShadow = ring;
  }
  
  createSpeechBubble() {
    this.speechBubble = document.createElement('div');
    this.speechBubble.id = 'ai-companion-speech';
    this.speechBubble.style.position = 'fixed';
    this.speechBubble.style.background = '#fff';
    this.speechBubble.style.padding = '10px 16px';
    this.speechBubble.style.borderRadius = '16px';
    this.speechBubble.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)';
    this.speechBubble.style.display = 'none';
    this.speechBubble.style.zIndex = '999999';
    this.speechBubble.style.pointerEvents = 'none';
    document.body.appendChild(this.speechBubble);
  }

  createSettingsPanel() {
    if (document.getElementById('ai-companion-settings')) return;
    const panel = document.createElement('div');
    panel.id = 'ai-companion-settings';
    panel.style.position = 'fixed';
    panel.style.bottom = '20px';
    panel.style.left = '-160px';
    panel.style.background = '#fff';
    panel.style.border = '1px solid #ddd';
    panel.style.borderRadius = '12px';
    panel.style.boxShadow = '0 2px 8px rgba(0,0,0,0.10)';
    panel.style.padding = '12px 18px 12px 18px';
    panel.style.zIndex = '1000000';
    panel.style.fontFamily = 'inherit';
    panel.style.minWidth = '180px';
    panel.style.opacity = '0.5';
    panel.style.transition = 'opacity 0.2s, left 0.2s';
    panel.onmouseenter = () => {
      panel.style.opacity = '1';
      panel.style.left = '20px';
    };
    panel.onmouseleave = () => {
      panel.style.opacity = '0.5';
      panel.style.left = '-160px';
    };
    let charOptions = Object.keys(this.characters).map(
      c => `<option value="${c}">${c}</option>`
    ).join('');
    panel.innerHTML = `
      <div style="font-weight:bold;margin-bottom:8px;">Companion Settings</div>
      <div style="margin-bottom:8px;">
        <label>Character:
          <select id="ai-character-select">${charOptions}</select>
        </label>
      </div>
      <div style="margin-bottom:8px;">
        <label><input type="checkbox" id="ai-mute-toggle"> Mute Voice</label>
      </div>
      <div>
        <label><input type="checkbox" id="ai-mode-toggle"> AI Replies</label>
      </div>
    `;
    document.body.appendChild(panel);
    setTimeout(() => {
      document.getElementById('ai-mute-toggle').checked = this.isMuted;
      document.getElementById('ai-mode-toggle').checked = this.useAI;
      document.getElementById('ai-character-select').value = this.character;
    }, 0);
    document.getElementById('ai-mute-toggle').addEventListener('change', (e) => {
      this.isMuted = e.target.checked;
      this.savePreferences();
    });
    document.getElementById('ai-mode-toggle').addEventListener('change', (e) => {
      this.useAI = e.target.checked;
      this.savePreferences();
    });
    document.getElementById('ai-character-select').addEventListener('change', (e) => {
      this.character = e.target.value;
      this.savePreferences();
      this.updateAvatarImage();
    });
  }
  
  attachEventListeners() {
    window.addEventListener('scroll', this.handleScroll.bind(this));
    document.addEventListener('click', this.handleClick.bind(this), true);
    document.addEventListener('mousemove', (e) => this.handleDrag(e));
    document.addEventListener('mouseup', () => this.stopDrag());
    
    document.addEventListener('keydown', (e) => {
      if ((e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)) {
        this.handleTypingKeydown(e.target, e);
      }
    });
    document.addEventListener('input', (e) => {
      if ((e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)) {
        this.handleTypingInput(e.target);
      }
    });
    document.addEventListener('focusin', (e) => {
      if ((e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)) {
        this.lastTypingField = e.target;
        this.typingTriggeredForField = false;
        this.lastTypingInputValue = '';
        this.typingStartTime = null;
        if (this.typingTimeout) {
          clearTimeout(this.typingTimeout);
          this.typingTimeout = null;
        }
      }
    });
    document.addEventListener('focusout', (e) => {
      if (e.target === this.lastTypingField) {
        this.lastTypingField = null;
        this.typingTriggeredForField = false;
        this.lastTypingInputValue = '';
        this.typingStartTime = null;
        if (this.typingTimeout) {
          clearTimeout(this.typingTimeout);
          this.typingTimeout = null;
        }
      }
    });

    chrome.runtime.onMessage.addEventListener && chrome.runtime.onMessage.addEventListener((message) => {
      if (message.type === 'show_response' && message.text) {
        this.showMessage(message.text);
      }
    });
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'show_response' && message.text) {
        this.showMessage(message.text);
      }
    });
  }

  canTriggerMessage(type) {
    const now = Date.now();
    if (now - this.lastMessageTime[type] < this.cooldowns[type]) {
      return false;
    }
    this.lastMessageTime[type] = now;
    return true;
  }

  handleClick(e) {
    if (e && e.button !== 0) return;
    if (this.avatar && this.avatar.contains(e.target)) return;
    if (!this.canTriggerMessage('click')) return;
    this.lastUserActivity = Date.now();
    this.sendEventToBackground('click');
  }

  handleScroll() {
    const scrollDelta = Math.abs(window.scrollY - this.lastScrollY);
    if (scrollDelta < this.scrollTriggerDelta) return;
    if (!this.canTriggerMessage('scroll')) return;
    this.lastScrollY = window.scrollY;
    this.lastUserActivity = Date.now();
    this.mood.focus = Math.max(0, this.mood.focus - 3); // reduce focus
    this.mood.lastScrolls = Date.now();
    this.sendEventToBackground('scroll');
  }

  handleTypingInput(target) {
    const value = (target.value !== undefined) ? target.value : (target.innerText || '');
    const now = Date.now();
    if (value.length < 10) {
      this.typingStartTime = null;
      if (this.typingTimeout) {
        clearTimeout(this.typingTimeout);
        this.typingTimeout = null;
      }
      this.typingTriggeredForField = false;
      return;
    }
    if (!this.typingStartTime) {
      this.typingStartTime = now;
    }
    if (this.typingTimeout) clearTimeout(this.typingTimeout);
    this.typingTimeout = setTimeout(() => {
      const currentValue = (target.value !== undefined) ? target.value : (target.innerText || '');
      const now2 = Date.now();
      if (
        currentValue.length >= 10 &&
        this.typingStartTime &&
        (now2 - this.typingStartTime >= 5000) &&
        (now2 - this.lastTypingTriggerTime >= 30000) &&
        !this.typingTriggeredForField
      ) {
        this.typingTriggeredForField = true;
        this.lastTypingTriggerTime = now2;
        this.lastUserActivity = Date.now();
        this.mood.energy = Math.max(0, this.mood.energy - 4); // reduce energy
        this.mood.lastTyping = Date.now();
        this.sendEventToBackground('typing');
      }
    }, 100);
  }

  handleTypingKeydown(target, e) {
    if (e.key === 'Enter') {
      this.typingTriggeredForField = false;
      this.lastTypingInputValue = '';
      this.typingStartTime = null;
      if (this.typingTimeout) {
        clearTimeout(this.typingTimeout);
        this.typingTimeout = null;
      }
      this.lastUserActivity = Date.now();
      return;
    }
  }

  sendEventToBackground(eventType) {
    if (!this.useAI) {
      this.showMessage(this.getHardcodedMessage(eventType));
      return;
    }
    const eventData = {
      type: eventType,
      pageTitle: document.title,
      pageUrl: window.location.href,
      pageCharacter: this.character
    };
    try {
      chrome.runtime.sendMessage(eventData, (response) => {
        if (chrome.runtime.lastError) {
          this.showMessage(this.getHardcodedMessage(eventType));
        }
      });
    } catch (e) {
      this.showMessage(this.getHardcodedMessage(eventType));
    }
  }

  getHardcodedMessage(type) {
    const char = this.characters[this.character];
    if (!char) return 'Hey there!';
    let lines = char.lines[type];
    if (!lines) return 'Hey there!';
    if (!Array.isArray(lines)) lines = [lines];
    return lines[Math.floor(Math.random() * lines.length)];
  }

  startDrag(e) {
    e.preventDefault();
    this.isDragging = true;
    this.avatar.style.cursor = 'grabbing';
    const rect = this.avatar.getBoundingClientRect();
    this.dragOffset.x = e.clientX - rect.left;
    this.dragOffset.y = e.clientY - rect.top;
    document.body.style.userSelect = 'none';
  }
  
  handleDrag(e) {
    if (!this.isDragging) return;
    e.preventDefault();
    const x = e.clientX - this.dragOffset.x;
    const y = e.clientY - this.dragOffset.y;
    const maxX = window.innerWidth - this.avatar.offsetWidth;
    const maxY = window.innerHeight - this.avatar.offsetHeight;
    const clampedX = Math.max(0, Math.min(x, maxX));
    const clampedY = Math.max(0, Math.min(y, maxY));
    this.avatar.style.left = clampedX + 'px';
    this.avatar.style.top = clampedY + 'px';
    this.avatar.style.right = 'auto';
    this.avatar.style.bottom = 'auto';
    localStorage.setItem('aiCompanionAvatarPos', JSON.stringify({ left: this.avatar.style.left, top: this.avatar.style.top }));
    this.updateBubblePosition();
  }
  
  stopDrag() {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.avatar.style.cursor = 'grab';
    document.body.style.userSelect = '';
  }

  updateBubblePosition() {
    if (!this.avatar || !this.speechBubble) return;
    const avatarRect = this.avatar.getBoundingClientRect();
    const bubbleWidth = this.speechBubble.offsetWidth || 180;
    const left = avatarRect.left + (avatarRect.width / 2) - (bubbleWidth / 2);
    const top = avatarRect.top - 48;
    this.speechBubble.style.left = `${left}px`;
    this.speechBubble.style.top = `${top}px`;
  }

  speak(text) {
    if (this.isMuted || !('speechSynthesis' in window)) return;
    const utter = new window.SpeechSynthesisUtterance(text);
    utter.onstart = () => this.startSpeakingAnim();
    utter.onend = () => this.stopSpeakingAnim();
    window.speechSynthesis.speak(utter);
  }

  startSpeakingAnim() {
    if (!this.avatar) return;
    this.avatar.style.transform = 'scale(1.08) translateY(-8px)';
    this.speaking = true;
    setTimeout(() => {
      if (this.speaking) this.avatar.style.transform = 'scale(1.04) translateY(-4px)';
    }, 120);
  }

  stopSpeakingAnim() {
    if (!this.avatar) return;
    this.avatar.style.transform = '';
    this.speaking = false;
  }

  showMessage(text) {
    if (this.speechBubble.textContent === text && this.speechBubble.style.display === 'block') return;
    this.speechBubble.textContent = text;
    this.speechBubble.style.display = 'block';
    this.updateBubblePosition();
    this.speak(text);
    this.addChatMessage(`${this.character}: ${text}`);
    setTimeout(() => {
      this.speechBubble.style.display = 'none';
      this.stopSpeakingAnim();
    }, 2500);
    this.lastUserActivity = Date.now();
  }

  startIdleAnimation() {
    if (!this.avatar) return;
    const updateFloating = () => {
      if (!this.avatar) return;
      if (!this.speaking && !this.isDragging) {
        this.avatar.classList.add('floating');
      } else {
        this.avatar.classList.remove('floating');
      }
    };
    if (this.idleAnimInterval) clearInterval(this.idleAnimInterval);
    this.idleAnimInterval = setInterval(updateFloating, 300);
    updateFloating();
  }

  startIdleRemarks() {
    if (this.idleRemarkTimeout) clearTimeout(this.idleRemarkTimeout);
    const schedule = () => {
      const delay = 45000 + Math.random() * 45000;
      this.idleRemarkTimeout = setTimeout(() => {
        const now = Date.now();
        // Mood recovery while idle
        if (now - this.mood.lastScrolls > 20000) this.mood.focus = Math.min(100, this.mood.focus + 2);
        if (now - this.mood.lastTyping > 20000) this.mood.energy = Math.min(100, this.mood.energy + 2);
        if (
          now - this.lastUserActivity > 40000 &&
          !this.speaking &&
          !this.isDragging &&
          document.activeElement !== document.body
        ) {
          // Always use mood-based lines if low
          let lines;
          if (this.mood.energy < 30) {
            lines = [
              'I feel tired...','Need a break...','So sleepy...','My energy is low...'
            ];
          } else if (this.mood.focus < 30) {
            lines = [
              'Can you focus for a second?','You seem distracted...','Losing track of things...','My mind is wandering...'
            ];
          } else {
            lines = this.idleLines[this.character] || ['...'];
          }
          const line = lines[Math.floor(Math.random() * lines.length)];
          this.showMessage(line);
        }
        schedule();
      }, delay);
    };
    schedule();
  }

  handlePetting() {
    if (!this.avatar) return;
    if (this.avatar.classList.contains('wiggle')) return;
    this.isHovered = true;
    this.avatar.classList.add('wiggle');
    const petLines = {
      'Zoro': ["Hey! Watch the hair.", "Not the head, the swords!", "You trying to mess up my bandana?"],
      'Batman': ["...I don't do pets.", "Careful. Bats bite.", "Even heroes need a break, I guess."],
      'Morty': ["Heehee! That tickles.", "Whoa, personal space!", "Aw jeez, what are you doing?"],
      'Maomao': ["Heehee! That tickles.", "Oh! Are you petting me?", "Careful, I might purr."]
    };
    const lines = petLines[this.character] || ["Heehee! That tickles."];
    const line = lines[Math.floor(Math.random() * lines.length)];
    this.showMessage(line);
    setTimeout(() => {
      if (this.avatar) this.avatar.classList.remove('wiggle');
      this.isHovered = false;
    }, 700);
  }

  startRandomWalk() {
    if (this.walkTimeout) clearTimeout(this.walkTimeout);
    const schedule = () => {
      const delay = 30000 + Math.random() * 30000; // 30–60s
      this.walkTimeout = setTimeout(() => {
        if (
          this.speaking ||
          this.isDragging ||
          this.isHovered ||
          !this.avatar
        ) {
          schedule();
          return;
        }
        // Get current position
        let left = parseInt(this.avatar.style.left || 0);
        let top = parseInt(this.avatar.style.top || 0);
        if (isNaN(left)) left = window.innerWidth - this.avatar.offsetWidth - 20;
        if (isNaN(top)) top = window.innerHeight - this.avatar.offsetHeight - 20;
        // Pick random direction
        const dx = (Math.random() < 0.5 ? -1 : 1) * (50 + Math.random() * 50);
        const dy = (Math.random() < 0.5 ? -1 : 1) * (50 + Math.random() * 50);
        let newLeft = left + dx;
        let newTop = top + dy;
        // Bounds checking
        const minX = 0;
        const minY = 0;
        const maxX = window.innerWidth - this.avatar.offsetWidth;
        const maxY = window.innerHeight - this.avatar.offsetHeight;
        newLeft = Math.max(minX, Math.min(newLeft, maxX));
        newTop = Math.max(minY, Math.min(newTop, maxY));
        // Walk animation polish
        this.avatar.classList.add('walking');
        this.avatar.style.left = newLeft + 'px';
        this.avatar.style.top = newTop + 'px';
        this.avatar.style.right = 'auto';
        this.avatar.style.bottom = 'auto';
        localStorage.setItem('aiCompanionAvatarPos', JSON.stringify({ left: this.avatar.style.left, top: this.avatar.style.top }));
        this.updateBubblePosition();
        this.lastWalkTime = Date.now();
        setTimeout(() => {
          if (this.avatar) this.avatar.classList.remove('walking');
        }, 1200);
        schedule();
      }, 30000 + Math.random() * 30000);
    };
    schedule();
  }

  toggleChatWindow() {
    if (this.isChatOpen) {
      if (this.chatWindow) this.chatWindow.remove();
      this.isChatOpen = false;
      return;
    }
    this.createChatWindow();
    this.isChatOpen = true;
  }

  createChatWindow() {
    if (this.chatWindow) this.chatWindow.remove();
    const win = document.createElement('div');
    win.className = 'ai-companion-chat-window';
    // Header
    const header = document.createElement('div');
    header.className = 'ai-companion-chat-header';
    header.innerHTML = `<span>${this.character}</span>`;
    // Mood
    const mood = document.createElement('span');
    mood.className = 'ai-companion-chat-mood';
    mood.innerHTML = `${this.getMoodEmoji('energy')} ${this.mood.energy} | ${this.getMoodEmoji('focus')} ${this.mood.focus}`;
    header.appendChild(mood);
    // Close btn
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.background = 'none';
    closeBtn.style.border = 'none';
    closeBtn.style.color = '#fff';
    closeBtn.style.fontSize = '22px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.onclick = () => this.toggleChatWindow();
    header.appendChild(closeBtn);
    win.appendChild(header);
    // Log
    const log = document.createElement('div');
    log.className = 'ai-companion-chat-log';
    log.innerHTML = this.chatLog.slice(-10).map(msg => `<div>${msg}</div>`).join('');
    win.appendChild(log);
    // Input
    const inputWrap = document.createElement('form');
    inputWrap.className = 'ai-companion-chat-input';
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Say something...';
    input.autocomplete = 'off';
    const sendBtn = document.createElement('button');
    sendBtn.type = 'submit';
    sendBtn.textContent = 'Send';
    inputWrap.appendChild(input);
    inputWrap.appendChild(sendBtn);
    inputWrap.onsubmit = (e) => {
      e.preventDefault();
      const val = input.value.trim();
      if (!val) return;
      this.addChatMessage('You: ' + val);
      input.value = '';
      this.updateChatLog();
      this.fakeAIReply(val);
    };
    win.appendChild(inputWrap);
    document.body.appendChild(win);
    this.chatWindow = win;
    this.updateChatLog();
  }

  fakeAIReply(userMsg) {
    // Use recent context for variety
    const char = this.character;
    const context = this.chatLog.slice(-5).join(' ');
    const aiLines = {
      'Zoro': [
        "Huh? Say that again, I wasn't paying attention.",
        "You got a map for that?",
        "Don't expect me to know everything.",
        "Three swords, three answers. Maybe.",
        "You talk a lot for someone who gets lost."
      ],
      'Batman': [
        "Justice doesn't sleep. Neither do I.",
        "I work alone, but I'll listen.",
        "Stay vigilant. Gotham needs us both.",
        "I have eyes everywhere.",
        "Noted."
      ],
      'Morty': [
        "Aw jeez, that's a lot to think about...",
        "Uh, okay, sure!",
        "Rick would know what to say...",
        "You sure about that?",
        "Whoa, that's deep."
      ],
      'Maomao': [
        "Heehee! That's interesting!",
        "Let me write that down.",
        "Are you experimenting again?",
        "I love learning new things!",
        "Hmm, I'll have to analyze that."
      ]
    };
    let lines = aiLines[char] || ["I'm thinking..."];
    // Optionally, add a little context-based flavor
    if (/tired|sleep|nap|rest/i.test(userMsg) && char === 'Maomao') {
      lines = ["Maybe you need a nap!", "Rest is important, you know."];
    }
    if (/lost|where|map/i.test(userMsg) && char === 'Zoro') {
      lines = ["Don't ask me for directions.", "I'm not lost, just exploring."];
    }
    setTimeout(() => {
      const reply = lines[Math.floor(Math.random() * lines.length)];
      this.addChatMessage(`${char}: ${reply}`);
      this.updateChatLog();
    }, 700 + Math.random() * 700);
  }

  addChatMessage(msg) {
    this.chatLog.push(msg);
    if (this.chatLog.length > 20) this.chatLog = this.chatLog.slice(-20);
    this.updateChatLog();
  }

  updateChatLog() {
    if (!this.chatWindow) return;
    const log = this.chatWindow.querySelector('.ai-companion-chat-log');
    if (!log) return;
    log.innerHTML = this.chatLog.slice(-10).map(msg => `<div>${msg}</div>`).join('');
    log.scrollTop = log.scrollHeight;
    // Update mood
    const mood = this.chatWindow.querySelector('.ai-companion-chat-mood');
    if (mood) mood.innerHTML = `${this.getMoodEmoji('energy')} ${this.mood.energy} | ${this.getMoodEmoji('focus')} ${this.mood.focus}`;
  }

  getMoodEmoji(type) {
    if (type === 'energy') {
      if (this.mood.energy > 70) return '⚡';
      if (this.mood.energy > 40) return '🙂';
      if (this.mood.energy > 20) return '😴';
      return '🥱';
    }
    if (type === 'focus') {
      if (this.mood.focus > 70) return '🎯';
      if (this.mood.focus > 40) return '🤔';
      if (this.mood.focus > 20) return '😵';
      return '💤';
    }
    return '';
  }
}

if (!window.__AI_COMPANION_INITIALIZED__) {
  window.__AI_COMPANION_INITIALIZED__ = true;
window.aiCompanion = new AICompanion();
  }
