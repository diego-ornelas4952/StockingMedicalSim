import { useState, useEffect } from 'react';
import Items from './components/items.jsx';
function App() {

  const [stock, setStock] = useState([]);

  useEffect(() => {
    fetch('http://localhost:3000/api/items')
      .then(response => response.json())
      .then(data => setStock(data))
      .catch(error => console.error('Error fetching items:', error));
  }, []);

  return (
    <div>
      <header style={{ backgroundColor: 'var(--azul-oscuro)', color: 'white', padding: '1rem 2rem', display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{ background: 'white', color: 'var(--azul-oscuro)', padding: '10px', borderRadius: '5px', fontWeight: 'bold' }}>
          LOGO UdeG
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Laboratorio de Simulación - CUAltos</h1>
          <p style={{ margin: 0, color: 'var(--azul-claro)' }}>Checklist de Inventario</p>
        </div>
      </header>

      <main style={{ padding: '3rem', maxWidth: '1000px', margin: '0 auto' }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: '10%', textAlign: 'center' }}>¿Está?</th>
              <th style={{ width: '45%' }}>Descripción del Equipo</th>
              <th style={{ width: '15%' }}>No. Serie / Modelo</th>
              <th style={{ width: '40%' }}>Comentarios</th>
            </tr>
          </thead>
          <tbody>
            {stock.map((item) => (
              <Items key={item.id} item={item} />
            ))}
          </tbody>
        </table>

        <button style={{
          marginTop: '20px', float: 'right', padding: '12px 24px',
          backgroundColor: 'var(--azul-oscuro)', color: 'white',
          border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold'
        }}>
          Guardar y Exportar PDF
        </button>
      </main>
    </div>
  );
}

export default App;