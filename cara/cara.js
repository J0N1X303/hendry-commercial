(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const storeKey = 'hendry-cara-offer-v1';
  const skills = [
    {
      id:'question-first', name:'Ask before you pitch', tag:'Discovery',
      premise:'A prospect can only tell you what matters if you leave space to discover it.',
      trap:'Opening with your capabilities, then asking a yes/no question to confirm your own assumptions.',
      example:'Instead of “Are you having supplier problems?”, try “How is your current supply arrangement working for you?” The second question allows an honest answer, including that everything is fine.',
      action:'On your next three relevant contacts, ask one neutral open question about the current approach before explaining your offer. Listen to the complete answer.'
    },
    {
      id:'earn-relevance', name:'Earn the first ten seconds', tag:'Opening',
      premise:'A credible reason for contact is more useful than an elaborate introduction.',
      trap:'Leading with a long company description or pretending to know the buyer has a problem.',
      example:'Introduce yourself briefly, mention a verifiable reason for contact and say what you want to understand. Example: “I saw your team announced a new product range. I was interested in how you’re planning the operational side of the launch.”',
      action:'Before your next contact, write down one verified reason the conversation could be relevant. If you have no credible reason, research first or don’t make an unsupported claim.'
    },
    {
      id:'follow-answer', name:'Follow their answer', tag:'Listening',
      premise:'The most useful next question often comes from what the buyer just told you.',
      trap:'Working through a list of prepared questions and missing the detail the customer volunteered.',
      example:'If the prospect describes a recent change, ask “How has that affected the way you work?” Avoid introducing a different topic until you understand their answer.',
      action:'In your next relevant conversation, pick up one detail from the customer’s answer and explore it with a single open follow-up before moving on.'
    },
    {
      id:'existing-supplier', name:'Understand the incumbent', tag:'Objections',
      premise:'Having a supplier is a fact about their situation, not evidence that they are unhappy or ready to change.',
      trap:'Asking “Are you happy with them?” or attacking the supplier without learning how the arrangement works.',
      example:'“How does your current supplier typically support you when your requirements change?” If they are well supported, acknowledge it rather than trying to manufacture a problem.',
      action:'Explore the existing approach neutrally. Only discuss an alternative after learning where, if anywhere, it might be relevant.'
    },
    {
      id:'respect-time', name:'Respect a busy buyer', tag:'Pressure',
      premise:'Showing that you respect time can be more persuasive than squeezing in a pitch.',
      trap:'Continuing the prepared monologue after someone says they are busy.',
      example:'“Understood, I don’t want to hold you up. What would be the most useful way to revisit this, if it becomes relevant?” Accept it if the answer is that it won’t.',
      action:'Next time you encounter a time objection, stop your pitch. Ask one short, permission-based question or end the contact gracefully.'
    },
    {
      id:'handle-no', name:'Make peace with “no”', tag:'Confidence',
      premise:'A clear no is useful information. Professional prospecting includes qualifying out.',
      trap:'Interpreting every rejection as a personal failure or applying pressure to overcome a clear boundary.',
      example:'“Understood — thanks for being clear. I appreciate your time.” If there is genuine permission to stay in touch, agree what would make a future contact relevant.',
      action:'On your next rejection, end professionally. Then note one fact you learned and one thing you would change in your next opening. Don’t confuse persistence with ignoring a no.'
    }
  ];

  const obstacles = {
    none:{
      title:'If the fit is unclear',
      line:'If the response shows no clear need, explore their priorities without pushing for a meeting. A useful no can save both sides time.',
      lesson:'Keep the first exchange focused on learning whether a conversation is relevant, not securing a meeting at any cost.'
    },
    incumbent:{
      title:'If they already have a supplier',
      line:'“How does your current arrangement usually work when your requirements change?”',
      lesson:'An existing supplier is not automatically a problem. Understand what works before suggesting anything different.'
    },
    busy:{
      title:'If they are short on time',
      line:'“Understood. What would be the most useful way to pick this up, if it becomes relevant?”',
      lesson:'Stop when someone says they are busy. Respect their answer, including if the answer is not to follow up.'
    },
    send:{
      title:'If they say “Send an email”',
      line:'“Of course. What would be most useful to include so it’s relevant to your situation?”',
      lesson:'Make the email about the buyer’s stated priorities. If they give no context, keep it short rather than assuming interest.'
    },
    gatekeeper:{
      title:'If someone else answers',
      line:'“Who would be best placed to explain how this area is managed?”',
      lesson:'Be transparent about who you are and why you called. Don’t invent a relationship or an appointment to get through.'
    },
    silence:{
      title:'If your earlier message had no reply',
      line:'Offer one new, specific reason to revisit the subject; otherwise give a respectful way to decline. Avoid another empty “just checking in”.',
      lesson:'Silence is not an objection you can solve with volume. Add relevance, change the channel appropriately or stop.'
    }
  };

  let selectedSkill = skills[0].id;
  let lastCard = '';
  let toastTimer;

  function toast(message) {
    const el = $('toast');
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
  }

  async function copy(text, message) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const area = document.createElement('textarea');
        area.value = text;
        area.style.position = 'fixed';
        area.style.left = '-9999px';
        document.body.appendChild(area);
        area.focus();
        area.select();
        const ok = document.execCommand('copy');
        area.remove();
        if (!ok) throw new Error('Copy unavailable');
      }
      toast(message || 'Copied');
    } catch (error) {
      toast('Copy unavailable here. Please select and copy the text manually.');
    }
  }

  function safeGet() {
    try { return localStorage.getItem(storeKey) || ''; } catch (_) { return ''; }
  }
  function safeSave(value) {
    try {
      if (value) localStorage.setItem(storeKey,value);
      else localStorage.removeItem(storeKey);
    } catch (_) {}
  }
  function switchMode(mode, focus) {
    ['prepare','coach'].forEach((name) => {
      const active = name === mode;
      $('tab-' + name).classList.toggle('active', active);
      $('tab-' + name).setAttribute('aria-selected', String(active));
      $('panel-' + name).hidden = !active;
    });
    if (focus) $('tab-' + mode).focus();
  }

  function checkDiscoveryQuestion(question) {
    const clean = String(question || '').trim();
    const opens = /^(what|how|where|when|who|which|tell me about|walk me through|describe)\b/i.test(clean);
    const multiple = (clean.match(/\?/g) || []).length !== 1;
    const loaded = /\b(you must|you obviously|your problem|your struggles|why haven't you|why don't you)\b/i.test(clean);
    return {pass: opens && !multiple && !loaded, reason: !opens ? 'Not an open question' : multiple ? 'Ask one question at a time' : loaded ? 'Potentially leading question' : 'Neutral open discovery opening'};
  }

  function getFormValue(name) {
    const element = document.querySelector('input[name="' + name + '"]:checked');
    return element ? element.value : '';
  }

  function makeCard(data) {
    const topic = data.topic;
    const about = data.offer || '';
    let opening, question, openingTitle, lesson;
    if (data.format === 'intro') {
      openingTitle = 'Your introduction';
      opening = 'Hello,\n\n' +
        (about ? 'I work with businesses on ' + about + '. ' : '') +
        'I’m reaching out about ' + topic + '. I’d be interested in how you’re approaching this area at the moment and whether there might be a useful conversation to have.\n\nNo problem if it is not a priority right now.\n\nBest,\n[Your name]';
      question = 'What does your current approach to ' + topic + ' look like?';
      lesson = 'An introduction should give a genuine reason for contact and make it easy to decline. Avoid a long credentials pitch or an invented point of urgency.';
    } else if (data.format === 'followup') {
      openingTitle = 'Your follow-up';
      opening = 'Hello,\n\nI wanted to pick up the thread on ' + topic + '. I know priorities can change, so I thought it might be useful to revisit this briefly.\n\nIf it remains relevant, I’d be interested in hearing where things stand. If not, no problem.\n\nBest,\n[Your name]';
      question = 'How is ' + topic + ' fitting into your priorities at the moment?';
      lesson = 'Give a genuine reason for following up. Ask about what has changed, not why they failed to reply. Respect a clear no.';
    } else {
      openingTitle = 'Your call opening';
      opening = '“Hi, I’m [your name]. ' +
        (about ? 'I work with businesses on ' + about + '. ' : '') +
        'I’m getting in touch about ' + topic + '. I was interested in how you’re approaching that at the moment.”';
      question = 'How are you currently approaching ' + topic + '?';
      lesson = 'Make the reason for your call clear, then give them space to explain their situation. Don’t turn a neutral discovery question into a disguised pitch.';
    }

    // Guard the discovery field even if editorial content is changed later.
    if (!checkDiscoveryQuestion(question).pass) {
      question = 'What does your current approach look like?';
    }

    const obs = obstacles[data.obstacle] || obstacles.none;
    const company = data.company ? 'Contact: ' + data.company + '. ' : '';
    const verifiedReason = data.reason ? 'Potential relevance: ' + data.reason + '. Mention this only if it is accurate and publicly appropriate.' : 'No buying trigger supplied. Do not imply a business need you haven’t established.';
    return {
      title: data.format === 'call' ? 'Before you pick up the phone' : data.format === 'intro' ? 'Before you hit send' : 'Before you follow up',
      context: company + verifiedReason,
      openingTitle, opening, question,
      objectionTitle: obs.title, objection: obs.line,
      lesson: obs.lesson + ' ' + lesson
    };
  }

  function displayCard(card) {
    $('result-title').textContent = card.title;
    $('result-context').textContent = card.context;
    $('cue-opening-title').textContent = card.openingTitle;
    $('cue-opening').textContent = card.opening;
    $('cue-question').textContent = card.question;
    $('cue-objection-title').textContent = card.objectionTitle;
    $('cue-objection').textContent = card.objection;
    $('cue-lesson').textContent = card.lesson;
    lastCard = [
      'Cold Call Cara — ' + card.title,
      card.context,
      'START HERE', card.opening,
      'OPEN DISCOVERY QUESTION', card.question,
      card.objectionTitle.toUpperCase(), card.objection,
      'ONE THING TO TRY', card.lesson,
      'Adapt this guidance to your voice and the actual customer. No prospect claims have been verified.'
    ].join('\n\n');
    $('preparation-result').hidden = false;
    $('reflection-message').textContent = '';
    $('preparation-result').scrollIntoView({behavior:'smooth',block:'start'});
  }

  function renderSkills() {
    $('skill-list').replaceChildren();
    skills.forEach((skill, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'skill-choice' + (skill.id === selectedSkill ? ' active' : '');
      button.dataset.skill = skill.id;
      const label = document.createElement('span');
      label.textContent = String(index+1).padStart(2,'0') + ' · ' + skill.tag;
      const title = document.createTextNode(skill.name);
      button.append(label,title);
      button.addEventListener('click', () => chooseSkill(skill.id));
      $('skill-list').appendChild(button);
    });
    chooseSkill(selectedSkill);
  }

  function chooseSkill(id) {
    const skill = skills.find((item) => item.id === id) || skills[0];
    selectedSkill = skill.id;
    document.querySelectorAll('.skill-choice').forEach((button) => {
      button.classList.toggle('active', button.dataset.skill === skill.id);
      button.setAttribute('aria-pressed', String(button.dataset.skill === skill.id));
    });
    $('skill-title').textContent = skill.name;
    $('skill-premise').textContent = skill.premise;
    $('skill-trap').textContent = skill.trap;
    $('skill-example').textContent = skill.example;
    $('skill-action').textContent = skill.action;
  }

  document.querySelectorAll('[data-mode]').forEach((tab) => {
    tab.addEventListener('click', () => switchMode(tab.dataset.mode, false));
  });

  $('prepare-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const data = {
      topic: $('topic').value.trim().replace(/\s+/g,' '),
      reason: $('reason').value.trim().replace(/\s+/g,' '),
      offer: $('offer').value.trim().replace(/\s+/g,' '),
      company: $('company').value.trim().replace(/\s+/g,' '),
      format: getFormValue('format'),
      obstacle: getFormValue('obstacle')
    };
    if (!data.topic) {
      $('topic').focus();
      return;
    }
    safeSave($('remember').checked ? data.offer : '');
    displayCard(makeCard(data));
  });
  $('copy-card').addEventListener('click', () => {
    if (lastCard) copy(lastCard,'Preparation card copied');
  });
  $('start-again').addEventListener('click', () => {
    $('preparation-result').hidden = true;
    $('topic').focus();
  });
  document.querySelectorAll('[data-outcome]').forEach((button) => {
    button.addEventListener('click', () => {
      const messages = {
        useful:'Good. What did you learn from their answer? Use that to improve your next question.',
        'no-fit':'That is a useful result too. Note what told you it was not relevant, then move on professionally.',
        'not-reached':'Not connecting is normal. Recheck your relevance and channel before deciding whether to follow up.'
      };
      $('reflection-message').textContent = messages[button.dataset.outcome] || '';
    });
  });

  $('share-skill').addEventListener('click', () => {
    const url = new URL(window.location.href);
    url.search = '';
    url.hash = '';
    url.searchParams.set('skill',selectedSkill);
    copy(url.toString(),'Challenge link copied');
  });

  $('clear-local').addEventListener('click', () => {
    safeSave('');
    $('remember').checked = false;
    $('offer').value = '';
    toast('Saved offer cleared from this device');
  });

  const saved = safeGet();
  if (saved) {
    $('offer').value = saved;
    $('remember').checked = true;
  }
  const requested = new URLSearchParams(window.location.search).get('skill');
  if (requested && skills.some((s) => s.id === requested)) {
    selectedSkill = requested;
    switchMode('coach',false);
  }
  renderSkills();

  // Exposed only for a small regression test suite, not as an AI-powered evaluator.
  window.ColdCallCaraQuality = Object.freeze({checkDiscoveryQuestion, makeCard, skills});
})();