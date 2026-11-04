import numpy as np
import pytest
from fastapi.testclient import TestClient
from backend.engine import Config, metrics, simulate
from backend.main import app

def test_known_metrics():
    m=metrics([100,120,90,99])
    assert m['return']==pytest.approx(-.01)
    assert m['drawdown']==pytest.approx(-.25)
    assert m['volatility']==pytest.approx(np.std([.2,-.25,.1],ddof=1)*np.sqrt(252))

def test_flat_metrics():
    m=metrics([100,100,100])
    assert m['sharpe'] is None and m['sortino'] is None
    assert m['return']==0

def test_invalid_metrics():
    for x in [[100],[100,float('nan')],[100,0]]:
        with pytest.raises(ValueError): metrics(x)

def test_contributions_removed():
    assert metrics([100,150,150],[0,50,0])['return']==0

@pytest.mark.parametrize('strategy',['hold','ma','rsi','momentum','dca'])
def test_accounting(strategy):
    r=simulate(Config(strategy=strategy),False)
    assert len(r['rows'])==252
    assert all(x['equity']>0 for x in r['rows'])
    assert all(x['fee']>=0 and 0<=x['after']<=1 for x in r['trades'])
    if strategy=='hold':
        assert r['metrics']['return']==pytest.approx(r['benchmark_metrics']['return'])
    if strategy=='dca':
        assert r['invested']==10000+250*11

def test_initial_fee():
    r=simulate(Config(strategy='hold',cost_bps=100),False)
    assert r['rows'][0]['equity']==pytest.approx(10000/1.01)
    assert r['trades'][0]['fee']==pytest.approx(10000-10000/1.01)

def test_causality(monkeypatch):
    from backend import engine
    dates,prices=engine.dataset('covid')
    original=simulate(Config(),False)
    prices[150:]*=3
    monkeypatch.setattr(engine,'dataset',lambda s:(dates,prices))
    altered=simulate(Config(),False)
    assert original['rows'][:150]==altered['rows'][:150]
    assert all(t['signal_date']<t['date'] for t in original['trades'])

def test_ma_rule(monkeypatch):
    from backend import engine
    monkeypatch.setattr(engine,'dataset',lambda s:([f'2020-01-{i:02}' for i in range(1,8)],np.array([1.,2.,3.,4.,3.,2.,1.])))
    r=simulate(Config(short=2,long=3,cost_bps=0),False)
    assert r['trades'][0]['date']=='2020-01-04'
    assert r['trades'][0]['indicators']=={'short_ma':2.5,'long_ma':2.0}
    assert r['trades'][1]['side']=='SELL'

def test_validation():
    client=TestClient(app)
    assert client.get('/api/health').json()=={'status':'ok'}
    for body in [{'short':50,'long':10},{'capital':0},{'strategy':'fake'},{'start':'1990-01-01','end':'1990-02-01'}]:
        assert client.post('/api/backtest',json=body).status_code==422
    r=client.post('/api/backtest',json={})
    assert r.status_code==200
    d=r.json()['diagnostics']
    assert len(d['costs'])==5 and len(d['sensitivity'])==9
    assert d['costs'][0]['return']>=d['costs'][-1]['return']
