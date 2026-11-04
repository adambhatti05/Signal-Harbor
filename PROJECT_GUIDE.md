# Understanding SignalHarbor

The application asks three questions: what did the strategy do, why did it do it, and how fragile is the result?

## Request flow

Changing form fields changes a draft configuration. Run backtest sends that configuration to `/api/backtest`. Pydantic enforces bounds and parameter relationships. The engine generates a fixed scenario, filters dates, iterates through prices and returns observations, trade records, metrics and diagnostics. The browser charts those values. Changing an input does not silently change the existing result.

## Accounting and signals

At each session, the engine adds any scheduled deposit. It reads only earlier closes to calculate indicators, then buys or sells at the current close, charges a fee, and marks the remaining shares and cash. A separate buy-and-hold account receives identical deposits. Buying divides available cash by price times one plus the fee rate, avoiding negative cash. Cash plus shares times current price is account equity.

SMA holds when its short trailing average exceeds its long average. Momentum holds when trailing return is positive. RSI buys oversold readings and holds until an overbought reading. DCA invests cash at recurring intervals. These are deliberately simple rules for study, not recommendations.

## Replay

The full result is calculated once. A cursor controls which observations and executions are visible. A timer advances the cursor; pause cancels it. Scrubbing reveals only trades dated no later than the selected observation. Top-level metrics remain full-run metrics. This is a reproducible visualization of a completed simulation, not a live market feed.

## Reality Check

The engine reruns the strategy at five fee levels and SMA at nine window pairs. These calculations expose trading friction and dependence on chosen parameters. Sample length and executions per year provide additional context. Synthetic data and single-asset concentration are educational cautions rather than statistical findings.

## Tradeoffs

A simple daily-close engine is easy to audit and test, but lacks intraday fills, exchange calendars and execution realism. NumPy is sufficient for small arrays; no database or authentication is needed. The frontend renders server calculations rather than implementing a second financial engine. Fixed seeds allow reproducible debugging. Time-weighted returns isolate performance from deposit size, while dollar values still reflect real capital requirements.

## Interview questions to prepare

- How does prior-close signal evaluation prevent look-ahead bias? Explain the prefix-invariance test that changes future prices and checks earlier results.
- Why can't DCA terminal dollars be compared directly to lump-sum terminal dollars? Explain deposits and the matched benchmark.
- Why can a high Sharpe be misleading? Discuss sample size, synthetic assumptions, parameter search and omitted trading friction.
- What happens at zero volatility? Ratios become undefined and are returned as null.
- How would historical data change the architecture? Add source adapters, licensing records, calendar validation and reproducible dataset versions before the engine.
- How would you scale this? Move large experiments to bounded workers, persist versioned runs, limit requests and separate data ingestion from calculation.

## Honest scope

This is educational software with synthetic market paths. No personal brokerage or client systems are connected. It is not a trading platform, forecast service or historically verified strategy. Do not claim personal authorship of work you did not write; describe the actual design decisions and your understanding of them. Full methodology and run commands are in README.md.
