import { useEffect, useRef, useState } from 'react'

type Mode = 'MIXED' | 'POT_ODDS' | 'FE' | 'RANGE3'
type QType = 'POT_ODDS' | 'FE' | 'RANGE3'

type Question = {
  id: string
  qtype: QType
  pot: number
  bet: number
  options: string[]
  correctIndex: number
  explanation: string
  askedAt: number
  meta?: Record<string, any>
}

type Stats = { answered: number; correct: number; totalMs: number }

// 日本語表示マップ（表示用）
const MODE_LABEL_JA: Record<Mode, string> = {
  MIXED: 'ミックス',
  POT_ODDS: 'ポットオッズ',
  FE: 'フォールド・エクイティ',
  RANGE3: 'レンジ3',
}
const RANGE_LABEL_JA: Record<string, string> = { Strong: '強い', Medium: '普通', Weak: '弱い' }
const POS_LABEL_JA: Record<string, string> = { IP: 'IP（インポジション）', OOP: 'OOP（アウトオブポジション）' }
const HAND_LABEL_JA: Record<string, string> = {
  'Set/Trips': 'セット/トリップス',
  'Two Pair': 'ツーペア',
  'Overpair': 'オーバーペア',
  'Top Pair Top Kicker': 'トップペア・トップキッカー',
  'Top Pair Weak Kicker': 'トップペア・弱いキッカー',
  'Second Pair': 'セカンドペア',
  'Underpair': 'アンダーペア',
  'Nut FD + Overcards': 'ナッツFD＋オーバーカード',
  'Strong Draw (OESD/NFD)': '強いドロー（OESD/NFD）',
  'Weak Draw (GS/BDFD)': '弱いドロー（GS/BDFD）',
  'Air/Backdoors': 'エア/バックドア',
}
const BOARD_LABEL_JA: Record<string, string> = {
  'Dry High (A72r)': 'ドライハイ（A72r）',
  'Wet (T98hh)': 'ウェット（T98hh）',
  'Paired (KK2r)': 'ペアボード（KK2r）',
  'Low Connected (654ss)': 'ローカンネクテッド（654ss）',
}

function jaMode(m: Mode) { return MODE_LABEL_JA[m] ?? m }
function jaRange(s: string) { return RANGE_LABEL_JA[s] ?? s }
function jaPos(s: string) { return POS_LABEL_JA[s] ?? s }
function jaHand(s?: string) { return (s && HAND_LABEL_JA[s]) || s || '' }
function jaBoard(s?: string) { return (s && BOARD_LABEL_JA[s]) || s || '' }

const PREF_KEY = 'fst.prefs.v1'
const STATS_KEY = 'fst.stats.v1'
const MISTAKES_KEY = 'fst.mistakes.v1'
const SCORE_KEY = 'fst.score.v1'
const BESTSTREAK_KEY = 'fst.beststreak.v1'

function loadPrefs(): { mode: Mode; minutes: number; reviewOnly?: boolean } | null {
  try { const raw = localStorage.getItem(PREF_KEY); if (!raw) return null; const obj = JSON.parse(raw);
    if (obj && (['MIXED','POT_ODDS','FE','RANGE3'] as Mode[]).includes(obj.mode) && typeof obj.minutes === 'number') return obj; } catch {}
  return null
}
function savePrefs(p: { mode: Mode; minutes: number; reviewOnly?: boolean }) { localStorage.setItem(PREF_KEY, JSON.stringify(p)) }

function loadStats(): Stats | null {
  try { const raw = localStorage.getItem(STATS_KEY); if (!raw) return null; const obj = JSON.parse(raw);
    if (obj && typeof obj.answered==='number' && typeof obj.correct==='number' && typeof obj.totalMs==='number') return obj; } catch {}
  return null
}
function saveStats(s: Stats) { localStorage.setItem(STATS_KEY, JSON.stringify(s)) }

function loadMistakes(): Question[] { try { const raw = localStorage.getItem(MISTAKES_KEY); if (!raw) return []; const arr = JSON.parse(raw); return Array.isArray(arr)? arr.filter(Boolean): [] } catch { return [] } }
function saveMistakes(arr: Question[]) { localStorage.setItem(MISTAKES_KEY, JSON.stringify(arr)) }

function clamp01(x: number) { return Math.min(1, Math.max(0, x)) }
function toPctStr(x: number) { const v = Math.round(x * 1000) / 10; return `${v.toFixed(1)}%` }
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }
function shuffle<T>(arr: T[]): T[] { const a = arr.slice(); for (let i=a.length-1;i>0;i--){ const j = Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]] } return a }
function fmtChips(x: number) { return `${x}` }

function generatePotAndBet() { const potBase = Math.round((Math.random()*90+10)); const pot = potBase; const factors=[0.25,0.33,0.4,0.5,0.66,0.75,0.8,1.0,1.25,1.5]; const f = pick(factors); const bet = Math.max(1, Math.round(pot*f)); return { pot, bet } }
function makeId(parts: (string|number)[]) { return parts.join('|') }

function genPotOddsQuestion(): Question {
  const { pot, bet } = generatePotAndBet()
  const correct = clamp01(bet / (pot + 2 * bet))
  const m1 = clamp01(bet / (pot + bet))
  const m2 = clamp01(pot / (pot + 2 * bet))
  const m3 = clamp01(bet / Math.max(1, pot))
  const vals = [correct, m1, m2, m3]
  const labels = vals.map(toPctStr)
  const unique: { val: number; label: string; isCorrect: boolean }[] = []
  for (let i=0;i<vals.length;i++){ const label = labels[i]; if (!unique.some(u=>u.label===label)) unique.push({ val: vals[i], label, isCorrect: i===0 }) }
  while (unique.length < 4) { const tweak = clamp01(correct + (Math.random()*0.2 - 0.1)); const l = toPctStr(tweak); if (!unique.some(u=>u.label===l)) unique.push({ val: tweak, label: l, isCorrect: false }) }
  const shuffled = shuffle(unique)
  const correctIndex = shuffled.findIndex(o=>o.isCorrect)
  const options = shuffled.map(o=>o.label)
  const explanation = `ポットオッズ: コールに必要なエクイティ = b / (p + 2b)。p=${fmtChips(pot)}, b=${fmtChips(bet)}。正解は ${toPctStr(correct)}。`
  const id = makeId(['POT', pot, bet, ...options])
  return { id, qtype: 'POT_ODDS', pot, bet, options, correctIndex, explanation, askedAt: performance.now() }
}

function genFEQuestion(): Question {
  const { pot, bet } = generatePotAndBet()
  const correct = clamp01(bet / (pot + bet))
  const m1 = clamp01(bet / (pot + 2 * bet))
  const m2 = clamp01(pot / (pot + bet))
  const m3 = clamp01(bet / Math.max(1, pot))
  const vals = [correct, m1, m2, m3]
  const labels = vals.map(toPctStr)
  const unique: { val: number; label: string; isCorrect: boolean }[] = []
  for (let i=0;i<vals.length;i++){ const label = labels[i]; if (!unique.some(u=>u.label===label)) unique.push({ val: vals[i], label, isCorrect: i===0 }) }
  while (unique.length < 4) { const tweak = clamp01(correct + (Math.random()*0.2 - 0.1)); const l = toPctStr(tweak); if (!unique.some(u=>u.label===l)) unique.push({ val: tweak, label: l, isCorrect: false }) }
  const shuffled = shuffle(unique)
  const correctIndex = shuffled.findIndex(o=>o.isCorrect)
  const options = shuffled.map(o=>o.label)
  const explanation = `フォールド・エクイティ: ブラフの損益分岐フォールド率 = b / (p + b)。p=${fmtChips(pot)}, b=${fmtChips(bet)}。正解は ${toPctStr(correct)}。`
  const id = makeId(['FE', pot, bet, ...options])
  return { id, qtype: 'FE', pot, bet, options, correctIndex, explanation, askedAt: performance.now() }
}

// RANGE 3-box drill
type HandCat = { name: string; base: number }
type BoardTex = { name: string; effect: (h: HandCat) => number }

const HANDS: HandCat[] = [
  { name: 'Set/Trips', base: 95 },
  { name: 'Two Pair', base: 90 },
  { name: 'Overpair', base: 78 },
  { name: 'Top Pair Top Kicker', base: 82 },
  { name: 'Top Pair Weak Kicker', base: 72 },
  { name: 'Second Pair', base: 55 },
  { name: 'Underpair', base: 35 },
  { name: 'Nut FD + Overcards', base: 75 },
  { name: 'Strong Draw (OESD/NFD)', base: 68 },
  { name: 'Weak Draw (GS/BDFD)', base: 45 },
  { name: 'Air/Backdoors', base: 20 },
]

const BOARDS: BoardTex[] = [
  { name: 'Dry High (A72r)', effect: (h) => {
    if (h.name.includes('Top Pair')) return +6
    if (h.name.includes('Overpair')) return +5
    if (h.name.includes('Strong Draw')) return -8
    if (h.name.includes('Weak Draw')) return -5
    return 0
  }},
  { name: 'Wet (T98hh)', effect: (h) => {
    if (h.name.includes('Draw')) return +10
    if (h.name.includes('Top Pair')) return -10
    if (h.name.includes('Overpair')) return -8
    return 0
  }},
  { name: 'Paired (KK2r)', effect: (h) => {
    if (h.name.includes('Set/Trips')) return +10
    if (h.name.includes('Two Pair')) return +5
    if (h.name.includes('Draw')) return -5
    return 0
  }},
  { name: 'Low Connected (654ss)', effect: (h) => {
    if (h.name.includes('Strong Draw')) return +8
    if (h.name.includes('Underpair')) return -5
    return 0
  }},
]

function classifyScore(score: number): 'Strong' | 'Medium' | 'Weak' {
  if (score >= 70) return 'Strong'
  if (score >= 45) return 'Medium'
  return 'Weak'
}

function genRange3Question(): Question {
  const hand = pick(HANDS)
  const board = pick(BOARDS)
  const position = pick(['IP','OOP'])
  const bonus = board.effect(hand) + (position === 'IP' ? 2 : 0)
  const score = Math.max(0, Math.min(100, hand.base + bonus))
  const correctLabel = classifyScore(score)
  const labels = ['Strong','Medium','Weak']
  const options = shuffle(labels)
  const correctIndex = options.indexOf(correctLabel)
  const explanation = `レンジ3: ${HAND_LABEL_JA[hand.name] ?? hand.name} / ${BOARD_LABEL_JA[board.name] ?? board.name}（${jaPos(position)}）。スコア ${Math.round(score)} → ${jaRange(correctLabel)}。`
  const id = makeId(['R3', hand.name, board.name, position])
  return { id, qtype: 'RANGE3', pot: 0, bet: 0, options, correctIndex, explanation, askedAt: performance.now(), meta: { hand: hand.name, board: board.name, position, score } }
}

function newQuestionFor(mode: Mode): Question {
  const t: QType = mode === 'MIXED' ? pick(['POT_ODDS','FE','RANGE3'] as QType[]) : mode
  if (t === 'POT_ODDS') return genPotOddsQuestion()
  if (t === 'FE') return genFEQuestion()
  return genRange3Question()
}

function useTimer(initialMinutes: number) {
  const [minutes, setMinutes] = useState(initialMinutes)
  const [remaining, setRemaining] = useState(initialMinutes * 60 * 1000)
  const [running, setRunning] = useState(false)
  const [over, setOver] = useState(false)
  const lastTick = useRef<number | null>(null)
  useEffect(() => {
    if (!running) { lastTick.current = null; return }
    const raf = () => {
      const now = performance.now()
      const prev = lastTick.current ?? now
      lastTick.current = now
      setRemaining(prevRem => {
        const next = prevRem - (now - prev)
        if (next <= 0) { setRunning(false); setOver(true); return 0 }
        return next
      })
      if (running) requestAnimationFrame(raf)
    }
    const id = requestAnimationFrame(raf)
    return () => cancelAnimationFrame(id)
  }, [running])
  const reset = (mins?: number) => { const m = mins ?? minutes; setMinutes(m); setRemaining(m*60*1000); setRunning(false); setOver(false) }
  return { minutes, setMinutes, remaining, running, over, setRunning, reset }
}

function formatTime(ms: number) { const total = Math.ceil(ms/1000); const m = Math.floor(total/60).toString().padStart(2,'0'); const s = (total%60).toString().padStart(2,'0'); return `${m}:${s}` }

// --- カード表示ユーティリティ ---
type CardCode = string // 例: 'As', 'Td', 'BACK'
const SUIT_LABEL: Record<string, string> = { s: '♠', h: '♥', d: '♦', c: '♣' }
function parseCard(code: CardCode) {
  if (code === 'BACK') return { back: true }
  const rank = code[0]?.toUpperCase() || 'A'
  const suit = code[1]?.toLowerCase() || 's'
  return { back: false, rank, suit, suitLabel: SUIT_LABEL[suit] ?? '♠' }
}
const BOARD_SAMPLE_CARDS: Record<string, CardCode[]> = {
  'Dry High (A72r)': ['As','7d','2c'],
  'Wet (T98hh)': ['Th','9h','8c'],
  'Paired (KK2r)': ['Kd','Kc','2s'],
  'Low Connected (654ss)': ['6s','5s','4d'],
}
function sampleBoardCards(boardName?: string): CardCode[] { return (boardName && BOARD_SAMPLE_CARDS[boardName]) || ['As','Kd','7c'] }

function Card({ code, size='md' }: { code: CardCode; size?: 'sm'|'md'|'lg' }) {
  const c = parseCard(code)
  const cls = `card ${c.back? 'back':''} ${size}`
  if (c.back) return <div className={cls} aria-label="カード(裏)" />
  const isRed = (c as any).suit === 'h' || (c as any).suit === 'd'
  return (
    <div className={cls} aria-label={`カード ${c.rank}${(c as any).suitLabel}`}>
      <div className={`pip ${isRed? 'red':''}`}>{c.rank}{(c as any).suitLabel}</div>
    </div>
  )
}

function BoardMini({ scale = 1, boardName, position }: { scale?: number; boardName?: string; position?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.id = 'board-mini-root'
    try { console.log('[BoardMini] inside .board-col ? =>', !!el.closest('.board-col')) } catch {}
  }, [])
  return (
    <div ref={ref} className="board-mini rounded-xl" style={{ border:'1px solid rgba(255,255,255,0.08)', background:'rgba(0,0,0,0.2)', padding:12, transform:`scale(${scale})`, transformOrigin:'top left' }}>
      <div className="poker-wrap">
        <div className="table felt">
          <div className="board-cards">
            {sampleBoardCards(boardName).map((cc, i) => <Card key={i} code={cc} size="md" />)}
          </div>
          <div className="hole-cards" style={{opacity:0.9}}>
            <Card code={'BACK'} size="sm" />
            <Card code={'BACK'} size="sm" />
          </div>
          <div className="pos-badge">{jaPos(String(position))}</div>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const prefs = loadPrefs() ?? { mode: 'MIXED' as Mode, minutes: 30, reviewOnly: false }
  const [mode, setMode] = useState<Mode>(prefs.mode)
  const timer = useTimer(prefs.minutes)
  const [question, setQuestion] = useState<Question>(() => newQuestionFor(mode))
  const [selected, setSelected] = useState<number | null>(null)
  const [stats, setStats] = useState<Stats>(() => loadStats() ?? { answered: 0, correct: 0, totalMs: 0 })
  const [reviewOnly, setReviewOnly] = useState<boolean>(!!prefs.reviewOnly)
  const [mistakes, setMistakes] = useState<Question[]>(() => loadMistakes())
  const [streak, setStreak] = useState<number>(0)
  const [bestStreak, setBestStreak] = useState<number>(() => Number(localStorage.getItem(BESTSTREAK_KEY) || 0))
  const [score, setScore] = useState<number>(() => Number(localStorage.getItem(SCORE_KEY) || 0))
  const [toast, setToast] = useState<string | null>(null)

  // persist
  useEffect(() => { savePrefs({ mode, minutes: timer.minutes, reviewOnly }) }, [mode, timer.minutes, reviewOnly])
  useEffect(() => { saveStats(stats) }, [stats])
  useEffect(() => { saveMistakes(mistakes) }, [mistakes])
  useEffect(() => { localStorage.setItem(SCORE_KEY, String(score)) }, [score])
  useEffect(() => { localStorage.setItem(BESTSTREAK_KEY, String(bestStreak)) }, [bestStreak])

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement | null
      const tag = active?.tagName?.toLowerCase()
      const isTyping = !!(active && (tag === 'input' || tag === 'textarea' || active.isContentEditable))
      if (isTyping) return
      const key = e.key.toLowerCase()
      if (key === ' ' || key === 's') { e.preventDefault(); if (!timer.over) timer.setRunning(r=>!r); return }
      if (key === 'r') { e.preventDefault(); timer.reset(); return }
      if (timer.over) return
      if (key === 'n') { e.preventDefault(); nextQuestion(); return }
      if (['1','2','3','4'].includes(key)) { e.preventDefault(); choose(parseInt(key, 10) - 1) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [timer.over, question, selected])

  function nextQuestion() {
    if (timer.over) return
    setSelected(null)
    if (reviewOnly && mistakes.length > 0) {
      const m = pick(mistakes)
      setQuestion({ ...m, askedAt: performance.now() })
    } else {
      setQuestion(newQuestionFor(mode))
    }
  }

  function choose(i: number) {
    if (timer.over) return
    if (selected !== null) return
    if (i < 0 || i >= question.options.length) return
    setSelected(i)
    const now = performance.now()
    const elapsed = Math.max(0, now - question.askedAt)
    setStats(s => ({ answered: s.answered + 1, correct: s.correct + (i === question.correctIndex ? 1 : 0), totalMs: s.totalMs + elapsed }))
    if (i !== question.correctIndex) {
      setMistakes(list => (list.find(q => q.id === question.id) ? list : [...list, question]))
      setStreak(0)
      setToast('❌ コンボ終了')
      setTimeout(() => setToast(null), 900)
    } else {
      setMistakes(list => list.filter(q => q.id !== question.id))
      setStreak(n => { const nn = n + 1; if (nn > bestStreak) setBestStreak(nn); return nn })
      const sec = elapsed / 1000
      let bonus = 0
      if (sec <= 2) bonus = 50
      else if (sec <= 5) bonus = 25
      else if (sec <= 10) bonus = 10
      const comboBonus = Math.max(0, (streak + 1 - 2)) * 10
      const points = 100 + bonus + comboBonus
      setScore(s => s + points)
      setToast(`✅ +${points}`)
      setTimeout(() => setToast(null), 900)
    }
  }

  const accuracy = stats.answered ? (stats.correct / stats.answered) : 0
  const avgMs = stats.answered ? (stats.totalMs / stats.answered) : 0
  const canInteract = !timer.over
  const totalMs = timer.minutes * 60 * 1000
  const timeRatio = Math.max(0, Math.min(1, timer.remaining / totalMs))

  return (
    <div className="app" data-streak={streak}>
      {toast && <div className="toast">{toast}</div>}
      <header className="toolbar">
        <div className="row" style={{gap: 16}}>
          <div className="seg" role="radiogroup" aria-label="モード">
            {(['MIXED','POT_ODDS','FE','RANGE3'] as Mode[]).map(m => (
              <button key={m} className={m===mode? 'active':''} onClick={() => { setMode(m); setSelected(null); setQuestion(newQuestionFor(m)) }} aria-pressed={m===mode}>
                {jaMode(m)}
              </button>
            ))}
          </div>
          <div className="seg" role="group" aria-label="タイマー設定">
            {[30,45,60].map(min => (
              <button key={min} className={min===timer.minutes? 'active':''} onClick={() => { timer.setMinutes(min); timer.reset(min) }} aria-pressed={min===timer.minutes}>
                {min}分
              </button>
            ))}
          </div>
          <div className="row" style={{gap:8}}>
            <label className="muted" htmlFor="custom-min">カスタム</label>
            <input id="custom-min" type="number" min={5} max={180} step={1} value={timer.minutes}
              onChange={(e) => { const v = Math.max(5, Math.min(180, Number(e.target.value)||0)); timer.setMinutes(v); timer.reset(v) }}
              style={{width:72, background:'#0b1222', color:'var(--text)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:8, padding:'8px 10px'}}
            />
            <span className="muted">分</span>
          </div>
          <div className="row">
            <button className="btn" onClick={() => timer.setRunning(r=>!r)} disabled={timer.over}>
              {timer.running ? '一時停止 (S/Space)' : '開始 (S/Space)'}
            </button>
            <button className="btn" onClick={() => timer.reset()}>リセット (R)</button>
            <button className="btn" onClick={nextQuestion} disabled={!canInteract}>次へ (N)</button>
          </div>
        </div>

        <div className="row" style={{gap: 16}}>
          <div className="bigtime badge" aria-live="polite">⏱ {formatTime(timer.remaining)}</div>
          <div className="timebar" aria-hidden>
            <div className="fill" style={{width: `${timeRatio*100}%`}} />
          </div>
          <div className="stats">
            <div className="badge">回答数: {stats.answered}</div>
            <div className="badge">正解: {stats.correct}</div>
            <div className="badge">正答率: {(accuracy*100).toFixed(1)}%</div>
            <div className="badge">平均: {avgMs>0 ? (avgMs/1000).toFixed(1)+'秒' : '-'}</div>
            <div className="badge">ミス: {mistakes.length}</div>
            <div className="badge">🏆 スコア: {score}</div>
            <div className="badge">🔥 コンボ: x{streak}</div>
            <div className="badge">自己ベスト: x{bestStreak}</div>
            <button className="btn" onClick={() => setStats({ answered: 0, correct: 0, totalMs: 0 })}>統計をリセット</button>
            <button className="btn" onClick={() => setMistakes([])}>ミスをクリア</button>
          </div>
        </div>

        <div className="row" style={{gap:12}}>
          <label style={{display:'flex',alignItems:'center',gap:8}}>
            <input type="checkbox" checked={reviewOnly} onChange={(e)=> setReviewOnly(e.target.checked)} />
            間違いのみ復習
          </label>
          {reviewOnly && mistakes.length===0 && (
            <span className="muted">保存されたミスはありません。間違えるとここに追加されます。</span>
          )}
        </div>
      </header>

      <section className="card question qwrap">
        <div className="layout-12">
          <div className="col-main">
            <div className="muted" style={{marginBottom:8}}>
              {question.qtype === 'POT_ODDS' && 'ポットオッズ: コールに必要なエクイティ'}
              {question.qtype === 'FE' && 'フォールド・エクイティ: ブラフの損益分岐フォールド率'}
              {question.qtype === 'RANGE3' && 'レンジ3: 強さを分類（強い / 普通 / 弱い）'}
            </div>
            {question.qtype !== 'RANGE3' ? (
              <div>
                ポット p = <strong>{fmtChips(question.pot)}</strong>, ベット b = <strong>{fmtChips(question.bet)}</strong>
              </div>
            ) : (
              <div>
                <div className="muted" style={{marginTop:4}}>
                  ハンド: <strong className="break-safe text-balance">{jaHand(question.meta?.hand)}</strong>／ボード: <strong>{jaBoard(question.meta?.board)}</strong>
                </div>
              </div>
            )}
            {question.qtype !== 'RANGE3' && (
              <div className="grid">
                {question.options.map((opt, idx) => {
                  const state = selected === null ? '' : (idx === question.correctIndex ? 'correct' : (idx === selected ? 'wrong' : ''))
                  return (
                    <button key={idx} className={`opt ${state}`} onClick={() => choose(idx)} disabled={!canInteract || selected!==null}>
                      {idx+1}. {opt}
                    </button>
                  )
                })}
              </div>
            )}
            {selected !== null && (
              <div style={{marginTop:12}}>
                {selected === question.correctIndex ? '✅ 正解。' : '❌ 不正解。'} {question.explanation}
              </div>
            )}
          </div>
          {question.qtype === 'RANGE3' && (
            <aside className="board-col">
              <BoardMini scale={0.95} boardName={question.meta?.board} position={String(question.meta?.position)} />
              <div style={{height:12}} />
              <div className="grid range-grid">
                {question.options.map((opt, idx) => {
                  const state = selected === null ? '' : (idx === question.correctIndex ? 'correct' : (idx === selected ? 'wrong' : ''))
                  return (
                    <button key={idx} className={`opt ${state}`} onClick={() => choose(idx)} disabled={!canInteract || selected!==null}>
                      {idx+1}. {jaRange(opt)}
                    </button>
                  )
                })}
              </div>
            </aside>
          )}
        </div>
      </section>

      <footer className="muted" style={{marginTop:16}}>
        ショートカット: 1–4 選択, N 次へ, S/Space 開始/一時停止, R リセット。モードは「ミックス」推奨。
      </footer>

      {timer.over && (
        <div className="overlay" role="dialog" aria-modal="true">
          <div className="panel">
            <h3 style={{marginTop:0}}>時間切れ</h3>
            <p>セッション完了。正答率 {(accuracy*100).toFixed(1)}%、平均 {(avgMs/1000).toFixed(1)} 秒。</p>
            <div className="row">
              <button className="btn" onClick={() => timer.reset()}>タイマーをリセット</button>
              <button className="btn" onClick={() => { setSelected(null); setQuestion(newQuestionFor(mode)) }}>新しい問題を出す</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

