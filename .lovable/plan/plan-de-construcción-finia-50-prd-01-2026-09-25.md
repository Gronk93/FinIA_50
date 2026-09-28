# Plan de construcción — FinIA 50 PRD-01

## Resultado
Una aplicación navegable de inteligencia financiera, priorizada para escritorio y usable en tablet y móvil, con acceso protegido real y datos demostrativos desacoplados de futuros cálculos.

## Fases
1. **Fundación visual**
   - Crear el sistema visual fintech premium en modo oscuro: azul marino, azul eléctrico, verde, ámbar, violeta y rojo por función.
   - Construir navegación lateral adaptable, encabezado, menús de notificaciones y usuario, títulos por pantalla y estados globales.
   - Definir componentes consistentes para métricas, paneles, tablas, pestañas, formularios, progreso, estados y mensajes.

2. **Acceso y primera entrada**
   - Activar Lovable Cloud y acceso por correo/contraseña con Google.
   - Crear inicio de sesión, recuperación y cambio de contraseña, cierre de sesión y protección de pantallas privadas.
   - Crear asistente de cinco pasos completamente recorrible; sus datos serán demostrativos y no se guardarán, según lo indicado.

3. **Inicio y finanzas**
   - Dashboard con métricas, patrimonio, evolución, resumen mensual, pendientes y protagonista Retiro 50.
   - Mis Finanzas con Resumen, Ingresos, Gastos y Patrimonio; formularios visuales para nuevas entradas.
   - Fondo Seguridad con fondos, comparador de hasta cuatro productos y simulador visual.

4. **Inversión y trading**
   - Crecimiento con resumen, portafolio e histórico.
   - Trading Lab con carga y vista previa local de captura, operación, Risk Manager y panel de IA desconectada.
   - Trading Journal con filtros, listado y detalle pre/post trade.

5. **Retiro, aprendizaje y ajustes**
   - Retiro 50 con datos, proyección conceptual y tres escenarios.
   - Academia con biblioteca y progreso demostrativo.
   - Configuración con Perfil, Preferencias, Seguridad, Integraciones e IA; todos los proveedores permanecerán no configurados y sin llaves.

6. **Validación**
   - Comprobar todas las rutas, navegación, formularios visuales, menús y carga de imagen.
   - Revisar escritorio, tablet y móvil; las tablas se convertirán en tarjetas en pantallas pequeñas.
   - Verificar estados loading, empty, error y success, metadatos por pantalla y ausencia de conexiones externas.

## Decisiones técnicas
- Los datos de perfil y financieros serán constantes mock claramente separadas de la interfaz.
- El acceso será persistente; onboarding y ediciones financieras no tendrán persistencia en este PRD.
- No se crearán roles adicionales, APIs financieras, recomendaciones, análisis IA ni campos de API keys.
- Las pantallas principales usarán rutas separadas para navegación directa y metadatos propios.
