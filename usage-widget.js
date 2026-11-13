// 利用枠ウィジェット (Muse + ChatGPT) — Scriptable 用
// 設計: ぴちと 2026-11-13 に確定したもの
//   表示 = Scriptable(無料) / 数字の置き場 = GitHub リポジトリの usage.json
//   バー = 紫 → 水色 → ピンクのグラデーション
//   更新 = お天気便(平日06:20/土日08:00)の裏処理 + 金曜15:00チェックに相乗り。15分おき更新はしない
//   天気便の文面に数字は出さない(裏でファイルを書き換えるだけ)
// サイズ対応: 小・中どちらのウィジェットでも収まるよう、大きさで幅と文字を切り替える。

const JSON_URL = "https://raw.githubusercontent.com/labeltheshelf/usage-widget/main/usage.json";

// ウィジェットの大きさ (ホーム画面に置いた時にだけ値が入る。アプリ内実行では medium 扱い)
const FAMILY = config.widgetFamily || "medium";
const SMALL = FAMILY === "small";
const BAR_WIDTH = SMALL ? 118 : 290;
const BAR_HEIGHT = SMALL ? 8 : 10;

// ---------- 数字を取る (取れなければ前回の保存分を使う) ----------
const fm = FileManager.local();
const cachePath = fm.joinPath(fm.documentsDirectory(), "usage-widget-cache.json");

let data = null;
try {
  const req = new Request(JSON_URL);
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
if (SMALL) { widget.setPadding(10, 12, 10, 12); } else { widget.setPadding(14, 16, 12, 16); }

// グラデーション: 紫 → 水色 → ピンク (ぴち指定)
function gradient() {
  const g = new LinearGradient();
  g.colors = [new Color("#8b5cf6"), new Color("#38bdf8"), new Color("#ec4899")];
  g.locations = [0, 0.5, 1];
  g.startPoint = new Point(0, 0);
  g.endPoint = new Point(1, 0);
  return g;
}

function fmtReset(iso) {
  if (!iso) return "";
  // 小サイズでは時刻だけ、中サイズでは日付+時刻
  return SMALL ? "リセット " + String(iso).slice(11, 16)
               : "リセット " + String(iso).slice(5, 16).replace("T", " ");
}

function addRow(title, leftPct, sub) {
  const head = widget.addStack();
  head.layoutHorizontally();
  const name = head.addText(title);
  name.font = Font.boldSystemFont(SMALL ? 12 : 13);
  name.textColor = Color.white();
  head.addSpacer();
  const pct = head.addText(leftPct == null ? "—" : "残り " + leftPct + "%");
  pct.font = Font.boldSystemFont(SMALL ? 12 : 13);
  pct.textColor = Color.white();
  widget.addSpacer(SMALL ? 3 : 5);

  // バー: 土台(半透明)の上に、残り%分のグラデーションを左寄せで重ねる
  const track = widget.addStack();
  track.backgroundColor = new Color("#ffffff", 0.18);
  track.cornerRadius = BAR_HEIGHT / 2;
  track.size = new Size(BAR_WIDTH, BAR_HEIGHT);
  track.layoutHorizontally();
  if (leftPct != null && leftPct > 0) {
    const fill = track.addStack();
    fill.backgroundGradient = gradient();
    fill.cornerRadius = BAR_HEIGHT / 2;
    fill.size = new Size(Math.max(BAR_HEIGHT, Math.round(BAR_WIDTH * leftPct / 100)), BAR_HEIGHT);
  }
  track.addSpacer();
  widget.addSpacer(2);

  const note = widget.addText(sub);
  note.font = Font.systemFont(SMALL ? 9 : 10);
  note.textColor = new Color("#ffffff", 0.65);
  note.lineLimit = 1;
  widget.addSpacer(SMALL ? 7 : 10);
}

if (data && data.muse) {
  addRow("Muse", data.muse.left_pct, fmtReset(data.muse.reset) || "週枠");
} else {
  addRow("Muse", null, "まだ数字が届いてないよ");
}

if (data && data.chatgpt) {
  addRow("ChatGPT", data.chatgpt.left_pct, fmtReset(data.chatgpt.reset) || "週枠");
} else {
  addRow("ChatGPT", null, "ChatGPTじぴに確認中");
}

if (!SMALL) {
  const foot = widget.addText(
    data && data.updated_at ? "更新 " + String(data.updated_at).slice(5, 16).replace("T", " ") : "更新 —"
  );
  foot.font = Font.systemFont(9);
  foot.textColor = new Color("#ffffff", 0.45);
}

Script.setWidget(widget);
Script.complete();
