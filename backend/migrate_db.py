import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), 'lexcer_dashboard.db')

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Verificar si la columna existe
cursor.execute("PRAGMA table_info(aci_generations)")
columns = [col[1] for col in cursor.fetchall()]

if 'excel_data' not in columns:
    cursor.execute("ALTER TABLE aci_generations ADD COLUMN excel_data BLOB")
    conn.commit()
    print("Columna excel_data agregada exitosamente")
else:
    print("La columna excel_data ya existe")

conn.close()