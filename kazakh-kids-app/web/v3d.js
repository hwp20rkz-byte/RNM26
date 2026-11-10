/* QV3D — небольшой 3D-слой поверх three.js: блочные нео-чиби персонажи, питомцы, скины,
 * асыки, молоток аукциона и сцена-«подиум». Всё собрано из коробок с неоновыми акцентами.
 * Если WebGL недоступен, QV3D.ok() вернёт false и игра покажет 2D-версии. */
(function () {
  'use strict';
  var T = window.THREE;
  var NEON = { cyan: 0x22e6ff, pink: 0xff4fd8, gold: 0xffc93c, lime: 0x7dff5a, violet: 0x9b6bff, orange: 0xff8a2a, red: 0xff4d5e };
  var stages = [], glOk = null;

  function ok() {
    if (glOk !== null) return glOk;
    try {
      var c = document.createElement('canvas');
      glOk = !!(T && (c.getContext('webgl2') || c.getContext('webgl')));
    } catch (e) { glOk = false; }
    return glOk;
  }

  /* ---------- primitives ---------- */
  function lam(color, o) { o = o || {}; o.color = color; return new T.MeshLambertMaterial(o); }
  function glow(color, o) { o = o || {}; o.color = color; return new T.MeshBasicMaterial(o); }
  function box(w, h, d, mat, x, y, z) {
    var m = new T.Mesh(new T.BoxGeometry(w, h, d), typeof mat === 'number' ? lam(mat) : mat);
    m.position.set(x || 0, y || 0, z || 0);
    return m;
  }
  function cyl(rt, rb, h, mat, x, y, z, seg) {
    var m = new T.Mesh(new T.CylinderGeometry(rt, rb, h, seg || 12), typeof mat === 'number' ? lam(mat) : mat);
    m.position.set(x || 0, y || 0, z || 0);
    return m;
  }
  function ball(r, mat, x, y, z) {
    var m = new T.Mesh(new T.SphereGeometry(r, 12, 10), typeof mat === 'number' ? lam(mat) : mat);
    m.position.set(x || 0, y || 0, z || 0);
    return m;
  }
  function group(x, y, z) { var g = new T.Group(); g.position.set(x || 0, y || 0, z || 0); for (var i = 3; i < arguments.length; i++) g.add(arguments[i]); return g; }

  // Face painted on a canvas → texture for the front of the blocky head.
  function faceTexture(draw, skin) {
    var c = document.createElement('canvas'); c.width = c.height = 128;
    var g = c.getContext('2d');
    g.fillStyle = skin; g.fillRect(0, 0, 128, 128);
    draw(g);
    var tx = new T.CanvasTexture(c);
    return tx;
  }
  function eye(g, x, y, r, iris) {
    g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    g.fillStyle = iris; g.beginPath(); g.arc(x, y + 1, r * 0.62, 0, 7); g.fill();
    g.fillStyle = '#16181f'; g.beginPath(); g.arc(x, y + 1, r * 0.34, 0, 7); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(x + r * 0.3, y - r * 0.3, r * 0.2, 0, 7); g.fill();
  }
  function smile(g, y, w, open) {
    g.strokeStyle = '#4a2a2a'; g.lineWidth = 5; g.lineCap = 'round';
    g.beginPath(); g.arc(64, y, w, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
    if (open) { g.fillStyle = '#b2414f'; g.beginPath(); g.arc(64, y + 2, w - 2, 0.1 * Math.PI, 0.9 * Math.PI); g.fill(); }
  }
  function blush(g) { g.fillStyle = 'rgba(255,120,150,.45)'; g.beginPath(); g.arc(24, 84, 10, 0, 7); g.arc(104, 84, 10, 0, 7); g.fill(); }
  function hexStr(n) { return '#' + ('000000' + n.toString(16)).slice(-6); }

  /* ---------- blocky humanoid base ---------- */
  function humanoid(o) {
    var root = new T.Group(), P = {};
    var skinMat = lam(o.skin);
    var sideMat = lam(o.hair != null ? o.hair : o.skin);
    var headMats = [sideMat, sideMat, lam(o.hair != null ? o.hair : o.skin), skinMat, new T.MeshLambertMaterial({ map: faceTexture(o.face, hexStr(o.skin)) }), sideMat];
    P.head = new T.Mesh(new T.BoxGeometry(1.25, 1.15, 1.1), headMats); P.head.position.y = 2.62;
    P.torso = box(1.0, 1.1, 0.56, o.top, 0, 1.48, 0);
    P.armL = group(-0.68, 2.0, 0, box(0.34, 1.0, 0.4, o.sleeve != null ? o.sleeve : o.top, 0, -0.5, 0), box(0.34, 0.22, 0.4, o.skin, 0, -1.08, 0));
    P.armR = group(0.68, 2.0, 0, box(0.34, 1.0, 0.4, o.sleeve != null ? o.sleeve : o.top, 0, -0.5, 0), box(0.34, 0.22, 0.4, o.skin, 0, -1.08, 0));
    if (!o.hover) {
      P.legL = group(-0.26, 0.95, 0, box(0.44, 0.75, 0.46, o.pants, 0, -0.38, 0), box(0.46, 0.2, 0.6, o.shoes, 0, -0.85, 0.06));
      P.legR = group(0.26, 0.95, 0, box(0.44, 0.75, 0.46, o.pants, 0, -0.38, 0), box(0.46, 0.2, 0.6, o.shoes, 0, -0.85, 0.06));
      root.add(P.legL, P.legR);
    }
    root.add(P.head, P.torso, P.armL, P.armR);
    root.userData.parts = P;
    return root;
  }

  /* ---------- the four heroes ---------- */
  var BUILD = {
    batyr: function () {
      var g = humanoid({
        skin: 0xe8b98a, hair: 0x2b2230, top: 0x1b2a5c, sleeve: 0x2456c9, pants: 0x1b2340, shoes: 0xffc93c,
        face: function (c) {
          c.fillStyle = '#16181f'; c.fillRect(14, 44, 100, 26);                      // (⌐■_■) visor
          c.fillStyle = '#22e6ff'; c.fillRect(20, 50, 34, 6); c.fillRect(74, 50, 34, 6);
          smile(c, 84, 20, false);
        }
      }), P = g.userData.parts;
      // holographic шапан with gold қошқар мүйіз trim
      var robe = box(1.16, 1.3, 0.7, lam(NEON.cyan, { transparent: true, opacity: 0.38 }), 0, 1.4, 0);
      g.add(robe, box(0.12, 1.3, 0.72, glow(NEON.gold), -0.2, 1.4, 0.01), box(0.12, 1.3, 0.72, glow(NEON.gold), 0.2, 1.4, 0.01), box(1.18, 0.1, 0.72, glow(NEON.gold), 0, 0.8, 0));
      // helmet
      P.head.add(box(1.35, 0.3, 1.2, 0xffc93c, 0, 0.62, 0), cyl(0.12, 0.5, 0.5, 0x2456c9, 0, 0.98, 0, 8), ball(0.12, glow(NEON.cyan), 0, 1.3, 0));
      // laser шоқпар on the back
      var mace = group(0.5, 1.9, -0.5, cyl(0.06, 0.06, 1.7, 0x4b3a2a), ball(0.26, glow(NEON.cyan), 0, 0.95, 0));
      mace.rotation.z = -0.5; g.add(mace);
      return g;
    },
    aisulu: function () {
      var g = humanoid({
        skin: 0xf3c9a5, hair: 0x2a1b3d, top: 0x18b7a6, sleeve: 0xffffff, pants: 0x3a2f66, shoes: 0xffffff,
        face: function (c) {
          eye(c, 40, 58, 15, '#7a3fd0'); eye(c, 88, 58, 15, '#7a3fd0');
          c.fillStyle = 'rgba(34,230,255,.35)'; c.fillRect(14, 40, 100, 34);          // AR glasses
          c.strokeStyle = '#22e6ff'; c.lineWidth = 3; c.strokeRect(14, 40, 100, 34);
          blush(c); smile(c, 88, 16, true);
        }
      }), P = g.userData.parts;
      P.head.add(cyl(0.6, 0.66, 0.34, 0x7a3fd0, 0, 0.72, 0, 16), cyl(0.61, 0.67, 0.08, glow(NEON.gold), 0, 0.6, 0, 16));        // тюбетейка
      P.head.add(box(0.14, 0.5, 0.5, 0x22262e, -0.7, 0.05, 0), box(0.14, 0.5, 0.5, 0x22262e, 0.7, 0.05, 0), box(1.5, 0.1, 0.16, 0x22262e, 0, 0.66, -0.1)); // headphones
      P.braids = [];
      [-1, 1].forEach(function (s) {
        var b = group(s * 0.66, -0.5, -0.2);
        for (var i = 0; i < 5; i++) b.add(box(0.2 - i * 0.015, 0.22, 0.2 - i * 0.015, glow(i % 2 ? NEON.pink : NEON.violet), 0, -i * 0.24, 0));
        P.head.add(b); P.braids.push(b);
      });
      if (P.legL) [P.legL, P.legR].forEach(function (l) { l.add(box(0.5, 0.07, 0.64, glow(NEON.pink), 0, -0.97, 0.06)); });       // air-sole sneakers
      g.add(box(1.02, 0.12, 0.58, glow(NEON.pink), 0, 1.0, 0));
      return g;
    },
    azhe: function () {
      var g = humanoid({
        skin: 0xcfd3e6, hair: 0xffffff, top: 0x8c2f4a, sleeve: 0xb9bfd8, hover: true,
        face: function (c) {
          ['40', '88'].forEach(function (x) {                                         // [◎ ‿ ◎] screen eyes
            c.strokeStyle = '#22e6ff'; c.lineWidth = 6; c.beginPath(); c.arc(+x, 58, 15, 0, 7); c.stroke();
            c.fillStyle = '#22e6ff'; c.beginPath(); c.arc(+x, 58, 6, 0, 7); c.fill();
          });
          blush(c); smile(c, 86, 18, false);
        }
      }), P = g.userData.parts;
      P.head.add(box(1.4, 0.5, 1.2, 0xffffff, 0, 0.5, -0.02), box(0.14, 1.3, 1.16, 0xffffff, -0.68, -0.1, -0.02), box(0.14, 1.3, 1.16, 0xffffff, 0.68, -0.1, -0.02)); // кимешек
      P.head.add(cyl(0.02, 0.02, 0.4, 0x8a8fa8, 0.3, 0.95, 0), ball(0.09, glow(NEON.gold), 0.3, 1.18, 0));                      // antenna
      g.add(box(1.04, 0.14, 0.6, glow(NEON.gold), 0, 1.86, 0), box(0.2, 1.1, 0.6, glow(NEON.gold), 0, 1.48, 0.005));               // камзол trim
      g.add(box(0.9, 0.6, 0.5, 0x8c2f4a, 0, 0.72, 0));                                                                           // skirt block
      // hovering көрпеше
      var rug = group(0, 0.28, 0, box(1.9, 0.14, 1.3, 0xb5179e), box(1.5, 0.15, 0.9, 0xffc93c), box(1.0, 0.16, 0.5, 0x22b8cf), box(1.96, 0.05, 1.36, glow(NEON.cyan), 0, -0.1, 0));
      g.add(rug); P.rug = rug;
      return g;
    },
    tayson: function () {
      var g = humanoid({
        skin: 0xe0a878, hair: 0x3b2a20, top: 0xff8a2a, pants: 0x2d3142, shoes: 0xffffff,
        face: function (c) {
          eye(c, 40, 60, 13, '#3d7a34'); eye(c, 88, 60, 13, '#3d7a34');
          c.strokeStyle = '#3b2a20'; c.lineWidth = 6; c.lineCap = 'round';           // (ò_ó)
          c.beginPath(); c.moveTo(24, 38); c.lineTo(52, 46); c.moveTo(104, 38); c.lineTo(76, 46); c.stroke();
          smile(c, 86, 15, true);
          c.fillStyle = '#f6e3b4'; c.fillRect(92, 76, 18, 8);                         // plaster
        }
      }), P = g.userData.parts;
      g.scale.setScalar(0.88);
      P.head.add(box(1.32, 0.34, 1.16, 0x2bd96b, 0, 0.66, 0), box(0.9, 0.08, 0.5, 0x2bd96b, 0, 0.52, -0.75));                     // cap, visor back
      g.add(box(1.2, 0.5, 0.5, 0xff8a2a, 0, 2.1, -0.36));                                                                        // hood
      // petroglyph print (Тамғалы)
      var c = document.createElement('canvas'); c.width = c.height = 64; var x = c.getContext('2d');
      x.fillStyle = '#ff8a2a'; x.fillRect(0, 0, 64, 64); x.strokeStyle = '#5a2a00'; x.lineWidth = 3;
      x.beginPath(); x.arc(32, 22, 9, 0, 7); x.moveTo(32, 31); x.lineTo(32, 50); x.moveTo(18, 40); x.lineTo(46, 40); x.moveTo(32, 50); x.lineTo(22, 60); x.moveTo(32, 50); x.lineTo(42, 60);
      for (var i = 0; i < 8; i++) { var a = i * Math.PI / 4; x.moveTo(32 + 11 * Math.cos(a), 22 + 11 * Math.sin(a)); x.lineTo(32 + 16 * Math.cos(a), 22 + 16 * Math.sin(a)); }
      x.stroke();
      var tx = new T.CanvasTexture(c);
      g.add(new T.Mesh(new T.PlaneGeometry(0.7, 0.7), new T.MeshLambertMaterial({ map: tx })).translateY(1.5).translateZ(0.29));
      // asyk-shaped hoverboard
      var board = group(0, 0.02, 0, box(1.7, 0.16, 0.7, 0xf2e6c9), box(0.5, 0.2, 0.74, 0xe3d2a8, -0.45, 0.02, 0), box(0.5, 0.2, 0.74, 0xe3d2a8, 0.45, 0.02, 0), box(1.76, 0.05, 0.76, glow(NEON.lime), 0, -0.11, 0));
      g.add(board); P.board = board;
      g.children.forEach(function (ch) { if (ch !== board) ch.position.y += 0.12; });
      return g;
    }
  };

  /* ---------- pets, skins, trails, props ---------- */
  var ITEM = {
    pet_bars: function () {
      var g = group(0, 0, 0, box(1.1, 0.6, 0.6, 0xf2f5fa, 0, 0.6, 0), box(0.62, 0.56, 0.6, 0xf2f5fa, 0.72, 0.95, 0), box(0.16, 0.2, 0.12, 0xf2f5fa, 0.56, 1.3, 0.2), box(0.16, 0.2, 0.12, 0xf2f5fa, 0.56, 1.3, -0.2));
      [[-0.4, 0.2], [0.4, 0.2], [-0.4, -0.2], [0.4, -0.2]].forEach(function (p) { g.add(box(0.2, 0.36, 0.2, 0xdfe5ee, p[0], 0.18, p[1])); });
      [[-0.3, 0.92, 0.2], [0.1, 0.92, -0.15], [0.3, 0.92, 0.22], [-0.1, 0.92, 0.05]].forEach(function (p) { g.add(box(0.14, 0.03, 0.14, glow(NEON.cyan), p[0], p[1], p[2])); });
      g.add(box(0.04, 0.1, 0.12, glow(NEON.cyan), 1.04, 1.02, 0.16), box(0.04, 0.1, 0.12, glow(NEON.cyan), 1.04, 1.02, -0.16));
      var tail = group(-0.55, 0.75, 0, box(0.7, 0.14, 0.14, 0xf2f5fa, -0.35, 0, 0), box(0.16, 0.16, 0.16, glow(NEON.cyan), -0.72, 0, 0)); tail.rotation.z = -0.5; g.add(tail); g.userData.tail = tail;
      return g;
    },
    pet_tay: function () {
      var gold = lam(0xffc93c, { emissive: 0x7a4a00 });
      var g = group(0, 0, 0, box(1.1, 0.55, 0.5, gold, 0, 0.85, 0), box(0.3, 0.7, 0.36, gold, 0.5, 1.3, 0), box(0.6, 0.34, 0.38, gold, 0.72, 1.62, 0), box(0.1, 0.7, 0.1, glow(0xfff2b0), 0.36, 1.4, 0), box(0.5, 0.1, 0.1, glow(0xfff2b0), -0.75, 0.9, 0));
      [[-0.4, 0.17], [0.4, 0.17], [-0.4, -0.17], [0.4, -0.17]].forEach(function (p) { g.add(box(0.16, 0.62, 0.16, gold, p[0], 0.31, p[1])); });
      return g;
    },
    pet_burkit: function () {
      var g = group(0, 0, 0, box(0.5, 0.7, 0.5, 0x7a4e30, 0, 0.9, 0), box(0.44, 0.4, 0.44, 0xf3e3c8, 0, 1.4, 0), box(0.14, 0.12, 0.26, 0xffc93c, 0, 1.36, 0.3), box(0.1, 0.08, 0.02, glow(NEON.cyan), -0.12, 1.48, 0.23), box(0.1, 0.08, 0.02, glow(NEON.cyan), 0.12, 1.48, 0.23));
      var wl = group(-0.25, 1.1, 0, box(0.8, 0.1, 0.4, 0x5b3a22, -0.4, 0, 0)), wr = group(0.25, 1.1, 0, box(0.8, 0.1, 0.4, 0x5b3a22, 0.4, 0, 0));
      g.add(wl, wr, box(0.1, 0.5, 0.1, 0xffc93c, -0.12, 0.3, 0), box(0.1, 0.5, 0.1, 0xffc93c, 0.12, 0.3, 0)); g.userData.wings = [wl, wr];
      return g;
    },
    pet_tasbaqa: function () {
      var g = group(0, 0, 0, box(1.0, 0.4, 0.8, 0x2f9e5b, 0, 0.5, 0), box(0.7, 0.2, 0.5, 0x37b86b, 0, 0.78, 0), box(0.72, 0.03, 0.52, glow(NEON.lime), 0, 0.68, 0), box(0.34, 0.3, 0.3, 0x9ad17c, 0.66, 0.5, 0));
      [[-0.35, 0.36], [0.35, 0.36], [-0.35, -0.36], [0.35, -0.36]].forEach(function (p) { g.add(box(0.2, 0.26, 0.2, 0x9ad17c, p[0], 0.2, p[1])); });
      return g;
    },
    sk_borik: function () { return group(0, 0, 0, cyl(0.72, 0.72, 0.34, 0x6b4a2f, 0, 0.17, 0, 14), cyl(0.3, 0.62, 0.4, 0x2456c9, 0, 0.52, 0, 14), cyl(0.73, 0.73, 0.07, glow(NEON.cyan), 0, 0.3, 0, 14), ball(0.1, glow(NEON.gold), 0, 0.78, 0)); },
    sk_saukele: function () { return group(0, 0, 0, cyl(0.16, 0.6, 1.3, 0xc2185b, 0, 0.65, 0, 12), cyl(0.62, 0.62, 0.1, glow(NEON.gold), 0, 0.06, 0, 12), cyl(0.42, 0.42, 0.08, glow(NEON.pink), 0, 0.5, 0, 12), cyl(0.26, 0.26, 0.08, glow(NEON.gold), 0, 0.95, 0, 12), ball(0.1, glow(NEON.cyan), 0, 1.36, 0)); },
    sk_taqiya: function () { return group(0, 0, 0, cyl(0.6, 0.66, 0.36, lam(0xffc93c, { emissive: 0x6a4200 }), 0, 0.18, 0, 16), cyl(0.67, 0.67, 0.06, glow(NEON.orange), 0, 0.06, 0, 16)); },
    sk_glasses: function () { return group(0, 0, 0, box(1.34, 0.26, 0.1, lam(NEON.cyan, { transparent: true, opacity: 0.6 })), box(1.36, 0.05, 0.12, glow(NEON.cyan), 0, 0.14, 0)); },
    sk_shapan: function () { return group(0, 0, 0, box(1.3, 1.5, 0.08, lam(NEON.violet, { transparent: true, opacity: 0.55 })), box(1.34, 0.1, 0.1, glow(NEON.gold), 0, 0.72, 0), box(0.1, 1.5, 0.1, glow(NEON.gold), -0.64, 0, 0), box(0.1, 1.5, 0.1, glow(NEON.gold), 0.64, 0, 0)); },
    tr_tulip: function () { return ring(function () { return group(0, 0, 0, cyl(0.02, 0.02, 0.4, 0x2f9e5b), cyl(0.14, 0.06, 0.22, glow(NEON.pink), 0, 0.3, 0, 6)); }); },
    tr_spark: function () { return ring(function () { var m = new T.Mesh(new T.OctahedronGeometry(0.14), glow(NEON.gold)); return m; }); },
    tr_stars: function () { return ring(function () { var m = new T.Mesh(new T.OctahedronGeometry(0.16), glow(0xfff36b)); m.scale.y = 0.5; return m; }); }
  };
  function ring(make) {
    var g = new T.Group(); g.userData.orbit = [];
    for (var i = 0; i < 7; i++) { var m = make(); m.userData.a = i / 7 * Math.PI * 2; g.add(m); g.userData.orbit.push(m); }
    g.position.y = 0.9;
    return g;
  }
  // Асық: dog-bone silhouette. Sides are marked so the result of a toss is readable:
  // top = алшы (gold S-ridge), bottom = тәйке (dark), front = бүк (smooth belly), back = шік (hollow groove).
  function asyk() {
    var bone = lam(0xf4e6c8), dark = lam(0xd9c49a);
    var g = group(0, 0, 0,
      box(0.62, 0.4, 0.5, bone),                                   // waist
      box(0.42, 0.52, 0.66, bone, -0.5, 0, 0), box(0.42, 0.52, 0.66, bone, 0.5, 0, 0),   // knobs
      box(0.18, 0.44, 0.56, dark, -0.78, 0, 0), box(0.18, 0.44, 0.56, dark, 0.78, 0, 0),
      box(0.5, 0.05, 0.14, glow(NEON.gold), -0.2, 0.275, 0.1), box(0.5, 0.05, 0.14, glow(NEON.gold), 0.2, 0.275, -0.1),   // алшы
      box(1.1, 0.05, 0.3, 0x8a6f45, 0, -0.275, 0),                 // тәйке
      box(0.7, 0.3, 0.06, 0xfff6e0, 0, 0, 0.3),                    // бүк
      box(0.7, 0.2, 0.06, 0x6b5636, 0, 0, -0.3));                  // шік
    return g;
  }
  function hammer() {
    var g = group(0, 0, 0), arm = group(0, 0, 0, cyl(0.07, 0.07, 1.6, 0x7a4e30, 0, 0.8, 0), cyl(0.26, 0.26, 0.7, 0x4b2f1c, 0, 1.6, 0, 14), cyl(0.27, 0.27, 0.08, glow(NEON.gold), 0, 1.6, 0.0, 14));
    arm.children[1].rotation.z = Math.PI / 2; arm.children[2].rotation.z = Math.PI / 2;
    g.add(arm); g.userData.arm = arm;
    return g;
  }
  function pedestal() { return group(0, 0, 0, cyl(1.5, 1.7, 0.3, 0x1b2340, 0, 0.15, 0, 24), cyl(1.52, 1.52, 0.05, glow(NEON.cyan), 0, 0.31, 0, 24), cyl(1.0, 1.1, 0.25, 0x2a3566, 0, 0.44, 0, 24)); }

  // Put a skin on a hero: hats on the head, glasses over the eyes, cape on the back.
  function wear(hero, skinId) {
    var P = hero.userData.parts; if (!P || !ITEM[skinId]) return;
    if (P.skin) { P.skin.parent.remove(P.skin); P.skin = null; }
    var s = ITEM[skinId]();
    if (skinId === 'sk_glasses') { s.position.set(0, 0.06, 0.58); P.head.add(s); }
    else if (skinId === 'sk_shapan') { s.position.set(0, 1.35, -0.36); hero.add(s); }
    else { s.position.y = 0.6; s.scale.setScalar(1.02); P.head.add(s); }
    P.skin = s;
  }
  function make(id) { return BUILD[id] ? BUILD[id]() : ITEM[id] ? ITEM[id]() : null; }

  /* ---------- animation ---------- */
  var ease = function (x) { return x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x); };
  function animate(obj, t, dt) {
    var P = obj.userData.parts, u = obj.userData, a = u.anim || 'idle', k = t - (u.animT0 || 0), base = u.baseY || 0;
    if (u.orbit) { u.orbit.forEach(function (m) { var ang = m.userData.a + t * 1.4; m.position.set(Math.cos(ang) * 1.1, Math.sin(t * 3 + m.userData.a) * 0.18, Math.sin(ang) * 1.1); m.rotation.y = t * 2; }); return; }
    if (u.wings) { u.wings[0].rotation.z = Math.sin(t * 7) * 0.6; u.wings[1].rotation.z = -Math.sin(t * 7) * 0.6; obj.position.y = base + Math.sin(t * 3) * 0.08; return; }
    if (u.tail) u.tail.rotation.y = Math.sin(t * 4) * 0.5;
    if (!P) { obj.position.y = base + Math.abs(Math.sin(t * 3)) * 0.08; return; }
    var sw = Math.sin(t * 2.2);
    P.head.rotation.set(0, sw * 0.12, 0); P.armL.rotation.set(0, 0, 0.08 + sw * 0.05); P.armR.rotation.set(0, 0, -0.08 - sw * 0.05);
    if (P.legL) { P.legL.rotation.x = 0; P.legR.rotation.x = 0; }
    obj.position.y = base + Math.sin(t * 2.2) * 0.04; obj.rotation.z = 0; obj.scale.y = obj.scale.x;
    if (P.braids) P.braids.forEach(function (b, i) { b.rotation.z = Math.sin(t * 5 + i) * 0.22; b.rotation.x = Math.cos(t * 4 + i) * 0.15; });
    if (P.rug) { P.rug.rotation.y = Math.sin(t * 1.3) * 0.15; obj.position.y = base + 0.18 + Math.sin(t * 2) * 0.1; }
    if (P.board && a !== 'kickflip') P.board.rotation.set(0, 0, Math.sin(t * 2.5) * 0.06);
    if (a === 'run') {
      var r = Math.sin(t * 11);
      if (P.legL) { P.legL.rotation.x = r * 0.8; P.legR.rotation.x = -r * 0.8; }
      P.armL.rotation.x = -r * 0.7; P.armR.rotation.x = r * 0.7;
    } else if (a === 'slam') {                       // Shattyq Slam: crouch → jump → arms crossed → land
      var j = k < 0.3 ? -ease(k / 0.3) * 0.25 : k < 0.9 ? Math.sin((k - 0.3) / 0.6 * Math.PI) * 1.3 : 0;
      obj.position.y = base + j; obj.scale.y = obj.scale.x * (k > 0.9 && k < 1.1 ? 0.86 : 1);
      var c = ease((k - 0.2) / 0.3);
      P.armL.rotation.set(-1.1 * c, 0, 1.0 * c); P.armR.rotation.set(-1.1 * c, 0, -1.0 * c);
      if (k > 1.9) u.anim = 'idle';
    } else if (a === 'shuffle') {                    // Qara Zhorgha Electro-Shuffle
      var s = Math.sin(t * 12);
      if (P.legL) { P.legL.rotation.x = s * 0.6; P.legR.rotation.x = -s * 0.6; }
      obj.rotation.y = (u.faceY || 0) + Math.sin(t * 6) * 0.5; obj.position.x = (u.baseX || 0) + Math.sin(t * 3) * 0.35;
      P.armL.rotation.set(0, 0, 0.4 + Math.sin(t * 6) * 0.9); P.armR.rotation.set(0, 0, -0.4 + Math.sin(t * 6) * 0.9);
      P.head.rotation.z = Math.sin(t * 6) * 0.15;
      if (k > 3.2) { u.anim = 'idle'; obj.rotation.y = u.faceY || 0; obj.position.x = u.baseX || 0; }
    } else if (a === 'bata') {                       // open palms, a gentle nod
      var b = ease(k / 0.5);
      P.armL.rotation.set(-1.25 * b, 0, 0.35 * b); P.armR.rotation.set(-1.25 * b, 0, -0.35 * b);
      P.head.rotation.x = 0.15 * b + Math.sin(t * 3) * 0.05;
      if (k > 2.8) u.anim = 'idle';
    } else if (a === 'kickflip') {                   // 360 kickflip
      var q = Math.min(1, k / 0.9);
      obj.position.y = base + Math.sin(q * Math.PI) * 1.0;
      if (P.board) P.board.rotation.set(0, 0, 0), P.board.rotation.x = q * Math.PI * 2;
      P.armL.rotation.z = 0.9; P.armR.rotation.z = -0.9;
      if (k > 1.1) { u.anim = 'idle'; if (P.board) P.board.rotation.x = 0; }
    } else if (a === 'cheer') {
      obj.position.y = base + Math.abs(Math.sin(t * 7)) * 0.4;
      P.armL.rotation.z = 2.6; P.armR.rotation.z = -2.6;
      if (k > 2) u.anim = 'idle';
    }
  }
  function play(obj, name, t) { obj.userData.anim = name; obj.userData.animT0 = t != null ? t : now(); }
  function now() { return performance.now() / 1000; }

  /* ---------- stage ---------- */
  function stage(el, o) {
    if (!ok()) return null;
    o = o || {};
    var w = el.clientWidth || o.w || 300, h = el.clientHeight || o.h || 300;
    var renderer;
    try { renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' }); } catch (e) { glOk = false; return null; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h);
    el.appendChild(renderer.domElement);
    var scene = new T.Scene(), cam = new T.PerspectiveCamera(o.fov || 38, w / h, 0.1, 200);
    cam.position.set.apply(cam.position, o.camPos || [0, 2.6, 7.2]); cam.lookAt.apply(cam, o.camLook || [0, 1.6, 0]);
    scene.add(new T.HemisphereLight(0xffffff, 0x8a93b8, 0.85));
    var sun = new T.DirectionalLight(0xffffff, 0.45); sun.position.set(3, 6, 5); scene.add(sun);
    if (o.fog) scene.fog = new T.Fog(o.fog, o.fogNear || 20, o.fogFar || 70);
    var actors = [], ticks = [], dead = false, last = now();
    var S = {
      scene: scene, camera: cam, renderer: renderer, el: el,
      add: function (obj, x, y, z) { if (x != null) obj.position.set(x, y || 0, z || 0); obj.userData.baseY = obj.position.y; obj.userData.baseX = obj.position.x; obj.userData.faceY = obj.rotation.y; scene.add(obj); actors.push(obj); return obj; },
      remove: function (obj) { scene.remove(obj); actors = actors.filter(function (a) { return a !== obj; }); },
      onTick: function (fn) { ticks.push(fn); },
      play: function (obj, name) { play(obj, name, now()); },
      dispose: function () {
        if (dead) return; dead = true;
        stages = stages.filter(function (s) { return s !== S; });
        scene.traverse(function (m) { if (m.geometry) m.geometry.dispose(); if (m.material) [].concat(m.material).forEach(function (x) { if (x.map) x.map.dispose(); x.dispose(); }); });
        renderer.dispose(); if (renderer.forceContextLoss) renderer.forceContextLoss();
        if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
    (function loop() {
      if (dead) return;
      if (!document.body.contains(renderer.domElement)) return S.dispose();   // (isConnected is missing in old WebViews)
      var t = now(), dt = Math.min(0.05, t - last); last = t;
      actors.forEach(function (a) { animate(a, t, dt); });
      ticks.forEach(function (fn) { fn(t, dt); });
      renderer.render(scene, cam);
      requestAnimationFrame(loop);
    })();
    stages.push(S);
    return S;
  }
  function disposeAll() { stages.slice().forEach(function (s) { s.dispose(); }); }

  // Golden sparks (бата, jackpot, sold!)
  function sparks(S, x, y, z, color, n) {
    var parts = [];
    for (var i = 0; i < (n || 26); i++) {
      var m = new T.Mesh(new T.OctahedronGeometry(0.07 + Math.random() * 0.06), glow(color || NEON.gold));
      m.position.set(x, y, z); m.userData.v = new T.Vector3((Math.random() - 0.5) * 3, 2 + Math.random() * 3, (Math.random() - 0.5) * 3);
      S.scene.add(m); parts.push(m);
    }
    var t0 = now();
    S.onTick(function (t, dt) {
      if (!parts.length) return;
      parts.forEach(function (m) { m.userData.v.y -= 6 * dt; m.position.addScaledVector(m.userData.v, dt); m.rotation.x += dt * 6; });
      if (t - t0 > 1.6) { parts.forEach(function (m) { S.scene.remove(m); m.geometry.dispose(); m.material.dispose(); }); parts = []; }
    });
  }

  // One-off thumbnail (PNG data URL) for lists; cached.
  var snapCache = {}, snapR = null;
  function snapshot(id, size, skin) {
    var key = id + '|' + (skin || '') + '|' + size;
    if (snapCache[key]) return snapCache[key];
    if (!ok()) return null;
    try {
      if (!snapR) { snapR = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); }
      snapR.setSize(size, size);
      var scene = new T.Scene(), obj = make(id); if (!obj) return null;
      if (skin && BUILD[id]) wear(obj, skin);
      scene.add(new T.HemisphereLight(0xffffff, 0x8a93b8, 0.85)); var d = new T.DirectionalLight(0xffffff, 0.45); d.position.set(3, 6, 5); scene.add(d);
      var bb = new T.Box3().setFromObject(obj), c = bb.getCenter(new T.Vector3()), s = bb.getSize(new T.Vector3()), r = Math.max(s.x, s.y, s.z);
      obj.rotation.y = BUILD[id] ? -0.35 : 0.6; scene.add(obj);
      var cam = new T.PerspectiveCamera(30, 1, 0.1, 100); cam.position.set(c.x, c.y + r * 0.15, c.z + r * 2.3); cam.lookAt(c);
      snapR.render(scene, cam);
      snapCache[key] = snapR.domElement.toDataURL('image/png');
      scene.traverse(function (m) { if (m.geometry) m.geometry.dispose(); if (m.material) [].concat(m.material).forEach(function (x) { if (x.map) x.map.dispose(); x.dispose(); }); });
      return snapCache[key];
    } catch (e) { return null; }
  }

  window.QV3D = {
    ok: ok, THREE: T, NEON: NEON, box: box, cyl: cyl, ball: ball, group: group, lam: lam, glow: glow,
    make: make, wear: wear, asyk: asyk, hammer: hammer, pedestal: pedestal,
    stage: stage, disposeAll: disposeAll, play: play, sparks: sparks, snapshot: snapshot, ease: ease, now: now
  };
})();
