"""Deterministic, long-only daily-close simulator. Signals execute one close later."""
from datetime import date, timedelta
import math
import numpy as np
from pydantic import BaseModel, Field, model_validator
from typing import Literal

SCENARIOS = {
    'crisis': ('Financial crisis', '2007-07-02', 504, 11, -.0008, .024),
    'covid': ('Pandemic shock', '2020-01-02', 252, 23, .0005, .026),
    'rates': ('Inflation & rates', '2022-01-03', 252, 42, -.0005, .017),
}
class Config(BaseModel):
    strategy: Literal['hold','ma','rsi','momentum','dca'] = 'ma'
    scenario: Literal['crisis','covid','rates'] = 'covid'
    capital: float = Field(default=10000, ge=100, le=10000000)
    short: int = Field(default=10, ge=2, le=100)
    long: int = Field(default=40, ge=3, le=200)
    lower: float = Field(default=30, ge=1, le=49)
    upper: float = Field(default=70, ge=51, le=99)
    lookback: int = Field(default=20, ge=2, le=100)
    cost_bps: float = Field(default=10, ge=0, le=200)
    contribution: float = Field(default=250, ge=0, le=100000)
    start: date | None = None
    end: date | None = None
    @model_validator(mode='after')
    def valid(self):
        if self.short >= self.long:
            raise ValueError('Short window must be smaller than long window')
        if self.start and self.end and self.start >= self.end:
            raise ValueError('Start must precede end')
        return self

def dataset(scenario):
    _, start, n, seed, drift, vol = SCENARIOS[scenario]
    rng = np.random.default_rng(seed)
    returns = rng.normal(drift, vol, n)
    # Stylized shocks, deliberately synthetic rather than reconstructed prices.
    returns[n//4:n//4+15] -= .025
    returns[n//4+20:n//4+45] += .012
    prices = 100 * np.exp(np.cumsum(returns))
    dates=[]; day=date.fromisoformat(start)
    while len(dates)<n:
        if day.weekday()<5: dates.append(day.isoformat())
        day += timedelta(days=1)
    return dates, prices

def metrics(equity, flows=None):
    a=np.asarray(equity, dtype=float)
    if len(a)<2 or not np.all(np.isfinite(a)) or np.any(a<=0):
        raise ValueError('At least two positive finite equity observations required')
    f=np.zeros(len(a)) if flows is None else np.asarray(flows)
    r=(a[1:]-f[1:])/a[:-1]-1
    total=float(np.prod(1+r)-1)
    vol=float(np.std(r,ddof=1)*np.sqrt(252)) if len(r)>1 else 0.
    downside=float(np.sqrt(np.mean(np.minimum(r,0)**2))*np.sqrt(252))
    mean=float(np.mean(r)*252)
    return {'return':total,'annualized':float((1+total)**(252/len(r))-1),
            'volatility':vol,'drawdown':float(np.min(a/np.maximum.accumulate(a)-1)),
            'sharpe':mean/vol if vol>1e-12 else None,
            'sortino':mean/downside if downside>1e-12 else None}

def simulate(c: Config, diagnostics=True):
    dates,prices=dataset(c.scenario)
    selected=[i for i,d in enumerate(dates) if (not c.start or d>=c.start.isoformat()) and (not c.end or d<=c.end.isoformat())]
    if len(selected)<3: raise ValueError('Selected period requires at least three observations within scenario coverage')
    # Indicators start at selected period; no hidden pre-period warm-up.
    dates=[dates[i] for i in selected]; prices=prices[selected]
    n=len(prices); cash=c.capital; qty=0.; bench_cash=c.capital; bench_qty=0.; target=False
    trades=[]; rows=[]; equity=[c.capital]; flows=[0.]; benchmark=[c.capital]
    fee=c.cost_bps/10000; invested=c.capital
    for i,p in enumerate(prices):
        contribution=c.contribution if c.strategy=='dca' and i>0 and i%21==0 else 0.
        cash+=contribution; bench_cash+=contribution; invested+=contribution
        prev=prices[:i]; indicators={}; reason='Initial allocation'; desired=target
        if c.strategy in ('hold','dca'): desired=True
        elif c.strategy=='ma' and i>=c.long:
            s=float(np.mean(prev[-c.short:])); l=float(np.mean(prev[-c.long:])); desired=s>l
            indicators={'short_ma':s,'long_ma':l}; reason=f'Prior-close {c.short}-day average {s:.2f} '+('exceeded' if desired else 'fell below')+f' {c.long}-day average {l:.2f}.'
        elif c.strategy=='momentum' and i>c.lookback:
            mom=float(prev[-1]/prev[-1-c.lookback]-1); desired=mom>0
            indicators={'momentum':mom}; reason=f'Prior-close {c.lookback}-session momentum was {mom:.2%}.'
        elif c.strategy=='rsi' and i>14:
            delta=np.diff(prev[-15:]); gain=float(np.maximum(delta,0).mean()); loss=float(np.maximum(-delta,0).mean())
            rsi=100-100/(1+gain/loss) if loss else (100. if gain else 50.)
            desired=True if rsi<c.lower else False if rsi>c.upper else target
            indicators={'rsi':rsi}; reason=f'Prior-close 14-session simple RSI was {rsi:.1f}; thresholds {c.lower:g}/{c.upper:g}.'
        before=qty*p/(cash+qty*p)
        side=None; amount=0.; cost=0.
        if desired and cash>1e-7 and (qty==0 or c.strategy=='dca'):
            amount=cash/(p*(1+fee)); cost=amount*p*fee; qty+=amount; cash=0.; side='BUY'
        elif not desired and qty>0:
            amount=qty; cost=qty*p*fee; cash+=qty*p-cost; qty=0.; side='SELL'
        target=desired
        value=cash+qty*p
        if side: trades.append({'date':dates[i],'asset':'SYNTH','side':side,'price':float(p),'quantity':amount,'fee':cost,'before':float(before),'after':float(qty*p/value),'indicators':indicators,'reason':reason,'signal_date':dates[i-1] if i else None})
        if bench_cash>0:
            bench_qty+=bench_cash/(p*(1+fee)); bench_cash=0.
        equity.append(float(value)); benchmark.append(float(bench_qty*p)); flows.append(contribution)
        rows.append({'date':dates[i],'price':float(p),'equity':float(value),'benchmark':float(bench_qty*p),'drawdown':float(value/max(equity)-1),'cash':cash,'contribution':contribution})
    m=metrics(equity,flows); bm=metrics(benchmark,flows)
    # Flow-adjusted drawdown uses cumulative time-weighted wealth, not deposits.
    wealth=np.cumprod(np.r_[1,(np.asarray(equity[1:])-np.asarray(flows[1:]))/np.asarray(equity[:-1])])
    dd=wealth/np.maximum.accumulate(wealth)-1
    m['drawdown']=float(min(dd))
    for i,row in enumerate(rows): row['drawdown']=float(dd[i+1])
    result={'rows':rows,'trades':trades,'metrics':m,'benchmark_metrics':bm,'invested':invested,'data_label':'Synthetic demonstration data · not historical market prices','diagnostics':None}
    if diagnostics:
        costs=[]
        for bps in [0,10,25,50,100]:
            alt=simulate(c.model_copy(update={'cost_bps':bps}),False)
            costs.append({'bps':bps,'return':alt['metrics']['return']})
        sensitivity=[]
        for s in [5,10,20]:
            for l in [30,50,90]:
                alt=simulate(c.model_copy(update={'strategy':'ma','short':s,'long':l}),False)
                sensitivity.append({'short':s,'long':l,'return':alt['metrics']['return']})
        result['diagnostics']={'costs':costs,'sensitivity':sensitivity,'observations':n,'turnover':len(trades)/(n/252),'warmup':c.long if c.strategy=='ma' else c.lookback+1 if c.strategy=='momentum' else 15 if c.strategy=='rsi' else 0}
    return result
