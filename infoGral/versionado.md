================================================================================
                   PLATAFORMA INTEGRAL - VERSIONADO AIS LIVE
================================================================================
Ubicacion: Back/infoGral/versionado.md
Proposito: Documentar cambios, mejoras y estado de implementacion del modulo AIS Live
                                                               (multi-fuente y salidas de datos)

================================================================================
HISTORIAL DE VERSIONES
================================================================================

v0.1.0 (2026-11-25) - Estado inicial (BASE)
--------------------------------------------------------------------------------
Descripcion:
  Implementacion original de AIS Live con una sola fuente TCP cliente.
  - Un solo host:puerto configurable (default: 190.210.40.127:3069).
  - Conexion cliente TCP a una estación receptora externa.
  - Polling HTTP cada 3s desde el frontend para obtener snapshot.
  - Decodificacion de mensajes NMEA AIVDM/AIVDO (tipos 1,2,3,18,19,5,21,6,8).
  - Rutas: GET /ais/live, POST /ais/connect, POST /ais/disconnect.
  - Un solo procesador de feed en memoria (createFeedProcessor).
  - Sin persistencia de configuracion (host/puerto se pierden al recargar).
  - Sin soporte para multiples estaciones receptoras simultaneas.
  - Sin modo servidor (no se puede recibir conexiones entrantes).
  - Sin salidas de datos configurables (solo recepcion).

Archivos afectados:
  Back/src/utils/aisLiveFeed.js
  Back/src/routes/aisLive.routes.js
  Front/src/pages/herramientasAIS/aisLive.jsx
  Front/src/styles/aisLive.css

================================================================================
EN PROGRESO - v0.2.0 (IMPLEMENTACION EN CURSO)
--------------------------------------------------------------------------------
Objetivo: Soporte de multiples fuentes AIS (cliente TCP, servidor TCP, servidor UDP)
          con gestion independiente por fuente.

Cambios implementados:
  1. CREADO: Back/src/utils/multiAisFeed.js
     - Gestor de múltiples fuentes (sourceId -> {config, processor, estado}).
     - Soporte para 3 modos: tcp-client, tcp-server, udp-server.
     - tcp-client: net.createConnection (cliente a estación externa).
     - tcp-server: net.createServer (acepta conexiones entrantes de receptores).
     - udp-server: dgram.createSocket (recibe datagramas NMEA por UDP).
     - Cada fuente tiene su propio FeedProcessor (targets, messages, estado independiente).
     - Reconexión automática para tcp-client.
     - Funciones: createSource, getAllSources, removeSource, connectSource, disconnectSource,
       getSourceSnapshot, getAggregatedSnapshot.

  2. CREADO: Back/src/utils/aisSourcesPersistence.js
     - Persistencia de configuraciones de fuentes en Back/infoGral/aisSources.json.
     - Funciones: loadAisSources, saveAisSources, appendAisSource, updateAisSource, removeAisSource.
     - Carga automática de fuentes guardadas al iniciar el modulo.

  3. CREADO: Back/src/routes/aisSources.routes.js
     - GET    /api/ais/sources          - Listar todas las fuentes con estado.
     - POST   /api/ais/sources          - Crear nueva fuente (modo, host, puerto, nombre).
     - GET    /api/ais/sources/:sourceId - Snapshot de una fuente específica.
     - POST   /api/ais/sources/:sourceId/connect - Conectar una fuente.
     - POST   /api/ais/sources/:sourceId/disconnect - Desconectar una fuente.
     - DELETE /api/ais/sources/:sourceId - Eliminar una fuente.
     - GET    /api/ais/live             - Snapshot agregado de todas las fuentes (compatibilidad).
     - POST   /api/ais/connect          - Legacy: conecta/crea fuente principal por defecto.
     - POST   /api/ais/disconnect       - Legacy: desconecta primera fuente encontrada.

  4. MODIFICADO: Back/src/app.js
     - Importación y registro de aisSourcesRoutes bajo /api.

  5. MODIFICADO: Back/src/utils/multiAisFeed.js
     - Integracion con aisSourcesPersistence.js para cargar/guardar configuraciones.
     - Carga automatica de fuentes guardadas al iniciar el modulo.

Cambios pendientes:
  - Salidas de datos configurables (TCP, UDP, WebSocket, archivos) - v0.3.0

Archivos afectados:
  Back/src/utils/multiAisFeed.js (MODIFICADO)
  Back/src/utils/aisSourcesPersistence.js (NUEVO)
  Back/src/routes/aisSources.routes.js (NUEVO)
  Back/src/app.js (MODIFICADO)
  Back/infoGral/aisSources.json (NUEVO - generado automaticamente)
  Back/src/utils/aisLiveFeed.js (mantener para compatibilidad)
  Back/src/routes/aisLive.routes.js (mantener para compatibilidad)
  Front/src/pages/herramientasAIS/aisLive.jsx (MODIFICADO - multi-fuente frontend)
  Front/src/styles/aisLive.css (MODIFICADO - estilos para fuentes)

Estado: v0.2.0 completado (backend multi-fuente + persistencia + frontend gestión de fuentes).

================================================================================
PENDIENTE - v0.3.0 (PLANIFICADO)
--------------------------------------------------------------------------------
Objetivo: Configuracion de salidas de datos (TCP, UDP, WebSocket, archivos).

Cambios planificados:
  1. CRUD de salidas: GET/POST/PUT/DELETE /api/ais/outputs.
  2. Formatos soportados: NMEA crudo, JSON estructurado.
  3. Protocolos de salida: TCP client, UDP, WebSocket server, archivo CSV/KML.
  4. Filtros por salida: MMSI, tipo de mensaje, area geografica.
  5. Tasa de reenvio configurable por salida.

================================================================================
PENDIENTE - v0.4.0 (PLANIFICADO)
--------------------------------------------------------------------------------
Objetivo: WebSocket para datos en tiempo real (reemplazar polling).

================================================================================
PENDIENTE - v0.5.0 (PLANIFICADO)
--------------------------------------------------------------------------------
Objetivo: Trazado de rutas (tracks), geofencing y exportacion CSV/KML/GPX.

================================================================================
NOTAS DE IMPLEMENTACION
================================================================================
- Cada fuente AIS mantiene su propio procesador (targets, messages, estado de conexion).
- El snapshot agregado combina todas las fuentes activas para compatibilidad con el frontend actual.
- Las fuentes se identifican por sourceId (UUID o nombre unico).
- Modos de conexion: 'tcp-client', 'tcp-server', 'udp-server'.

================================================================================
FIN DEL ARCHIVO
================================================================================
