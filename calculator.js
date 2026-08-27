const display = document.getElementById("display");
const expressionEl = document.getElementById("expression");
const keys = document.querySelectorAll(".key");
const historyList = document.getElementById("historyList");
const historyEmpty = document.getElementById("historyEmpty");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");
const historyToggle = document.getElementById("historyToggle");
const historyPanel = document.getElementById("historyPanel");

let current = "0";
let previous = null;
let operator = null;
let justEvaluated = false;

const OP_SYMBOLS = {
  add: "+",
  subtract: "−",
  multiply: "×",
  divide: "÷",
};

function updateDisplay() {
  display.textContent = formatNumber(current);

  if (operator && previous !== null) {
    expressionEl.textContent = `${formatNumber(previous)} ${OP_SYMBOLS[operator]}`;
  } else {
    expressionEl.textContent = "\u00A0";
  }

  display.classList.remove("pop");
  void display.offsetWidth;
  display.classList.add("pop");
}

function formatNumber(value) {
  const num = parseFloat(value);
  if (Number.isNaN(num)) return "0";
  if (Math.abs(num) >= 1e12 || (Math.abs(num) < 1e-9 && num !== 0)) {
    return num.toExponential(4);
  }
  return num.toLocaleString(undefined, { maximumFractionDigits: 10 });
}

function inputDigit(digit) {
  if (justEvaluated) {
    current = digit;
    justEvaluated = false;
  } else {
    current = current === "0" ? digit : current + digit;
  }
  updateDisplay();
}

function inputDecimal() {
  if (justEvaluated) {
    current = "0.";
    justEvaluated = false;
    updateDisplay();
    return;
  }
  if (!current.includes(".")) {
    current += ".";
    updateDisplay();
  }
}

function chooseOperator(op) {
  if (operator && previous !== null && !justEvaluated) {
    compute();
  }
  previous = current;
  operator = op;
  justEvaluated = false;
  current = "0";
  updateDisplay();
}

function compute() {
  if (operator === null || previous === null) return;

  const a = parseFloat(previous);
  const b = parseFloat(current);
  let result;

  switch (operator) {
    case "add":
      result = a + b;
      break;
    case "subtract":
      result = a - b;
      break;
    case "multiply":
      result = a * b;
      break;
    case "divide":
      result = b === 0 ? NaN : a / b;
      break;
    default:
      return;
  }

  const exprText = `${formatNumber(a)} ${OP_SYMBOLS[operator]} ${formatNumber(b)}`;
  const resultText = Number.isNaN(result) ? "Error" : formatNumber(result);

  addHistoryEntry(exprText, resultText);

  current = Number.isNaN(result) ? "0" : String(result);
  operator = null;
  previous = null;
  justEvaluated = true;
  updateDisplay();
}

function clearAll() {
  current = "0";
  previous = null;
  operator = null;
  justEvaluated = false;
  updateDisplay();
}

function negate() {
  if (current === "0") return;
  current = current.startsWith("-") ? current.slice(1) : "-" + current;
  updateDisplay();
}

function percent() {
  current = String(parseFloat(current) / 100);
  updateDisplay();
}

const HISTORY_KEY = "calc-premium-history";

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(items) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
  } catch {
    /* ignore storage errors */
  }
}

function renderHistory(items) {
  historyList.innerHTML = "";

  if (items.length === 0) {
    historyEmpty.hidden = false;
    historyList.appendChild(historyEmpty);
    return;
  }
  historyEmpty.hidden = true;

  items
    .slice()
    .reverse()
    .forEach((item) => {
      const el = document.createElement("div");
      el.className = "history-item";

      const expr = document.createElement("div");
      expr.className = "h-expr";
      expr.textContent = item.expr;

      const result = document.createElement("div");
      result.className = "h-result";
      result.textContent = item.result;

      el.appendChild(expr);
      el.appendChild(result);

      el.addEventListener("click", () => {
        current = item.result === "Error" ? "0" : item.result;
        previous = null;
        operator = null;
        justEvaluated = true;
        updateDisplay();
      });

      historyList.appendChild(el);
    });
}

function addHistoryEntry(expr, result) {
  const items = loadHistory();
  items.push({ expr, result });
  const trimmed = items.slice(-50);
  saveHistory(trimmed);
  renderHistory(trimmed);
}

clearHistoryBtn.addEventListener("click", () => {
  saveHistory([]);
  renderHistory([]);
});

let historyVisible = true;
historyToggle.addEventListener("click", () => {
  historyVisible = !historyVisible;
  if (window.innerWidth <= 680) {
    historyPanel.hidden = !historyVisible;
  } else {
    historyPanel.dataset.collapsed = String(!historyVisible);
  }
});

keys.forEach((key) => {
  key.addEventListener("click", () => {
    const num = key.dataset.num;
    const action = key.dataset.action;

    key.classList.add("pressed");
    setTimeout(() => key.classList.remove("pressed"), 120);

    if (num !== undefined) {
      inputDigit(num);
      return;
    }

    switch (action) {
      case "clear":
        clearAll();
        break;
      case "negate":
        negate();
        break;
      case "percent":
        percent();
        break;
      case "decimal":
        inputDecimal();
        break;
      case "equals":
        compute();
        break;
      case "add":
      case "subtract":
      case "multiply":
      case "divide":
        chooseOperator(action);
        break;
    }
  });
});

const KEY_MAP = {
  "+": "add",
  "-": "subtract",
  "*": "multiply",
  "/": "divide",
  Enter: "equals",
  "=": "equals",
  Escape: "clear",
  "%": "percent",
};

window.addEventListener("keydown", (e) => {
  if (e.key >= "0" && e.key <= "9") {
    inputDigit(e.key);
    flashKey(`[data-num="${e.key}"]`);
    return;
  }
  if (e.key === ".") {
    inputDecimal();
    flashKey('[data-action="decimal"]');
    return;
  }

  const action = KEY_MAP[e.key];
  if (!action) return;

  e.preventDefault();

  if (action === "equals") {
    compute();
  } else if (action === "clear") {
    clearAll();
  } else if (action === "percent") {
    percent();
  } else {
    chooseOperator(action);
  }

  flashKey(`[data-action="${action}"]`);
});

function flashKey(selector) {
  const el = document.querySelector(selector);
  if (!el) return;
  el.classList.add("pressed");
  setTimeout(() => el.classList.remove("pressed"), 120);
}

renderHistory(loadHistory());
updateDisplay();
