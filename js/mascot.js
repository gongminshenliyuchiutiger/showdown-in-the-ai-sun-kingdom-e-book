/**
 * 吉祥物互動與自由拖曳功能
 * 支援滑鼠與觸控雙重拖曳，可移動到畫面任意位置
 */
document.addEventListener('DOMContentLoaded', () => {
  const mascot = document.getElementById('mascotWidget');
  const speechBubble = document.getElementById('mascotBubble');
  if (!mascot) return;

  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let initialLeft = 0;
  let initialTop = 0;
  let hasMoved = false;

  // 對話泡泡隨機台詞庫（繁體中文）
  const mascotQuotes = [
    "嗨！我是阿宅聯盟的最佳夥伴！",
    "決戰 AI 太陽王國，一起勇往直前！",
    "你可以把我拖曳到畫面的任何角落喔！",
    "滑鼠移到我身上，我會發出霓虹彩色光芒！",
    "看漫畫累了嗎？記得喝口水休息一下眼睛喔！",
    "按鍵盤左右方向鍵可以快速翻頁喔！",
    "支援單頁與雙頁模式切換，閱讀更舒適！",
    "快看精彩下一頁，AI 太陽王國的秘密要揭曉了！"
  ];

  let bubbleTimeout = null;

  function showSpeechBubble(text) {
    if (!speechBubble) return;
    speechBubble.textContent = text || mascotQuotes[Math.floor(Math.random() * mascotQuotes.length)];
    speechBubble.classList.add('visible');
    
    if (bubbleTimeout) clearTimeout(bubbleTimeout);
    bubbleTimeout = setTimeout(() => {
      speechBubble.classList.remove('visible');
    }, 4500);
  }

  // 初始提示氣泡（3秒後自動彈出，讓使用者知道可以拖曳與互動）
  setTimeout(() => {
    showSpeechBubble("嗨！你可以隨意拖曳我到任何地方喔！");
  }, 1800);

  // 開始拖曳
  function onPointerDown(e) {
    // 判斷是否為主要按鍵（左鍵或觸控）
    if (e.button !== undefined && e.button !== 0) return;

    isDragging = true;
    hasMoved = false;
    
    // 獲取當前指針座標
    const clientX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
    const clientY = e.type.startsWith('touch') ? e.touches[0].clientY : e.clientY;

    startX = clientX;
    startY = clientY;

    // 取得當前元素相對於視窗的位置
    const rect = mascot.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;

    mascot.style.bottom = 'auto';
    mascot.style.right = 'auto';
    mascot.style.left = `${initialLeft}px`;
    mascot.style.top = `${initialTop}px`;
    mascot.classList.add('is-dragging');

    // 阻止某些原生拖曳圖片行為
    e.preventDefault();
  }

  // 拖曳移動中
  function onPointerMove(e) {
    if (!isDragging) return;

    const clientX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
    const clientY = e.type.startsWith('touch') ? e.touches[0].clientY : e.clientY;

    const deltaX = clientX - startX;
    const deltaY = clientY - startY;

    if (Math.hypot(deltaX, deltaY) > 4) {
      hasMoved = true;
    }

    let newLeft = initialLeft + deltaX;
    let newTop = initialTop + deltaY;

    // 視窗邊界限制，防止拖出螢幕外
    const maxX = window.innerWidth - mascot.offsetWidth;
    const maxY = window.innerHeight - mascot.offsetHeight;

    newLeft = Math.max(0, Math.min(newLeft, maxX));
    newTop = Math.max(0, Math.min(newTop, maxY));

    mascot.style.left = `${newLeft}px`;
    mascot.style.top = `${newTop}px`;
  }

  // 結束拖曳
  function onPointerUp() {
    if (!isDragging) return;
    isDragging = false;
    mascot.classList.remove('is-dragging');

    // 如果沒有顯著移動，則視為點擊，觸發台詞互動
    if (!hasMoved) {
      showSpeechBubble();
    }
  }

  // 監聽滑鼠與觸控事件
  mascot.addEventListener('mousedown', onPointerDown);
  window.addEventListener('mousemove', onPointerMove, { passive: false });
  window.addEventListener('mouseup', onPointerUp);

  mascot.addEventListener('touchstart', onPointerDown, { passive: false });
  window.addEventListener('touchmove', onPointerMove, { passive: false });
  window.addEventListener('touchend', onPointerUp);
  window.addEventListener('touchcancel', onPointerUp);

  // 視窗大小改變時，確保吉祥物留在畫面之內
  window.addEventListener('resize', () => {
    const rect = mascot.getBoundingClientRect();
    const maxX = window.innerWidth - mascot.offsetWidth;
    const maxY = window.innerHeight - mascot.offsetHeight;

    let adjustedLeft = Math.max(0, Math.min(rect.left, maxX));
    let adjustedTop = Math.max(0, Math.min(rect.top, maxY));

    mascot.style.left = `${adjustedLeft}px`;
    mascot.style.top = `${adjustedTop}px`;
  });
});
