import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  AreaChart,
  Area,
  Line,
  ComposedChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  BarChart,
  Bar,
} from "recharts";
import {
  Anchor,
  FlaskConical,
  LayoutDashboard,
  Play,
  Pause,
  ShieldCheck,
  BookOpen,
  ArrowUpRight,
  ArrowRight,
  Activity,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import "./style.css";
import { visibleUntil } from "./format";
type Config = {
  strategy: string;
  scenario: string;
  capital: number;
  short: number;
  long: number;
  lower: number;
  upper: number;
  lookback: number;
  cost_bps: number;
  contribution: number;
  start: string | null;
  end: string | null;
};
type Metrics = {
  return: number;
  annualized: number;
  volatility: number;
  drawdown: number;
  sharpe: number | null;
  sortino: number | null;
};
type Trade = {
  date: string;
  asset: string;
  side: string;
  price: number;
  quantity: number;
  fee: number;
  before: number;
  after: number;
  reason: string;
  signal_date: string | null;
  indicators: Record<string, number>;
};
type Result = {
  rows: {
    date: string;
    price: number;
    equity: number;
    benchmark: number;
    drawdown: number;
    cash: number;
    contribution: number;
  }[];
  trades: Trade[];
  metrics: Metrics;
  benchmark_metrics: Metrics;
  invested: number;
  data_label: string;
  diagnostics: {
    costs: { bps: number; return: number }[];
    sensitivity: { short: number; long: number; return: number }[];
    observations: number;
    turnover: number;
    warmup: number;
  };
};
const strategies = [
  ["hold", "Buy & hold", "Stay the course"],
  ["ma", "Moving average", "Follow the trend"],
  ["rsi", "RSI reversal", "Find the turning point"],
  ["momentum", "Momentum", "Ride relative strength"],
  ["dca", "Dollar-cost averaging", "Build over time"],
];
const scenarios = [
  ["covid", "Pandemic shock", "2020", "A sudden shock. An uneven recovery."],
  [
    "crisis",
    "Financial crisis",
    "2007–09",
    "Test conviction through a deep drawdown.",
  ],
  ["rates", "Inflation & rates", "2022", "A repricing of risk and duration."],
];
const pct = (n: number) => `${(n * 100).toFixed(2)}%`;
const money = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
function App() {
  const [page, setPage] = useState("Overview");
  const [config, setConfig] = useState<Config>({
    strategy: "ma",
    scenario: "covid",
    capital: 10000,
    short: 10,
    long: 40,
    lower: 30,
    upper: 70,
    lookback: 20,
    cost_bps: 10,
    contribution: 250,
    start: null,
    end: null,
  });
  const [result, setResult] = useState<Result | null>(null),
    [used, setUsed] = useState(config),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [cursor, setCursor] = useState(0),
    [playing, setPlaying] = useState(false),
    [trade, setTrade] = useState<Trade | null>(null);
  async function run(c = config) {
    setLoading(true);
    setError("");
    setPlaying(false);
    try {
      const r = await fetch("/api/backtest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(c),
      });
      const data = await r.json();
      if (!r.ok)
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : JSON.stringify(data.detail),
        );
      setResult(data);
      setUsed({ ...c });
      setCursor(data.rows.length - 1);
      setTrade(null);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to reach the calculation service",
      );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void run();
  }, []);
  useEffect(() => {
    if (!playing || !result) return;
    const timer = setInterval(
      () =>
        setCursor((i) => {
          if (i >= result.rows.length - 1) {
            setPlaying(false);
            return i;
          }
          return i + 1;
        }),
      90,
    );
    return () => clearInterval(timer);
  }, [playing, result]);
  const replay = page === "Scenario Replay";
  const rows = result
    ? replay
      ? result.rows.slice(0, cursor + 1)
      : result.rows
    : [];
  const latest = rows.at(-1);
  const trades = result
    ? replay
      ? visibleUntil(result.trades, latest?.date || "")
      : result.trades
    : [];
  const update = (key: keyof Config, value: string | number | null) =>
    setConfig((c) => ({ ...c, [key]: value }));
  const number = (
    label: string,
    key: keyof Config,
    min: number,
    max: number,
  ) => (
    <label>
      {label}
      <input
        type="number"
        min={min}
        max={max}
        value={config[key] ?? ""}
        onChange={(e) => update(key, e.target.valueAsNumber)}
      />
    </label>
  );
  return (
    <div className="shell">
      <aside>
        <a className="brand" href="#" onClick={(e) => e.preventDefault()}>
          <span className="brand-icon">
            <Anchor size={23} />
          </span>
          SignalHarbor
        </a>
        <div className="workspace">
          RESEARCH WORKSPACE <span>01</span>
        </div>
        <nav>
          {[
            ["Overview", LayoutDashboard],
            ["Strategy Lab", FlaskConical],
            ["Scenario Replay", Play],
            ["Reality Check", ShieldCheck],
            ["Methodology", BookOpen],
          ].map(([name, Icon]) => {
            const I = Icon as typeof Anchor;
            return (
              <button
                key={String(name)}
                className={page === name ? "active" : ""}
                onClick={() => {
                  setPage(String(name));
                  setPlaying(false);
                }}
              >
                <I size={18} />
                {String(name)}
                {page === name && <ChevronRight size={14} />}
              </button>
            );
          })}
        </nav>
        <div className="aside-bottom">
          <div className="status">
            <i /> LOCAL RESEARCH ENGINE
          </div>
          <p>
            Curiosity, with conviction.
            <br />
            Conviction, with evidence.
          </p>
          <span className="version">SIGNALHARBOR / v1.0</span>
        </div>
      </aside>
      <main>
        <header>
          <div className="breadcrumb">
            Workspace <ChevronRight size={13} /> <span>{page}</span>
          </div>
          <div className="header-right">
            <span className="demo-dot" /> SYNTHETIC DATA{" "}
            <span className="avatar">SH</span>
          </div>
        </header>
        <div className="content">
          <div className="eyebrow">THE QUANTITATIVE STRATEGY LABORATORY</div>
          <div className="title-row">
            <div>
              <h1>
                {page === "Overview" ? (
                  <>
                    Every strategy has a story<span>.</span>
                  </>
                ) : (
                  page
                )}
              </h1>
              <p className="subtitle">
                {page === "Overview"
                  ? "Understand the strategy. Stress-test the risk. Find the signal."
                  : page === "Scenario Replay"
                    ? "Move through the market, one decision at a time."
                    : page === "Reality Check"
                      ? "Good results deserve difficult questions."
                      : "A clearer view of the decisions behind the numbers."}
              </p>
            </div>
            <span className="research-tag">
              <FlaskConical size={14} /> RESEARCH MODE
            </span>
          </div>
          <div className="data-banner">
            <Activity size={16} />
            <span>SIMULATED MARKET ENVIRONMENT</span>
            <p>Reproducible synthetic prices. Educational research only.</p>
            <button onClick={() => setPage("Methodology")}>
              Data & assumptions <ArrowUpRight size={14} />
            </button>
          </div>
          {error && (
            <div role="alert" className="error">
              {error}
              <button onClick={() => run()}>Retry</button>
            </div>
          )}
          {page === "Methodology" ? (
            <section className="method panel">
              <div className="eyebrow">OPEN BY DESIGN</div>
              <h2>Know what you're measuring.</h2>
              <p>
                SignalHarbor is a long-only, single-asset simulation laboratory.
                Every scenario uses deterministic synthetic prices generated
                with a fixed NumPy seed and stylized shocks. Event names
                describe inspiration, not authentic historical observations.
                Dates are weekdays, not an exchange calendar.
              </p>
              <h3>Information before execution</h3>
              <p>
                Signals use closes through the preceding session and execute at
                the current close. Moving averages compare trailing simple
                means; RSI uses a simple 14-session mean of gains and losses;
                momentum compares the prior close to its lookback close. Initial
                buy-and-hold and DCA allocations execute at the first close.
                Fractional shares are allowed, cash earns zero, and fees apply
                to traded notional. No leverage, shorting, tax, slippage or
                dividends are modeled.
              </p>
              <h3>Metrics & contributions</h3>
              <p>
                Daily time-weighted returns remove beginning-of-session
                contributions. Annualization assumes 252 sessions; Sharpe uses a
                zero risk-free rate and sample volatility. Sortino uses the root
                mean square of negative daily returns including zero for
                positive days. Undefined ratios display a dash. Drawdown is
                calculated on time-weighted wealth. Benchmark buy-and-hold
                receives the same contributions and pays the same fees. DCA
                invests the initial balance and adds funds every 21 sessions;
                its final dollars should not be compared to a strategy with
                fewer deposits.
              </p>
              <h3>Evidence has limits</h3>
              <p>
                Warm-up sessions remain in the evaluation as cash. Custom dates
                filter a scenario's available observations, without earlier
                indicator warm-up. Missing or irregular external observations
                are not supported. Win rate is omitted because this engine does
                not define closed trade lots. Reality Check reruns actual
                simulations at alternative costs and moving-average windows.
                These are educational sensitivity checks, not out-of-sample
                validation or forecasts.
              </p>
            </section>
          ) : (
            <>
              {page === "Overview" && (
                <section className="scenarios">
                  <div className="section-title">
                    <h2>
                      Explore a market regime <span>01 — SCENARIOS</span>
                    </h2>
                    <button onClick={() => setPage("Scenario Replay")}>
                      Open replay <ArrowRight size={15} />
                    </button>
                  </div>
                  <div className="scenario-grid">
                    {scenarios.map(([id, name, year, desc], j) => (
                      <button
                        className={
                          "scenario-card " +
                          (used.scenario === id ? "selected" : "")
                        }
                        key={id}
                        onClick={() => {
                          const c = {
                            ...config,
                            scenario: id,
                            start: null,
                            end: null,
                          };
                          setConfig(c);
                          void run(c);
                        }}
                      >
                        <div className="card-top">
                          <span className="scenario-year">{year}</span>
                          <span>
                            0{j + 1} <ArrowUpRight size={15} />
                          </span>
                        </div>
                        <svg
                          viewBox="0 0 280 45"
                          preserveAspectRatio="none"
                          aria-hidden="true"
                        >
                          <path
                            d={
                              j === 0
                                ? "M0 12 L35 15 L55 8 L70 13 L90 40 L108 32 L120 39 L140 22 L160 27 L180 14 L200 20 L225 9 L250 15 L280 3"
                                : j === 1
                                  ? "M0 5 L25 11 L50 8 L80 20 L100 16 L125 33 L155 42 L180 34 L210 37 L235 22 L260 28 L280 20"
                                  : "M0 10 L25 4 L50 17 L75 12 L100 28 L130 19 L150 33 L180 27 L210 38 L240 30 L280 36"
                            }
                          />
                        </svg>
                        <h3>{name}</h3>
                        <p>{desc}</p>
                        <span className="synthetic">
                          SYNTHETIC SCENARIO{" "}
                          {used.scenario === id && "• SELECTED"}
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              )}
              <div className="lab-grid">
                <section className="panel config">
                  <div className="panel-heading">
                    <h2>Strategy controls</h2>
                    <FlaskConical size={17} />
                  </div>
                  <label>
                    STRATEGY
                    <select
                      aria-label="Strategy"
                      value={config.strategy}
                      onChange={(e) => update("strategy", e.target.value)}
                    >
                      {strategies.map(([id, name]) => (
                        <option value={id} key={id}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    SCENARIO
                    <select
                      aria-label="Scenario"
                      value={config.scenario}
                      onChange={(e) => update("scenario", e.target.value)}
                    >
                      {scenarios.map(([id, name]) => (
                        <option value={id} key={id}>
                          {name} · synthetic
                        </option>
                      ))}
                    </select>
                  </label>
                  {number("INITIAL CAPITAL ($)", "capital", 100, 10000000)}
                  <div className="input-grid">
                    {config.strategy === "ma" && (
                      <>
                        {number("SHORT WINDOW", "short", 2, 100)}
                        {number("LONG WINDOW", "long", 3, 200)}
                      </>
                    )}
                    {config.strategy === "rsi" && (
                      <>
                        {number("BUY BELOW RSI", "lower", 1, 49)}
                        {number("SELL ABOVE RSI", "upper", 51, 99)}
                      </>
                    )}
                    {config.strategy === "momentum" &&
                      number("LOOKBACK", "lookback", 2, 100)}
                    {config.strategy === "dca" &&
                      number("EVERY 21 DAYS ($)", "contribution", 0, 100000)}
                    {number("COST (BPS)", "cost_bps", 0, 200)}
                  </div>
                  <details>
                    <summary>Custom period</summary>
                    <label>
                      START
                      <input
                        type="date"
                        value={config.start || ""}
                        onChange={(e) =>
                          update("start", e.target.value || null)
                        }
                      />
                    </label>
                    <label>
                      END
                      <input
                        type="date"
                        value={config.end || ""}
                        onChange={(e) => update("end", e.target.value || null)}
                      />
                    </label>
                  </details>
                  <button
                    className="primary"
                    disabled={loading}
                    onClick={() => run()}
                  >
                    {loading ? "Calculating…" : "Run backtest"}{" "}
                    <ArrowRight size={16} />
                  </button>
                  <p className="helper">
                    Signals at prior close. Execution at next close.{" "}
                    {JSON.stringify(config) !== JSON.stringify(used) &&
                      "Parameters changed — run to apply."}
                  </p>
                </section>
                <div className="results">
                  {result && (
                    <>
                      {replay && (
                        <p className="muted">
                          Summary metrics below describe the complete run.
                          Charts and ledger follow the replay cursor.
                        </p>
                      )}
                      <div
                        className="metrics"
                        aria-label="Full-run performance metrics"
                      >
                        {[
                          [
                            "TOTAL RETURN",
                            pct(result.metrics.return),
                            "Full-run flow-adjusted strategy return",
                          ],
                          [
                            "VS. BENCHMARK",
                            pct(
                              result.metrics.return -
                                result.benchmark_metrics.return,
                            ),
                            "Difference in time-weighted returns",
                          ],
                          [
                            "MAX. DRAWDOWN",
                            pct(result.metrics.drawdown),
                            "Largest decline in time-weighted wealth",
                          ],
                          [
                            "SHARPE RATIO",
                            result.metrics.sharpe?.toFixed(2) ?? "—",
                            "Annualized daily mean / volatility; zero risk-free rate",
                          ],
                        ].map(([label, value, tip]) => (
                          <div className="metric" key={label} title={tip}>
                            <span>
                              {label} <span className="info">ⓘ</span>
                            </span>
                            <strong
                              className={
                                label === "MAX. DRAWDOWN"
                                  ? "negative"
                                  : label === "TOTAL RETURN"
                                    ? "teal"
                                    : ""
                              }
                            >
                              {value}
                            </strong>
                            <small>
                              {label === "TOTAL RETURN"
                                ? `${trades.length} executed trades`
                                : label === "VS. BENCHMARK"
                                  ? "Matched cash-flow benchmark"
                                  : label === "MAX. DRAWDOWN"
                                    ? "Peak-to-trough decline"
                                    : "Risk-adjusted performance"}
                            </small>
                          </div>
                        ))}
                      </div>
                      <section className="panel chart-panel">
                        <div className="panel-heading">
                          <div>
                            <h2>
                              Capital in motion{" "}
                              <span className="live">BACKTEST</span>
                            </h2>
                            <p>
                              {
                                strategies.find(
                                  (s) => s[0] === used.strategy,
                                )?.[1]
                              }{" "}
                              <span> / </span>{" "}
                              {
                                scenarios.find(
                                  (s) => s[0] === used.scenario,
                                )?.[1]
                              }
                            </p>
                          </div>
                          <div className="legend">
                            <span>
                              <i />
                              Strategy
                            </span>
                            <span>
                              <i />
                              Buy & hold
                            </span>
                          </div>
                        </div>
                        <div className="chart-summary">
                          <strong>{money(latest?.equity || 0)}</strong>
                          <span>
                            {latest?.date} · total deposited{" "}
                            {money(
                              replay
                                ? used.capital +
                                    rows.reduce((s, r) => s + r.contribution, 0)
                                : result.invested,
                            )}
                          </span>
                        </div>
                        <div className="chart">
                          <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart
                              data={rows}
                              margin={{
                                left: 5,
                                right: 20,
                                top: 15,
                                bottom: 0,
                              }}
                            >
                              <defs>
                                <linearGradient
                                  id="equity"
                                  x1="0"
                                  y1="0"
                                  x2="0"
                                  y2="1"
                                >
                                  <stop
                                    offset="0%"
                                    stopColor="#49d6be"
                                    stopOpacity={0.18}
                                  />
                                  <stop
                                    offset="100%"
                                    stopColor="#49d6be"
                                    stopOpacity={0}
                                  />
                                </linearGradient>
                              </defs>
                              <CartesianGrid
                                vertical={false}
                                stroke="#202b37"
                                strokeDasharray="3 5"
                              />
                              <XAxis
                                dataKey="date"
                                minTickGap={65}
                                tickFormatter={(v) => v.slice(5)}
                                tick={{ fill: "#788697", fontSize: 11 }}
                                axisLine={false}
                                tickLine={false}
                              />
                              <YAxis
                                domain={["auto", "auto"]}
                                tickFormatter={(v) =>
                                  `${(v / 1000).toFixed(0)}k`
                                }
                                tick={{ fill: "#788697", fontSize: 11 }}
                                axisLine={false}
                                tickLine={false}
                                width={42}
                              />
                              <Tooltip
                                contentStyle={{
                                  background: "#151e29",
                                  border: "1px solid #344353",
                                  borderRadius: 8,
                                }}
                                formatter={(v) => money(Number(v))}
                              />
                              <Area
                                type="linear"
                                dataKey="equity"
                                name="Strategy"
                                stroke="#49d6be"
                                fill="url(#equity)"
                                strokeWidth={2}
                                isAnimationActive={false}
                              />
                              <Line
                                dataKey="benchmark"
                                name="Buy & hold"
                                stroke="#7b8ba8"
                                dot={false}
                                strokeDasharray="5 5"
                                strokeWidth={1.5}
                                isAnimationActive={false}
                              />
                            </ComposedChart>
                          </ResponsiveContainer>
                        </div>
                        {replay ? (
                          <div className="replay">
                            <button
                              aria-label={
                                playing ? "Pause replay" : "Play replay"
                              }
                              onClick={() => {
                                if (cursor === result.rows.length - 1)
                                  setCursor(0);
                                setPlaying(!playing);
                              }}
                            >
                              {playing ? (
                                <Pause size={18} />
                              ) : (
                                <Play size={18} />
                              )}
                            </button>
                            <button
                              aria-label="Reset replay"
                              onClick={() => {
                                setCursor(0);
                                setPlaying(false);
                              }}
                            >
                              <RotateCcw size={16} />
                            </button>
                            <input
                              aria-label="Replay timeline"
                              type="range"
                              min="0"
                              max={result.rows.length - 1}
                              value={cursor}
                              onChange={(e) => {
                                setCursor(+e.target.value);
                                setPlaying(false);
                              }}
                            />
                            <span>
                              {cursor + 1} / {result.rows.length}
                            </span>
                          </div>
                        ) : (
                          <div className="chart-footer">
                            <span>
                              <i className="demo-dot" /> {result.rows.length}{" "}
                              daily observations
                            </span>
                            <button
                              onClick={() => {
                                setPage("Scenario Replay");
                                setCursor(0);
                              }}
                            >
                              Replay this strategy <Play size={12} />
                            </button>
                          </div>
                        )}
                      </section>
                      {replay && (
                        <section className="panel">
                          <div className="panel-heading">
                            <h2>Drawdown through time</h2>
                            <span className="negative">
                              {pct(latest?.drawdown || 0)}
                            </span>
                          </div>
                          <div style={{ height: 130 }}>
                            <ResponsiveContainer>
                              <AreaChart data={rows}>
                                <XAxis dataKey="date" hide />
                                <YAxis
                                  tickFormatter={(v) => pct(v)}
                                  width={65}
                                  tick={{ fill: "#8996a8", fontSize: 10 }}
                                />
                                <Tooltip
                                  contentStyle={{ background: "#151e29" }}
                                  formatter={(v) => pct(Number(v))}
                                />
                                <Area
                                  dataKey="drawdown"
                                  stroke="#f49788"
                                  fill="#f4978822"
                                  isAnimationActive={false}
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        </section>
                      )}
                    </>
                  )}
                  {!result && (
                    <div className="panel empty">
                      {loading
                        ? "Preparing your research environment…"
                        : "Run a strategy to begin."}
                    </div>
                  )}
                </div>
              </div>
              {result &&
                (page === "Reality Check" ? (
                  <>
                    <div className="section-title">
                      <h2>
                        Reality Check <span>QUESTION THE RESULT</span>
                      </h2>
                      <span>Calculated by rerunning the engine</span>
                    </div>
                    <div className="diagnostic-grid">
                      <section className="panel">
                        <div className="panel-heading">
                          <h2>The cost of trading</h2>
                        </div>
                        <p className="muted">
                          Same strategy, different fees. Returns after
                          transaction costs.
                        </p>
                        <div style={{ height: 220 }}>
                          <ResponsiveContainer>
                            <BarChart data={result.diagnostics.costs}>
                              <XAxis
                                dataKey="bps"
                                tickFormatter={(v) => `${v} bps`}
                                tick={{ fill: "#8996a8", fontSize: 11 }}
                              />
                              <YAxis
                                tickFormatter={(v) => pct(v)}
                                tick={{ fill: "#8996a8", fontSize: 11 }}
                              />
                              <Tooltip
                                contentStyle={{ background: "#151e29" }}
                                formatter={(v) => pct(Number(v))}
                              />
                              <ReferenceLine y={0} stroke="#546070" />
                              <Bar
                                dataKey="return"
                                fill="#49d6be"
                                radius={[4, 4, 0, 0]}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </section>
                      <section className="panel">
                        <div className="panel-heading">
                          <h2>Parameter sensitivity</h2>
                        </div>
                        <p className="muted">
                          Moving-average return by short / long window.
                          In-sample only.
                        </p>
                        <div className="heatmap">
                          {result.diagnostics.sensitivity.map((s) => (
                            <div
                              key={`${s.short}-${s.long}`}
                              style={{
                                background:
                                  s.return > 0 ? "#1b443f" : "#452e32",
                              }}
                            >
                              <small>
                                {s.short} / {s.long} days
                              </small>
                              <strong>{pct(s.return)}</strong>
                            </div>
                          ))}
                        </div>
                      </section>
                      <section className="panel">
                        <div className="panel-heading">
                          <h2>Evidence quality</h2>
                          <ShieldCheck size={18} />
                        </div>
                        <div className="finding">
                          <span className="negative">LIMITED SAMPLE</span>
                          <p>
                            {result.diagnostics.observations} observations;{" "}
                            {result.diagnostics.warmup} warm-up sessions. Less
                            than three years cannot establish robustness.
                          </p>
                        </div>
                        <div className="finding">
                          <span>
                            {result.diagnostics.turnover.toFixed(1)} TRADES /
                            YEAR
                          </span>
                          <p>
                            Annualized execution frequency. Check sensitivity to
                            cost as turnover increases.
                          </p>
                        </div>
                        <div className="finding">
                          <span>EDUCATIONAL CAUTION</span>
                          <p>
                            Single-asset concentration, synthetic data and
                            in-sample parameter selection limit conclusions. No
                            future performance prediction.
                          </p>
                        </div>
                      </section>
                    </div>
                  </>
                ) : (
                  <div className="lower-grid">
                    <section className="panel trades">
                      <div className="panel-heading">
                        <h2>
                          Decision ledger <span>{trades.length} TRADES</span>
                        </h2>
                        <span className="muted">Select a trade to inspect</span>
                      </div>
                      <div className="table-scroll">
                        <table>
                          <thead>
                            <tr>
                              <th>EXECUTED</th>
                              <th>ACTION</th>
                              <th>PRICE</th>
                              <th>QUANTITY</th>
                              <th>FEE</th>
                              <th></th>
                            </tr>
                          </thead>
                          <tbody>
                            {trades
                              .slice()
                              .reverse()
                              .map((t, i) => (
                                <tr key={t.date + i}>
                                  <td>{t.date}</td>
                                  <td>
                                    <span
                                      className={
                                        "badge " + t.side.toLowerCase()
                                      }
                                    >
                                      {t.side}
                                    </span>
                                  </td>
                                  <td>{money(t.price)}</td>
                                  <td>{t.quantity.toFixed(3)}</td>
                                  <td>${t.fee.toFixed(2)}</td>
                                  <td>
                                    <button
                                      aria-label={`Inspect ${t.side} on ${t.date}`}
                                      onClick={() => setTrade(t)}
                                    >
                                      <ArrowUpRight size={15} />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                        {trades.length === 0 && (
                          <p className="empty">
                            No executions at this point. Advance the replay or
                            adjust parameters.
                          </p>
                        )}
                      </div>
                    </section>
                    <section className="panel insight">
                      <ShieldCheck size={24} />
                      <div className="eyebrow">BEYOND THE EQUITY CURVE</div>
                      <h2>
                        Does your edge
                        <br />
                        survive reality?
                      </h2>
                      <p>
                        Transaction costs. Fragile parameters. A limited sample.
                        Put your results under the microscope.
                      </p>
                      <button onClick={() => setPage("Reality Check")}>
                        Run a reality check <ArrowRight size={16} />
                      </button>
                    </section>
                  </div>
                ))}
              {result && (
                <div className="supplemental">
                  <span>
                    Annualized return <b>{pct(result.metrics.annualized)}</b>
                  </span>
                  <span>
                    Volatility <b>{pct(result.metrics.volatility)}</b>
                  </span>
                  <span>
                    Sortino <b>{result.metrics.sortino?.toFixed(2) ?? "—"}</b>
                  </span>
                  <span>
                    Benchmark return{" "}
                    <b>{pct(result.benchmark_metrics.return)}</b>
                  </span>
                </div>
              )}
            </>
          )}
          <footer>
            <span>
              <Anchor size={13} /> SIGNALHARBOR
            </span>
            <span>Built for inquiry. Not investment advice.</span>
            <span>SYNTHETIC DATA / NO LIVE TRADING</span>
          </footer>
        </div>
      </main>
      {trade && (
        <div className="modal-backdrop" onClick={() => setTrade(null)}>
          <section
            className="modal panel"
            role="dialog"
            aria-modal="true"
            aria-label="Trade inspector"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="panel-heading">
              <h2>Inside the decision</h2>
              <button autoFocus onClick={() => setTrade(null)}>
                Close ×
              </button>
            </div>
            <span className={"badge " + trade.side.toLowerCase()}>
              {trade.side} · {trade.asset}
            </span>
            <h2>{trade.date}</h2>
            <p>{trade.reason}</p>
            <dl>
              {Object.entries({
                Price: `$${trade.price.toFixed(2)}`,
                Quantity: trade.quantity.toFixed(5),
                Fee: `$${trade.fee.toFixed(2)}`,
                "Signal date": trade.signal_date || "Initial allocation",
                Exposure: `${pct(trade.before)} → ${pct(trade.after)}`,
                ...trade.indicators,
              }).map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{String(v)}</dd>
                </div>
              ))}
            </dl>
            <p className="muted">
              Indicators use only observations available before the execution
              session.
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
