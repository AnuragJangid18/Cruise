(function () {
  'use strict';

  // Mobile detection
  var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
    || window.innerWidth < 768 
    || (window.matchMedia('(pointer:coarse)').matches);

  /* ─────────────────────────────────────────
     INTRO: porthole + sea canvas + zoom-in
  ───────────────────────────────────────── */
  var introEl   = document.getElementById('intro');
  var phWrap    = document.getElementById('ph-wrap');
  var phText    = document.getElementById('ph-text');
  var scrollCue = document.getElementById('scroll-cue');
  var boltsEl   = document.getElementById('ph-bolts');
  var canvas    = document.getElementById('sea');
  var ctx       = canvas.getContext('2d');
  
  // Reduce animation timing on mobile
  var animDelay = isMobile ? 400 : 800;

  /* position wrap fixed & centred */
  phWrap.style.position = 'fixed';
  phWrap.style.zIndex   = '10001';
  function centreWrap() {
    phWrap.style.left = (window.innerWidth  / 2 - 110) + 'px';
    phWrap.style.top  = (window.innerHeight / 2 - 110) + 'px';
  }
  centreWrap();
  window.addEventListener('resize', centreWrap);

  /* bolts */
  for (var bi = 0; bi < 8; bi++) {
    var ang = (bi / 8) * Math.PI * 2 - Math.PI / 2;
    var bolt = document.createElement('div');
    bolt.className = 'bolt';
    bolt.style.left = (144 + Math.cos(ang) * 130) + 'px';
    bolt.style.top  = (144 + Math.sin(ang) * 130) + 'px';
    boltsEl.appendChild(bolt);
  }

  /* canvas sea */
  var cW = 220, cH = 220, seaT = 0, seaRaf;

  function sizeCvs() {
    cW = canvas.offsetWidth  || 220;
    cH = canvas.offsetHeight || 220;
    canvas.width  = cW;
    canvas.height = cH;
  }
  sizeCvs();

  var waves = [
    {a:.055,f:1.2, s:.22, al:.85, col:'rgba(8,60,100,',   off:0   },
    {a:.040,f:2.1, s:.38, al:.70, col:'rgba(13,90,140,',  off:1.1 },
    {a:.030,f:3.4, s:.55, al:.60, col:'rgba(18,120,160,', off:2.3 },
    {a:.020,f:5.0, s:.80, al:.45, col:'rgba(40,160,180,', off:0.7 },
    {a:.012,f:7.8, s:1.1, al:.30, col:'rgba(60,190,200,', off:3.0 },
    {a:.008,f:12., s:1.6, al:.20, col:'rgba(100,210,220,',off:1.8 }
  ];

  var sparks = [];
  for (var si = 0; si < 28; si++) {
    sparks.push({
      x:    Math.random(),
      yRel: 0.3 + Math.random() * 0.5,
      sz:   0.5 + Math.random() * 1.5,
      life: Math.random(),
      spd:  0.002 + Math.random() * 0.004,
      drift:(Math.random() - 0.5) * 0.0008
    });
  }

  function drawSea(ts) {
    seaT = ts * 0.001;
    ctx.clearRect(0, 0, cW, cH);

    var skyH = cH * 0.42;

    /* sky */
    var skyG = ctx.createLinearGradient(0, 0, 0, skyH);
    skyG.addColorStop(0,   '#03111e');
    skyG.addColorStop(0.5, '#061d38');
    skyG.addColorStop(1,   '#0a3060');
    ctx.fillStyle = skyG;
    ctx.fillRect(0, 0, cW, skyH);

    /* sun glow - simplified on mobile */
    if (!isMobile) {
      var sunX = cW * 0.55, sunY = skyH * 0.82;
      var sunG = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, cW * 0.55);
      sunG.addColorStop(0,   'rgba(220,180,80,.22)');
      sunG.addColorStop(0.3, 'rgba(180,130,40,.10)');
      sunG.addColorStop(1,   'transparent');
      ctx.fillStyle = sunG;
      ctx.fillRect(0, 0, cW, skyH);
    }

    /* horizon */
    ctx.strokeStyle = 'rgba(180,200,220,.18)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, skyH); ctx.lineTo(cW, skyH); ctx.stroke();

    /* ocean */
    var seaG = ctx.createLinearGradient(0, skyH, 0, cH);
    seaG.addColorStop(0,   '#0a3a6e');
    seaG.addColorStop(0.4, '#063060');
    seaG.addColorStop(1,   '#020d20');
    ctx.fillStyle = seaG;
    ctx.fillRect(0, skyH, cW, cH - skyH);

    /* sun reflection - skip on mobile */
    if (!isMobile) {
      var sunX = cW * 0.55, sunY = skyH * 0.82;
      var refG = ctx.createLinearGradient(0, skyH, 0, cH);
      refG.addColorStop(0, 'rgba(200,170,60,.14)');
      refG.addColorStop(1, 'rgba(200,170,60,0)');
      ctx.save();
      ctx.fillStyle = refG;
      ctx.beginPath();
      ctx.moveTo(sunX - cW*.06, skyH); ctx.lineTo(sunX + cW*.06, skyH);
      ctx.lineTo(sunX + cW*.18, cH);   ctx.lineTo(sunX - cW*.18, cH);
      ctx.closePath(); ctx.fill(); ctx.restore();
    }

    /* waves - reduced on mobile */
    var waveCount = isMobile ? 2 : waves.length;
    for (var wi = 0; wi < waveCount; wi++) {
      var lyr = waves[wi];
      var baseY = skyH + (cH - skyH) * (0.08 + wi * 0.13);
      ctx.beginPath(); ctx.moveTo(0, cH); ctx.lineTo(0, baseY);
      var step = isMobile ? 4 : 2;
      for (var x = 0; x <= cW; x += step) {
        var nx = x / cW;
        var y = baseY
          + Math.sin(nx * Math.PI * 2 * lyr.f + seaT * lyr.s + lyr.off) * cH * lyr.a
          + Math.sin(nx * Math.PI * 2 * lyr.f * 0.7 + seaT * lyr.s * 1.3 + lyr.off * 0.6) * cH * lyr.a * 0.4;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(cW, cH); ctx.closePath();
      ctx.fillStyle = lyr.col + lyr.al + ')';
      ctx.fill();
    }

    /* sparkles - skip on mobile */
    if (!isMobile) {
      for (var ki = 0; ki < sparks.length; ki++) {
        var sp = sparks[ki];
        sp.life = (sp.life + sp.spd) % 1;
        var sparkA = sp.life < 0.5 ? sp.life * 2 : 2 - sp.life * 2;
        sp.x = (sp.x + sp.drift + 1) % 1;
        var px = sp.x * cW;
        var py = skyH + (cH - skyH) * sp.yRel
                 + Math.sin(sp.x * Math.PI * 4 + seaT * 0.6) * cH * 0.018;
        ctx.save();
        ctx.globalAlpha = sparkA * 0.55;
        ctx.fillStyle = 'rgba(200,235,245,1)';
        ctx.beginPath(); ctx.arc(px, py, sp.sz, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    }

    /* stars */
    ctx.save();
    var starCount = isMobile ? 10 : 22;
    for (var st = 0; st < starCount; st++) {
      var sx = ((st * 137.508 + 13) % 1) * cW;
      var sy = ((st * 97.3   + 7 ) % 0.38) * skyH;
      var tw = isMobile ? 0.5 : (0.2 + 0.8 * (0.5 + 0.5 * Math.sin(seaT * (0.8 + st * 0.15) + st)));
      ctx.globalAlpha = tw * 0.5;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(sx, sy, 0.5 + (st % 2) * 0.2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    /* caustics - skip on mobile */
    if (!isMobile) {
      ctx.save(); ctx.globalAlpha = 0.06;
      for (var ci = 0; ci < 6; ci++) {
        var cx2 = cW * (0.1 + ci * 0.15 + Math.sin(seaT * 0.4 + ci) * 0.05);
        var cy2 = skyH + (cH - skyH) * (0.1 + Math.cos(seaT * 0.3 + ci * 0.7) * 0.08);
        var cg  = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, cW * 0.12);
        cg.addColorStop(0, 'rgba(100,220,240,1)'); cg.addColorStop(1, 'transparent');
        ctx.fillStyle = cg; ctx.fillRect(0, skyH, cW, cH);
      }
      ctx.restore();
    }

    seaRaf = requestAnimationFrame(drawSea);
  }
  seaRaf = requestAnimationFrame(drawSea);

  /* ── sequence ── */
  var zooming = false;

  /* fade porthole in */
  setTimeout(function () { phWrap.style.opacity = '1'; }, 200);

  /* show brand text */
  setTimeout(function () { phText.classList.add('on'); }, 1000);

  /* show scroll cue */
  setTimeout(function () { scrollCue.classList.add('on'); }, 1800);

  function ease(t) {
    return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2;
  }

  function triggerZoom() {
    if (zooming) return;
    zooming = true;

    phText.classList.remove('on');
    scrollCue.classList.remove('on');
    phWrap.classList.add('zooming');

    var vw = window.innerWidth, vh = window.innerHeight;
    var endScale = Math.sqrt(vw*vw + vh*vh) / 220 + 0.15;
    var dur = 1800, t0 = null;
    var ring  = document.getElementById('ph-ring');
    var bolts = document.querySelectorAll('.bolt');

    function step(ts) {
      if (!t0) t0 = ts;
      var prog  = Math.min((ts - t0) / dur, 1);
      var scale = 1 + (endScale - 1) * ease(prog);
      phWrap.style.transform = 'scale(' + scale + ')';
      sizeCvs();

      if (prog > 0.5) {
        var op = Math.max(0, 1 - (prog - 0.5) * 2);
        ring.style.opacity = op;
        for (var i = 0; i < bolts.length; i++) bolts[i].style.opacity = op;
      }

      if (prog < 1) {
        requestAnimationFrame(step);
      } else {
        introEl.style.transition = 'opacity .5s ease';
        introEl.style.opacity    = '0';
        setTimeout(function () {
          introEl.style.display = 'none';
          document.body.classList.remove('locked');
          cancelAnimationFrame(seaRaf);
        }, 520);
      }
    }
    requestAnimationFrame(step);
  }

  /* ── input listeners — fire on ANY interaction during intro ── */
  window.addEventListener('wheel', function (e) {
    if (!zooming && e.deltaY > 0) triggerZoom();
  }, { passive: true });

  window.addEventListener('touchstart', function () {
    if (!zooming) triggerZoom();
  }, { passive: true });

  introEl.addEventListener('click', function () {
    if (!zooming) triggerZoom();
  });

  window.addEventListener('keydown', function (e) {
    if (zooming) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight' ||
        e.key === ' ' || e.key === 'Enter' || e.key === 'PageDown') {
      e.preventDefault();
      triggerZoom();
    }
  });

  /* ─────────────────────────────────────────
     CURSOR
  ───────────────────────────────────────── */
  if (!isMobile) {
    var cur  = document.getElementById('cur');
    var curR = document.getElementById('cur-ring');
    var mx = 0, my = 0, rx = 0, ry = 0;
    document.addEventListener('mousemove', function (e) { mx = e.clientX; my = e.clientY; });
    (function animCursor() {
      cur.style.left  = mx + 'px'; cur.style.top  = my + 'px';
      rx += (mx - rx) * 0.12;     ry += (my - ry) * 0.12;
      curR.style.left = rx + 'px'; curR.style.top = ry + 'px';
      requestAnimationFrame(animCursor);
    }());
  }

  /* ─────────────────────────────────────────
     NAVBAR
  ───────────────────────────────────────── */
  var navbar = document.getElementById('navbar');
  window.addEventListener('scroll', function () {
    navbar.classList.toggle('scrolled', window.scrollY > 60);
  });

  /* ─────────────────────────────────────────
     THREE.JS 3D SHIP
  ───────────────────────────────────────── */
  (function initShip3D() {
    if (isMobile) return; // Skip 3D on mobile
    var canvas = document.getElementById('hero-ship-canvas');
    if (!canvas || typeof THREE === 'undefined' || typeof THREE.GLTFLoader === 'undefined') return;
    
    try {
      var scene = new THREE.Scene();
      scene.background = null;
      
      var w = canvas.clientWidth || 520;
      var h = canvas.clientHeight || 280;
      
      var camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 1000);
      camera.position.set(0, 0, 5.2);
      camera.lookAt(0, 0, 0);
      
      var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
      renderer.setSize(w, h);
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setClearColor(0x000000, 0);
      
      /* lights */
      var ambLight = new THREE.AmbientLight(0xffffff, 0.85);
      scene.add(ambLight);
      
      var dirLight = new THREE.DirectionalLight(0xffffff, 1.15);
      dirLight.position.set(3, 4, 3);
      scene.add(dirLight);

      var fillLight = new THREE.DirectionalLight(0x7ab8ff, 0.65);
      fillLight.position.set(-3, 2, -2);
      scene.add(fillLight);
      
      var shipRoot = new THREE.Group();
      shipRoot.position.y = 0;
      scene.add(shipRoot);

      var shipModel = null;
      var modelBaseSize = null;
      var modelBaseCenter = null;

      function fitModelToCanvas() {
        if (!shipModel || !modelBaseSize || !modelBaseCenter) return;

        var distance = camera.position.z;
        var vFov = THREE.MathUtils.degToRad(camera.fov);
        var visibleHeight = 2 * Math.tan(vFov * 0.5) * distance;
        var visibleWidth = visibleHeight * camera.aspect;

        var scaleForHeight = (visibleHeight * 0.74) / Math.max(modelBaseSize.y, 0.001);
        var scaleForWidth = (visibleWidth * 0.86) / Math.max(modelBaseSize.x, 0.001);
        var scale = Math.min(scaleForHeight, scaleForWidth);

        shipModel.scale.set(scale, scale, scale);
        shipModel.position.x = -modelBaseCenter.x * scale;
        shipModel.position.y = -modelBaseCenter.y * scale;
        shipModel.position.z = -modelBaseCenter.z * scale;
      }

      var loader = new THREE.GLTFLoader();
      loader.load(
        '/images/viking_line_ms_viking_grace_2013.glb',
        function (gltf) {
          shipModel = gltf.scene;

          var box = new THREE.Box3().setFromObject(shipModel);
          modelBaseSize = new THREE.Vector3();
          modelBaseCenter = new THREE.Vector3();
          box.getSize(modelBaseSize);
          box.getCenter(modelBaseCenter);

          fitModelToCanvas();

          shipRoot.add(shipModel);
        },
        undefined,
        function (err) {
          console.error('GLB load error:', err);
        }
      );
      
      var animationTime = 0;
      function animate() {
        requestAnimationFrame(animate);
        animationTime += 0.015;

        shipRoot.position.y = Math.sin(animationTime) * 0.08;
        shipRoot.rotation.z = Math.sin(animationTime * 0.7) * 0.03;
        if (shipModel) shipModel.rotation.y = Math.sin(animationTime * 0.35) * 0.08;
        
        renderer.render(scene, camera);
      }
      animate();
      
      window.addEventListener('resize', function() {
        var newW = canvas.clientWidth || 520;
        var newH = canvas.clientHeight || 280;
        renderer.setSize(newW, newH);
        camera.aspect = newW / newH;
        camera.updateProjectionMatrix();
        camera.lookAt(0, 0, 0);
        fitModelToCanvas();
      });
      
    } catch (e) {
      console.error('Three.js ship error:', e);
    }
  }());

  /* ─────────────────────────────────────────
     THREE.JS ROUTES EARTH
  ───────────────────────────────────────── */
  (function initRoutesEarth3D() {
    if (isMobile) return; // Skip 3D on mobile
    var canvas = document.getElementById('routes-earth-canvas');
    if (!canvas || typeof THREE === 'undefined' || typeof THREE.GLTFLoader === 'undefined') return;

    /* defer until canvas has real dimensions */
    function getSize() {
      var parent = canvas.parentElement;
      var w = canvas.clientWidth || (parent && parent.clientWidth) || 560;
      var h = canvas.clientHeight || (parent && parent.clientHeight) || 480;
      return { w: w, h: h };
    }

    try {
      var sz = getSize();
      var w = sz.w, h = sz.h;

      var scene = new THREE.Scene();

      var camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
      camera.position.set(0, 0, 6.5);
      camera.lookAt(0, 0, 0);

      var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0x000000, 0);

      var ambientLight = new THREE.AmbientLight(0xffffff, 2.2);
      scene.add(ambientLight);

      var earthRoot = new THREE.Group();
      scene.add(earthRoot);

      var earthModel = null;
      var modelBaseSize = null;
      var modelBaseCenter = null;

      function fitEarthModel() {
        if (!earthModel || !modelBaseSize || !modelBaseCenter) return;

        var distance = camera.position.z;
        var vFov = THREE.MathUtils.degToRad(camera.fov);
        var visibleHeight = 2 * Math.tan(vFov * 0.5) * distance;
        var visibleWidth = visibleHeight * camera.aspect;

        var scaleForHeight = (visibleHeight * 0.95) / Math.max(modelBaseSize.y, 0.001);
        var scaleForWidth = (visibleWidth * 0.95) / Math.max(modelBaseSize.x, 0.001);
        var scale = Math.min(scaleForHeight, scaleForWidth);

        earthModel.scale.set(scale, scale, scale);
        earthModel.position.x = -modelBaseCenter.x * scale;
        earthModel.position.y = -modelBaseCenter.y * scale;
        earthModel.position.z = -modelBaseCenter.z * scale;
      }

      var loader = new THREE.GLTFLoader();
      loader.load(
        '/images/earth.glb',
        function (gltf) {
          earthModel = gltf.scene;

          var box = new THREE.Box3().setFromObject(earthModel);
          modelBaseSize = new THREE.Vector3();
          modelBaseCenter = new THREE.Vector3();
          box.getSize(modelBaseSize);
          box.getCenter(modelBaseCenter);

          /* re-measure canvas size after it's fully laid out */
          var sz2 = getSize();
          renderer.setSize(sz2.w, sz2.h);
          camera.aspect = sz2.w / sz2.h;
          camera.updateProjectionMatrix();

          fitEarthModel();
          earthRoot.add(earthModel);
        },
        undefined,
        function (err) {
          console.error('Earth GLB load error:', err);
        }
      );

      var animationTime = 0;
      function animate() {
        requestAnimationFrame(animate);
        animationTime += 0.008;

        earthRoot.rotation.y += 0.003;
        earthRoot.rotation.x = Math.sin(animationTime * 0.3) * 0.12;

        renderer.render(scene, camera);
      }
      animate();

      window.addEventListener('resize', function () {
        var sz3 = getSize();
        renderer.setSize(sz3.w, sz3.h);
        camera.aspect = sz3.w / sz3.h;
        camera.updateProjectionMatrix();
        camera.lookAt(0, 0, 0);
        fitEarthModel();
      });
    } catch (e) {
      console.error('Three.js earth error:', e);
    }
  }());

  /* ─────────────────────────────────────────
     SCROLL REVEALS
  ───────────────────────────────────────── */
  var revEls = document.querySelectorAll('.reveal');
  if (!isMobile) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en, i) {
        if (en.isIntersecting) {
          setTimeout(function () { en.target.classList.add('visible'); }, i * 80);
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12 });
    revEls.forEach(function (el) { io.observe(el); });
  } else {
    revEls.forEach(function (el) { el.classList.add('visible'); });
  }

  /* ─────────────────────────────────────────
     FLEET FILTER
  ───────────────────────────────────────── */
  window.filterFleet = function (type, btn) {
    document.querySelectorAll('.tab-btn').forEach(function (b) { b.classList.remove('active'); });
    btn.classList.add('active');
    document.querySelectorAll('.fc').forEach(function (card) {
      card.style.display = (type === 'all' || card.dataset.type === type) ? '' : 'none';
    });
  };

  /* ═══════════════════════════════════════════════════
     SHIP DEPTH — REVISED
     ───────────────────────────────────────────────────
     transform-origin: center top  — the bow (top of image)
     is the scale anchor. translateY moves the whole image
     so the bow starts just off the bottom of the screen
     and rises to the vertical center.

     SCROLL SEQUENCE (progress 0 → 1):
       0.00        : ship invisible, 2.4× scale, bow at bottom of screen
       0.00 – 0.35 : fades in, rises — bow travels up to resting center
       0.35 – 0.58 : shrinks to 0.82×, panels slide in
       0.58 – 0.78 : everything holds
       0.78 – 1.00 : fade out + drift up
  ═══════════════════════════════════════════════════ */
  (function () {
    var section = document.getElementById('ship-depth');
    var ship    = document.getElementById('depth-ship');
    var panelL  = document.getElementById('depth-panel-left');
    var panelR  = document.getElementById('depth-panel-right');
    if (!section || !ship) return;

    var SCALE_BIG    = 2.4;
    var SCALE_FITTED = 0.82;

    /*
      transform-origin: center top — the bow (top edge of image) is the fixed
      scale anchor. The flexbox centres the image at rest (scale 1, Y=0), so
      the bow sits at  vh/2 − (88vh/2) ≈ 6vh from the top of the screen.

      Y_START: bow begins fully below the viewport (off-screen bottom).
      Y_END:   settled position — a positive value shifts the whole image
               downward so there is equal breathing room above (nav) and below.
               At scale 0.82 the image is 88vh × 0.82 ≈ 72vh tall.
               To centre it in the remaining space (below nav ~70px ≈ 0.09vh):
               offset = navHeight/2 / vh ≈ 0.045  →  use 0.04 for a natural feel.
    */
    var Y_START = 1.0;     /* bow enters from below the viewport — fully off-screen */
    var Y_END   = 0.08;    /* settled: nudged down so ship sits evenly between nav and bottom */

    var tShipScale = SCALE_BIG, cShipScale = SCALE_BIG;
    var tShipY     = 1.0,       cShipY     = 1.0;
    var tShipOp    = 0,         cShipOp    = 0;
    var tPanelOp   = 0,         cPanelOp   = 0;
    var tPanelDx   = 60,        cPanelDx   = 60;

    function lerp(a, b, t) { return a + (b - a) * t; }
    function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
    function ease(t) { return t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3) / 2; }
    function remap(p, lo, hi) { return ease(clamp((p - lo) / (hi - lo), 0, 1)); }

    function onScroll() {
      var scrolled = -section.getBoundingClientRect().top;
      var total    = section.offsetHeight - window.innerHeight;
      var p        = clamp(scrolled / total, 0, 1);

      if (p <= 0) {
        tShipScale = SCALE_BIG; tShipY = Y_START; tShipOp = 0;
        tPanelOp = 0; tPanelDx = 60;
        return;
      }

      /* Phase 1 (0 → 0.35): large ship fades in, bow rises from bottom to center */
      if (p < 0.35) {
        tShipOp    = remap(p, 0, 0.18);
        tShipScale = SCALE_BIG;
        tShipY     = lerp(Y_START, Y_END, remap(p, 0, 0.35));
        tPanelOp   = 0;
        tPanelDx   = 60;
        return;
      }

      /* Phase 2 (0.35 → 0.58): shrink to fitted, panels slide in */
      if (p < 0.58) {
        tShipOp    = 1;
        tShipScale = lerp(SCALE_BIG, SCALE_FITTED, remap(p, 0.35, 0.58));
        tShipY     = Y_END;
        tPanelOp   = remap(p, 0.42, 0.58);
        tPanelDx   = lerp(60, 0, remap(p, 0.42, 0.58));
        return;
      }

      /* Phase 3 (0.58 → 0.78): hold */
      if (p < 0.78) {
        tShipOp = 1; tShipScale = SCALE_FITTED; tShipY = Y_END;
        tPanelOp = 1; tPanelDx = 0;
        return;
      }

      /* Phase 4 (0.78 → 1.0): exit */
      var t4 = remap(p, 0.78, 1.0);
      tShipOp    = lerp(1, 0, t4);
      tShipScale = lerp(SCALE_FITTED, SCALE_FITTED * 0.9, t4);
      tShipY     = lerp(Y_END, Y_END - 0.06, t4);
      tPanelOp   = lerp(1, 0, t4);
      tPanelDx   = lerp(0, 30, t4);
    }

    function render() {
      cShipScale += (tShipScale - cShipScale) * 0.10;
      cShipY     += (tShipY     - cShipY)     * 0.10;
      cShipOp    += (tShipOp    - cShipOp)    * (isMobile ? 0.15 : 0.10);
      cPanelOp   += (tPanelOp   - cPanelOp)   * (isMobile ? 0.12 : 0.08);
      cPanelDx   += (tPanelDx   - cPanelDx)   * (isMobile ? 0.12 : 0.08);

      var vh = window.innerHeight;
      ship.style.opacity   = cShipOp;
      ship.style.transform =
        'translateY(' + (cShipY * vh) + 'px) scale(' + cShipScale + ')';

      if (panelL) {
        panelL.style.opacity   = cPanelOp;
        panelL.style.transform = 'translateY(-50%) translateX(' + (-cPanelDx) + 'px)';
      }
      if (panelR) {
        panelR.style.opacity   = cPanelOp;
        panelR.style.transform = 'translateY(-50%) translateX(' + cPanelDx + 'px)';
      }

      requestAnimationFrame(render);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();
    render();
  }());



  /* ─────────────────────────────────────────
     FORM
  ───────────────────────────────────────── */
  document.getElementById('fsub-btn').addEventListener('click', function () {
    this.textContent = 'Inquiry Sent ✓';
    this.style.background = '#1a6b78';
    var self = this;
    setTimeout(function () {
      self.textContent = 'Send Inquiry →';
      self.style.background = '';
    }, 3000);
  });

}());
