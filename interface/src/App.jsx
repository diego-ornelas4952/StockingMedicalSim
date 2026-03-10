import { useState, useEffect } from 'react';
import Items from './components/items.jsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
function App() {

  const [stock, setStock] = useState([]);
  const [activeView, setActiveView] = useState('login'); // Iniciar en el login

  // Estados del usuario y del formulario de login
  const [user, setUser] = useState(null);
  const [loginForm, setLoginForm] = useState({ codigo: '', pin: '' });
  const [loginError, setLoginError] = useState('');

  // Estados Admin y Reportes
  const [usersList, setUsersList] = useState([]);
  const [reportsList, setReportsList] = useState([]);
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [reportDetails, setReportDetails] = useState([]);
  const [newUser, setNewUser] = useState({ id: '', full_name: '', pin: '', role: 'Servicio' });
  const [newItem, setNewItem] = useState({ description: '', series_model: '', quantity: 1, fixed_notes: '' });
  
  // Sistema de notificaciones (Toast) no bloqueante para evitar que alert() congele Electron
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (message, type = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 3500);
  };


  useEffect(() => {
    fetch('http://localhost:3000/api/items')
      .then(response => response.json())
      .then(data => setStock(data))
      .catch(error => console.error('Error fetching items:', error));
  }, []);

  useEffect(() => {
    if (user) {
      if (activeView === 'admin_usuarios' && user.role === 'Admin') {
        fetch('http://localhost:3000/api/users').then(r => r.json()).then(setUsersList);
      } else if (activeView === 'reportes') {
        setSelectedReportId(null);
        if (user.role === 'Admin') {
          fetch('http://localhost:3000/api/reports-full').then(r => r.json()).then(setReportsList);
        } else {
          fetch(`http://localhost:3000/api/reports/user/${user.id}`).then(r => r.json()).then(setReportsList);
        }
      }
    }
  }, [activeView, user]);

  const handleCreateUser = (e) => {
    e.preventDefault();
    fetch('http://localhost:3000/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser)
    }).then(response => response.json()).then((data) => {
      if (data.success) {
        setNewUser({ id: '', full_name: '', pin: '', role: 'Servicio' });
        fetch('http://localhost:3000/api/users').then(r => r.json()).then(setUsersList);
        showToast('Usuario creado con éxito', 'success');
      } else {
        showToast('Error: ' + (data.message || 'No se pudo crear el usuario. Asegúrate de que el código no exista ya.'), 'error');
      }
    });
  };

  const handleCreateItem = (e) => {
    e.preventDefault();
    fetch('http://localhost:3000/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newItem)
    }).then(() => {
      setNewItem({ description: '', series_model: '', quantity: 1, fixed_notes: '' });
      fetch('http://localhost:3000/api/items').then(r => r.json()).then(setStock);
      showToast('Inventario añadido con éxito', 'success');
    });
  };

  const handleItemUpdate = (id, field, value) => {
    setStock(prevStock =>
      prevStock.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const handleVerDetalle = (id) => {
    fetch(`http://localhost:3000/api/reports/${id}/details`)
      .then(r => r.json())
      .then(data => {
        setReportDetails(data);
        setSelectedReportId(id);
      })
      .catch(error => console.error('Error fetching details:', error));
  };

  const exportarPDF = async () => {
    try {
      // 1. Guardar o Registrar el Reporte en la Base de Datos para obtener Folio
      const payload = {
        id_user: user ? user.id : null,
        items: stock.map(item => ({
          id_item: item.id,
          is_present: item.isChecked ? 1 : 0,
          status: item.status || 'Disponible',
          comments: item.comments || ''
        }))
      };

      const response = await fetch('http://localhost:3000/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const respData = await response.json();
      const folio = respData.success ? respData.folio : "N/A";

      const doc = new jsPDF();

      // ----------------------------------------------------
      // METADATOS DEL USUARIO (Sacados del Login)
      // ----------------------------------------------------
      const userInfo = {
        full_name: user ? user.full_name : "Desconocido",
        id: user ? user.id.toString() : "N/A"
      };

      // Obtenemos la fecha y hora actual
      const fechaActual = new Date();
      const formatoFecha = fechaActual.toLocaleDateString('es-MX', {
        day: '2-digit', month: '2-digit', year: 'numeric'
      });
      const formatoHora = fechaActual.toLocaleTimeString('es-MX', {
        hour: '2-digit', minute: '2-digit'
      });
      // ----------------------------------------------------

      // Cargamos el logo
      const img = new Image();

      img.onload = () => {
        try {
          // 1. Añadimos la imagen (x, y, ancho, alto)
          doc.addImage(img, 'PNG', 15, 10, 20, 26);

          // 2. Textos de encabezado
          doc.setFontSize(10);
          doc.setFont("helvetica", "bold");
          doc.text("UNIVERSIDAD DE GUADALAJARA", 40, 16);
          doc.text("CENTRO UNIVERSITARIO DE LOS ALTOS", 40, 22);
          doc.text("LABORATORIO DE SIMULADORES", 40, 28);

          // 3. Título del Reporte
          doc.setFontSize(12);
          doc.setFont("helvetica", "bold");
          doc.text("REPORTE DE INVENTARIO", 105, 42, { align: "center" });

          // -- Sección de Metadatos del Usuario --
          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");

          // Bloque Izquierdo (Info Estudiante)
          doc.text(`Nombre: ${userInfo.full_name}`, 15, 52);
          doc.text(`Código: ${userInfo.id}`, 15, 57);

          // Bloque Derecho (Folio, Fecha y Hora)
          doc.text(`Folio: #${folio}`, 195, 47, { align: "right" });
          doc.text(`Fecha: ${formatoFecha}`, 195, 52, { align: "right" });
          doc.text(`Hora: ${formatoHora}`, 195, 57, { align: "right" });

          // Línea divisoria
          doc.setLineWidth(0.5);
          doc.line(15, 62, 195, 62);

          // 4. Construimos las filas de la tabla
          const tableColumn = ["Descripción", "No. Serie", "Cantidad", "Check", "Condición", "Comentarios"];
          const tableRows = [];

          stock.forEach(item => {
            const estadoFísico = item.isChecked ? "Encontrado" : "Falta";
            const resComentarios = item.comments ? item.comments : "-";
            const cond = item.status || "Disponible";
            const itemData = [
              item.description || "",
              item.series_model || "N/A",
              item.quantity ? item.quantity.toString() : "0",
              estadoFísico,
              cond,
              resComentarios
            ];
            tableRows.push(itemData);
          });

          // 5. Dibujar tabla usando autoTable
          autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 68,
            theme: 'grid',
            styles: { fontSize: 9, cellPadding: 3 },
            headStyles: { fillColor: [4, 30, 66] }, // Azul oscuro
          });

          // 6. Descargar - con el nombre del folio
          doc.save(`${user.full_name}_ReporteInventario_${folio}.pdf`);
        } catch (error) {
          showToast("Hubo un error al generar con logo: " + error.message, 'error');
        }
      };

      img.onerror = () => {
        try {
          console.warn("No se pudo cargar el logo para el PDF, generando sin logo...");
          // Generar sin logo si hay error
          doc.setFontSize(10);
          doc.setFont("helvetica", "bold");
          doc.text("UNIVERSIDAD DE GUADALAJARA", 15, 16);
          doc.text("CENTRO UNIVERSITARIO DE LOS ALTOS", 15, 22);
          doc.text("LABORATORIO DE SIMULADORES", 15, 28);

          doc.setFontSize(12);
          doc.setFont("helvetica", "bold");
          doc.text("REPORTE DE INVENTARIO", 105, 42, { align: "center" });

          // -- Sección de Metadatos del Usuario (Sin logo) --
          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          doc.text(`Nombre: ${userInfo.full_name}`, 15, 52);
          doc.text(`Código: ${userInfo.id}`, 15, 57);
          doc.text(`Folio: #${folio}`, 195, 47, { align: "right" });
          doc.text(`Fecha: ${formatoFecha}`, 195, 52, { align: "right" });
          doc.text(`Hora: ${formatoHora}`, 195, 57, { align: "right" });
          doc.line(15, 62, 195, 62);

          const tableColumn = ["Descripción", "No. Serie", "Cantidad", "Check", "Condición", "Comentarios"];
          const tableRows = [];
          stock.forEach(item => {
            const estadoFísico = item.isChecked ? "Encontrado" : "Falta";
            const resComentarios = item.comments ? item.comments : "-";
            const cond = item.status || "Disponible";
            tableRows.push([
              item.description || "",
              item.series_model || "N/A",
              item.quantity ? item.quantity.toString() : "0",
              estadoFísico,
              cond,
              resComentarios
            ]);
          });

          autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 68,
            theme: 'grid',
            styles: { fontSize: 9, cellPadding: 3 },
            headStyles: { fillColor: [4, 30, 66] },
          });

          doc.save(`${user.full_name}_ReporteInv_${folio}.pdf`);
        } catch (error) {
          showToast("Hubo un error al generar sin logo: " + error.message, 'error');
        }
      };

      img.src = '/udglogo.png';
    } catch (error) {
      showToast("Error al registrar el reporte en la base de datos: " + error.message, 'error');
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    setLoginError('');

    fetch('http://localhost:3000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo: loginForm.codigo, pin: loginForm.pin })
    })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          setUser(data.user);
          setActiveView('inicio'); // Si es exitoso, pasa al Inicio
        } else {
          setLoginError(data.message);
        }
      })
      .catch(error => {
        console.error('Error in login:', error);
        setLoginError('Error de conexión al servidor.');
      });
  };

  // Si no hay usuario logueado, mostrar ÚNICAMENTE la pantalla de Login
  if (!user && activeView === 'login') {
    return (
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh',
        backgroundColor: 'var(--fondo-crema)', backgroundImage: 'url("/fondo.jpg")', backgroundSize: 'cover'
      }}>
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)', padding: '3rem', borderRadius: '12px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.15)', width: '350px', textAlign: 'center'
        }}>
          <img src="/udglogo.png" alt="Logo UDG" style={{ height: '80px', marginBottom: '20px' }} />
          <h2 style={{ color: 'var(--azul-oscuro)', marginBottom: '5px' }}>Iniciar Sesión</h2>
          <p style={{ color: 'gray', fontSize: '0.9rem', marginBottom: '25px' }}>Laboratorio de Simuladores</p>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input
              type="text"
              placeholder="Código"
              value={loginForm.codigo}
              onChange={(e) => setLoginForm({ ...loginForm, codigo: e.target.value })}
              style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '1rem' }}
              required
            />
            <input
              type="password"
              placeholder="Contraseña"
              value={loginForm.pin}
              onChange={(e) => setLoginForm({ ...loginForm, pin: e.target.value })}
              style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '1rem' }}
              required
            />

            {loginError && <span style={{ color: 'red', fontSize: '0.85rem' }}>{loginError}</span>}

            <button type="submit" style={{
              marginTop: '10px', padding: '12px', backgroundColor: 'var(--azul-oscuro)',
              color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer',
              fontWeight: 'bold', fontSize: '1rem'
            }}>
              Ingresar
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>

      {/* Barra lateral */}
      <nav style={{
        width: '150px',
        backgroundColor: 'var(--azul-oscuro)',
        color: 'white',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '2px 0 5px rgba(0,0,0,0.1)'
      }}>
        <div style={{ marginBottom: '30px', textAlign: 'center' }}>
          <h2 style={{ color: 'white', margin: 0, fontSize: '1.2rem' }}>Menu</h2>
        </div>

        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <li onClick={() => setActiveView('inicio')} style={{ cursor: 'pointer', padding: '12px 15px', borderRadius: '6px', transition: 'background 0.2s', backgroundColor: activeView === 'inicio' ? 'var(--azul-medio)' : 'transparent', fontWeight: activeView === 'inicio' ? 'bold' : 'normal' }} onMouseEnter={(e) => activeView !== 'inicio' && (e.target.style.backgroundColor = 'rgba(255,255,255,0.1)')} onMouseLeave={(e) => activeView !== 'inicio' && (e.target.style.backgroundColor = 'transparent')}>
            🏠 Inicio
          </li>

          {user && user.role === 'Admin' ? (
            <>
              <li onClick={() => setActiveView('admin_usuarios')} style={{ cursor: 'pointer', padding: '12px 15px', borderRadius: '6px', transition: 'background 0.2s', backgroundColor: activeView === 'admin_usuarios' ? 'var(--azul-medio)' : 'transparent', fontWeight: activeView === 'admin_usuarios' ? 'bold' : 'normal' }} onMouseEnter={(e) => activeView !== 'admin_usuarios' && (e.target.style.backgroundColor = 'rgba(255,255,255,0.1)')} onMouseLeave={(e) => activeView !== 'admin_usuarios' && (e.target.style.backgroundColor = 'transparent')}>
                👥 Usuarios
              </li>
              <li onClick={() => setActiveView('admin_inventario')} style={{ cursor: 'pointer', padding: '12px 15px', borderRadius: '6px', transition: 'background 0.2s', backgroundColor: activeView === 'admin_inventario' ? 'var(--azul-medio)' : 'transparent', fontWeight: activeView === 'admin_inventario' ? 'bold' : 'normal' }} onMouseEnter={(e) => activeView !== 'admin_inventario' && (e.target.style.backgroundColor = 'rgba(255,255,255,0.1)')} onMouseLeave={(e) => activeView !== 'admin_inventario' && (e.target.style.backgroundColor = 'transparent')}>
                📦 Añadir Equipos
              </li>
              <li onClick={() => setActiveView('inventario')} style={{ cursor: 'pointer', padding: '12px 15px', borderRadius: '6px', transition: 'background 0.2s', backgroundColor: activeView === 'inventario' ? 'var(--azul-medio)' : 'transparent', fontWeight: activeView === 'inventario' ? 'bold' : 'normal' }} onMouseEnter={(e) => activeView !== 'inventario' && (e.target.style.backgroundColor = 'rgba(255,255,255,0.1)')} onMouseLeave={(e) => activeView !== 'inventario' && (e.target.style.backgroundColor = 'transparent')}>
                📋 Hacer Checklist
              </li>
            </>
          ) : (
            <li onClick={() => setActiveView('inventario')} style={{ cursor: 'pointer', padding: '12px 15px', borderRadius: '6px', transition: 'background 0.2s', backgroundColor: activeView === 'inventario' ? 'var(--azul-medio)' : 'transparent', fontWeight: activeView === 'inventario' ? 'bold' : 'normal' }} onMouseEnter={(e) => activeView !== 'inventario' && (e.target.style.backgroundColor = 'rgba(255,255,255,0.1)')} onMouseLeave={(e) => activeView !== 'inventario' && (e.target.style.backgroundColor = 'transparent')}>
              📋 Inventario
            </li>
          )}

          <li onClick={() => setActiveView('reportes')} style={{ cursor: 'pointer', padding: '12px 15px', borderRadius: '6px', transition: 'background 0.2s', backgroundColor: activeView === 'reportes' ? 'var(--azul-medio)' : 'transparent', fontWeight: activeView === 'reportes' ? 'bold' : 'normal' }} onMouseEnter={(e) => activeView !== 'reportes' && (e.target.style.backgroundColor = 'rgba(255,255,255,0.1)')} onMouseLeave={(e) => activeView !== 'reportes' && (e.target.style.backgroundColor = 'transparent')}>
            📊 Reportes
          </li>
        </ul>

        <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid var(--azul-medio)', fontSize: '0.8rem', textAlign: 'center', color: 'var(--azul-claro)' }}>
          V1.0 Quorra
        </div>
      </nav>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
        <header style={{ backgroundColor: 'white', color: 'var(--azul-oscuro)', padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e0e0e0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <img src="/udglogo.png" alt="Logo UDG" className="logo-udg" />
            <div>
              <h1 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--azul-oscuro)' }}>Laboratorio de Simuladores</h1>
              <p style={{ margin: 0, color: 'gray', fontSize: '0.9rem' }}>Centro Universitario de Los Altos</p>
            </div>
          </div>
          <div style={{ fontWeight: 'bold', backgroundColor: 'var(--fondo-crema)', padding: '8px 15px', borderRadius: '20px', border: '1px solid #d0d0d0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>👨‍⚕️ {user ? user.full_name : 'Usuario'}</span>
            <button onClick={() => { setUser(null); setActiveView('login'); setLoginForm({ codigo: '', pin: '' }); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1rem' }} title="Cerrar sesión">Salir</button>
          </div>
        </header>
        <main style={{ padding: '3rem', maxWidth: '1000px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
          {activeView === 'inicio' && (
            <div style={{
              textAlign: 'center',
              marginTop: '50px',
              padding: '4rem',
              borderRadius: '12px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
              backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.85), rgba(255, 255, 255, 0.95)), url("/fondo.jpg")',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              border: '1px solid #eaeaea'
            }}>
              <h2 style={{ fontSize: '2.5rem', color: 'var(--azul-oscuro)', marginBottom: '15px', marginTop: 0 }}>Control de Inventarios</h2>
              <p style={{ fontSize: '1.2rem', color: 'gray', marginBottom: '40px' }}>Laboratorio de Simuladores del Centro Universitario de Los Altos</p>

              {user && user.role === 'Admin' ? (
                <>
                  <p style={{ marginBottom: '30px', fontWeight: 'bold', color: 'var(--azul-oscuro)' }}>Panel de Administración Principal</p>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '30px', flexWrap: 'wrap' }}>

                    <div onClick={() => setActiveView('admin_usuarios')} style={{ cursor: 'pointer', backgroundColor: 'var(--fondo-crema)', padding: '30px', borderRadius: '10px', border: '1px solid #e0e0e0', width: '200px', transition: 'transform 0.2s, box-shadow 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = '0 6px 15px rgba(0,0,0,0.1)'; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
                      <div style={{ fontSize: '3rem', marginBottom: '15px' }}>👥</div>
                      <h3 style={{ margin: 0, color: 'var(--azul-oscuro)' }}>Gestión de Usuarios</h3>
                    </div>

                    <div onClick={() => setActiveView('admin_inventario')} style={{ cursor: 'pointer', backgroundColor: 'var(--fondo-crema)', padding: '30px', borderRadius: '10px', border: '1px solid #e0e0e0', width: '200px', transition: 'transform 0.2s, box-shadow 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = '0 6px 15px rgba(0,0,0,0.1)'; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
                      <div style={{ fontSize: '3rem', marginBottom: '15px' }}>📦</div>
                      <h3 style={{ margin: 0, color: 'var(--azul-oscuro)' }}>Añadir Equipos</h3>
                    </div>

                    <div onClick={() => setActiveView('inventario')} style={{ cursor: 'pointer', backgroundColor: 'var(--fondo-crema)', padding: '30px', borderRadius: '10px', border: '1px solid #e0e0e0', width: '200px', transition: 'transform 0.2s, box-shadow 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = '0 6px 15px rgba(0,0,0,0.1)'; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
                      <div style={{ fontSize: '3rem', marginBottom: '15px' }}>📋</div>
                      <h3 style={{ margin: 0, color: 'var(--azul-oscuro)' }}>Hacer Checklist</h3>
                    </div>

                    <div onClick={() => setActiveView('reportes')} style={{ cursor: 'pointer', backgroundColor: 'var(--fondo-crema)', padding: '30px', borderRadius: '10px', border: '1px solid #e0e0e0', width: '200px', transition: 'transform 0.2s, box-shadow 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = '0 6px 15px rgba(0,0,0,0.1)'; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
                      <div style={{ fontSize: '3rem', marginBottom: '15px' }}>📊</div>
                      <h3 style={{ margin: 0, color: 'var(--azul-oscuro)' }}>Historial de Reportes</h3>
                    </div>

                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '30px', flexWrap: 'wrap' }}>
                  <div onClick={() => setActiveView('inventario')} style={{ cursor: 'pointer', backgroundColor: 'var(--fondo-crema)', padding: '30px', borderRadius: '10px', border: '1px solid #e0e0e0', width: '200px', transition: 'transform 0.2s, box-shadow 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = '0 6px 15px rgba(0,0,0,0.1)'; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
                    <div style={{ fontSize: '3rem', marginBottom: '15px' }}>📋</div>
                    <h3 style={{ margin: 0, color: 'var(--azul-oscuro)' }}>Inventarios</h3>
                  </div>

                  <div onClick={() => setActiveView('reportes')} style={{ cursor: 'pointer', backgroundColor: 'var(--fondo-crema)', padding: '30px', borderRadius: '10px', border: '1px solid #e0e0e0', width: '200px', transition: 'transform 0.2s, box-shadow 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = '0 6px 15px rgba(0,0,0,0.1)'; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
                    <div style={{ fontSize: '3rem', marginBottom: '15px' }}>📊</div>
                    <h3 style={{ margin: 0, color: 'var(--azul-oscuro)' }}>Mis Reportes</h3>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeView === 'inventario' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: 0 }}>Checklist de Inventario</h2>
              </div>

              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '5%', textAlign: 'center' }}>¿Está?</th>
                      <th style={{ width: '35%' }}>Descripción</th>
                      <th style={{ width: '15%' }}>No. Serie</th>
                      <th style={{ width: '15%' }}>Estado</th>
                      <th style={{ width: '30%' }}>Comentarios</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stock.map((item) => (
                      <Items key={item.id} item={item} onUpdate={handleItemUpdate} />
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                onClick={exportarPDF}
                style={{
                  marginTop: '20px', float: 'right', padding: '12px 24px',
                  backgroundColor: 'var(--azul-oscuro)', color: 'white',
                  border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold'
                }}>
                Guardar y Exportar PDF
              </button>
            </>
          )}

          {activeView === 'reportes' && (
            <>
              {selectedReportId ? (
                <div>
                  <button onClick={() => setSelectedReportId(null)} style={{ marginBottom: '20px', padding: '10px 15px', backgroundColor: 'var(--azul-claro)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                    ← Volver a los Reportes
                  </button>
                  <h2 style={{ color: 'var(--azul-oscuro)', marginBottom: '20px' }}>Detalles del Folio #{selectedReportId}</h2>
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>¿Estaba?</th>
                          <th>Descripción</th>
                          <th>No. Serie</th>
                          <th>Estado</th>
                          <th>Comentarios</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportDetails.map(det => (
                          <tr key={det.id}>
                            <td style={{ textAlign: 'center', fontWeight: 'bold', color: det.is_present ? 'green' : 'red' }}>
                              {det.is_present ? 'Sí' : 'No'}
                            </td>
                            <td>{det.description}</td>
                            <td>{det.series_model || 'N/A'}</td>
                            <td>{det.status}</td>
                            <td>{det.comments || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <>
                  <h2 style={{ color: 'var(--azul-oscuro)', marginBottom: '20px' }}>
                    {user && user.role === 'Admin' ? 'Historial de Reportes' : 'Mis Reportes'}
                  </h2>
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Folio</th>
                          <th>Fecha y Hora</th>
                          {user && user.role === 'Admin' && <th>Nombre</th>}
                          <th>Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportsList.map(rep => (
                          <tr key={rep.id}>
                            <td>#{rep.id}</td>
                            <td>{new Date(rep.date_time + 'Z').toLocaleString()}</td>
                            {user && user.role === 'Admin' && <td>{rep.full_name || 'Desconocido'}</td>}
                            <td><button onClick={() => handleVerDetalle(rep.id)} style={{ padding: '5px 10px', backgroundColor: 'var(--azul-claro)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Ver Detalle</button></td>
                          </tr>
                        ))}
                        {reportsList.length === 0 && <tr><td colSpan={user && user.role === 'Admin' ? "4" : "3"} style={{ textAlign: 'center' }}>No hay reportes generados.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          )}

          {activeView === 'admin_usuarios' && (
            <>
              <h2 style={{ color: 'var(--azul-oscuro)', marginBottom: '20px' }}>Gestión de Usuarios</h2>
              <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, backgroundColor: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                  <h3>Crear Nuevo Usuario</h3>
                  <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <input type="text" placeholder="Código de Estudiante (ID)" value={newUser.id} onChange={e => setNewUser({ ...newUser, id: e.target.value })} required style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
                    <input type="text" placeholder="Nombre Completo" value={newUser.full_name} onChange={e => setNewUser({ ...newUser, full_name: e.target.value })} required style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
                    <input type="text" placeholder="PIN de Acceso" value={newUser.pin} onChange={e => setNewUser({ ...newUser, pin: e.target.value })} required style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
                    <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}>
                      <option value="Servicio">Servicio</option>
                      <option value="Admin">Administrador</option>
                    </select>
                    <button type="submit" style={{ padding: '10px', backgroundColor: 'var(--azul-oscuro)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Guardar Usuario</button>
                  </form>
                </div>
                <div style={{ flex: 2 }} className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Código</th>
                        <th>Nombre</th>
                        <th>Rol</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usersList.map((u) => (
                        <tr key={u.id}>
                          <td>{u.id}</td>
                          <td>{u.full_name}</td>
                          <td>{u.role}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {activeView === 'admin_inventario' && (
            <>
              <h2 style={{ color: 'var(--azul-oscuro)', marginBottom: '20px' }}>Gestión de Inventario</h2>
              <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, backgroundColor: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e0e0e0', minWidth: '300px' }}>
                  <h3>Agregar al Catálogo</h3>
                  <form onSubmit={handleCreateItem} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.9rem', color: 'gray', marginBottom: '5px' }}>Descripción del Equipo:</label>
                      <input type="text" required value={newItem.description} onChange={e => setNewItem({ ...newItem, description: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.9rem', color: 'gray', marginBottom: '5px' }}>No. Serie o Modelo:</label>
                      <input type="text" value={newItem.series_model} onChange={e => setNewItem({ ...newItem, series_model: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.9rem', color: 'gray', marginBottom: '5px' }}>Cantidad:</label>
                      <input type="number" min="1" required value={newItem.quantity} onChange={e => setNewItem({ ...newItem, quantity: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.9rem', color: 'gray', marginBottom: '5px' }}>Notas Fijas (opcional):</label>
                      <input type="text" value={newItem.fixed_notes} onChange={e => setNewItem({ ...newItem, fixed_notes: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
                    </div>
                    <button type="submit" style={{ padding: '12px', backgroundColor: 'var(--azul-oscuro)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', marginTop: '10px' }}>Agregar Equipo</button>
                  </form>
                </div>

                <div style={{ flex: 2 }} className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Descripción</th>
                        <th>No. Serie</th>
                        <th>Cantidad</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stock.map((item) => (
                        <tr key={item.id}>
                          <td>{item.description}</td>
                          <td>{item.series_model || 'N/A'}</td>
                          <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '30px',
          right: '30px',
          backgroundColor: toastMessage.type === 'error' ? '#FF4D4F' : '#4CAF50',
          color: 'white',
          padding: '15px 25px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          fontWeight: 'bold',
          zIndex: 9999,
          animation: 'fadeInOut 3.5s forwards'
        }}>
          {toastMessage.message}
        </div>
      )}
      
      <style>{`
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateY(20px); }
          10% { opacity: 1; transform: translateY(0); }
          90% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(20px); }
        }
      `}</style>
    </div>
  );
}

export default App;