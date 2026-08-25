/* 할매공방 — menu.html / subscribe.html 공용 스크립트 */
(function(){
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* GNB 고정 시 미니 로고 + 맨 위로 */
  var catebar = document.getElementById('catebar');
  var gotop = document.getElementById('gotop');
  function onScroll(){
    if (catebar) catebar.classList.toggle('stuck', catebar.getBoundingClientRect().top <= 0);
    if (gotop) gotop.classList.toggle('on', window.scrollY > 700);
  }
  window.addEventListener('scroll', onScroll, { passive:true });
  onScroll();
  if (gotop) gotop.addEventListener('click', function(){
    window.scrollTo({ top:0, behavior:'smooth' });
  });

  /* 모바일 메뉴 */
  var navtoggle = document.getElementById('navtoggle');
  if (navtoggle && catebar){
    navtoggle.addEventListener('click', function(){
      var open = catebar.classList.toggle('open');
      navtoggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      navtoggle.textContent = open ? '닫기' : '메뉴';
    });
    catebar.addEventListener('click', function(e){
      if (e.target.tagName === 'A' && catebar.classList.contains('open')){
        catebar.classList.remove('open');
        navtoggle.setAttribute('aria-expanded','false');
        navtoggle.textContent = '메뉴';
      }
    });
  }

  /* 커서를 따라다니는 단팥빵 */
  var bun = document.getElementById('bunCursor');
  var fine = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  if (bun && fine && !still){
    var mx = window.innerWidth / 2, my = window.innerHeight / 2;
    var bx = mx, by = my, tilt = 0;
    window.addEventListener('mousemove', function(e){
      mx = e.clientX; my = e.clientY; bun.classList.add('on');
    }, { passive:true });
    document.addEventListener('mouseleave', function(){ bun.classList.remove('on'); });
    (function loop(){
      var dx = mx - bx, dy = my - by;
      bx += dx * 0.14; by += dy * 0.14;
      tilt += (Math.max(-16, Math.min(16, dx * 0.5)) - tilt) * 0.1;
      bun.style.transform = 'translate(' + bx + 'px,' + by + 'px) rotate(' + tilt + 'deg)';
      requestAnimationFrame(loop);
    })();
  }
})();
