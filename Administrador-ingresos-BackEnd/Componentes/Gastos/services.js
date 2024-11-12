const XLSX = require('xlsx');
const fs = require('fs');
const { pool } = require('../../index');

async function procesarArchivoExcel(filePath) {
    try {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
  
      // Verifica si las celdas esperadas existen
      if (!sheet['C18'] || !sheet['C19'] || !sheet['C20'] || !sheet['C21'] || !sheet['C22'] || !sheet['C23']) {
        throw new Error('Formato de archivo inválido o celdas esperadas faltantes.');
      }
  
      const salarios_total_mes = sheet['C18'].v;
      const infraestructura_Mantenimiento_total_mes = sheet['C19'].v;
      const becas_total_mes = sheet['C20'].v;
      const tecnologiaRecursosAprendizaje_total_mes = sheet['C21'].v;
      const serviciosEstudiantiles_total_mes = sheet['C22'].v;
      const total_mes = sheet['C23'].v;
  
      const fechaFormat = 'dd/mm/yyyy';
      let datosDelRangoDias = [];
      let datosDelRangoTotalDia = [];
      for (let i = 28; i <= 58; i++) {
        const fechaCell = sheet[`B${i}`];
        const totalCell = sheet[`H${i}`];
        if (fechaCell && totalCell) {
          const valorNumerico = fechaCell.v;
          const fecha = new Date((valorNumerico - 25568) * 86400 * 1000); 
          datosDelRangoDias.push(fecha.toLocaleDateString('es-ES', { dateFormat: fechaFormat }));
          datosDelRangoTotalDia.push(totalCell.v);
        }
      }
  
      return {
        DatosMensuales: {
            salarios_total_mes,
            infraestructura_Mantenimiento_total_mes,
            becas_total_mes,
            tecnologiaRecursosAprendizaje_total_mes,
            serviciosEstudiantiles_total_mes,
            total_mes
        },
        Diario: { datosDelRangoDias, datosDelRangoTotalDia }
      };
    } catch (error) {
      console.error(`Error al procesar el archivo: ${error.message}`);
      throw error;
    } finally {
      fs.unlink(filePath, (err) => {
        if (err) {
          console.error(`Error al eliminar el archivo temporal: ${err}`);
        }
      });
    }
}

function getLastDayOfMonth(yyyyMM) {
    const [year, month] = yyyyMM.split('-');
    const date = new Date(year, month, 0); // El día 0 del mes siguiente es el último día del mes actual
    return `${year}-${month}-${date.getDate()}`; // Retorna YYYY-MM-DD
}

function formatDate(dateString) {
    const [day, month, year] = dateString.split('/');
    return `${year}-${month}-${day}`;
}

async function insertarDatos({ reporteDiario, reporteMensual, fechaReporte }) {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const fechaReporteFormatoCompleto = getLastDayOfMonth(fechaReporte);

        // 1. Insertar en la tabla 'ingreso'
        const insertIngresoQuery = `
          INSERT INTO gasto (fecha, data)
          VALUES ($1, $2)
          RETURNING id;
      `;
        const ingresoValues = [fechaReporteFormatoCompleto, JSON.stringify(reporteMensual)];
        const result = await client.query(insertIngresoQuery, ingresoValues);
        const ingresoId = result.rows[0].id;

        // 2. Insertar en la tabla 'sub_ingreso'
        for (let i = 0; i < reporteDiario.fechas.length; i++) {
            const insertSubIngresoQuery = `
              INSERT INTO sub_gasto (gasto_id, fecha, total)
              VALUES ($1, $2, $3);
          `;
            const subIngresoValues = [ingresoId, formatDate(reporteDiario.fechas[i]), reporteDiario.totales[i]];
            await client.query(insertSubIngresoQuery, subIngresoValues);
        }

        console.log("Datos insertados con éxito.");

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

async function obtenerReportePorRangoFechas(fechaInicio, fechaFin) {
    const client = await pool.connect();

    try {
        const query = `
          SELECT * FROM gasto 
          WHERE to_char(fecha, 'YYYY-MM') BETWEEN $1 AND $2
          ORDER BY fecha ASC;  -- Esto ordenará los reportes por fecha en orden ascendente
      `;
        const result = await client.query(query, [fechaInicio, fechaFin]);

        return result.rows;
    } catch (error) {
        throw error;
    } finally {
        client.release();
    }
}

async function obtenerReportePorId(id) {
    const client = await pool.connect();

    try {
        const query = `
          SELECT * FROM gasto 
          WHERE id = $1
      `;
        const result = await client.query(query, [id]);

        return result.rows;
    } catch (error) {
        throw error;
    } finally {
        client.release();
    }
}

async function eliminarReportePorId(id) {
    const client = await pool.connect();

    try {
        const query = `
          DELETE FROM gasto 
          WHERE id = $1
          RETURNING *; 
      `;
        const result = await client.query(query, [id]);

        if (result.rows.length === 0) {
            throw new Error(`No se encontró el ingreso con el ID ${id} para eliminar.`);
        }

        return result.rows[0]; // Retorna el registro eliminado.

    } catch (error) {
        console.error("Error al eliminar el reporte por ID:", error);
        throw error;
    } finally {
        client.release();
    }
}

async function obtenerReporteDiarioPorRangoFechas(fechaInicio, fechaFin) {
    const client = await pool.connect();

    try {
        const query = `
          SELECT * FROM sub_gasto 
          WHERE fecha BETWEEN $1 AND $2
          ORDER BY fecha ASC;  -- Esto ordenará los reportes diarios por fecha en orden ascendente
      `;
        const result = await client.query(query, [fechaInicio, fechaFin]);

        return result.rows;
    } catch (error) {
        throw error;
    } finally {
        client.release();
    }
}

async function obtenerReporteDiarioPorId(id) {
    const client = await pool.connect();

    try {
        const query = `
          SELECT * FROM sub_gasto 
          WHERE id = $1
      `;
        const result = await client.query(query, [id]);

        return result.rows;
    } catch (error) {
        throw error;
    } finally {
        client.release();
    }
}

async function validarFecha(fecha) {
    const client = await pool.connect();
  
    try {
        const query = `
            SELECT EXISTS (
                SELECT 1 
                FROM gasto 
                WHERE EXTRACT(YEAR FROM fecha) = $1 AND EXTRACT(MONTH FROM fecha) = $2
            ) AS fecha_existe;
        `;
  
        // Dividimos el string de fecha por el guion para obtener el año y el mes directamente
        const [year, month] = fecha.split('-');
  
        const valores = [parseInt(year, 10), parseInt(month, 10)];
  
        const result = await client.query(query, valores);
  
        return result.rows[0].fecha_existe;
  
    } catch (error) {
        throw error;
    } finally {
        client.release();
    }
}

async function getSumaTotalMesGastos() {
    const client = await pool.connect();

    try {
        const query = `
          SELECT SUM((data->>'total_mes')::integer) AS suma_total_mes 
          FROM gasto
      `;
        const result = await client.query(query);

        // Retorna la suma
        return result.rows[0].suma_total_mes;
    } catch (error) {
        throw error;
    } finally {
        client.release();
    }
}

async function getSumaTotalMesGastosPorFecha(fechaInicio, fechaFin) {	
    const client = await pool.connect();
  
    try {
        const query = `
            SELECT SUM((data->>'total_mes')::integer) AS suma_total_mes 
            FROM gasto
            WHERE to_char(fecha, 'YYYY-MM') BETWEEN $1 AND $2
        `;
        const result = await client.query(query, [fechaInicio, fechaFin]);
        
        // Retorna la suma
        return result.rows[0].suma_total_mes;
    } catch (error) {
        throw error;
    } finally {
        client.release();
    }
  }


module.exports = {
    procesarArchivoExcel,
    insertarDatos,
    obtenerReportePorRangoFechas,
    obtenerReporteDiarioPorRangoFechas,
    obtenerReportePorId,
    obtenerReporteDiarioPorId,
    eliminarReportePorId,
    validarFecha,
    getSumaTotalMesGastos,
    getSumaTotalMesGastosPorFecha
};
