import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'
import AusenciaModal from '../components/AusenciaModal'
import SolicitudModal from '../components/SolicitudModal'
import CalendarioView from '../components/CalendarioView'
import EmpleadosView from '../components/EmpleadosView'
import PendientesView from '../components/PendientesView'

const TIPO_COLORS = {
  'Vacaciones': 'badge-vac',
  'Baja médica': 'badge-baja',
  'Permiso retribuido': 'badge-perm-r',
  'Permiso no retribuido': 'badge-perm-nr',
  'Asuntos propios': 'badge-asuntos',
  'Formación': 'badge-form',
  'Otros': 'badge-otros',
}
const ESTADO_COLORS = {
  'Aprobada': 'badge-aprobada',
  'Solicitada': 'badge-solicitada',
  'Rechazada': 'badge-rechazada',
  'Pendiente de justificar': 'badge-pendiente',
}

function fmtFecha(s) {
  if (!s) return ''
  const [y, m, d] = s.split('-')
  return `${d}/${m}/${y}`
}

export default function Dashboard() {
  const { session, userRole, empId } = useAuth()
  const [tab, setTab] = useState('dashboard')
  const [ausencias, setAusencias] = useState([])
  const [empleados, setEmpleados] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingAusencia, setEditingAusencia] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [toast, setToast] = useState(null)
  const [dashMonth, setDashMonth] = useState(new Date().getMonth())
  const [dashYear, setDashYear] = useState(new Date().getFullYear())

  // Filters
  const [solicitudOpen, setSolicitudOpen] = useState(false)

  const [fEmp, setFEmp] = useState('')
  const [fDept, setFDept] = useState('')
  const [fTipo, setFTipo] = useState('')
  const [fEstado, setFEstado] = useState('')
  const [fDesde, setFDesde] = useState('')
  const [fHasta, setFHasta] = useState('')

  const isAdmin = userRole === 'admin'

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    const [{ data: emp }, { data: aus }] = await Promise.all([
      supabase.from('ausencias_empleados').select('*').eq('activo', true).order('nombre'),
      isAdmin
        ? supabase.from('ausencias').select('*').order('inicio', { ascending: false })
        : supabase.from('ausencias').select('*').eq('emp_id', empId).order('inicio', { ascending: false })
    ])
    setEmpleados(emp || [])
    setAusencias(aus || [])
    setLoading(false)
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function handleDelete() {
    await supabase.from('ausencias').delete().eq('id', deleteId)
    setDeleteId(null)
    showToast('Ausencia eliminada')
    fetchData()
  }

  async function handleChangeEstado(id, estado) {
    await supabase.from('ausencias').update({ estado, updated_at: new Date().toISOString() }).eq('id', id)
    showToast(`Ausencia ${estado.toLowerCase()}`)
    fetchData()
  }

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  function exportCSV() {
    const headers = ['Empleado', 'Departamento', 'Tipo', 'Inicio', 'Fin', 'Días', 'Estado', 'Comentarios', 'Documento']
    const rows = filteredAusencias.map(a => [
      a.emp_nombre, a.departamento, a.tipo, a.inicio, a.fin, a.dias,
      a.estado, (a.comentarios || '').replace(/,/g, ' '), a.doc_referencia || ''
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'ausencias_alma.csv'; a.click()
    URL.revokeObjectURL(url)
    showToast('CSV exportado')
  }

  // --- Filtered list ---
  const filteredAusencias = ausencias.filter(a => {
    if (fEmp && a.emp_id !== fEmp) return false
    if (fDept && a.departamento !== fDept) return false
    if (fTipo && a.tipo !== fTipo) return false
    if (fEstado && a.estado !== fEstado) return false
    if (fDesde && a.fin < fDesde) return false
    if (fHasta && a.inicio > fHasta) return false
    return true
  })

  // --- Dashboard KPIs ---
  const monthStr = `${dashYear}-${String(dashMonth + 1).padStart(2, '0')}`
  const inMonth = ausencias.filter(a => a.inicio?.slice(0, 7) <= monthStr && a.fin?.slice(0, 7) >= monthStr)
  const totalDaysMonth = inMonth.reduce((s, a) => s + (a.dias || 0), 0)
  const pending = ausencias.filter(a => a.estado === 'Solicitada' || a.estado === 'Pendiente de justificar')
  const daysInMonth = new Date(dashYear, dashMonth + 1, 0).getDate()
  const absentismo = empleados.length > 0 ? ((totalDaysMonth / (empleados.length * daysInMonth)) * 100).toFixed(1) : 0

  // Overlaps
  function detectOverlaps(list) {
    let count = 0
    for (let i = 0; i < list.length; i++)
      for (let j = i + 1; j < list.length; j++)
        if (list[i].emp_id === list[j].emp_id && !(list[i].fin < list[j].inicio || list[i].inicio > list[j].fin)) count++
    return count
  }
  const overlaps = detectOverlaps(inMonth)

  // Chart data
  const empDays = {}
  empleados.forEach(e => { empDays[e.id] = { nombre: e.nombre, dias: 0 } })
  ausencias.filter(a => a.inicio?.startsWith(dashYear)).forEach(a => { if (empDays[a.emp_id]) empDays[a.emp_id].dias += (a.dias || 0) })
  const sortedEmp = Object.values(empDays).sort((a, b) => b.dias - a.dias)
  const maxEmp = Math.max(1, ...sortedEmp.map(e => e.dias))

  const typeDays = {}
  inMonth.forEach(a => { typeDays[a.tipo] = (typeDays[a.tipo] || 0) + (a.dias || 0) })
  const sortedTypes = Object.entries(typeDays).sort((a, b) => b[1] - a[1])
  const maxType = Math.max(1, ...sortedTypes.map(t => t[1]))

  const typeCalColors = {
    'Vacaciones': '#2c5f8a', 'Baja médica': '#c0392b', 'Permiso retribuido': '#27824b',
    'Permiso no retribuido': '#b5651d', 'Asuntos propios': '#6a5acd', 'Formación': '#0e7490', 'Otros': '#78716c'
  }

  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

  const navItems = [
    { id: 'dashboard', icon: '📊', label: 'Dashboard', adminOnly: false },
    { id: 'calendar', icon: '📅', label: 'Calendario', adminOnly: false },
    { id: 'lista', icon: '📋', label: 'Lista completa', adminOnly: false },
    { id: 'empleados', icon: '👥', label: 'Por empleado', adminOnly: true },
    { id: 'pendientes', icon: '⏳', label: `Aprobaciones${pending.length > 0 ? ` (${pending.length})` : ''}`, adminOnly: true },
  ]

  return (
    <div className="app-wrap">
      {/* HEADER */}
      <header className="header">
        <div className="header-brand">
          <div className="header-logo">GA</div>
          <div>
            <div className="header-title">Gestión de Ausencias</div>
            <div className="header-sub">Grupo Alma Iberia · {isAdmin ? 'Administrador' : 'Comercial'}</div>
          </div>
        </div>
        <div className="header-actions">
          {isAdmin && <button className="btn btn-secondary btn-sm" onClick={exportCSV}>⬇ Exportar CSV</button>}
          {isAdmin && <button className="btn btn-primary" onClick={() => { setEditingAusencia(null); setModalOpen(true) }}>+ Nueva ausencia</button>}
          {!isAdmin && <button className="btn btn-primary" onClick={() => setSolicitudOpen(true)}>+ Solicitar ausencia</button>}
          <button className="btn btn-secondary btn-sm" onClick={handleLogout}>Salir</button>
        </div>
      </header>

      <div className="layout">
        {/* SIDEBAR */}
        <nav className="sidebar">
          <div className="sidebar-section">
            <div className="sidebar-label">Vistas</div>
            {navItems.filter(n => !n.adminOnly || isAdmin).map(n => (
              <div key={n.id} className={`sidebar-item ${tab === n.id ? 'active' : ''}`} onClick={() => setTab(n.id)}>
                <span className="sidebar-icon">{n.icon}</span> {n.label}
              </div>
            ))}
          </div>
          <div className="sidebar-section sidebar-legend">
            <div className="sidebar-label">Tipos</div>
            {Object.entries(typeCalColors).map(([tipo, color]) => (
              <div key={tipo} className="legend-item">
                <div className="legend-dot" style={{ background: color }}></div>
                <span>{tipo}</span>
              </div>
            ))}
          </div>
          <div className="sidebar-user">
            <div className="sidebar-user-email">{session.user.email}</div>
            <div className="sidebar-user-role">{isAdmin ? '🔧 Administrador' : '👤 Comercial'}</div>
          </div>
        </nav>

        {/* MAIN */}
        <main className="main">
          {loading ? (
            <div className="loading-screen" style={{ height: '60vh' }}>
              <div className="loading-logo">GA</div>
              <div className="loading-text">Cargando datos...</div>
            </div>
          ) : (
            <>
              {/* DASHBOARD */}
              {tab === 'dashboard' && (
                <div>
                  <div className="section-header">
                    <div>
                      <div className="section-title">Panel de Control</div>
                      <div className="section-sub">{monthNames[dashMonth]} {dashYear}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <select className="filter-control" value={dashMonth} onChange={e => setDashMonth(+e.target.value)}>
                        {monthNames.map((m, i) => <option key={i} value={i}>{m}</option>)}
                      </select>
                      <select className="filter-control" value={dashYear} onChange={e => setDashYear(+e.target.value)}>
                        {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="kpi-grid">
                    <div className="kpi-card">
                      <div className="kpi-label">Ausencias en el mes</div>
                      <div className="kpi-value">{inMonth.length}</div>
                      <div className="kpi-sub">{totalDaysMonth} días totales</div>
                    </div>
                    <div className="kpi-card">
                      <div className="kpi-label">Empleados ausentes</div>
                      <div className="kpi-value">{new Set(inMonth.map(a => a.emp_id)).size}</div>
                      <div className="kpi-sub">de {empleados.length} en plantilla</div>
                    </div>
                    <div className={`kpi-card ${absentismo > 5 ? 'kpi-alert' : ''}`}>
                      <div className="kpi-label">Absentismo mensual</div>
                      <div className="kpi-value">{absentismo}%</div>
                      <div className="kpi-sub">{absentismo > 5 ? '⚠️ Por encima del umbral' : 'Dentro de parámetros'}</div>
                    </div>
                    {isAdmin && (
                      <div className={`kpi-card ${pending.length > 0 ? 'kpi-alert' : ''}`}>
                        <div className="kpi-label">Pendientes aprobación</div>
                        <div className="kpi-value">{pending.length}</div>
                        <div className="kpi-sub">{pending.length > 0 ? 'Requieren acción' : 'Todo al día'}</div>
                      </div>
                    )}
                    {isAdmin && (
                      <div className={`kpi-card ${overlaps > 0 ? 'kpi-alert' : ''}`}>
                        <div className="kpi-label">Solapamientos</div>
                        <div className="kpi-value">{overlaps}</div>
                        <div className="kpi-sub">{overlaps > 0 ? 'Revisar calendario' : 'Sin conflictos'}</div>
                      </div>
                    )}
                  </div>

                  <div className="chart-row">
                    <div className="chart-card">
                      <div className="chart-title">Días de ausencia por empleado ({dashYear})</div>
                      {sortedEmp.map(e => (
                        <div key={e.nombre} className="bar-row">
                          <div className="bar-label" title={e.nombre}>{e.nombre}</div>
                          <div className="bar-track"><div className="bar-fill" style={{ width: `${(e.dias / maxEmp) * 100}%`, background: '#2c5f8a' }}></div></div>
                          <div className="bar-count">{e.dias}d</div>
                        </div>
                      ))}
                      {sortedEmp.length === 0 && <div className="empty-state">Sin datos</div>}
                    </div>
                    <div className="chart-card">
                      <div className="chart-title">Ausencias por tipo — {monthNames[dashMonth]}</div>
                      {sortedTypes.map(([tipo, dias]) => (
                        <div key={tipo} className="bar-row">
                          <div className="bar-label">{tipo}</div>
                          <div className="bar-track"><div className="bar-fill" style={{ width: `${(dias / maxType) * 100}%`, background: typeCalColors[tipo] || '#78716c' }}></div></div>
                          <div className="bar-count">{dias}d</div>
                        </div>
                      ))}
                      {sortedTypes.length === 0 && <div className="empty-state" style={{ padding: '8px 0' }}>Sin ausencias este mes</div>}
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="chart-row">
                      <div className="chart-card">
                        <div className="chart-title">⏳ Pendientes de aprobación</div>
                        {pending.length === 0 && <div className="empty-state" style={{ padding: '8px 0' }}>✓ Sin pendientes</div>}
                        {pending.slice(0, 5).map(a => (
                          <div key={a.id} className="pending-row">
                            <div>
                              <strong>{a.emp_nombre}</strong>
                              <div style={{ fontSize: 11, color: '#6b6860', marginTop: 2 }}>{a.tipo} · {fmtFecha(a.inicio)}{a.inicio !== a.fin ? ` – ${fmtFecha(a.fin)}` : ''}</div>
                            </div>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button className="btn btn-sm approve-btn" onClick={() => handleChangeEstado(a.id, 'Aprobada')}>✓</button>
                              <button className="btn btn-sm reject-btn" onClick={() => handleChangeEstado(a.id, 'Rechazada')}>✕</button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="chart-card">
                        <div className="chart-title">⚠️ Alertas</div>
                        {overlaps === 0 && pending.length === 0
                          ? <div className="empty-state" style={{ padding: '8px 0' }}>✓ Sin alertas este mes</div>
                          : <>
                            {overlaps > 0 && <div className="alert-card alert-warn">⚡ {overlaps} solapamiento{overlaps > 1 ? 's' : ''} detectado{overlaps > 1 ? 's' : ''} en el mes</div>}
                            {inMonth.filter(a => a.tipo === 'Baja médica' && a.dias >= 5).map(a => (
                              <div key={a.id} className="alert-card alert-warn">🏥 Baja prolongada: <strong>{a.emp_nombre}</strong> — {a.dias} días</div>
                            ))}
                          </>
                        }
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* CALENDAR */}
              {tab === 'calendar' && (
                <CalendarioView ausencias={ausencias} typeCalColors={typeCalColors} />
              )}

              {/* LISTA */}
              {tab === 'lista' && (
                <div>
                  <div className="section-header">
                    <div className="section-title">{isAdmin ? 'Todas las ausencias' : 'Mis ausencias'}</div>
                  </div>
                  {isAdmin && (
                    <div className="filters-bar">
                      <div className="filter-group">
                        <div className="filter-label">Empleado</div>
                        <select className="filter-control" value={fEmp} onChange={e => setFEmp(e.target.value)}>
                          <option value="">Todos</option>
                          {empleados.map(e => <option key={e.id} value={e.id}>{e.nombre} {e.apellidos}</option>)}
                        </select>
                      </div>
                      <div className="filter-group">
                        <div className="filter-label">Tipo</div>
                        <select className="filter-control" value={fTipo} onChange={e => setFTipo(e.target.value)}>
                          <option value="">Todos</option>
                          {['Vacaciones','Baja médica','Permiso retribuido','Permiso no retribuido','Asuntos propios','Formación','Otros'].map(t => <option key={t}>{t}</option>)}
                        </select>
                      </div>
                      <div className="filter-group">
                        <div className="filter-label">Estado</div>
                        <select className="filter-control" value={fEstado} onChange={e => setFEstado(e.target.value)}>
                          <option value="">Todos</option>
                          {['Solicitada','Aprobada','Rechazada','Pendiente de justificar'].map(s => <option key={s}>{s}</option>)}
                        </select>
                      </div>
                      <div className="filter-group">
                        <div className="filter-label">Desde</div>
                        <input type="date" className="filter-control" value={fDesde} onChange={e => setFDesde(e.target.value)} />
                      </div>
                      <div className="filter-group">
                        <div className="filter-label">Hasta</div>
                        <input type="date" className="filter-control" value={fHasta} onChange={e => setFHasta(e.target.value)} />
                      </div>
                      <button className="btn btn-secondary btn-sm" onClick={() => { setFEmp(''); setFDept(''); setFTipo(''); setFEstado(''); setFDesde(''); setFHasta('') }}>✕ Limpiar</button>
                    </div>
                  )}
                  <div className="table-wrap">
                    <div className="table-header-bar">
                      <span className="table-count">{filteredAusencias.length} registro{filteredAusencias.length !== 1 ? 's' : ''}</span>
                      {isAdmin && <button className="btn btn-secondary btn-sm" onClick={exportCSV}>⬇ CSV</button>}
                    </div>
                    <table>
                      <thead>
                        <tr>
                          {isAdmin && <th>Empleado</th>}
                          <th>Tipo</th>
                          <th>Inicio</th>
                          <th>Fin</th>
                          <th>Días</th>
                          <th>Estado</th>
                          <th>Comentarios</th>
                          {isAdmin && <th>Acciones</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAusencias.length === 0 && (
                          <tr><td colSpan={isAdmin ? 8 : 6}><div className="empty-state"><div className="empty-icon">🔍</div><div>Sin registros</div></div></td></tr>
                        )}
                        {filteredAusencias.map(a => (
                          <tr key={a.id}>
                            {isAdmin && <td><strong>{a.emp_nombre}</strong><br /><span style={{ fontSize: 11, color: '#9e9c96' }}>{a.departamento}</span></td>}
                            <td><span className={`badge ${TIPO_COLORS[a.tipo] || 'badge-otros'}`}>{a.tipo}</span></td>
                            <td>{fmtFecha(a.inicio)}</td>
                            <td>{fmtFecha(a.fin)}</td>
                            <td><strong>{a.dias}</strong></td>
                            <td><span className={`badge ${ESTADO_COLORS[a.estado] || 'badge-otros'}`}>{a.estado}</span></td>
                            <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.comentarios || <span style={{ color: '#ccc' }}>—</span>}</td>
                            {isAdmin && (
                              <td>
                                <div style={{ display: 'flex', gap: 4 }}>
                                  <button className="btn btn-secondary btn-sm btn-icon" onClick={() => { setEditingAusencia(a); setModalOpen(true) }}>✏️</button>
                                  <button className="btn btn-danger btn-sm btn-icon" onClick={() => setDeleteId(a.id)}>🗑️</button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* EMPLEADOS */}
              {tab === 'empleados' && isAdmin && (
                <EmpleadosView empleados={empleados} ausencias={ausencias} onEdit={a => { setEditingAusencia(a); setModalOpen(true) }} />
              )}

              {/* PENDIENTES */}
              {tab === 'pendientes' && isAdmin && (
                <PendientesView
                  ausencias={ausencias}
                  onApprove={id => handleChangeEstado(id, 'Aprobada')}
                  onReject={id => handleChangeEstado(id, 'Rechazada')}
                  onEdit={a => { setEditingAusencia(a); setModalOpen(true) }}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* MODAL */}
      {modalOpen && (
        <AusenciaModal
          ausencia={editingAusencia}
          empleados={empleados}
          ausencias={ausencias}
          onClose={() => { setModalOpen(false); setEditingAusencia(null) }}
          onSaved={() => { setModalOpen(false); setEditingAusencia(null); showToast(editingAusencia ? 'Ausencia actualizada' : 'Ausencia registrada'); fetchData() }}
        />
      )}

      {/* CONFIRM DELETE */}
      {deleteId && (
        <div className="modal-overlay open">
          <div className="modal" style={{ width: 380 }}>
            <div className="modal-header">
              <div className="modal-title">Confirmar eliminación</div>
              <button className="modal-close" onClick={() => setDeleteId(null)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ color: '#6b6860' }}>¿Seguro que deseas eliminar esta ausencia? Esta acción no se puede deshacer.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={handleDelete}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* SOLICITUD MODAL */}
      {solicitudOpen && (
        <SolicitudModal
          empleados={empleados}
          ausencias={ausencias}
          onClose={() => setSolicitudOpen(false)}
          onSaved={() => { setSolicitudOpen(false); showToast('Solicitud enviada correctamente'); fetchData() }}
        />
      )}

      {/* TOAST */}
      {toast && (
        <div className="toast-container">
          <div className={`toast ${toast.type}`}>{toast.msg}</div>
        </div>
      )}
    </div>
  )
}
