const express = require('express');
const multer = require('multer');
const upload = multer({ dest: 'uploads_temporal/' }); // Configura el directorio de almacenamiento de los archivos
const fs = require('fs');
const router = express.Router();
const ingresosService = require('./services.js'); // Asegúrate de importar tu servicio de manejo de archivos Excel


const HTTP_OK = 200;
const HTTP_NOT_FOUND = 404;
const HTTP_INTERNAL_SERVER_ERROR = 500;

router.post('/cargar-excel', upload.single('archivoExcel'), async (req, res) => {
    var filePath = req.file.path; 
    try {
      const data = await ingresosService.procesarArchivoExcel(filePath);
      const response = {
        message: 'Archivo Excel procesado con éxito',
        data: data
      };
      res.json(response);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: `Error al procesar el archivo Excel. ${error.message}` });
    }
});

router.post('/cargar-registro', async (req, res) => {
  try {
      const { reporteDiario, reporteMensual, fechaReporte  } = req.body;
      await ingresosService.insertarDatos({ reporteDiario, reporteMensual, fechaReporte  });

      res.status(200).json({ message: 'Información almacenada con éxito.' });
  } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al almacenar la información.' });
  }
});

router.get('/reporte-mensual/:fechaInicio/:fechaFin', obtenerReportePorRangoFechas);
async function obtenerReportePorRangoFechas(req, res) {
    try {
        const fechaInicio = req.params.fechaInicio;
        const fechaFin = req.params.fechaFin;
        const reportes = await ingresosService.obtenerReportePorRangoFechas(fechaInicio, fechaFin);

        if (!reportes || reportes.length === 0) {
            return res.status(404).json({ message: 'No se encontraron reportes para el rango de fechas especificado.' });
        }

        res.status(200).json(reportes);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener los reportes.' });
    }
}

router.get('/reporte-mensual-porId/:id',obtenerReportePorId);
async function obtenerReportePorId(req, res) {
    try {
        const id = req.params.id;
        const reportes = await ingresosService.obtenerReportePorId(id);

        if (!reportes || reportes.length === 0) {
            return res.status(404).json({ message: 'No se encontraron reportes para el rango de fechas especificado.' });
        }

        res.status(200).json(reportes);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener los reportes.' });
    }
}

router.delete('/eliminar-reporte-mensual-porId/:id',eliminarReportePorId);
async function eliminarReportePorId(req, res) {
  const { id } = req.params;

  try {
      const data = await ingresosService.eliminarReportePorId(id);

      const response = {
        message: 'Registro de Ingreso Eliminado',
        data: data
      };

      res.status(HTTP_OK).json(response);
  } catch (error) {
      console.error(error);
      if (error.message.includes("No se encontró")) {
          res.status(HTTP_NOT_FOUND).json({ error: error.message });
      } else {
          res.status(HTTP_INTERNAL_SERVER_ERROR).json({ error: 'Error al eliminar los reportes' });
      }
  }
}

router.get('/reporte-diario/:fechaInicio/:fechaFin', obtenerReporteDiarioPorRangoFechas);
async function obtenerReporteDiarioPorRangoFechas(req, res) {
    try {
        const fechaInicio = req.params.fechaInicio;
        const fechaFin = req.params.fechaFin;
        const reportesDiarios = await ingresosService.obtenerReporteDiarioPorRangoFechas(fechaInicio, fechaFin);

        if (!reportesDiarios || reportesDiarios.length === 0) {
            return res.status(404).json({ message: 'No se encontraron reportes diarios para el rango de fechas especificado.' });
        }

        res.status(200).json(reportesDiarios);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener los reportes diarios.' });
    }
}

router.get('/reporte-diario-porId/:id',obtenerReporteDiarioPorId);
async function obtenerReporteDiarioPorId(req, res) {
    try {
        const id = req.params.id;
        const reportes = await ingresosService.obtenerReporteDiarioPorId(id);

        if (!reportes || reportes.length === 0) {
            return res.status(404).json({ message: 'No se encontraron reportes para el rango de fechas especificado.' });
        }

        res.status(200).json(reportes);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener los reportes.' });
    }
}

router.post('/validar-fecha', async (req, res) => {
    try {
        const { fecha } = req.body; 
        
        const existe = await ingresosService.validarFecha(fecha);
        
        if (existe) {
            res.status(200).json({ message: "El ingreso para este mes y año ya existe.",disponible: false });
        } else {
            res.status(200).json({ message: "Fecha válida.",disponible: true});
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al validar la fecha' });
    }
});

// Ruta para obtener la suma de todos los total_mes
router.get('/suma-total-mes', obtenerSumaTotalMes);
async function obtenerSumaTotalMes(req, res) {
    try {
        const suma = await ingresosService.getSumaTotalMesIngresos();

        const response = {
          message: 'Suma obtenida con éxito',
          suma_total_mes: suma
        };

        res.status(200).json(response);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener la suma total de los meses' });
    }
}

// Ruta para obtener la suma de todos los total_mes por fecha
router.get('/suma-total-mes/:fechaInicio/:fechaFin', obtenerSumaTotalMesPorFecha);
async function obtenerSumaTotalMesPorFecha(req, res) {
    try {
        const fechaInicio = req.params.fechaInicio;
        const fechaFin = req.params.fechaFin;
        const suma = await ingresosService.getSumaTotalMesIngresosPorFecha(fechaInicio, fechaFin);

        const response = {
          message: 'Suma obtenida con éxito',
          suma_total_mes: suma
        };

        res.status(200).json(response);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener la suma total de los meses' });
    }
}

module.exports = router;
