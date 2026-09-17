// Catálogo de áreas y equipos de la planta, extraído de "Formato Ruta Niveles de Aceite.xlsx"
// Estructura fiel al Excel original (columna AREA / EQUIPO).
const PLANTA = {
  nombre: "Planta de Extracción",
  areas: [
    {
      area: "RECEPCION",
      equipos: [
        "GATO ELEVADOR CAMIONES",
        "FRACTURADOR 1",
        "FRACTURADOR 2",
        "DOSIFICADOR 1",
        "DOSIFICADOR 2",
        "REDUCTOR REDLER FRESCO 1",
        "REDUCTOR REDLER FRESCO 2",
        "UNIDAD HIDRAULICA",
        "CABRESTANTE 4",
        "CABRESTANTE 5",
        "CABRESTANTE 1"
      ]
    },
    {
      area: "ESTERILIZACION",
      equipos: [
        "UNIDAD HIDRAULICA",
        "CABRESTANTE 3",
        "CABRESTANTE 6",
        "CABRESTANTE 2",
        "CAJA TRASMISION PRENSA RAQUIS 1",
        "CAJA REDUCTORA PRENSA RAQUIS 1",
        "REDUCTOR DOSIFICADOR PRENSA RAQUIS 1",
        "CAJA TRASMISION PRENSA RAQUIS 2",
        "CAJA REDUCTORA PRENSA RAQUIS 2",
        "REDUCTOR DOSIFICADOR PRENSA RAQUIS 2",
        "REDUCTOR BANDA TRANSPORTADORA",
        "REDUCTOR TAMBOR DE VOLTEO"
      ]
    },
    {
      area: "PRENSADO",
      equipos: [
        "REDUCTOR ELEVADOR DE FRUTO 1",
        "REDUCTOR ELEVADOR DE FRUTO 2",
        "DIGESTOR 1",
        "DIGESTOR 2",
        "DIGESTOR 3",
        "DOSIFICADOR PRENSA CPO 1",
        "DOSIFICADOR PRENSA CPO 2",
        "DOSIFICADOR PRENSA CPO 3",
        "CAJA TRANSMISION PRENSA CPO 1",
        "CAJA REDUCTORA PRENSA CPO 1",
        "UNIDAD HIDRAULICA PRENSA CPO 1",
        "CAJA TRANSMISION PRENSA CPO 2",
        "CAJA REDUCTORA PRENSA CPO 2",
        "UNIDAD HIDRAULICA PRENSA CPO 2",
        "CAJA TRANSMISION PRENSA CPO 3",
        "CAJA REDUCTORA PRENSA CPO 3",
        "UNIDAD HIDRAULICA PRENSA CPO 3",
        "REDUCTOR TRASVERSAL DE DIGESTORES",
        "REDUCTOR TRASVERSAL",
        "REDUCTOR TAMBOR DESFRUTADOR 1",
        "REDUCTOR TAMBOR DESFRUTADOR 2"
      ]
    },
    {
      area: "PALMISTERIA",
      equipos: [
        "REDUCTOR NUEZ HUMEDA",
        "TRANSPORTADOR NUEZ SECA",
        "REDUCTOR TAMBOR SACAPIEDRA",
        "REDUCTOR SILO DE ALMENDRA 1",
        "REDUCTOR SILO DE ALMENDRA 2",
        "HIDROCICLONES",
        "TRANSPORTADOR BAJO TRITURADORES",
        "SILO NUEZ",
        "VALVULA ROTATORIA HIDROCICLONES",
        "TRANSPORTADOR ALMENDRA CASCARA HIDROCICLONES",
        "TAMBOR CLASIFICADOR",
        "VALVULA ALMENDRA",
        "ELEVADOR DE NUEZ",
        "TRANSPORTADOR ALMENDRA SOBRE SILOS",
        "ELEVADOR DE ALMENDRA",
        "TRANSPORTADOR ALMENDRA Y CASCARA"
      ]
    },
    {
      area: "CALDERA",
      equipos: [
        "TRANSPORTADOR CENIZA 1",
        "BANDA TRANSPORTADORA",
        "TRANSPORTADOR CENIZA 2",
        "TRANSPORTADOR CENIZA 3",
        "TRANSPORTADOR FIBRA 2",
        "TRANSPORTADOR FIBRA 1",
        "TRANSPORTADOR COMBUSTION",
        "TRANSPORTADOR DESCARGA",
        "VALVULA ROTATORIA CASCARILLA",
        "VALVULA ROTATORIA DE FIBRA",
        "ELEVADOR COMBUSTION",
        "GOBERNADOR",
        "UNIDAD HIDRAULICA"
      ]
    },
    {
      area: "PKO",
      equipos: [
        "TRANSPORTADOR NUEZ",
        "TRANSPORTADOR ALIMENTADOR BASCULA",
        "TRANSPORTADOR BAJO BASCULA",
        "ELEVADOR NUEZ",
        "ALIMENTADOR PRENSAS PKO",
        "PRENSA PKO 1",
        "PRENSA PKO 2",
        "CAJA REDUCTORA PRENSA PKO 1",
        "CAJA REDUCTORA PRENSA PKO 2",
        "SIN FIN TRANSPORTADOR DE TORTA",
        "SIN FIN RETORNO DE ACEITE",
        "TRANSPORTADOR BAZUCA"
      ]
    }
  ]
};

// Genera un id estable por equipo: AREA::EQUIPO
function equipoId(area, equipo) {
  return `${area}::${equipo}`;
}

// Tipos de novedad más comunes en revisión de niveles de aceite
const TIPOS_NOVEDAD = [
  "Nivel bajo",
  "Fuga de aceite",
  "Aceite contaminado / sucio",
  "Sin aceite (vacío)",
  "Mirilla / varilla dañada",
  "Otro"
];

// Tipos de aceite usados comúnmente en planta
const TIPOS_ACEITE = [
  "SAE 40",
  "SAE 90",
  "SAE 140",
  "ISO VG 68",
  "ISO VG 150",
  "ISO VG 220",
  "ISO VG 320",
  "Grasa industrial",
  "Otro"
];

const TOTAL_EQUIPOS = PLANTA.areas.reduce((sum, a) => sum + a.equipos.length, 0);
