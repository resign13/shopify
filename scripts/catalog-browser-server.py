"""Serve the built storefront against a seeded, separate local *_test database."""
import os
import sys
from pathlib import Path
if os.environ.get('PGHOST')!='127.0.0.1' or not os.environ.get('PGDATABASE','').endswith('_test'):
    raise RuntimeError('Explicit isolated local *_test database required')
root=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(root/'storefront-backend'))
from app import app
from flask import send_from_directory
dist=root/'frontend/dist'
@app.get('/')
@app.get('/<path:path>')
def page(path=''):
    if path.startswith('api/'):return {'message':'Not found'},404
    if (dist/path).is_file():return send_from_directory(dist,path)
    return send_from_directory(dist,'index.html')
if __name__=='__main__':app.run(host='127.0.0.1',port=5371,threaded=True,use_reloader=False)
