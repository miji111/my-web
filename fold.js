/* ══════════════════════════════════════════════════════════
   할매공방 — 수첩에서 종이를 찢어 두 번 접어 보내는 연출

   window.tearAndFold(paperEl, onDone)
     1) 수첩에서 뜯어냄                    0    ~ 0.45s
     2) 오른쪽 절반을 왼쪽으로 넘겨 접음   0.52 ~ 1.12s
     3) 아래쪽 절반을 위로 넘겨 접음       1.20 ~ 1.80s
     4) 스르륵 날아감                      1.88 ~ 2.68s
     끝나면 onDone() 호출

   종이답게 보이려고 넣은 것
     · 종이 결(노이즈 + 섬유 줄무늬) 오버레이
     · 접힌 자국이 접은 뒤에도 남음 (어두운 선 + 그 옆 하이라이트)
     · 접히는 각도를 일부러 180도에서 살짝 어긋나게 — 손으로 접은 티
     · 모서리를 미세하게 다르게 둥글림 + 부드러운 그림자
     · 넘어가는 동안 빛을 받았다 그늘로 들어가는 밝기 변화
   ══════════════════════════════════════════════════════════ */
(function(){
  var TOTAL = 2720;

  /* 종이 결 — feTurbulence 노이즈 */
  var GRAIN = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='220' height='220' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")";

  var CSS = `
  .fold-stage{position:absolute;z-index:20;pointer-events:none;
    transform-origin:center center;will-change:transform,opacity;
    filter:drop-shadow(0 12px 22px rgba(61,31,34,.20))}
  .fold-stage .q{position:absolute;left:0;width:100%;height:50%}
  .fold-stage .q-top{top:0;overflow:hidden}
  .fold-stage .q-bot{top:50%;transform-style:preserve-3d;transform-origin:center top}
  .fold-stage .qface{position:absolute;inset:0;overflow:hidden;backface-visibility:hidden}
  .fold-stage .qback{transform:rotateX(180deg)}

  .fold-stage .sub{position:absolute;left:0;width:100%;perspective:1500px}
  .fold-stage .pL{position:absolute;left:0;top:0;width:50%;height:100%;overflow:hidden;
    border-radius:1px 0 0 2px}
  .fold-stage .pR{position:absolute;right:0;top:0;width:50%;height:100%;
    transform-style:preserve-3d;transform-origin:left center}
  .fold-stage .pface{position:absolute;inset:0;overflow:hidden;backface-visibility:hidden;
    border-radius:0 3px 2px 0}
  .fold-stage .pback{transform:rotateY(180deg)}
  .fold-stage .clone{position:absolute;top:0}
  .fold-stage .clone *{animation:none !important;transition:none !important}

  /* 종이 뒷면 — 앞면보다 한 톤 눌린 크림색 */
  .fold-stage .backpaper{position:absolute;inset:0;background:#f6eee0;
    background-image:
      radial-gradient(120% 80% at 30% 10%, rgba(255,255,255,.55), transparent 60%),
      linear-gradient(104deg, rgba(61,31,34,.13), rgba(61,31,34,.02) 45%, rgba(61,31,34,.09))}

  /* 종이 결 — 노이즈 + 섬유 줄무늬 */
  .fold-stage .grain{position:absolute;inset:0;pointer-events:none;z-index:4;opacity:.34;
    background-image:
      ${GRAIN},
      repeating-linear-gradient(96deg, rgba(90,60,40,.045) 0 1px, transparent 1px 4px),
      repeating-linear-gradient(6deg,  rgba(90,60,40,.030) 0 1px, transparent 1px 7px);
    background-size:220px 220px, auto, auto}

  /* 접힌 자국 — 접고 나서도 남습니다 */
  .fold-stage .crease{position:absolute;opacity:0;z-index:7;pointer-events:none}
  .fold-stage .crease-v{top:0;bottom:0;right:-1px;width:7px;
    background:linear-gradient(to right,
      rgba(255,255,255,.55) 0%, rgba(61,31,34,.30) 45%, rgba(61,31,34,.10) 70%, transparent 100%)}
  .fold-stage .crease-h{left:0;right:0;bottom:-1px;height:7px;
    background:linear-gradient(to bottom,
      rgba(255,255,255,.50) 0%, rgba(61,31,34,.28) 45%, rgba(61,31,34,.09) 70%, transparent 100%)}

  /* 넘어온 종이가 드리우는 그늘 */
  .fold-stage .cast{position:absolute;inset:0;opacity:0;pointer-events:none;z-index:6}
  .fold-stage .cast-x{background:linear-gradient(to left,
    rgba(61,31,34,.36) 0%, rgba(61,31,34,.12) 26%, transparent 68%)}
  .fold-stage .cast-y{background:linear-gradient(to top,
    rgba(61,31,34,.32) 0%, rgba(61,31,34,.10) 26%, transparent 68%)}

  /* 뜯긴 왼쪽 결 */
  .fold-stage .torn{clip-path:polygon(
    9px 0, 2px 3%, 11px 6%, 3px 9%, 8px 12%, 1px 15%, 12px 18%, 4px 21%, 9px 24%, 2px 27%,
    11px 30%, 3px 33%, 8px 36%, 1px 39%, 12px 42%, 4px 45%, 9px 48%, 2px 51%, 11px 54%, 3px 57%,
    8px 60%, 1px 63%, 12px 66%, 4px 69%, 9px 72%, 2px 75%, 11px 78%, 3px 81%, 8px 84%, 1px 87%,
    12px 90%, 4px 93%, 9px 96%, 2px 100%, 100% 100%, 100% 0)}

  .fold-stage.go{animation:
      fs-rip .45s cubic-bezier(.3,.8,.4,1) forwards,
      fs-drift .8s 1.88s cubic-bezier(.4,0,.7,1) forwards}
  .fold-stage.go .pR   {animation:fs-fold1 .6s .52s cubic-bezier(.42,.02,.22,1) forwards}
  .fold-stage.go .q-bot{animation:fs-fold2 .6s 1.20s cubic-bezier(.42,.02,.22,1) forwards}
  .fold-stage.go .pR .pfront{animation:fs-lightF .6s .52s ease-in-out forwards}
  .fold-stage.go .pR .pback {animation:fs-lightB .6s .52s ease-in-out forwards}
  .fold-stage.go .q-bot .qfront{animation:fs-lightF .6s 1.20s ease-in-out forwards}
  .fold-stage.go .q-bot .qback {animation:fs-lightB .6s 1.20s ease-in-out forwards}
  .fold-stage.go .cast-x  {animation:fs-cast .6s .52s ease forwards}
  .fold-stage.go .cast-y  {animation:fs-cast .6s 1.20s ease forwards}
  .fold-stage.go .crease-v{animation:fs-crease .5s .60s ease forwards}
  .fold-stage.go .crease-h{animation:fs-crease .5s 1.28s ease forwards}

  @keyframes fs-rip{
    0%  {transform:translate(0,0) rotate(0)}
    45% {transform:translate(7px,-8px) rotate(-1deg)}
    100%{transform:translate(13px,4px) rotate(1.4deg)}}

  /* 180도에 살짝 못 미치게 — 손으로 접으면 딱 안 맞습니다 */
  @keyframes fs-fold1{
    0%  {transform:rotateY(0) translateZ(0)}
    50% {transform:rotateY(-92deg) translateZ(16px)}
    82% {transform:rotateY(-171deg) translateZ(5px)}
    100%{transform:rotateY(-178.4deg) translateZ(0.6px)}}
  @keyframes fs-fold2{
    0%  {transform:rotateX(0) translateZ(0)}
    50% {transform:rotateX(-92deg) translateZ(16px)}
    82% {transform:rotateX(-171deg) translateZ(5px)}
    100%{transform:rotateX(-177.6deg) translateZ(0.6px)}}

  /* 넘어가며 빛을 받았다가 그늘로 */
  @keyframes fs-lightF{
    0%{filter:brightness(1)} 45%{filter:brightness(1.09)} 100%{filter:brightness(1)}}
  @keyframes fs-lightB{
    0%{filter:brightness(1.1)} 55%{filter:brightness(1.05)} 100%{filter:brightness(.955)}}

  @keyframes fs-cast  {0%{opacity:0} 62%{opacity:.95} 100%{opacity:.6}}
  @keyframes fs-crease{0%{opacity:0} 100%{opacity:1}}

  @keyframes fs-drift{
    0%  {opacity:1;transform:translate(13px,4px) rotate(1.4deg) scale(1)}
    22% {opacity:1;transform:translate(2px,-28px) rotate(-7deg) scale(1.04)}
    58% {opacity:.85;transform:translate(26px,52px) rotate(6deg) scale(.94)}
    100%{opacity:0;transform:translate(58px,172px) rotate(19deg) scale(.8)}}
  `;

  var injected = false;
  function inject(){
    if (injected) return;
    var st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);
    injected = true;
  }

  function el(cls, html){
    var d = document.createElement('div');
    d.className = cls;
    if (html) d.innerHTML = html;
    return d;
  }

  /* 입력한 값은 property 에만 있어서, 복제 전에 attribute 로 옮겨둡니다 */
  function freezeValues(root){
    root.querySelectorAll('input').forEach(function(e){
      if (e.type === 'checkbox' || e.type === 'radio'){
        if (e.checked) e.setAttribute('checked',''); else e.removeAttribute('checked');
      } else { e.setAttribute('value', e.value); }
    });
    root.querySelectorAll('textarea').forEach(function(e){ e.textContent = e.value; });
    root.querySelectorAll('select').forEach(function(e){
      Array.prototype.forEach.call(e.options, function(o){
        if (o.selected) o.setAttribute('selected',''); else o.removeAttribute('selected');
      });
    });
  }

  function makeClone(paper, W, offsetLeft){
    var c = paper.cloneNode(true);
    c.removeAttribute('id');
    c.querySelectorAll('[id]').forEach(function(e){ e.removeAttribute('id'); });
    c.querySelectorAll('input,select,textarea,button,a').forEach(function(e){
      e.setAttribute('tabindex','-1');
    });
    c.setAttribute('aria-hidden','true');
    c.classList.add('clone','torn');
    c.style.width = W + 'px';
    c.style.left = offsetLeft + 'px';
    c.style.margin = '0';
    return c;
  }

  window.tearAndFold = function(paper, onDone){
    var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (still || !paper){ if (onDone) onDone(); return; }

    inject();
    freezeValues(paper);

    /* 무대는 감출 종이(.tear) 바깥에 놓아야 같이 사라지지 않습니다 */
    var tear = paper.closest('.tear');
    var host = (tear && tear.parentElement) || paper.offsetParent || paper.parentElement;
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';

    var pr = paper.getBoundingClientRect();
    var hr = host.getBoundingClientRect();
    var W = pr.width, H = pr.height;

    var stage = el('fold-stage');
    stage.setAttribute('aria-hidden','true');
    stage.style.left   = (pr.left - hr.left + host.scrollLeft) + 'px';
    stage.style.top    = (pr.top  - hr.top  + host.scrollTop)  + 'px';
    stage.style.width  = W + 'px';
    stage.style.height = H + 'px';

    /* 가로 반 접기 무대 — 세로 절반씩 두 벌 만들어 같이 돌립니다 */
    function stageA(subTop){
      var sub = el('sub');
      sub.style.top = subTop + 'px';
      sub.style.height = H + 'px';

      var pL = el('pL');
      pL.appendChild(makeClone(paper, W, 0));
      pL.appendChild(el('grain'));
      pL.appendChild(el('cast cast-x'));
      pL.appendChild(el('crease crease-v'));

      var pR = el('pR');
      var front = el('pface pfront');
      front.appendChild(makeClone(paper, W, -W / 2));
      front.appendChild(el('grain'));
      var back = el('pface pback', '<div class="backpaper"></div>');
      back.appendChild(el('grain'));
      pR.appendChild(front);
      pR.appendChild(back);

      sub.appendChild(pL);
      sub.appendChild(pR);
      return sub;
    }

    var qTop = el('q q-top');
    qTop.appendChild(stageA(0));
    qTop.appendChild(el('cast cast-y'));
    qTop.appendChild(el('crease crease-h'));

    var qBot = el('q q-bot');
    var qFront = el('qface qfront');
    qFront.appendChild(stageA(-H / 2));
    var qBack = el('qface qback', '<div class="backpaper"></div>');
    qBack.appendChild(el('grain'));
    qBot.appendChild(qFront);
    qBot.appendChild(qBack);

    stage.appendChild(qTop);
    stage.appendChild(qBot);
    host.appendChild(stage);

    /* 원본은 자리만 남기고 감춥니다 (수첩 높이 유지) */
    var hide = tear || paper;
    hide.style.visibility = 'hidden';

    void stage.offsetWidth;          // reflow
    stage.classList.add('go');

    setTimeout(function(){
      stage.remove();
      hide.style.visibility = '';
      if (onDone) onDone();
    }, TOTAL);
  };
})();
