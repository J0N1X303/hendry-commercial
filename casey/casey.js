(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const storeKey = 'hendry-casey-offer-v2';
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


  let selectedSkill = skills[0].id;
  let lastCard = '';
  let toastTimer, running = false;

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
    } catch {
      toast('Copy unavailable. Select and copy the text manually.');
    }
  }

  function safeGet() {
    try { return localStorage.getItem(storeKey) || localStorage.getItem('hendry-cara-offer-v2') || localStorage.getItem('hendry-cara-offer-v1') || ''; } catch { return ''; }
  }
  function safeSave(value) {
    try { if (value) localStorage.setItem(storeKey,value); else localStorage.removeItem(storeKey); localStorage.removeItem('hendry-cara-offer-v1'); localStorage.removeItem('hendry-cara-offer-v2'); } catch {}
  }
  function switchMode(mode) {
    ['prepare','coach'].forEach((name) => {
      const active = name === mode;
      $('tab-' + name).classList.toggle('active', active);
      $('tab-' + name).setAttribute('aria-selected', String(active));
      $('panel-' + name).hidden = !active;
    });
  }
  function getFormValue(name) {
    return document.querySelector('input[name="' + name + '"]:checked')?.value || '';
  }
  function checkDiscoveryQuestion(question) {
    const text = String(question || '').trim();
    const beginsOpen = /^(what|how|which|who|where|when|describe|tell me about|walk me through)\b/i.test(text);
    const oneQuestion = (text.match(/\?/g) || []).length === 1;
    const leading = /\b(you must|you obviously|your problem|your struggles|why haven't you|why don't you|surely|struggling with|your biggest problems|your biggest challenges|your main pain|your biggest issues)\b/i.test(text) || /^what (?:are|have been|do you see as) .{0,70}\b(?:problems|challenges|issues|pain points)\b/i.test(text);
    return {pass: beginsOpen && oneQuestion && !leading, reason: !beginsOpen?'Not an open question':!oneQuestion?'Must be one question':leading?'Assumes a problem':'Open discovery question'};
  }
  function getInputs() {
    return {
      seller:$('seller').value.trim().replace(/\s+/g,' '),
      context:$('context').value.trim().replace(/\s+/g,' '),
      channel:getFormValue('channel') || 'call',
      goal:$('goal').value
    };
  }
  function setProfileCollapsed(isSaved) {
    const hasSaved = !!isSaved;
    $('edit-profile').hidden = !hasSaved;
    $('seller-area').hidden = hasSaved;
    $('seller-hint').textContent = hasSaved
      ? 'Your offering is saved in this browser.'
      : 'Plain English is fine. You don’t need to write something polished.';
  }
  function feedback(message, status='info') {
    const area=$('prepare-feedback');
    area.textContent = message;
    area.dataset.status = status;
    area.hidden = !message;
  }
  function validateResponse(obj) {
    if (!obj || obj.status!=='ready' || obj.mode!=='tailored' || typeof obj.card!=='object') return null;
    const c=obj.card;
    const fields=['angle','opening','question','next_question','listen_for','complication','lesson','caution'];
    if (!fields.every(k=>typeof c[k]==='string' && c[k].trim().length>=12)) return null;
    if(!checkDiscoveryQuestion(c.question).pass || !checkDiscoveryQuestion(c.next_question).pass) return null;
    if(c.question.trim().toLowerCase()===c.next_question.trim().toLowerCase())return null;
    return c;
  }
  function displayCard(card,channel) {
    const isEmail=channel!=='call';
    $('result-title').textContent=channel==='call'
      ? 'A sharper way into the call'
      : channel==='intro'?'An introduction with a reason':'A follow-up worth considering';
    $('cue-angle').textContent=card.angle;
    $('cue-opening-title').textContent=isEmail?'Your email — ready to edit':'A natural opening';
    $('cue-opening').textContent=card.opening;
    // An email includes its initial question already. Never display or copy it twice.
    $('cue-question-title').textContent=isEmail?'If they reply, explore this':'Your first open question';
    $('cue-question').textContent=isEmail?card.next_question:card.question;
    $('cue-question-hint').textContent=isEmail
      ? 'A different question for a later exchange — not part of the email above.'
      : 'Ask it once. Listen to the actual answer rather than rushing to another question.';
    $('cue-next').hidden=isEmail;
    if(!isEmail) {
      $('cue-next-question').textContent=card.next_question;
    }
    $('cue-listen-for').textContent=card.listen_for;
    $('cue-objection').textContent=card.complication;
    $('cue-lesson').textContent=card.lesson;
    $('cue-caution').textContent=card.caution;
    $('copy-card').textContent=isEmail?'Copy email':'Copy preparation card';
    lastCard=isEmail?card.opening:[
      'COLD CALL CASEY — CONVERSATION PREP',
      'WHY THIS COULD BE RELEVANT\n'+card.angle,
      'OPENING\n'+card.opening,
      'INITIAL DISCOVERY QUESTION\n'+card.question,
      'WHAT TO LISTEN FOR\n'+card.listen_for,
      'FOLLOW-UP AFTER THEIR ANSWER\n'+card.next_question,
      'IF THEY PUSH BACK\n'+card.complication,
      'ONE THING TO TRY\n'+card.lesson,
      'DON’T ASSUME\n'+card.caution,
      'Based only on the information supplied. Adapt to the person and check claims.'
    ].join('\n\n');
    $('preparation-result').hidden=false;
    $('reflection-message').textContent='';
    $('preparation-result').scrollIntoView({behavior:'smooth',block:'start'});
  }

  function renderSkills() {
    $('skill-list').replaceChildren();
    skills.forEach((skill, index) => {
      const button=document.createElement('button');
      button.type='button';
      button.className='skill-choice'+(skill.id===selectedSkill?' active':'');
      button.dataset.skill=skill.id;
      const label=document.createElement('span');
      label.textContent=String(index+1).padStart(2,'0')+' · '+skill.tag;
      button.append(label,document.createTextNode(skill.name));
      button.addEventListener('click',()=>chooseSkill(skill.id));
      $('skill-list').appendChild(button);
    });
    chooseSkill(selectedSkill);
  }

  function chooseSkill(id) {
    const skill = skills.find(item=>item.id===id) || skills[0];
    selectedSkill=skill.id;
    document.querySelectorAll('.skill-choice').forEach(button=>{
      const active=button.dataset.skill===skill.id;
      button.classList.toggle('active',active);
      button.setAttribute('aria-pressed',String(active));
    });
    $('skill-title').textContent=skill.name;
    $('skill-premise').textContent=skill.premise;
    $('skill-trap').textContent=skill.trap;
    $('skill-example').textContent=skill.example;
    $('skill-action').textContent=skill.action;
  }

  document.querySelectorAll('[data-mode]').forEach(tab=>{
    tab.addEventListener('click',()=>switchMode(tab.dataset.mode));
  });

  $('prepare-form').addEventListener('submit',async event=>{
    event.preventDefault();
    if(running) return;
    const inputs=getInputs();
    if(inputs.seller.length<10) {
      $('seller-area').hidden=false;
      $('seller').focus();
      feedback('Add a short description of what you help businesses achieve.','error');
      return;
    }
    if(inputs.context.length<16) {
      $('context').focus();
      feedback('Describe who you’re approaching and why there may be a reason to speak.','error');
      return;
    }
    // Save only the reusable seller offering. Never store named-prospect context.
    safeSave($('remember').checked ? inputs.seller : '');
    setProfileCollapsed($('remember').checked);
    running=true;
    $('generate-button').disabled=true;
    $('generate-button').textContent='Considering the buyer situation…';
    $('preparation-result').hidden=true;
    feedback('Looking for a useful commercial angle, a better question and one coaching insight.','info');
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),18000);
    try {
      const response=await fetch('/casey/api',{
        method:'POST',
        headers:{'content-type':'application/json'},
        body:JSON.stringify(inputs),
        signal:controller.signal,
        cache:'no-store'
      });
      let result;
      try {
        result=await response.json();
      } catch {
        feedback('Casey received an unexpected response from its test server (HTTP '+response.status+'). Your inputs are saved on screen; this is a technical problem, not missing information.','error');
        return;
      }
      if(!response.ok) {
        const errorCode=String(result?.error||'unknown');
        if(response.status===400 && errorCode==='input_incomplete') {
          feedback(result.message||'Please check the required contact and offering fields.','error');
        } else if(response.status===429) {
          feedback('Casey has reached its test usage limit. Your information was accepted. Please try later.','error');
        } else if(response.status===502 && errorCode==='generation_quality') {
          feedback('Your information is sufficient. Casey rejected its own AI draft twice because the sales advice failed quality checks. You can try again without rewriting anything.','error');
        } else if(response.status===503 && errorCode==='ai_binding_missing') {
          feedback('Your information is sufficient. AI is not connected to this test deployment yet. This needs a site configuration fix, not a change to your prompt.','error');
        } else if(response.status===503) {
          feedback('Your information is sufficient. The AI generation service is temporarily unavailable. Please try again shortly.','error');
        } else if(response.status===401 || response.status===403) {
          feedback('Your private preview session was not authorised. Reopen the private test link and sign in again.','error');
        } else if(response.status===404 || response.status===405) {
          feedback('Your information is sufficient. Casey’s preparation endpoint is missing from this preview (HTTP '+response.status+'). This needs a deployment fix.','error');
        } else {
          feedback('Casey encountered a technical problem (HTTP '+response.status+', '+errorCode+'). Your information was accepted; please don’t rewrite it just to fix this.','error');
        }
        return;
      }
      const card=validateResponse(result);
      if(!card) {
        feedback('Your information was accepted. The generated answer did not pass Casey’s browser quality checks; please retry without changing your prompt.','error');
        return;
      }
      feedback('');
      displayCard(card,inputs.channel);
    } catch(error) {
      feedback(error?.name==='AbortError'
        ? 'The briefing took too long. Your text is still here — please try again.'
        : 'Casey couldn’t reach the preparation service. Your text is still here — please try again or use a coaching challenge.','error');
    } finally {
      clearTimeout(timeout);
      running=false;
      $('generate-button').disabled=false;
      $('generate-button').textContent='Help me prepare →';
    }
  });

  $('edit-profile').addEventListener('click',()=>{
    $('seller-area').hidden=false;
    $('seller').focus();
  });
  $('seller').addEventListener('input',()=>{
    if($('seller').value.trim()!==safeGet()) $('edit-profile').hidden=true;
  });
  $('remember').addEventListener('change',()=>{
    if(!$('remember').checked) {
      safeSave('');
      setProfileCollapsed(false);
    }
  });
  $('copy-card').addEventListener('click',()=>{ if(lastCard) copy(lastCard,'Preparation copied'); });
  $('start-again').addEventListener('click',()=>{
    $('preparation-result').hidden=true;
    $('context').focus();
  });
  document.querySelectorAll('[data-outcome]').forEach(button=>{
    button.addEventListener('click',()=>{
      const messages={
        useful:'What did you learn from the buyer’s answer? Use that to improve your next question.',
        'no-fit':'Recognising no fit is useful. Note what told you and move on.',
        'not-reached':'Consider whether you have a new reason to follow up. Silence is not permission to chase indefinitely.'
      };
      $('reflection-message').textContent=messages[button.dataset.outcome]||'';
    });
  });
  $('share-skill').addEventListener('click',()=>{
    const url=new URL(window.location.href);
    url.hash='';
    url.search='';
    url.searchParams.set('skill',selectedSkill);
    copy(url.toString(),'Coaching challenge link copied');
  });
  $('clear-local').addEventListener('click',()=>{
    safeSave('');
    $('seller').value='';
    $('context').value='';
    $('remember').checked=false;
    setProfileCollapsed(false);
    toast('Saved offering cleared from this device');
  });

  const saved=safeGet();
  if(saved) {
    $('seller').value=saved;
    $('remember').checked=true;
    setProfileCollapsed(true);
  } else setProfileCollapsed(false);
  const requested=new URLSearchParams(window.location.search).get('skill');
  if(requested && skills.some(s=>s.id===requested)) {
    selectedSkill=requested;
    switchMode('coach');
  }
  renderSkills();
  window.ColdCallCaseyQuality=Object.freeze({checkDiscoveryQuestion,validateResponse,skills});
})();
