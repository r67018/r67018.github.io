// 配色の色相差。テトラードは 90° の正方形、ペンタードは 72° の正五角形、ヘクサードは 60° の正六角形。
const INITIAL_SAT = 100;
const INITIAL_LIT = 50;

const SCHEMES = {
  complementary: {
    label: "補色",
    note: "メインの反対側です。色相を 180° 回した 1 色を足します。",
    colors: [
      { offset: 0, role: "メイン" },
      { offset: 180, role: "補色" },
    ],
  },
  analogous: {
    label: "類似色",
    note: "色相環で隣り合う色です。メインの前後 30° を足します。",
    colors: [
      { offset: -30, role: "類似 −30°" },
      { offset: 0, role: "メイン" },
      { offset: 30, role: "類似 +30°" },
    ],
  },
  split: {
    label: "分割補色",
    note: "補色の両脇です。メインから +150° と +210° の 2 色を足します。",
    colors: [
      { offset: 0, role: "メイン" },
      { offset: 150, role: "分割補色 +150°" },
      { offset: 210, role: "分割補色 +210°" },
    ],
  },
  triad: {
    label: "トライアド",
    note: "色相環を三等分します。120° 間隔の 3 色です。",
    colors: [
      { offset: 0, role: "メイン" },
      { offset: 120, role: "+120°" },
      { offset: 240, role: "+240°" },
    ],
  },
  tetrad: {
    label: "テトラード",
    note: "90° 間隔の正方形配置です（長方形のテトラードではありません）。",
    colors: [
      { offset: 0, role: "メイン" },
      { offset: 90, role: "+90°" },
      { offset: 180, role: "+180°" },
      { offset: 270, role: "+270°" },
    ],
  },
  pentad: {
    label: "ペンタード",
    note: "色相環を五等分します。72° 間隔の正五角形、5 色です。",
    colors: [
      { offset: 0, role: "メイン" },
      { offset: 72, role: "+72°" },
      { offset: 144, role: "+144°" },
      { offset: 216, role: "+216°" },
      { offset: 288, role: "+288°" },
    ],
  },
  hexad: {
    label: "ヘクサード",
    note: "色相環を六等分します。60° 間隔の正六角形、6 色です。",
    colors: [
      { offset: 0, role: "メイン" },
      { offset: 60, role: "+60°" },
      { offset: 120, role: "+120°" },
      { offset: 180, role: "+180°" },
      { offset: 240, role: "+240°" },
      { offset: 300, role: "+300°" },
    ],
  },
};

const state = {
  hue: 210,
  sat: INITIAL_SAT,
  lit: INITIAL_LIT,
  scheme: "complementary",
};

const wheel = document.getElementById("wheel");
const hub = document.getElementById("hub");
const markers = document.getElementById("markers");
const schemeButtons = document.getElementById("schemes");
const schemeNote = document.getElementById("scheme-note");
const angleReadout = document.getElementById("angle-readout");
const satInput = document.getElementById("sat");
const litInput = document.getElementById("lit");
const satVal = document.getElementById("sat-val");
const litVal = document.getElementById("lit-val");
const satReset = document.getElementById("sat-reset");
const litReset = document.getElementById("lit-reset");
const hexInput = document.getElementById("hex");
const swatches = document.getElementById("swatches");
const toast = document.getElementById("toast");

let dragging = false;
let copiedHex = null;
let copiedTimer = 0;
let toastTimer = 0;

function formatNum(n) {
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

// 桁が変わると折り返し位置が動き、行の高さがガタつく。色相は常に小数1桁・5桁、百分率は3桁にそろえる。
const FIGURE_SPACE = "\u2007";

function formatHueText(h) {
  let value = Math.round(normalizeHue(h) * 10) / 10;
  if (value >= 360) value = 0;
  return value.toFixed(1).padStart(5, FIGURE_SPACE);
}

function formatPctText(n) {
  return `${String(Math.round(n)).padStart(3, FIGURE_SPACE)}%`;
}

function currentColors() {
  const scheme = SCHEMES[state.scheme];
  return scheme.colors.map((item) => {
    const hue = normalizeHue(state.hue + item.offset);
    return {
      offset: item.offset,
      role: item.role,
      hue,
      hex: hslToHex(hue, state.sat, state.lit),
    };
  });
}

function renderMarkers(colors) {
  const ordered = colors
    .filter((c) => c.offset !== 0)
    .concat(colors.filter((c) => c.offset === 0));
  while (markers.children.length > ordered.length) {
    markers.lastChild.remove();
  }
  const reach = parseFloat(
    getComputedStyle(wheel).getPropertyValue("--marker-reach")
  );
  ordered.forEach((color, i) => {
    let el = markers.children[i];
    if (!el) {
      el = document.createElement("div");
      el.className = "marker";
      markers.appendChild(el);
    }
    const rad = (color.hue * Math.PI) / 180;
    el.classList.toggle("main", color.offset === 0);
    el.style.backgroundColor = color.hex;
    el.style.left = `${50 + Math.sin(rad) * reach}%`;
    el.style.top = `${50 - Math.cos(rad) * reach}%`;
    el.title = `${color.role} ${formatNum(color.hue)}° ${color.hex}`;
  });
}

function renderSwatches(colors) {
  swatches.dataset.count = String(colors.length);
  swatches.replaceChildren();
  colors.forEach((color) => {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "swatch";
    btn.dataset.hex = color.hex;
    btn.dataset.hue = String(color.hue);
    btn.dataset.offset = String(color.offset);
    if (copiedHex === color.hex) btn.classList.add("copied");

    const chip = document.createElement("span");
    chip.className = "chip";
    chip.style.backgroundColor = color.hex;

    const body = document.createElement("span");
    body.className = "swatch-body";

    const role = document.createElement("span");
    role.className = "role";
    role.textContent = color.role;

    const deg = document.createElement("span");
    deg.className = "deg";
    deg.textContent = `色相 ${formatHueText(color.hue)}°`;

    const code = document.createElement("span");
    code.className = "code";
    code.textContent = copiedHex === color.hex ? "コピーしました" : color.hex;

    const hsl = document.createElement("span");
    hsl.className = "hsl";
    hsl.textContent = `hsl(${formatHueText(color.hue)}, ${formatPctText(state.sat)}, ${formatPctText(state.lit)})`;

    body.append(role, deg, code, hsl);
    btn.append(chip, body);
    btn.setAttribute(
      "aria-label",
      `${color.role} ${color.hex} をコピー`
    );
    li.append(btn);
    swatches.append(li);
  });
}

function renderAngleReadout(colors) {
  angleReadout.replaceChildren();
  for (const color of colors) {
    const item = document.createElement("span");
    item.className = "readout-item";
    if (color.offset === 0) {
      item.textContent = `メイン ${formatHueText(color.hue)}°`;
    } else {
      const sign = color.offset > 0 ? "+" : "−";
      item.textContent = `${sign}${Math.abs(color.offset)}° → ${formatHueText(color.hue)}°`;
    }
    angleReadout.append(item);
  }
}

function render({ keepHex = false } = {}) {
  const colors = currentColors();
  const main = colors.find((c) => c.offset === 0);

  hub.style.backgroundColor = main.hex;
  renderMarkers(colors);
  renderSwatches(colors);
  renderAngleReadout(colors);

  schemeNote.textContent = SCHEMES[state.scheme].note;
  schemeButtons.querySelectorAll("button").forEach((btn) => {
    const on = btn.dataset.scheme === state.scheme;
    btn.setAttribute("aria-checked", on ? "true" : "false");
  });

  const satText = String(Math.round(state.sat));
  const litText = String(Math.round(state.lit));
  if (satInput.value !== satText) satInput.value = satText;
  if (litInput.value !== litText) litInput.value = litText;
  satVal.textContent = `${formatNum(state.sat)}%`;
  litVal.textContent = `${formatNum(state.lit)}%`;

  const satTrack = `linear-gradient(to right, hsl(${state.hue}, 0%, ${state.lit}%), hsl(${state.hue}, 100%, ${state.lit}%))`;
  const litTrack = `linear-gradient(to right, hsl(${state.hue}, ${state.sat}%, 0%), hsl(${state.hue}, ${state.sat}%, 50%), hsl(${state.hue}, ${state.sat}%, 100%))`;
  satInput.style.setProperty("--track", satTrack);
  litInput.style.setProperty("--track", litTrack);

  if (!keepHex) hexInput.value = main.hex;
  hexInput.classList.remove("invalid");

  wheel.setAttribute("aria-valuenow", String(Math.round(state.hue)));
  wheel.setAttribute("aria-valuetext", `色相 ${formatHueText(state.hue).trim()}度`);
}

function setHueFromPointer(e) {
  const rect = wheel.getBoundingClientRect();
  const x = e.clientX - rect.left - rect.width / 2;
  const y = e.clientY - rect.top - rect.height / 2;
  if (x === 0 && y === 0) return;
  state.hue = normalizeHue((Math.atan2(x, -y) * 180) / Math.PI);
  render();
}

wheel.addEventListener("pointerdown", (e) => {
  if (e.button !== undefined && e.button !== 0) return;
  dragging = true;
  wheel.setPointerCapture(e.pointerId);
  setHueFromPointer(e);
});

wheel.addEventListener("pointermove", (e) => {
  if (!dragging) return;
  setHueFromPointer(e);
});

function endDrag() {
  dragging = false;
}

wheel.addEventListener("pointerup", endDrag);
wheel.addEventListener("pointercancel", endDrag);

wheel.addEventListener("keydown", (e) => {
  const step = e.shiftKey ? 10 : 1;
  if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
    state.hue = normalizeHue(state.hue - step);
  } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
    state.hue = normalizeHue(state.hue + step);
  } else {
    return;
  }
  e.preventDefault();
  render();
});

schemeButtons.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-scheme]");
  if (!btn || !SCHEMES[btn.dataset.scheme]) return;
  state.scheme = btn.dataset.scheme;
  render();
});

schemeButtons.addEventListener("keydown", (e) => {
  const buttons = [...schemeButtons.querySelectorAll("button")];
  const index = buttons.indexOf(document.activeElement);
  if (index < 0) return;
  let next = -1;
  if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (index + 1) % buttons.length;
  else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
    next = (index - 1 + buttons.length) % buttons.length;
  }
  if (next < 0) return;
  e.preventDefault();
  buttons[next].focus();
  state.scheme = buttons[next].dataset.scheme;
  render();
});

satInput.addEventListener("input", () => {
  state.sat = Number(satInput.value);
  render();
});

litInput.addEventListener("input", () => {
  state.lit = Number(litInput.value);
  render();
});

satReset.addEventListener("click", () => {
  state.sat = INITIAL_SAT;
  render();
});

litReset.addEventListener("click", () => {
  state.lit = INITIAL_LIT;
  render();
});

hexInput.addEventListener("input", () => {
  const parsed = parseHex(hexInput.value);
  if (!parsed) {
    const raw = hexInput.value.trim().replace(/^#/, "");
    const stillTyping = /^[0-9a-fA-F]{0,6}$/.test(raw) && raw.length < 6;
    hexInput.classList.toggle("invalid", !stillTyping && raw.length > 0);
    return;
  }
  const hsl = hexToHsl(parsed);
  state.hue = hsl.h;
  state.sat = hsl.s;
  state.lit = hsl.l;
  render({ keepHex: true });
  hexInput.classList.remove("invalid");
});

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 1400);
}

async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    // 下のフォールバックへ
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.left = "-9999px";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  } catch (err) {
    return false;
  }
}

swatches.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-hex]");
  if (!btn) return;
  const hex = btn.dataset.hex;
  const ok = await copyText(hex);
  if (!ok) {
    showToast("コピーできませんでした");
    return;
  }
  copiedHex = hex;
  showToast(`${hex} をコピーしました`);
  render();
  clearTimeout(copiedTimer);
  copiedTimer = setTimeout(() => {
    copiedHex = null;
    render();
  }, 1200);
});

const ring = document.querySelector(".ring");
const stops = [];
for (let h = 0; h <= 360; h += 4) {
  stops.push(`hsl(${h}, 100%, 50%) ${h}deg`);
}
ring.style.background = `conic-gradient(${stops.join(",")})`;

render();
