import sys, os
sys.path.insert(0, os.path.dirname(__file__))
os.chdir(os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv('.env')

from app.database import engine
from sqlalchemy import inspect, text

with engine.connect() as conn:
    cols = [c['name'] for c in inspect(engine).get_columns('users')]
    print('CURRENT users columns:', cols)

    if 'waste_point_id' not in cols:
        print('ADDING waste_point_id column...')
        conn.execute(text('ALTER TABLE users ADD COLUMN IF NOT EXISTS waste_point_id INTEGER REFERENCES waste_points(id)'))
        conn.commit()
        print('DONE — column added')
    else:
        print('OK — waste_point_id already exists')
