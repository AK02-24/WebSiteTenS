/**
 * TenSguru Decryption Engine
 * AES-CBC 256-bit browser-side decryption using Web Crypto API.
 */

document.addEventListener('DOMContentLoaded', () => {
  // ログイン画面のテキストを動的設定 (PowerShellの文字化け回避対策)
  const desc = document.getElementById('login-desc');
  const input = document.getElementById('site-password');
  const error = document.getElementById('password-error');
  const btn = document.getElementById('login-btn');

  if (desc) desc.textContent = "このサイトはパスワードで保護されています。";
  if (input) input.placeholder = "パスワードを入力してください";
  if (error) error.textContent = "パスワードが正しくありません。";
  if (btn) btn.textContent = "サイトを開く";

  const cachedPassword = sessionStorage.getItem('tensguru_decrypt_password');
  if (cachedPassword) {
    decryptAndRun(cachedPassword, true);
  }
});

async function handleDecryptSubmit() {
  const input = document.getElementById('site-password');
  const password = input.value;
  const success = await decryptAndRun(password, false);
  if (!success) {
    document.getElementById('password-error').style.display = 'block';
    input.value = '';
    input.focus();
  }
}

function base64ToBytes(base64) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decryptAndRun(password, isAuto = false) {
  try {
    const saltBytes = base64ToBytes(PAYLOAD.salt);
    const ivBytes = base64ToBytes(PAYLOAD.iv);
    const cipherBytes = base64ToBytes(PAYLOAD.ciphertext);

    // Web Crypto APIでパスワードからキーを導出 (PBKDF2)
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      "raw",
      enc.encode(password),
      "PBKDF2",
      false,
      ["deriveBits", "deriveKey"]
    );
    const key = await window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: saltBytes,
        iterations: 100000,
        hash: PAYLOAD.hash
      },
      keyMaterial,
      { name: "AES-CBC", length: 256 },
      false,
      ["decrypt"]
    );

    // AES-CBCで復号を実行
    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: "AES-CBC",
        iv: ivBytes
      },
      key,
      cipherBytes
    );

    const dec = new TextDecoder();
    const appData = JSON.parse(dec.decode(decrypted));

    // 復号成功後、セッションに記憶
    sessionStorage.setItem('tensguru_decrypt_password', password);

    const overlay = document.getElementById('password-screen');
    if (isAuto) {
      overlay.remove();
      injectAndStart(appData);
    } else {
      overlay.style.opacity = '0';
      setTimeout(() => {
        overlay.remove();
        injectAndStart(appData);
      }, 300);
    }
    return true;
  } catch (e) {
    console.error("Decryption failed:", e);
    return false;
  }
}

function injectAndStart(appData) {
  // 1. 本体のCSSを差し込む
  const style = document.createElement('style');
  style.textContent = appData.css;
  document.head.appendChild(style);

  // 2. 本体のHTMLを差し込む (bodyに展開)
  const container = document.createElement('div');
  container.innerHTML = appData.html;
  while (container.firstChild) {
    document.body.appendChild(container.firstChild);
  }

  // 3. 本体のJSを読み込んで実行
  const script = document.createElement('script');
  script.textContent = appData.js;
  document.body.appendChild(script);

  // 4. ログイン画面用CSSを削除 (競合回避のため)
  const loginCssLink = document.querySelector('link[href="login.css"]');
  if (loginCssLink) {
    loginCssLink.remove();
  }
}
