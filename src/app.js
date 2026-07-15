/* ========================================================
   TenSguru Main Application Logic
   ======================================================== */

// アプリケーション状態の管理
const state = {
  currentDate: new Date(), // カレンダーで現在表示している月
  selectedDate: null,      // カレンダーで現在選択している日付 (YYYY-MM-DD)
  articles: [],            // 記事配列
  schedules: [],           // 予定配列
};

// 曜日リスト (日本語)
const weekdays = ['日', '月', '火', '水', '木', '金', '土'];

// ========================================================
// 1. パスワード認証機能
// ========================================================

// ページロード時の初期化と描画
document.addEventListener('DOMContentLoaded', () => {
  initData();
  renderArticles();
  renderCalendar();
  renderScheduleSlider();
});

// ローカルストレージからデータを読み込む
function initData() {

  // デフォルト画像データの作成 (SVGデータURI)
  const defaultImg1 = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%23f8fafc;stop-opacity:1"/><stop offset="100%" style="stop-color:%23e2e8f0;stop-opacity:1"/></linearGradient></defs><rect width="800" height="500" fill="url(%23g)"/><circle cx="400" cy="250" r="120" fill="%230f172a" fill-opacity="0.03"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="'Outfit', sans-serif" font-size="32" font-weight="bold" fill="%230f172a">TenSguru</text></svg>`;
  const defaultImg2 = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%23fffbeb;stop-opacity:1"/><stop offset="100%" style="stop-color:%23fef3c7;stop-opacity:1"/></linearGradient></defs><rect width="800" height="500" fill="url(%23g)"/><path d="M 200,300 Q 400,100 600,300" fill="none" stroke="%23d97706" stroke-width="2" stroke-dasharray="5 5"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="'Noto Sans JP', sans-serif" font-size="24" font-weight="500" fill="%23b45309">シンプルな余白とデザイン</text></svg>`;

  // 記事データの初期化
  const savedArticles = localStorage.getItem('tensguru_articles');
  if (!savedArticles) {
    const defaultArticles = [
      {
        id: 'default-1',
        title: 'TenSguru へようこそ',
        content: 'TenSguruは、プライベートな記事掲載とカレンダーによるスケジュール管理をひとつにまとめた、パスワード保護付きの個人用Webサイトです。\n\n右上の「投稿する」ボタンから、画像と言葉（テキスト）を自由に掲載できます。左上のメニューボタンからカレンダーを開き、日々の予定を追加することも可能です。\n\nすべてのデータは外部のサーバーではなく、ブラウザのローカルストレージ（localStorage）に保存されるため、あなたのプライバシーは安全に守られます。',
        image: defaultImg1,
        date: formatDateString(new Date())
      },
      {
        id: 'default-2',
        title: '白を基調としたミニマルなデザイン',
        content: '視覚的なノイズを極限まで減らし、あなたの言葉と画像が最も美しく引き立つように余白とタイポグラフィを設計しています。\n\n写真の下に言葉を添えるシンプルなスタイルで、日常のメモ、旅の記録、大切なアイデアなど、白いキャンバスに描くように自由に書き出してください。',
        image: defaultImg2,
        date: formatDateString(new Date(Date.now() - 24 * 60 * 60 * 1000)) // 昨日
      }
    ];
    localStorage.setItem('tensguru_articles', JSON.stringify(defaultArticles));
    state.articles = defaultArticles;
  } else {
    state.articles = JSON.parse(savedArticles);
  }

  // 予定データの初期化 (今日と明日のデモ予定を追加)
  const savedSchedules = localStorage.getItem('tensguru_schedules');
  if (!savedSchedules) {
    const todayStr = formatDateString(new Date());
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = formatDateString(tomorrow);

    const defaultSchedules = [
      {
        id: 'sch-1',
        date: todayStr,
        time: '10:00',
        title: 'TenSguruのセットアップ'
      },
      {
        id: 'sch-2',
        date: todayStr,
        time: '14:00',
        title: 'カレンダーの動作確認'
      },
      {
        id: 'sch-3',
        date: tomorrowStr,
        time: '13:00',
        title: '初めての記事を投稿する'
      }
    ];
    localStorage.setItem('tensguru_schedules', JSON.stringify(defaultSchedules));
    state.schedules = defaultSchedules;
  } else {
    state.schedules = JSON.parse(savedSchedules);
  }
}

// ログアウト処理
function logout() {
  sessionStorage.removeItem('tensguru_decrypt_password');
  window.location.reload();
}

// ========================================================
// 2. 記事の表示と管理 (画像が上、テキストが下)
// ========================================================

// 記事の一覧レンダリング
function renderArticles() {
  const listEl = document.getElementById('articles-list');
  const emptyEl = document.getElementById('empty-state');
  listEl.innerHTML = '';

  if (state.articles.length === 0) {
    emptyEl.classList.remove('hidden');
    return;
  }
  emptyEl.classList.add('hidden');

  // 新しい記事順 (降順) で並び替え
  const sortedArticles = [...state.articles].sort((a, b) => new Date(b.date) - new Date(a.date));

  sortedArticles.forEach(article => {
    const card = document.createElement('article');
    card.className = 'article-card';
    card.id = `article-${article.id}`;

    // カードのHTML構造 (上が画像、下がテキスト)
    const imageHtml = article.image ? `
      <div class="article-image-container">
        <img src="${article.image}" class="article-image" alt="${escapeHTML(article.title)}" loading="lazy">
      </div>
    ` : '';

    card.innerHTML = `
      ${imageHtml}
      <div class="article-content">
        <div class="article-meta">
          <span>${formatJPDate(article.date)}</span>
        </div>
        <h2 class="article-title">${escapeHTML(article.title)}</h2>
        <p class="article-text">${escapeHTML(article.content)}</p>
        <button class="icon-btn delete-btn" onclick="deleteArticle('${article.id}')" aria-label="記事を削除">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
        </button>
      </div>
    `;
    listEl.appendChild(card);
  });
}

// 新しい記事の投稿処理
let selectedImageBase64 = '';

// 画像選択時の処理
function handleImageSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    selectedImageBase64 = e.target.result;

    // UIのプレビュー更新
    const previewImg = document.getElementById('image-preview');
    const placeholder = document.getElementById('upload-placeholder');
    const removeBtn = document.getElementById('remove-image-btn');

    previewImg.src = selectedImageBase64;
    previewImg.classList.remove('hidden');
    placeholder.classList.add('hidden');
    removeBtn.classList.remove('hidden');
  };
  reader.readAsDataURL(file);
}

// 選択した画像の初期化
function resetImageSelection(event) {
  if (event) event.preventDefault();
  selectedImageBase64 = '';
  document.getElementById('post-image').value = '';

  const previewImg = document.getElementById('image-preview');
  const placeholder = document.getElementById('upload-placeholder');
  const removeBtn = document.getElementById('remove-image-btn');

  previewImg.src = '';
  previewImg.classList.add('hidden');
  placeholder.classList.remove('hidden');
  removeBtn.classList.add('hidden');
}

// 記事保存の送信
function submitPost() {
  const title = document.getElementById('post-title').value.trim();
  const content = document.getElementById('post-content').value.trim();

  if (!title || !content) {
    showToast('タイトルと言葉を入力してください。', 'error');
    return;
  }

  const newArticle = {
    id: 'art-' + Date.now(),
    title: title,
    content: content,
    image: selectedImageBase64,
    date: formatDateString(new Date())
  };

  state.articles.push(newArticle);
  localStorage.setItem('tensguru_articles', JSON.stringify(state.articles));

  // フォーム初期化とモーダルクローズ
  document.getElementById('post-form').reset();
  resetImageSelection();
  closePostModal();

  // 表示の更新
  renderArticles();
}

// 記事の削除
function deleteArticle(id) {
  if (!confirm('この記事を削除してもよろしいですか？')) return;

  state.articles = state.articles.filter(article => article.id !== id);
  localStorage.setItem('tensguru_articles', JSON.stringify(state.articles));
  renderArticles();
}

// ========================================================
// 3. カレンダー機能 (サイドバー内)
// ========================================================

// カレンダーの描画
function renderCalendar() {
  const calendarGrid = document.getElementById('calendar-grid');
  const monthYearLabel = document.getElementById('calendar-month-year');
  calendarGrid.innerHTML = '';

  const year = state.currentDate.getFullYear();
  const month = state.currentDate.getMonth(); // 0-indexed

  monthYearLabel.textContent = `${year}年 ${month + 1}月`;

  // 当月の最初の日と最後の日を取得
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  // 前月の空枠を埋める
  for (let i = 0; i < firstDayIndex; i++) {
    const emptyCell = document.createElement('div');
    emptyCell.className = 'calendar-day-cell empty-day';
    calendarGrid.appendChild(emptyCell);
  }

  // 今月の日付を描画
  const today = new Date();
  const todayStr = formatDateString(today);

  for (let day = 1; day <= totalDays; day++) {
    const cellDateStr = formatDateString(new Date(year, month, day));
    const cell = document.createElement('div');
    cell.className = 'calendar-day-cell';
    cell.textContent = day;
    cell.dataset.date = cellDateStr;

    // 今日のマーク
    if (cellDateStr === todayStr) {
      cell.classList.add('today');
    }

    // 選択された日のマーク
    if (cellDateStr === state.selectedDate) {
      cell.classList.add('selected');
    }

    // 予定がある日のインジケータードット
    const hasEvents = state.schedules.some(event => event.date === cellDateStr);
    if (hasEvents) {
      const dot = document.createElement('div');
      dot.className = 'event-dot';
      cell.appendChild(dot);
    }

    // 日付クリックイベント
    cell.addEventListener('click', () => selectCalendarDay(cellDateStr));

    calendarGrid.appendChild(cell);
  }
}

// 日付の選択処理
function selectCalendarDay(dateStr) {
  state.selectedDate = dateStr;

  // カレンダー再描画でハイライトを更新
  renderCalendar();

  // 予定エディタを表示
  const editorEl = document.getElementById('event-editor');
  const labelEl = document.getElementById('selected-date-label');

  editorEl.classList.remove('hidden');
  labelEl.textContent = `${formatJPDate(dateStr)} の予定`;

  renderDayEvents(dateStr);

  // フォームの時間初期化
  document.getElementById('event-time').value = '12:00';
  document.getElementById('event-title').value = '';
}

// カレンダーの月移動
function prevMonth() {
  state.currentDate.setMonth(state.currentDate.getMonth() - 1);
  renderCalendar();
}

function nextMonth() {
  state.currentDate.setMonth(state.currentDate.getMonth() + 1);
  renderCalendar();
}

// ========================================================
// 4. 予定登録・管理
// ========================================================

// 特定の日の予定リストを描画
function renderDayEvents(dateStr) {
  const container = document.getElementById('current-day-events');
  container.innerHTML = '';

  const dayEvents = state.schedules
    .filter(event => event.date === dateStr)
    .sort((a, b) => a.time.localeCompare(b.time));

  if (dayEvents.length === 0) {
    container.innerHTML = `<div style="font-size:12px; color:var(--text-tertiary); padding: 8px 4px;">この日の予定はありません。</div>`;
    return;
  }

  dayEvents.forEach(event => {
    const item = document.createElement('div');
    item.className = 'day-event-item';
    item.innerHTML = `
      <div>
        <span class="event-time-badge">${event.time}</span>
        <span class="event-title-text">${escapeHTML(event.title)}</span>
      </div>
      <button class="delete-event-btn" onclick="deleteEvent('${event.id}', '${dateStr}')" aria-label="予定を削除">✕</button>
    `;
    container.appendChild(item);
  });
}

// 予定を追加
function addEvent() {
  if (!state.selectedDate) return;

  const time = document.getElementById('event-time').value;
  const title = document.getElementById('event-title').value.trim();

  if (!time || !title) return;

  const newEvent = {
    id: 'sch-' + Date.now(),
    date: state.selectedDate,
    time: time,
    title: title
  };

  state.schedules.push(newEvent);
  localStorage.setItem('tensguru_schedules', JSON.stringify(state.schedules));

  // リスト、カレンダー、スライダーを更新
  renderDayEvents(state.selectedDate);
  renderCalendar();
  renderScheduleSlider();

  // フォーム初期化
  document.getElementById('event-title').value = '';
}

// 予定を削除
function deleteEvent(id, dateStr) {
  state.schedules = state.schedules.filter(event => event.id !== id);
  localStorage.setItem('tensguru_schedules', JSON.stringify(state.schedules));

  // リスト、カレンダー、スライダーを更新
  renderDayEvents(dateStr);
  renderCalendar();
  renderScheduleSlider();
}

// 予定追加パネルを閉じる
function closeEventEditor() {
  document.getElementById('event-editor').classList.add('hidden');
  state.selectedDate = null;
  renderCalendar();
}

// ========================================================
// 5. 予定確認機能 (予定がある日だけを横スクロールスライダー表示)
// ========================================================

function renderScheduleSlider() {
  const sliderTrack = document.getElementById('schedule-slider');
  const emptyState = document.getElementById('slider-empty-state');
  sliderTrack.innerHTML = '';

  // 予定のある日のみ抽出
  if (state.schedules.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  // 今日以降の予定に絞る場合 (過去の予定を表示しないため)
  // 必要に応じて過去の予定も含める場合はフィルタ条件を緩めます
  const todayStr = formatDateString(new Date());
  const upcomingEvents = state.schedules.filter(event => event.date >= todayStr);

  if (upcomingEvents.length === 0) {
    emptyState.classList.remove('hidden');
    emptyState.querySelector('p').textContent = '今日以降の予定はありません。';
    return;
  }

  // 日付ごとにグループ化
  const groupedEvents = {};
  upcomingEvents.forEach(event => {
    if (!groupedEvents[event.date]) {
      groupedEvents[event.date] = [];
    }
    groupedEvents[event.date].push(event);
  });

  // 日付順 (昇順) でソート
  const sortedDates = Object.keys(groupedEvents).sort();

  sortedDates.forEach(dateStr => {
    const events = groupedEvents[dateStr].sort((a, b) => a.time.localeCompare(b.time));

    // カード要素を作成
    const card = document.createElement('div');
    card.className = 'schedule-day-card';
    card.onclick = () => {
      // サイドバー内のカレンダーでその日付を選択状態にする
      selectCalendarDay(dateStr);
    };

    // 日付ヘッダーをフォーマット (例: 7月15日(水))
    const formattedHeader = formatCardDate(dateStr);

    let eventsHtml = '';
    events.forEach(e => {
      eventsHtml += `
        <div class="card-event-item">
          <span class="card-event-time">${e.time}</span>
          <span class="card-event-title">${escapeHTML(e.title)}</span>
        </div>
      `;
    });

    card.innerHTML = `
      <div class="card-date-header">${formattedHeader}</div>
      ${eventsHtml}
    `;

    sliderTrack.appendChild(card);
  });
}



// ========================================================
// 7. 画面表示の制御とその他ユーティリティ
// ========================================================

// サイドバー開閉
function toggleSidebar(open) {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');

  if (open) {
    sidebar.classList.add('active');
    overlay.classList.remove('hidden');
    // カレンダーとスライダーを最新にする
    renderCalendar();
    renderScheduleSlider();
  } else {
    sidebar.classList.remove('active');
    overlay.classList.add('hidden');
  }
}

// 記事投稿モーダル開閉
function openPostModal() {
  document.getElementById('post-modal').classList.remove('hidden');
}

function closePostModal() {
  document.getElementById('post-modal').classList.add('hidden');
  document.getElementById('post-form').reset();
  resetImageSelection();
}

// 日付ユーティリティ (Dateオブジェクト -> YYYY-MM-DD 文字列)
function formatDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// 日付表示ユーティリティ (YYYY-MM-DD -> ○年○月○日)
function formatJPDate(dateStr) {
  const [y, m, d] = dateStr.split('-');
  return `${parseInt(y)}年${parseInt(m)}月${parseInt(d)}日`;
}

// カード用日付表示ユーティリティ (YYYY-MM-DD -> ○/○(曜日))
function formatCardDate(dateStr) {
  const date = new Date(dateStr);
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const dayName = weekdays[date.getDay()];
  return `${m}月${d}日(${dayName})`;
}

function escapeHTML(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// プレミアムトースト通知機能
function showToast(message, type = 'error') {
  const existingToast = document.querySelector('.toast-notification');
  if (existingToast) existingToast.remove();

  const toast = document.createElement('div');
  toast.className = `toast-notification toast-${type}`;
  toast.textContent = message;

  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add('show'), 10);

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 200);
  }, 3000);
}
