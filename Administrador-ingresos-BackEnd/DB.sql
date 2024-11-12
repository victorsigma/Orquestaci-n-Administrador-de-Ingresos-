-- Nota: No crees las base de datos por script, creala desde el entorno grafico pgadmin4
-- esta solo es una representacion de como se debe de llamar la db 
CREATE DATABASE dbgestiondinero;

-- Después de crear la base de datos, necesitas conectarte a ella para crear tablas en ella inserta el script.

CREATE TABLE ingreso (
    id SERIAL PRIMARY KEY,
    fecha DATE NOT NULL UNIQUE,
    data JSON NOT NULL
);

CREATE TABLE sub_ingreso (
    id SERIAL PRIMARY KEY,
    ingreso_id INTEGER REFERENCES ingreso(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    total NUMERIC(15,2) NOT NULL
);

CREATE TABLE gasto (
    id SERIAL PRIMARY KEY,
    fecha DATE NOT NULL UNIQUE,
    data JSON NOT NULL
);

CREATE TABLE sub_gasto (
    id SERIAL PRIMARY KEY,
    gasto_id INTEGER REFERENCES gasto(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    total NUMERIC(15,2) NOT NULL
);