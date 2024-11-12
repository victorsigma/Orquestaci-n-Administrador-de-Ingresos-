const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

// Configuración de la conexión a la base de datos
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
});

module.exports = {
  pool
};

app.get('/', (req, res) => {
  res.send('¡Server, up!');
});

// Importa el router desde controller.js de Ingresos
const ingresosController = require('./Componentes/Ingresos/controllers.js');
app.use('/ingresos', ingresosController);

// Importa el router desde controller.js de Ingresos
const gastosController = require('./Componentes/Gastos/controllers.js');
app.use('/gastos', gastosController);


// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor en ejecución en http://localhost:${port}`);
});
