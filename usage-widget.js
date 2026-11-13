// 利用枠ウィジェット (Muse + ChatGPT) — Scriptable 用
// 設計: ぴちと 2026-11-13 に確定したもの
//   表示 = Scriptable(無料) / 数字の置き場 = GitHub リポジトリの usage.json
//   バー = 紫 → 水色 → ピンクのグラデーション
//   更新 = お天気便(平日06:20/土日08:00)の裏処理 + 金曜15:00チェックに相乗り。15分おき更新はしない
//   天気便の文面に数字は出さない(裏でファイルを書き換えるだけ)
// 使い方: URL は設定済み。そのまま Scriptable に貼るだけ。
//   Gist の中身の形は usage-widget-setup.md を参照。

const GIST_URL = "https://raw.githubusercontent.com/labeltheshelf/usage-widget/main/usage.json";

// ウィジェットの横幅 (中サイズ想定。ホーム画面に置くのは中サイズ)
// 小サイズで使う時は 120、大サイズの時は 300 に変える。
const BAR_WIDTH = 290;

// ---------- 数字を取る (取れなければ前回の保存分を使う) ----------
const fm = FileManager.local();
const cachePath = fm.joinPath(fm.documentsDirectory(), "usage-widget-cache.json");

let data = null;
try {
  const req = new Request(GIST_URL);
  req.timeoutInterval = 10;
  data = await req.loadJSON();
  fm.writeString(cachePath, JSON.stringify(data));
} catch (e) {
  if (fm.fileExists(cachePath)) {
    try { data = JSON.parse(fm.readString(cachePath)); } catch (_) { data = null; }
  }
}

// ---------- ウィジェットを描く ----------
const widget = new ListWidget();
widget.backgroundColor = new Color("#1c1530");
widget.setPadding(14, 16, 12, 16);

// グラデーション: 紫 → 水色 → ピンク (ぴち指定)
function gradient() {
  const g = new LinearGradient();
  g.colors = [new Color("#8b5cf6"), new Color("#38bdf8"), new Color("#ec4899")];
  g.locations = [0, 0.5, 1];
  g.startPoint = new Point(0, 0);
  g.endPoint = new Point(1, 0);
  return g;
}

function addRow(title, leftPct, sub) {
  const head = widget.addStack();
  head.layoutHorizontally();
  const name = head.addText(title);
  name.font = Font.boldSystemFont(13);
  name.textColor = Color.white();
  head.addSpacer();
  const pct = head.addText(leftPct == null ? "—" : "残り " + leftPct + "%");
  pct.font = Font.boldSystemFont(13);
  pct.textColor = Color.white();
  widget.addSpacer(5);

  // バー: 土台(半透明)の上に、残り%分のグラデーションを左寄せで重ねる
  const track = widget.addStack();
  track.backgroundColor = new Color("#ffffff", 0.18);
  track.cornerRadius = 5;
  track.size = new Size(BAR_WIDTH, 10);
  track.layoutHorizontally();
  if (leftPct != null && leftPct > 0) {
    const fill = track.addStack();
    fill.backgroundGradient = gradient();
    fill.cornerRadius = 5;
    fill.size = new Size(Math.round(BAR_WIDTH * leftPct / 100), 10);
  }
  track.addSpacer();
  widget.addSpacer(3);

  const note = widget.addText(sub);
  note.font = Font.systemFont(10);
  note.textColor = new Color("#ffffff", 0.65);
  widget.addSpacer(10);
}

if (data && data.muse) {
  const m = data.muse;
  const reset = m.reset ? "リセット " + String(m.reset).slice(5, 16).replace("T", " ") : "";
  addRow("Muse", m.left_pct, reset || "週枠");
} else {
  addRow("Muse", null, "まだ数字が届いてないよ");
}

if (data && data.chatgpt) {
  const c = data.chatgpt;
  addRow("ChatGPT", c.left_pct, c.reset ? "リセット " + String(c.reset).slice(5, 16).replace("T", " ") : "週枠");
} else {
  addRow("ChatGPT", null, "ChatGPTじぴに確認中");
}

const foot = widget.addText(
  data && data.updated_at ? "更新 " + String(data.updated_at).slice(5, 16).replace("T", " ") : "更新 —"
);
foot.font = Font.systemFont(9);
foot.textColor = new Color("#ffffff", 0.45);

Script.setWidget(widget);
Script.complete();
