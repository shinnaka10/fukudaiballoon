/**
 * 福岡大学熱気球サークル — コンテンツ管理 API
 * Google Apps Script (スプレッドシートにバインドして使用)
 *
 * ═══ デプロイ手順 ═══════════════════════════════════════════════════════════
 * 1. Googleスプレッドシートを開く（シート名は自由）
 * 2. 拡張機能 → Apps Script → このコードをまるごと貼り付けて保存
 * 3. 右上「デプロイ」→「新しいデプロイ」→ 種類: ウェブアプリ
 *    - 説明: fukudai-balloon-cms
 *    - 次のユーザーとして実行: 自分
 *    - アクセスできるユーザー: 全員（匿名ユーザーを含む）
 * 4. 「デプロイ」→ 「アクセスを承認」→ ウェブアプリ URL をコピー
 * 5. そのURLを admin.html の「GAS URL 設定」欄に貼り付ける
 * ════════════════════════════════════════════════════════════════════════════
 *
 * POST /exec  →  データをスプレッドシートに追記
 * GET  /exec  →  スプレッドシートのデータをJSONで返す（GitHub Actions用）
 */

// ─── POST: admin.html からの書き込み ────────────────────────────────────────

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss   = SpreadsheetApp.getActiveSpreadsheet();

    switch (data.action) {

      /* ── お知らせ追加 ── */
      case 'add_notice': {
        if (!data.title) return fail('タイトルは必須です');
        const sheet = getOrCreate(ss, 'お知らせ', ['日付', 'タイトル', '内容']);
        sheet.appendRow([data.date || '', data.title, data.content || '']);
        return ok('お知らせを追加しました');
      }

      /* ── ギャラリー追加 ── */
      case 'add_gallery': {
        if (!data.url) return fail('画像URLは必須です');
        const sheet = getOrCreate(ss, 'ギャラリー', ['画像URL', 'キャプション']);
        sheet.appendRow([data.url, data.caption || '']);
        return ok('ギャラリー画像を追加しました');
      }

      /* ── お知らせ削除（行番号指定） ── */
      case 'delete_notice': {
        const sheet = ss.getSheetByName('お知らせ');
        if (!sheet) return fail('シートが見つかりません');
        const row = Number(data.row);
        if (row >= 2) sheet.deleteRow(row);
        return ok('お知らせを削除しました');
      }

      /* ── ギャラリー削除（行番号指定） ── */
      case 'delete_gallery': {
        const sheet = ss.getSheetByName('ギャラリー');
        if (!sheet) return fail('シートが見つかりません');
        const row = Number(data.row);
        if (row >= 2) sheet.deleteRow(row);
        return ok('ギャラリー画像を削除しました');
      }

      default:
        return fail('不明なアクション: ' + data.action);
    }

  } catch (err) {
    return fail('サーバーエラー: ' + err.toString());
  }
}

// ─── GET: GitHub Actions からのデータ取得 ───────────────────────────────────

function doGet(e) {
  try {
    const ss      = SpreadsheetApp.getActiveSpreadsheet();
    const notices = sheetToObjects(ss.getSheetByName('お知らせ'),  ['date', 'title', 'content']);
    const gallery = sheetToObjects(ss.getSheetByName('ギャラリー'), ['url', 'caption']);

    return ContentService
      .createTextOutput(JSON.stringify({ notices, gallery }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return fail('データ取得エラー: ' + err.toString());
  }
}

// ─── ヘルパー ────────────────────────────────────────────────────────────────

function getOrCreate(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    const header = sheet.getRange(1, 1, 1, headers.length);
    header.setValues([headers]);
    header.setFontWeight('bold');
    header.setBackground('#fff3e6');
  }
  return sheet;
}

function sheetToObjects(sheet, keys) {
  if (!sheet || sheet.getLastRow() < 2) return [];
  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, keys.length).getValues();
  return rows
    .map((row, i) => {
      const obj = { _row: i + 2 };
      keys.forEach((k, j) => { obj[k] = String(row[j] || '').trim(); });
      return obj;
    })
    .filter(obj => keys.some(k => obj[k]));
}

function ok(message) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', message }))
    .setMimeType(ContentService.MimeType.JSON);
}

function fail(message) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'error', message }))
    .setMimeType(ContentService.MimeType.JSON);
}
