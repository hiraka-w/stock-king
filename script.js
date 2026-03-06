// ========== STATE ==========
let state = {
  listName:      '',
  groups:        [],   // [{id, name, items:[{id,name,stock}]}]
  activeGroupId: null,
  messages:      [],   // [{id,author,text,time,readByMe,okStamped}]
  myName:        '',
  myIcon:        '🐱'
};

const MESSAGES = [
  '今日もなかなかいいストックができているな',
  'ほれほれ、ストックを切らしておらぬかな',
  'ストックあればこそ、民が豊かになるのだ',
  '拾うストックあれば、捨てるストックあり',
  'ストックがないのなら、ストックをすればいいのだ',
  'わたしがこよなく愛するもの、それはストック',
  '一日一ストック、その積み重ねがストックだ',
  'そこにストックがある限り、わたしはストックする',
  'だって涙が出ちゃう、ストックだもん',
  'このストックが目に入らぬか！',
  'ストックは一日にしてならず',
  '人生ストックあれば万事がうまくいく'
];


// ========== PERSISTENCE ==========
function save() {
  try {
    localStorage.setItem('stockKingData', JSON.stringify(state));
  } catch (e) {
    console.warn('保存失敗', e);
    showNotification('⚠️ データの保存に失敗しました');
  }
}

function load() {
  try {
    const raw = localStorage.getItem('stockKingData');
    if (raw) {
      const parsed = JSON.parse(raw);
      state = Object.assign({}, state, parsed);
    }
  } catch (e) {
    console.warn('読み込み失敗、初期化します', e);
    try { localStorage.removeItem('stockKingData'); } catch (e2) {}
  }
}


// ========== SETUP ==========
function setupComplete() {
  const val = document.getElementById('listNameInput').value.trim();
  if (!val) { document.getElementById('listNameInput').focus(); return; }

  state.listName = val;
  if (state.groups.length === 0) {
    const id = uid();
    state.groups.push({ id, name: '日用品', items: [] });
    state.activeGroupId = id;
  }
  save();
  document.getElementById('setupModal').classList.add('hidden');
  render();
}


// ========== TITLE SCREEN STARS ==========
function spawnStars() {
  const container = document.getElementById('starsContainer');
  for (let i = 0; i < 40; i++) {
    const star = document.createElement('div');
    star.className = 'star';
    star.style.left             = Math.random() * 100 + '%';
    star.style.top              = Math.random() * 100 + '%';
    star.style.animationDelay   = Math.random() * 2 + 's';
    star.style.animationDuration = (1.5 + Math.random() * 2) + 's';
    container.appendChild(star);
  }
}


// ========== RENDER ==========
function render() {
  document.getElementById('app').style.display = '';
  renderHeader();
  renderTabs();
  renderList();
  renderMessages();
  updateMsgBadge();
}

function renderHeader() {
  document.getElementById('listNameText').textContent    = state.listName;
  document.getElementById('currentListName').textContent = state.listName;
}

function addTabBorderSVG(tab) {
  requestAnimationFrame(() => {
    const w = tab.offsetWidth;
    const h = tab.offsetHeight;
    const c = 7; // 面取りサイズ
    const isActive = tab.classList.contains('active');
    const col = isActive ? 'rgba(230,168,23,0.8)' : 'rgba(230,168,23,0.22)';
    // 底辺なし（タブ下はリストにつながる）
    const pts = `${c},0 ${w-c},0 ${w},${c} ${w},${h} 0,${h} 0,${c} ${c},0`;

    const svg  = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class',  'tab-border-svg');
    svg.setAttribute('width',  w);
    svg.setAttribute('height', h);

    const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    poly.setAttribute('points',       pts);
    poly.setAttribute('fill',         'none');
    poly.setAttribute('stroke',       col);
    poly.setAttribute('stroke-width', '1.5');
    svg.appendChild(poly);

    const old = tab.querySelector('.tab-border-svg');
    if (old) old.remove();
    tab.appendChild(svg);
  });
}

function renderTabs() {
  const row = document.getElementById('tabsRow');
  row.innerHTML = '';

  state.groups.forEach((g, i) => {
    const tab = document.createElement('div');
    tab.className  = 'tab' + (g.id === state.activeGroupId ? ' active' : '');
    tab.textContent = g.name;
    tab.dataset.id  = g.id;
    tab.draggable   = true;

    tab.addEventListener('click', () => { state.activeGroupId = g.id; save(); render(); });
    tab.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('tabId', g.id);
      e.dataTransfer.effectAllowed = 'move';
    });
    tab.addEventListener('dragover',  (e) => { e.preventDefault(); tab.classList.add('drag-over-tab'); });
    tab.addEventListener('dragleave', ()  => tab.classList.remove('drag-over-tab'));
    tab.addEventListener('drop', (e) => {
      e.preventDefault();
      tab.classList.remove('drag-over-tab');
      const fromId  = e.dataTransfer.getData('tabId');
      const fromIdx = state.groups.findIndex(x => x.id === fromId);
      const toIdx   = i;
      if (fromIdx !== toIdx) {
        const [moved] = state.groups.splice(fromIdx, 1);
        state.groups.splice(toIdx, 0, moved);
        save(); render();
      }
    });

    row.appendChild(tab);
    addTabBorderSVG(tab);
  });

  // グループ追加ボタン
  const addBtn = document.createElement('button');
  addBtn.className   = 'tab-add';
  addBtn.textContent = '+';
  addBtn.title       = 'グループを追加';
  addBtn.onclick     = addGroup;
  row.appendChild(addBtn);

  // tab-add にも面取りborder（破線）
  requestAnimationFrame(() => {
    const w = addBtn.offsetWidth;
    const h = addBtn.offsetHeight;
    const c   = 7;
    const col = 'rgba(150,130,180,0.5)';
    const pts = `${c},0 ${w-c},0 ${w},${c} ${w},${h} 0,${h} 0,${c} ${c},0`;

    const svg  = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class',  'tab-border-svg');
    svg.setAttribute('width',  w);
    svg.setAttribute('height', h);

    const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    poly.setAttribute('points',            pts);
    poly.setAttribute('fill',              'none');
    poly.setAttribute('stroke',            col);
    poly.setAttribute('stroke-width',      '1.5');
    poly.setAttribute('stroke-dasharray',  '3 3');
    svg.appendChild(poly);
    addBtn.appendChild(svg);
  });
}

function renderList() {
  const area  = document.getElementById('listArea');
  const group = state.groups.find(g => g.id === state.activeGroupId);

  // list-area は innerHTML で毎回再構築するため、装飾画像もここで含める
  const ornaments = '<img class="list-ornament-left" src="list-left.png" alt=""><img class="list-ornament-right" src="list-right.png" alt="">';

  if (!group) { area.innerHTML = ornaments; return; }

  let html = ornaments + `
    <div class="group-header">
      <div class="group-name-display">
        <img src="crawn.png" class="crown-icon" alt="👑">${escHtml(group.name)}
      </div>
      <div class="group-actions">
        <button class="small-btn" onclick="renameGroup('${group.id}')">✏️ 名前変更</button>
        <button class="small-btn" onclick="deleteGroup('${group.id}')">🗑 削除</button>
      </div>
    </div>
    <div class="stock-list" id="stockList">`;

  if (group.items.length === 0) {
    html += `
      <div class="empty-state">
        <span class="empty-icon">📦</span>
        まだアイテムがありません<br>下の入力欄から追加してください
      </div>`;
  } else {
    group.items.forEach((item) => {
      const fire = item.stock === 0;
      html += `
        <div class="stock-item ${fire ? 'fire-mode' : ''}"
          draggable="true"
          data-id="${item.id}"
          ondragstart="itemDragStart(event,'${item.id}')"
          ondragover="itemDragOver(event)"
          ondragleave="itemDragLeave(event)"
          ondrop="itemDrop(event,'${item.id}')">
          <span class="drag-handle">⠿</span>
          <span class="item-line"></span>
          <span class="item-name" ondblclick="startEditItem('${item.id}')" title="ダブルタップで名前変更">${escHtml(item.name)}</span>
          <span class="fire-badge">🔥</span>
          <div class="stock-counter">
            <button class="counter-btn counter-minus" onclick="changeStock('${item.id}', -1)">－</button>
            <span class="counter-num">${item.stock}</span>
            <button class="counter-btn counter-plus"  onclick="changeStock('${item.id}', 1)">＋</button>
          </div>
          <button class="delete-item-btn" onclick="deleteItem('${item.id}')" title="削除">✕</button>
        </div>`;
    });
  }

  html += `
    </div>
    <div class="add-item-row">
      <input type="text" class="add-item-input" id="newItemInput" placeholder="商品名を入力..." maxlength="30"
        onkeydown="if(event.key==='Enter') addItem()">
      <button class="add-item-btn" onclick="addItem()">＋</button>
    </div>`;

  area.innerHTML = html;
}

function renderMessages() {
  const list = document.getElementById('msgList');
  if (!list) return;

  if (state.messages.length === 0) {
    list.innerHTML = '<div class="empty-state"><span class="empty-icon">📭</span>メッセージはまだありません</div>';
    return;
  }

  list.innerHTML = state.messages.slice().reverse().map(m => `
    <div class="msg-item ${m.readByMe ? '' : 'unread'}" id="msg-${m.id}">
      ${!m.readByMe ? '<div class="unread-dot"></div>' : ''}
      <div class="msg-meta">
        <span class="msg-author">${m.icon || '👤'} ${escHtml(m.author)}</span>
        <span class="msg-time">${m.time}</span>
      </div>
      <div class="msg-body">${escHtml(m.text)}</div>
      <button class="ok-stamp-btn ${m.okStamped ? 'stamped' : ''}" onclick="toggleOk('${m.id}')">
        ${m.okStamped ? '✅ OK!' : '👍 OK'}
      </button>
    </div>
  `).join('');
}

function updateMsgBadge() {
  const unread = state.messages.filter(m => !m.readByMe).length;
  document.getElementById('msgBadge').style.display = unread > 0 ? 'block' : 'none';
}


// ========== GROUP ACTIONS ==========
function addGroup()               { openGroupModal(null); }
function renameGroup(id) {
  const group = state.groups.find(g => g.id === id);
  if (group) openGroupModal(id, group.name);
}

function openGroupModal(editId, currentName) {
  document.getElementById('groupModalTitle').textContent   = editId ? 'グループ名を変更' : '新しいグループを追加';
  document.getElementById('groupNameInput').value          = currentName || '';
  document.getElementById('groupModal').dataset.editId     = editId || '';
  document.getElementById('groupModal').classList.remove('hidden');
  setTimeout(() => document.getElementById('groupNameInput').focus(), 50);
}

function closeGroupModal() {
  document.getElementById('groupModal').classList.add('hidden');
}

function confirmGroupModal() {
  const val    = document.getElementById('groupNameInput').value.trim();
  if (!val) { document.getElementById('groupNameInput').focus(); return; }

  const editId = document.getElementById('groupModal').dataset.editId;
  if (editId) {
    const group = state.groups.find(g => g.id === editId);
    if (group) group.name = val;
  } else {
    const id = uid();
    state.groups.push({ id, name: val, items: [] });
    state.activeGroupId = id;
  }
  save(); render();
  closeGroupModal();
}

function deleteGroup(id) {
  if (state.groups.length <= 1) { alert('最後のグループは削除できません'); return; }
  if (!confirm('このグループを削除しますか？\n中のアイテムもすべて消えます。')) return;
  state.groups     = state.groups.filter(g => g.id !== id);
  state.activeGroupId = state.groups[0].id;
  save(); render();
}


// ========== ITEM ACTIONS ==========
function addItem() {
  const input = document.getElementById('newItemInput');
  const name  = input.value.trim();
  if (!name) return;

  const group = state.groups.find(g => g.id === state.activeGroupId);
  if (!group) return;

  group.items.push({ id: uid(), name, stock: 5 });
  input.value = '';
  save(); renderList();
}

function updateStock(itemId, val) {
  for (const g of state.groups) {
    const item = g.items.find(i => i.id === itemId);
    if (item) { item.stock = parseInt(val); save(); renderList(); return; }
  }
}

function changeStock(itemId, delta) {
  for (const g of state.groups) {
    const item = g.items.find(i => i.id === itemId);
    if (item) {
      item.stock = Math.max(0, item.stock + delta);
      save(); renderList(); return;
    }
  }
}

function deleteItem(itemId) {
  for (const g of state.groups) {
    const idx = g.items.findIndex(i => i.id === itemId);
    if (idx !== -1) { g.items.splice(idx, 1); save(); renderList(); return; }
  }
}

function startEditItem(itemId) {
  if (document.querySelector('.item-edit-input')) return; // すでに編集中

  const span = document.querySelector(`.stock-item[data-id="${itemId}"] .item-name`);
  if (!span) return;

  const currentName = span.textContent;
  const input = document.createElement('input');
  input.type      = 'text';
  input.className = 'item-edit-input';
  input.value     = currentName;
  input.maxLength = 30;
  span.replaceWith(input);
  input.focus();
  input.select();

  function finish() {
    const newName = input.value.trim();
    if (newName) {
      for (const g of state.groups) {
        const item = g.items.find(i => i.id === itemId);
        if (item) { item.name = newName; save(); break; }
      }
    }
    renderList();
  }

  input.addEventListener('blur', finish);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter')  { input.blur(); }
    if (e.key === 'Escape') { input.removeEventListener('blur', finish); renderList(); }
  });
}


// ========== DRAG & DROP (items) ==========
let dragItemId = null;

function itemDragStart(e, id) {
  dragItemId = id;
  e.dataTransfer.effectAllowed = 'move';
  setTimeout(() => e.target.classList.add('dragging'), 0);
}

function itemDragOver(e) {
  e.preventDefault();
  e.currentTarget.classList.add('drag-over');
}

function itemDragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
}

function itemDrop(e, toId) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  if (!dragItemId || dragItemId === toId) return;

  const group = state.groups.find(g => g.id === state.activeGroupId);
  if (!group) return;

  const fromIdx = group.items.findIndex(i => i.id === dragItemId);
  const toIdx   = group.items.findIndex(i => i.id === toId);
  const [moved] = group.items.splice(fromIdx, 1);
  group.items.splice(toIdx, 0, moved);
  dragItemId = null;
  save(); renderList();
}


// ========== KING MASCOT ==========
function showKingMessage() {
  const bubble = document.getElementById('speechBubble');
  const text   = document.getElementById('speechText');
  text.textContent = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
  bubble.classList.add('visible');
  clearTimeout(window._bubbleTimer);
  window._bubbleTimer = setTimeout(closeBubble, 4000);
}

function closeBubble() {
  const bubble = document.getElementById('speechBubble');
  bubble.classList.add('hiding');
  setTimeout(() => bubble.classList.remove('visible', 'hiding'), 300);
}


// ========== MESSAGES ==========
function openMessages() {
  state.messages.forEach(m => m.readByMe = true);
  save();
  updateMsgBadge();
  renderMessages();
  document.getElementById('app').style.display          = 'none';
  document.getElementById('kingMascot').style.display   = 'none';
  document.getElementById('message-page').classList.add('open');
}

function closeMessages() {
  document.getElementById('app').style.display        = '';
  document.getElementById('kingMascot').style.display = '';
  document.getElementById('message-page').classList.remove('open');
}

function openCompose() {
  const picker = document.getElementById('iconPicker');
  const icons  = ['🐱', '🐶', '🐼', '🦊', '🐸', '🌸', '⭐', '🍎', '🎩', '👑'];
  picker.innerHTML = icons.map(ic =>
    `<div class="icon-option ${ic === state.myIcon ? 'selected' : ''}" onclick="selectIcon('${ic}')">${ic}</div>`
  ).join('');

  if (state.myName) document.getElementById('composeAuthor').value = state.myName;
  document.getElementById('composeModal').style.display = 'flex';
}

function selectIcon(icon) {
  state.myIcon = icon;
  save();
  document.querySelectorAll('.icon-option').forEach(el => {
    el.classList.toggle('selected', el.textContent === icon);
  });
}

function closeCompose() {
  document.getElementById('composeModal').style.display = 'none';
}

function postMessage() {
  const author = document.getElementById('composeAuthor').value.trim();
  const text   = document.getElementById('composeText').value.trim();
  if (!author || !text) return;

  state.myName = author;
  state.messages.push({
    id:         uid(),
    author,
    icon:       state.myIcon || '🐱',
    text,
    time:       new Date().toLocaleString('ja-JP', { month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit' }),
    readByMe:   true,
    okStamped:  false
  });
  save();
  document.getElementById('composeAuthor').value = '';
  document.getElementById('composeText').value   = '';
  closeCompose();
  renderMessages();
}

function toggleOk(msgId) {
  const msg = state.messages.find(m => m.id === msgId);
  if (msg) { msg.okStamped = !msg.okStamped; save(); renderMessages(); }
}


// ========== SETTINGS ==========
function openSettings() {
  document.getElementById('newListNameInput').value = state.listName;
  document.getElementById('settingsModal').classList.remove('hidden');
}

function closeSettings() {
  document.getElementById('settingsModal').classList.add('hidden');
}

function updateListName() {
  const val = document.getElementById('newListNameInput').value.trim();
  if (!val) return;
  state.listName = val;
  save(); render(); closeSettings();
}


// ========== NOTIFICATION ==========
function showNotification(text) {
  const toast = document.getElementById('notifToast');
  document.getElementById('notifBody').textContent = text;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 5000);
}

function closeNotif() {
  document.getElementById('notifToast').classList.remove('show');
}


// ========== UTILS ==========
function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function escHtml(str) {
  return str
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;');
}


// ========== TITLE: METEOR ANIMATION ==========
(function initKingAura() {
  const canvas = document.getElementById('kingAuraCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width  = canvas.offsetWidth  || window.innerWidth;
    canvas.height = canvas.offsetHeight || window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const meteors = [];

  // カラー：ゴールド・ピンク・ホワイト系
  const COLORS = [
    [255, 220,  80],  // gold
    [255, 248, 160],  // pale gold
    [255, 190, 220],  // pink
    [220, 160, 255],  // purple-pink
    [255, 255, 255],  // white
  ];

  function randColor() {
    return COLORS[Math.floor(Math.random() * COLORS.length)];
  }

  // 王様の中心を取得
  function getKingCenter() {
    const img = document.getElementById('titleKingImg');
    if (img && img.getBoundingClientRect().width > 0) {
      const r = img.getBoundingClientRect();
      return { x: r.left + r.width * 0.5, y: r.top + r.height * 0.42 };
    }
    return { x: canvas.width * 0.5, y: canvas.height * 0.60 };
  }

  // ── Meteor: 右から左へ弧を描いて通り過ぎる流れ星 ──
  function Meteor(cx, cy) {
    // 軌道サイズを3段階に：差を縮めてまとまり感UP
    const tier = Math.random();
    if (tier < 0.3) {
      this.rx = 160 + Math.random() * 40;
      this.ry = 110 + Math.random() * 30;
    } else if (tier < 0.7) {
      this.rx = 200 + Math.random() * 50;
      this.ry = 140 + Math.random() * 35;
    } else {
      this.rx = 245 + Math.random() * 55;
      this.ry = 170 + Math.random() * 40;
    }
    this.tilt = -0.4 + Math.random() * 0.8;

    this.startAngle = (Math.PI * 0.05) + (Math.random() - 0.5) * 0.6;
    this.angle      = this.startAngle;
    this.endAngle   = this.startAngle + Math.PI * (0.5 + Math.random() * 0.5);
    this.speed      = 0.018 + Math.random() * 0.022;
    this.cx = cx;
    this.cy = cy;

    // サイズもバリエーション：細い流れ星と太い流れ星
    this.size = tier < 0.3
      ? 1.2 + Math.random() * 1.5   // 細い
      : tier < 0.7
        ? 2.2 + Math.random() * 2.5  // 中
        : 3.0 + Math.random() * 3.0; // 太い

    this.rgb      = randColor();
    this.alpha    = 0;
    this.maxAlpha = 0.65 + Math.random() * 0.35;
    this.done     = false;

    // 尾の長さ：長めに
    this.trailLen = 24 + Math.floor(Math.random() * 20);
    this.trail    = [];

    // 頭に十字フレアを出すか（30%の確率）
    this.hasCrossFlare = Math.random() < 0.30;

    // 途中でピカッと光るフラッシュ（20%の確率）
    this.hasFlash  = Math.random() < 0.20;
    this.flashAt   = 0.3 + Math.random() * 0.4; // 進行度30〜70%のどこかで
    this.flashDone = false;
    this.flashAlpha = 0;

    this._calcPos();
  }

  Meteor.prototype._calcPos = function () {
    const cosT = Math.cos(this.tilt), sinT = Math.sin(this.tilt);
    const ex = this.rx * Math.cos(this.angle);
    const ey = this.ry * Math.sin(this.angle);
    this.x = this.cx + ex * cosT - ey * sinT;
    this.y = this.cy + ex * sinT + ey * cosT;
  };

  Meteor.prototype.update = function () {
    this.angle += this.speed; // 右→下→左（時計回り下半分）
    this._calcPos();

    const progress = (this.startAngle - this.angle) / (this.startAngle - this.endAngle);

    // フェードイン・フェードアウト
    if      (progress < 0.15) this.alpha = this.maxAlpha * (progress / 0.15);
    else if (progress > 0.75) this.alpha = this.maxAlpha * (1 - (progress - 0.75) / 0.25);
    else                      this.alpha = this.maxAlpha;

    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > this.trailLen) this.trail.shift();

    if (progress >= 1) this.done = true;

    // フラッシュ更新
    if (this.hasFlash) {
      if (!this.flashDone && progress >= this.flashAt) {
        this.flashAlpha = 1.0;
        this.flashDone  = true;
      }
      if (this.flashAlpha > 0) this.flashAlpha -= 0.06; // 約16フレームでフェード
    }
  };

  Meteor.prototype.draw = function (ctx) {
    if (this.alpha <= 0) return;
    const [r, g, b] = this.rgb;

    // 尾：グラデーションフェード（2層：ぼかし層＋シャープ層）
    for (let i = 0; i < this.trail.length; i++) {
      const pt    = this.trail[i];
      const ratio = i / this.trail.length;
      const tailA = this.alpha * ratio * ratio * 0.6;
      if (tailA < 0.008) continue;

      // ぼかし層（大きめ・薄い）
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, this.size * (0.5 + ratio * 1.0), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r},${g},${b},${tailA * 0.4})`;
      ctx.fill();

      // シャープ層（細い・濃い）
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, this.size * (0.15 + ratio * 0.55), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r},${g},${b},${tailA})`;
      ctx.fill();
    }

    // 頭のグロー
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.shadowBlur  = this.size * 7;
    ctx.shadowColor = `rgba(${r},${g},${b},1)`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${r},${g},${b},1)`;
    ctx.fill();

    // 白コア
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * 0.42, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fill();

    // 十字フレア（ランダムで追加）
    if (this.hasCrossFlare) {
      ctx.globalAlpha = this.alpha * 0.85;
      ctx.shadowBlur  = this.size * 4;
      ctx.shadowColor = `rgba(${r},${g},${b},0.9)`;
      const fl = this.size * 3.5;
      for (let ang = 0; ang < Math.PI; ang += Math.PI / 2) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(ang);
        ctx.beginPath();
        ctx.ellipse(0, 0, fl, this.size * 0.22, 0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},0.75)`;
        ctx.fill();
        ctx.restore();
      }
      // フレア中心白点
      ctx.shadowBlur  = 0;
      ctx.globalAlpha = this.alpha;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * 0.55, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,1)';
      ctx.fill();
    }

    ctx.restore();

    // ピカッとフラッシュ
    if (this.hasFlash && this.flashAlpha > 0) {
      const fa = Math.max(0, this.flashAlpha);
      ctx.save();

      // 外側の大きなグロー
      ctx.globalAlpha = fa * 0.5;
      ctx.shadowBlur  = this.size * 20;
      ctx.shadowColor = `rgba(${r},${g},${b},1)`;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * 4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r},${g},${b},0.4)`;
      ctx.fill();

      // 十字フレア（フラッシュ時は大きめ）
      ctx.globalAlpha = fa * 0.9;
      ctx.shadowBlur  = this.size * 8;
      const fl = this.size * 7;
      for (let ang = 0; ang < Math.PI; ang += Math.PI / 2) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(ang);
        ctx.beginPath();
        ctx.ellipse(0, 0, fl, this.size * 0.28, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.fill();
        ctx.restore();
      }

      // 白コア
      ctx.globalAlpha = fa;
      ctx.shadowBlur  = 0;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * 1.2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,1)';
      ctx.fill();
      ctx.restore();
    }
  };

  // ── メインループ ──
  let startTime  = null;
  let lastSpawn  = 0;
  const SPAWN_INTERVAL = 180;
  const MAX_METEORS    = 14;

  function animate(ts) {
    const titleScreen = document.getElementById('title-screen');
    if (!titleScreen || titleScreen.style.display === 'none') return; // title-screen 終了でループ停止
    requestAnimationFrame(animate);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!startTime) startTime = ts;

    const { x: cx, y: cy } = getKingCenter();

    // 一定間隔で新しい流れ星を追加
    if (ts - lastSpawn > SPAWN_INTERVAL && meteors.filter(m => !m.done).length < MAX_METEORS) {
      meteors.push(new Meteor(cx, cy));
      lastSpawn = ts;
    }
    // 古いものを掃除
    if (meteors.length > 30) meteors.splice(0, meteors.length - 30);

    for (const m of meteors) {
      if (!m.done) { m.cx = cx; m.cy = cy; m.update(); }
      m.draw(ctx);
    }
  }

  requestAnimationFrame(animate);
})();


// ========== INIT ==========
spawnStars();
load();

// モバイル：ダブルタップでアイテム名編集
// iOS Safari は dblclick が不安定なため touchend で代替実装
let _lastTapTarget = null;
let _lastTapTime   = 0;
document.addEventListener('touchend', (e) => {
  const nameEl = e.target.closest('.item-name');
  if (!nameEl) { _lastTapTarget = null; return; }
  const now = Date.now();
  if (_lastTapTarget === nameEl && now - _lastTapTime < 300) {
    e.preventDefault(); // ダブルタップズームを防止
    const itemId = nameEl.closest('.stock-item')?.dataset.id;
    if (itemId) startEditItem(itemId);
    _lastTapTarget = null;
    _lastTapTime   = 0;
  } else {
    _lastTapTarget = nameEl;
    _lastTapTime   = now;
  }
}, { passive: false });

// タイトル画面: 少し待ってからふわっと表示
setTimeout(() => {
  const logo = document.querySelector('.title-logo-wrapper');
  const king = document.querySelector('.title-king-wrapper');
  if (logo) logo.classList.add('show');
  if (king) king.classList.add('show');
}, 100);

// 王冠キラーン＋ロゴフレア演出（ロゴ表示後）
function fireCrownSparkle() {
  const logoImg     = document.getElementById('titleLogoImg');
  const logoWrapper = document.querySelector('.title-logo-wrapper');
  if (!logoImg) return;

  logoImg.classList.add('crown-sparkle-active');

  // パーティクル：ロゴ右上の王冠位置
  const rect   = logoImg.getBoundingClientRect();
  const cx     = rect.left + rect.width  * 0.88;
  const cy     = rect.top  + rect.height * 0.06;
  const colors = ['#ffd700','#fff8c0','#ffe066','#ffffff','#ffb800'];
  for (let i = 0; i < 16; i++) {
    const p     = document.createElement('div');
    p.className = 'sparkle-particle';
    const angle = (i / 16) * Math.PI * 2;
    const dist  = 20 + Math.random() * 45;
    const dx    = Math.cos(angle) * dist;
    const dy    = Math.sin(angle) * dist;
    p.style.cssText = `left:${cx}px;top:${cy}px;--dx:${dx}px;--dy:${dy}px;background:${colors[i % colors.length]};animation-delay:${Math.random() * 0.12}s;`;
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 1100);
  }

  // フレア：logoWrapper内の右上を起点に放射
  if (logoWrapper) {
    const angles = [0, 30, 55, 80, 110, 140, 165, 200, 240, 290, 330];
    const sizes  = [180, 110, 220, 90, 150, 100, 200, 120, 80, 140, 160];
    angles.forEach((angle, i) => {
      const flare     = document.createElement('div');
      flare.className = 'logo-flare';
      flare.style.cssText = `--angle:${angle}deg; width:${sizes[i]}px; top:8%; left:88%; animation-delay:${i * 0.045}s;`;
      logoWrapper.appendChild(flare);
      requestAnimationFrame(() => requestAnimationFrame(() => flare.classList.add('active')));
      setTimeout(() => flare.remove(), 1100 + i * 50);
    });
  }

  setTimeout(() => logoImg.classList.remove('crown-sparkle-active'), 950);
}

setTimeout(fireCrownSparkle, 700);

// タイトル画面をフェードアウト後にDOMから退かす
setTimeout(() => {
  const ts = document.getElementById('title-screen');
  if (ts) {
    ts.style.transition = 'opacity 0.5s ease-in';
    ts.style.opacity    = '0';
    setTimeout(() => {
      ts.style.display = 'none';
      window.scrollTo(0, 0);
    }, 500);
  }
}, 1800);

// 未読メッセージ通知
const unreadMsgs = state.messages.filter(m => !m.readByMe);
if (unreadMsgs.length > 0) {
  setTimeout(() => showNotification(`${unreadMsgs.length}件の未読メッセージがあります`), 2800);
}

// セットアップ済みならアプリを表示、未セットアップならモーダルを出す
setTimeout(() => {
  if (!state.listName) {
    document.getElementById('setupModal').classList.remove('hidden');
  } else {
    render();
  }
}, 2400);
