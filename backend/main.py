from fastapi import FastAPI, HTTPException
from .engine import Config, SCENARIOS, simulate
app=FastAPI(title='SignalHarbor',version='1.0.0')
@app.get('/api/health')
def health(): return {'status':'ok'}
@app.get('/api/scenarios')
def scenarios(): return [{'id':k,'name':v[0]} for k,v in SCENARIOS.items()]
@app.post('/api/backtest')
def backtest(config:Config):
    try: return simulate(config)
    except ValueError as e: raise HTTPException(422,str(e)) from e

# The built client and API share one origin for the single-command launcher.
from pathlib import Path
from fastapi.staticfiles import StaticFiles
client = Path(__file__).resolve().parent.parent / 'dist'
if client.is_dir():
    app.mount('/', StaticFiles(directory=client, html=True), name='client')
