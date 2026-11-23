/* systemowy.marketing · skrypt strony (bez zależności) */
(function () {
  "use strict";
  var doc = document, body = doc.body;
  body.classList.remove("bez-js");
  var OGRANICZ_RUCH = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- liczby po polsku */
  function grupuj(n) {
    var s = Math.round(Math.abs(n)).toString();
    var out = s.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return (n < 0 ? "−" : "") + out;
  }
  function dziesietnie(n, miejsca) {
    var s = Math.abs(n).toFixed(miejsca).split(".");
    var c = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return (n < 0 ? "−" : "") + c + (s[1] ? "," + s[1] : "");
  }
  function zl(n) { return grupuj(n) + " zł"; }

  /* ---------- nagłówek: linia po przewinięciu, menu mobilne */
  var naglowek = doc.getElementById("naglowek");
  function przewin() { if (naglowek) naglowek.classList.toggle("przewiniety", window.scrollY > 8); }
  przewin();
  window.addEventListener("scroll", przewin, { passive: true });
  var menuBtn = doc.querySelector(".menu-przycisk");
  if (menuBtn && naglowek) {
    menuBtn.addEventListener("click", function () {
      var otw = naglowek.classList.toggle("menu-otwarte");
      menuBtn.setAttribute("aria-expanded", otw ? "true" : "false");
      menuBtn.setAttribute("aria-label", otw ? "Zamknij menu" : "Otwórz menu");
    });
    doc.querySelectorAll("#menu-mobilne a").forEach(function (a) {
      a.addEventListener("click", function () {
        naglowek.classList.remove("menu-otwarte");
        menuBtn.setAttribute("aria-expanded", "false");
        menuBtn.setAttribute("aria-label", "Otwórz menu");
      });
    });
  }

  /* ---------- wejście elementów w widok */
  var wejscia = doc.querySelectorAll(".wej");
  if (OGRANICZ_RUCH || !("IntersectionObserver" in window)) {
    wejscia.forEach(function (el) { el.classList.add("widoczny"); });
  } else {
    var ioWej = new IntersectionObserver(function (wpisy) {
      wpisy.forEach(function (w) {
        if (w.isIntersecting) { w.target.classList.add("widoczny"); ioWej.unobserve(w.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    wejscia.forEach(function (el) {
      if (el.getBoundingClientRect().bottom < 0) el.classList.add("widoczny");
      else ioWej.observe(el);
    });
  }

  /* ---------- siatka kropek: białe kwadraty z rzadkimi niebieskimi akcentami,
     odsłanianie od środka, migotanie, rozbłysk od kursora (jak w lejki.pro) */
  var CELL = 14, DOT = 3, MAX_ALPHA = 0.5, OFF_CHANCE = 0.16, ACCENT_CHANCE = 0.05;
  var INTRO_SPREAD = 900, INTRO_JITTER = 350, FLASH_MS = 140;
  var FG = "#F5F5F5", AKCENTY = ["#3B82F6", "#93C5FD"];
  var KURSOR_PROMIEN = 130, KURSOR_ALFA = 0.95, KURSOR_GASNIECIE_MS = 650, KURSOR_KOLOR = "#93C5FD";
  var ROZBLYSK_MS = 200, ROZBLYSK_ALFA = 0.7, ROZBLYSK_UDZIAL = 0.6, ROZBLYSK_ODSTEP_MS = 250;

  function hexNaRgb(h) { return [1, 3, 5].map(function (i) { return parseInt(h.slice(i, i + 2), 16); }); }
  function paleta(z, na) {
    var a = hexNaRgb(z), b = hexNaRgb(na), out = [];
    for (var i = 0; i <= 16; i++) {
      var t = i / 16;
      out.push("rgb(" + a.map(function (v, k) { return Math.round(v + (b[k] - v) * t); }).join(",") + ")");
    }
    return out;
  }
  var PALETY = {};
  [FG].concat(AKCENTY).forEach(function (k) { PALETY[k] = paleta(k, KURSOR_KOLOR); });

  function siatka(cv) {
    var ctx = cv.getContext("2d");
    if (!ctx) return;
    var sekcja = cv.parentElement;
    var poswiata = sekcja.querySelector(".poswiata");
    var kropki = [], dotPx = DOT, cellPx = CELL, kol = 0, rz = 0, offX = 0, offY = 0, dpr = 1;
    var losAlfa = function () { return Math.random() < OFF_CHANCE ? 0 : 0.08 + Math.pow(Math.random(), 2) * (MAX_ALPHA - 0.08); };
    var losCzas = function () { return 400 + Math.random() * 1100; };
    function maluj(k) {
      ctx.clearRect(k.x - 1, k.y - 1, dotPx + 2, dotPx + 2);
      var alfa = k.sw > 0 ? Math.max(k.alfa, k.sw * KURSOR_ALFA) : k.alfa;
      if (alfa <= 0) return;
      ctx.globalAlpha = alfa;
      ctx.fillStyle = k.sw > 0 ? (PALETY[k.kolor] || PALETY[FG])[Math.round(k.sw * 16)] : k.kolor;
      ctx.fillRect(k.x, k.y, dotPx, dotPx);
    }
    function zbuduj(start) {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      var w = Math.max(1, Math.round(cv.clientWidth * dpr)), h = Math.max(1, Math.round(cv.clientHeight * dpr));
      cv.width = w; cv.height = h;
      cellPx = Math.max(4, Math.round(CELL * dpr)); dotPx = Math.max(1, Math.round(DOT * dpr));
      kol = Math.floor(w / cellPx) + 1; rz = Math.floor(h / cellPx) + 1;
      offX = Math.round((w - (kol - 1) * cellPx - dotPx) / 2); offY = Math.round((h - (rz - 1) * cellPx - dotPx) / 2);
      var cx = (kol - 1) / 2, cy = (rz - 1) / 2, maxD = Math.hypot(cx, cy) || 1;
      kropki = [];
      for (var r = 0; r < rz; r++) {
        for (var c = 0; c < kol; c++) {
          var d = Math.hypot(c - cx, r - cy) / maxD, akc = Math.random() < ACCENT_CHANCE;
          kropki.push({ x: offX + c * cellPx, y: offY + r * cellPx, kolor: akc ? AKCENTY[Math.random() < 0.6 ? 0 : 1] : FG,
            gain: 1 - 0.55 * d * d, alfa: 0, faza: 0, nast: start + d * INTRO_SPREAD + Math.random() * INTRO_JITTER, sw: 0 });
        }
      }
    }
    function ustabilizuj(t) { kropki.forEach(function (k) { k.faza = 2; k.alfa = losAlfa() * k.gain; k.nast = t + Math.random() * 1500; maluj(k); }); }
    zbuduj(0);
    var zakotwiczone = false, timer = 0, oswietlone = new Set();
    window.addEventListener("resize", function () {
      clearTimeout(timer);
      timer = setTimeout(function () { oswietlone.clear(); zbuduj(0); ustabilizuj(performance.now()); zakotwiczone = true; }, 120);
    });
    if (OGRANICZ_RUCH) { ustabilizuj(0); return; }

    var kx = 0, ky = 0, kursorNad = false, ostatnia = 0, raf = 0, widoczne = false;
    function swiatlo(t) {
      var dt = ostatnia ? Math.min(64, t - ostatnia) : 16; ostatnia = t;
      var R = KURSOR_PROMIEN * dpr, cel = new Map();
      if (kursorNad) {
        var c0 = Math.max(0, Math.floor((kx - R - offX) / cellPx)), c1 = Math.min(kol - 1, Math.ceil((kx + R - offX) / cellPx));
        var r0 = Math.max(0, Math.floor((ky - R - offY) / cellPx)), r1 = Math.min(rz - 1, Math.ceil((ky + R - offY) / cellPx));
        for (var r = r0; r <= r1; r++) for (var c = c0; c <= c1; c++) {
          var i = r * kol + c, k = kropki[i]; if (!k) continue;
          var d = Math.hypot(k.x + dotPx / 2 - kx, k.y + dotPx / 2 - ky) / R;
          if (d >= 1) continue;
          cel.set(i, Math.pow(1 - d, 1.6)); oswietlone.add(i);
        }
      }
      oswietlone.forEach(function (i) {
        var k = kropki[i]; if (!k) { oswietlone.delete(i); return; }
        var doc_ = cel.get(i) || 0, przed = k.sw;
        k.sw = doc_ >= k.sw ? doc_ : Math.max(doc_, k.sw - dt / KURSOR_GASNIECIE_MS);
        if (k.sw <= 0.001) { k.sw = 0; oswietlone.delete(i); }
        if (k.sw !== przed) maluj(k);
      });
    }
    function tik(t) {
      raf = 0;
      if (!widoczne || doc.hidden) return;
      if (!zakotwiczone) { zakotwiczone = true; kropki.forEach(function (k) { k.nast += t; }); }
      for (var j = 0; j < kropki.length; j++) {
        var k = kropki[j]; if (t < k.nast) continue;
        if (k.faza === 0) { k.faza = 1; k.alfa = k.gain; k.nast = t + FLASH_MS; }
        else if (k.faza === 3) { k.faza = 4; k.alfa = ROZBLYSK_ALFA; k.nast = t + ROZBLYSK_MS; }
        else { k.faza = 2; k.alfa = losAlfa() * k.gain; k.nast = t + losCzas(); }
        maluj(k);
      }
      if (kursorNad || oswietlone.size) swiatlo(t); else ostatnia = 0;
      raf = requestAnimationFrame(tik);
    }
    new IntersectionObserver(function (w) {
      widoczne = w[0].isIntersecting;
      if (widoczne && !raf) raf = requestAnimationFrame(tik);
    }, { threshold: 0.02 }).observe(cv);
    doc.addEventListener("visibilitychange", function () { if (!doc.hidden && widoczne && !raf) raf = requestAnimationFrame(tik); });

    var ostatniRozblysk = -Infinity;
    function rozblysk(cx, cy) {
      var t = performance.now(); if (t - ostatniRozblysk < ROZBLYSK_ODSTEP_MS) return; ostatniRozblysk = t;
      var r = cv.getBoundingClientRect(); if (!r.width || !r.height) return;
      var ex = (cx - r.left) * (cv.width / r.width), ey = (cy - r.top) * (cv.height / r.height);
      var maxD = Math.max(Math.hypot(ex, ey), Math.hypot(cv.width - ex, ey), Math.hypot(ex, cv.height - ey), Math.hypot(cv.width - ex, cv.height - ey)) || 1;
      zakotwiczone = true;
      kropki.forEach(function (k) {
        if (Math.random() >= ROZBLYSK_UDZIAL) return;
        k.faza = 3; k.nast = t + (Math.hypot(k.x - ex, k.y - ey) / maxD) * INTRO_SPREAD + Math.random() * INTRO_JITTER;
      });
      if (widoczne && !raf) raf = requestAnimationFrame(tik);
    }
    function ustawKursor(e) {
      var r = cv.getBoundingClientRect(); if (!r.width || !r.height) return;
      var x = e.clientX - r.left, y = e.clientY - r.top;
      kx = x * (cv.width / r.width); ky = y * (cv.height / r.height);
      if (poswiata) { poswiata.style.setProperty("--kx", x + "px"); poswiata.style.setProperty("--ky", y + "px"); }
    }
    sekcja.addEventListener("pointerenter", function (e) {
      if (e.pointerType === "touch") return;
      rozblysk(e.clientX, e.clientY); ustawKursor(e); kursorNad = true;
      if (poswiata) poswiata.style.opacity = "1";
      if (widoczne && !raf) raf = requestAnimationFrame(tik);
    });
    sekcja.addEventListener("pointermove", function (e) {
      if (e.pointerType === "touch") return;
      ustawKursor(e);
      if (!kursorNad) { kursorNad = true; if (poswiata) poswiata.style.opacity = "1"; }
      if (widoczne && !raf) raf = requestAnimationFrame(tik);
    }, { passive: true });
    sekcja.addEventListener("pointerleave", function (e) {
      if (e.pointerType === "touch") return;
      kursorNad = false; if (poswiata) poswiata.style.opacity = "0";
    });
    sekcja.addEventListener("pointerdown", function (e) { rozblysk(e.clientX, e.clientY); });
  }
  doc.querySelectorAll("canvas[data-siatka]").forEach(siatka);

  /* ---------- hero: system składany klocek po klocku */
  var budowa = doc.querySelector("[data-budowa]");
  if (budowa) {
    var KROKI = [
      { n: "Meta Ads", o: "test oferty", f: "budżet na pierwszy test" },
      { n: "ROMI", o: "pomiar zwrotu", f: "z zysku klocka 01" },
      { n: "Skala", o: "więcej tego, co zarabia", f: "z zysku klocków 01–02" },
      { n: "Google Ads", o: "popyt, który szuka", f: "z zysku klocków 01–03" },
      { n: "Strona", o: "konwersja i zaufanie", f: "z zysku klocków 01–04" },
      { n: "CRM", o: "retencja i polecenia", f: "z zysku klocków 01–05" }
    ];
    var klocki = {};
    budowa.querySelectorAll("[data-krok]").forEach(function (el) { klocki[el.getAttribute("data-krok")] = el; });
    var licznik = budowa.querySelector("[data-licznik]"), teraz = budowa.querySelector("[data-teraz]"), fin = budowa.querySelector("[data-finansowanie]");
    function pokaz(i) {
      var k = KROKI[i - 1];
      licznik.textContent = "Klocek 0" + i + "/06";
      teraz.textContent = k.n + ": " + k.o;
      fin.textContent = k.f;
    }
    if (!OGRANICZ_RUCH) {
      Object.keys(klocki).forEach(function (k) { klocki[k].classList.remove("stoi"); });
      var krok = 0;
      var nastepny = function () {
        if (krok > 0) { klocki[krok].classList.remove("teraz"); klocki[krok].classList.add("stoi"); }
        krok++;
        if (krok > 6) return;
        klocki[krok].classList.add("teraz");
        pokaz(krok);
        setTimeout(nastepny, krok === 1 ? 1100 : 850);
      };
      setTimeout(nastepny, 500);
    }
    Object.keys(klocki).forEach(function (k) {
      klocki[k].addEventListener("mouseenter", function () { if (klocki[k].classList.contains("stoi")) pokaz(+k); });
    });
  }

  /* ---------- kalkulator */
  var kalk = doc.querySelector("[data-kalk]");
  if (kalk) {
    var pola = {};
    kalk.querySelectorAll("[data-pole]").forEach(function (p) {
      var klucz = p.getAttribute("data-pole");
      var suw = p.querySelector("input[type=range]"), num = p.querySelector("input[type=number]");
      pola[klucz] = { suw: suw, num: num };
      function tor() { var mn = +suw.min, mx = +suw.max; suw.style.setProperty("--p", ((+suw.value - mn) / (mx - mn) * 100) + "%"); }
      suw.addEventListener("input", function () { num.value = suw.value; tor(); licz(); });
      num.addEventListener("input", function () {
        var v = parseFloat(String(num.value).replace(",", "."));
        if (isFinite(v)) { suw.value = Math.min(+suw.max, Math.max(+suw.min, v)); tor(); }
        licz();
      });
      tor();
    });
    function wart(k) { var v = parseFloat(String(pola[k].num.value).replace(",", ".")); return isFinite(v) ? v : 0; }
    var $o = function (k) { return kalk.querySelector('[data-o="' + k + '"]'); };
    var werdykt = kalk.querySelector("[data-werdykt]");
    var wStatus = kalk.querySelector("[data-w-status]"), wTekst = kalk.querySelector("[data-w-tekst]"), wRada = kalk.querySelector("[data-w-rada]");
    var ostatni = null;
    function poMiesiacach(n) { return n === 1 ? "po 1 miesiącu" : "po " + n + " miesiącach"; }
    function licz() {
      var B = wart("budzet"), F = wart("obsluga"), cpl = wart("cpl"), k = wart("konwersja") / 100, V = wart("wartosc"), m = wart("marza") / 100;
      var N = wart("nastepny"), r = wart("reinwestycja") / 100;
      if (B <= 0 || cpl <= 0) { wTekst.textContent = "Wpisz budżet i koszt kontaktu większe od zera."; return; }
      var kontakty = B / cpl, klienci = kontakty * k, przychod = klienci * V, marza = przychod * m, koszt = B + F;
      var wynik = marza - koszt, romi = koszt > 0 ? wynik / koszt : 0, roas = przychod / B, cac = klienci > 0 ? koszt / klienci : Infinity;
      $o("kontakty").textContent = dziesietnie(kontakty, kontakty < 10 ? 1 : 0);
      $o("klienci").textContent = dziesietnie(klienci, klienci < 10 ? 1 : 0);
      $o("przychod").textContent = zl(przychod);
      $o("cac").textContent = isFinite(cac) ? zl(cac) : "–";
      $o("roas").textContent = dziesietnie(roas, 2);
      var romiEl = $o("romi"), wynikEl = $o("wynik");
      romiEl.textContent = (romi > 0 ? "+" : "") + dziesietnie(romi * 100, 0) + "%";
      wynikEl.textContent = (wynik > 0 ? "+" : "") + zl(wynik);
      romiEl.className = "duzy " + (wynik > 0 ? "plus" : wynik < 0 ? "minus" : "");
      wynikEl.className = "duzy " + (wynik > 0 ? "plus" : wynik < 0 ? "minus" : "");
      var maxB = Math.max(marza, koszt, 1);
      kalk.querySelector('[data-b="marza"]').style.width = (marza / maxB * 100) + "%";
      kalk.querySelector('[data-b="koszt"]').style.width = (koszt / maxB * 100) + "%";
      kalk.querySelector('[data-b-t="marza"]').textContent = zl(marza);
      kalk.querySelector('[data-b-t="koszt"]').textContent = zl(koszt);
      var mies = null;
      if (wynik > 0 && r > 0 && N > 0) mies = Math.ceil(N / (wynik * r) - 1e-9);
      $o("miesiace").textContent = mies ? mies + " mies." : "–";
      if (wynik > 0) {
        werdykt.setAttribute("data-stan", "plus");
        wStatus.textContent = "Klocek się spina";
        wTekst.textContent = "Zarabia " + zl(wynik) + " miesięcznie ponad koszt marketingu.";
        wRada.textContent = mies
          ? "Jeśli " + dziesietnie(r * 100, 0) + "% nadwyżki przeznaczysz na rozwój, kolejny klocek za " + zl(N) + " sfinansujesz " + poMiesiacach(mies) + ". Zanim podniesiesz budżet, sprawdź, czy sprzedaż nadąża z obsługą kontaktów."
          : "Ustaw część nadwyżki na rozwój i koszt kolejnego klocka, żeby zobaczyć, kiedy go sfinansujesz.";
      } else {
        werdykt.setAttribute("data-stan", wynik < 0 ? "minus" : "zero");
        wStatus.textContent = wynik < 0 ? "Klocek jeszcze się nie spina" : "Klocek wychodzi na zero";
        wTekst.textContent = wynik < 0 ? "Dokładasz " + zl(-wynik) + " miesięcznie. Nie dokładaj kolejnego klocka, dopóki ten nie zarabia." : "Marża pokrywa koszt marketingu, ale nie zostaje nic na kolejny klocek.";
        var drogi = [];
        if (k > 0 && V > 0 && m > 0) drogi.push("koszt kontaktu do " + zl(B * k * V * m / koszt));
        var kStar = koszt * cpl / (B * V * m);
        if (V > 0 && m > 0 && kStar <= 1) drogi.push("skuteczność sprzedaży do " + dziesietnie(kStar * 100, 1) + "%");
        if (k > 0 && m > 0) drogi.push("średnia sprzedaż do " + zl(koszt * cpl / (B * k * m)));
        wRada.textContent = drogi.length ? "Żeby wyjść na zero, wystarczy jedna z tych zmian: " + drogi.join(", albo ") + "." : "Sprawdź marżę i skuteczność sprzedaży: przy tych wartościach klocek nie ma z czego się spłacić.";
      }
      ostatni = { B: B, F: F, cpl: cpl, k: k, V: V, m: m, romi: romi, wynik: wynik, mies: mies };
    }
    licz();
    var zapytaj = kalk.querySelector("[data-zapytaj]");
    if (zapytaj) zapytaj.addEventListener("click", function () {
      if (!ostatni) return;
      var o = ostatni;
      var tekst = "Kalkulator na stronie pokazał mi: budżet reklamowy " + zl(o.B) + ", obsługa " + zl(o.F) + ", koszt kontaktu " + zl(o.cpl) +
        ", skuteczność sprzedaży " + dziesietnie(o.k * 100, 1) + "%, średnia sprzedaż " + zl(o.V) + ", marża " + dziesietnie(o.m * 100, 0) +
        "%. ROMI wychodzi " + dziesietnie(o.romi * 100, 0) + "%. Co poprawić w pierwszej kolejności i od którego klocka zacząć?";
      if (window.CzatAI && typeof window.CzatAI.send === "function") window.CzatAI.send(tekst);
      else { var kont = doc.getElementById("kontakt"); if (kont) kont.scrollIntoView({ behavior: OGRANICZ_RUCH ? "auto" : "smooth" }); }
    });
  }

  /* ---------- pakiet z przycisku albo z adresu (?pakiet=) */
  var wyborPakietu = doc.getElementById("f-pakiet");
  function ustawPakiet(p) { if (wyborPakietu && p && wyborPakietu.querySelector('option[value="' + p + '"]')) wyborPakietu.value = p; }
  try { ustawPakiet(new URLSearchParams(location.search).get("pakiet")); } catch (e) { /* brak URLSearchParams */ }
  doc.querySelectorAll("[data-pakiet]").forEach(function (a) {
    a.addEventListener("click", function () { ustawPakiet(a.getAttribute("data-pakiet")); });
  });

  /* ---------- formularz kontaktowy: ta sama ścieżka co formularz lejki.pro (Discord, Notion, mail) */
  var FUNKCJA = "https://apsnhorlrhzblrplkaer.supabase.co/functions/v1/forward-to-zapier";
  var KLUCZ = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwc25ob3Jscmh6YmxycGxrYWVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxMzc0NjQsImV4cCI6MjA4ODcxMzQ2NH0.9r5MY08gzTacgDQVftGT7rPRVJLtEPJ1mE8Y9VyRz48";
  var NAZWY_PAKIETOW = { starter: "Mikrolejek", conversion: "Lejek podstawowy", advocate: "Lejek kompleksowy", enterprise: "Ekosystem sprzedażowo-marketingowy" };
  var form = doc.querySelector("[data-formularz]");
  if (form) {
    var blad = form.querySelector("[data-blad]"), przycisk = form.querySelector("[data-wyslij]");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var f = new FormData(form);
      var dane = {
        imie: String(f.get("imie") || "").trim(), telefon: String(f.get("telefon") || "").trim(), email: String(f.get("email") || "").trim(),
        firma: String(f.get("firma") || "").trim(), budzet: String(f.get("budzet") || ""), pakiet: String(f.get("pakiet") || ""),
        wiadomosc: String(f.get("wiadomosc") || "").trim(), zgoda: f.get("zgoda") === "on", pulapka: String(f.get("strona_www") || "")
      };
      blad.hidden = true;
      var brak = [];
      if (!dane.imie) brak.push("imię i nazwisko");
      if (!dane.telefon || dane.telefon.replace(/\D/g, "").length < 9) brak.push("telefon");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dane.email)) brak.push("e-mail");
      if (!dane.zgoda) brak.push("zgodę na kontakt");
      if (brak.length) { blad.textContent = "Uzupełnij: " + brak.join(", ") + "."; blad.hidden = false; return; }
      var kontener = doc.querySelector("[data-formularz-kontener]");
      function sukces() {
        kontener.innerHTML = '<div class="przyjete" role="status" tabindex="-1"><p class="mono" style="color:#93C5FD">■ Zgłoszenie przyjęte</p><p>Dziękujemy. Doradca odezwie się, żeby umówić rozmowę o pierwszym klocku.</p></div>';
        var p = kontener.querySelector(".przyjete"); if (p) p.focus();
        try { (window.dataLayer = window.dataLayer || []).push({ event: "formularz_wyslany", strona: "systemowy.marketing" }); } catch (e2) { /* bez analityki */ }
      }
      if (dane.pulapka) { sukces(); return; }
      przycisk.disabled = true; przycisk.querySelector("span").textContent = "Wysyłam…";
      fetch(FUNKCJA, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: KLUCZ, Authorization: "Bearer " + KLUCZ },
        body: JSON.stringify({
          name: dane.imie, phone: dane.telefon, email: dane.email, project_name: dane.firma,
          goal: dane.wiadomosc, revenue: dane.budzet ? "Budżet reklamowy / mies.: " + dane.budzet : "", industry: "",
          interested_package: NAZWY_PAKIETOW[dane.pakiet] || "Jeszcze nie wiem",
          source_url: location.origin + location.pathname
        })
      }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return r.ok && j && j.success; }); })
        .then(function (ok) {
          if (ok) sukces();
          else throw new Error("odmowa");
        })
        .catch(function () {
          przycisk.disabled = false; przycisk.querySelector("span").textContent = "Złóżmy pierwszy klocek";
          blad.textContent = "Nie udało się wysłać. Zadzwoń: +48 579 555 551 albo napisz: kontakt@lejki.pro";
          blad.hidden = false;
        });
    });
  }

  /* ---------- stopka: zmienna fraza co 6,5 s */
  var fraza = doc.querySelector("[data-fraza]");
  if (fraza && !OGRANICZ_RUCH) {
    var frazy = fraza.querySelectorAll("span"), akt = 0;
    setInterval(function () {
      frazy[akt].classList.remove("aktywna"); frazy[akt].setAttribute("aria-hidden", "true");
      akt = (akt + 1) % frazy.length;
      frazy[akt].classList.add("aktywna"); frazy[akt].removeAttribute("aria-hidden");
    }, 6500);
  }
})();
