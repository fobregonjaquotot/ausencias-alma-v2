function fmtFecha(s) {
  if (!s) return ''
  const [y,m,d] = s.split('-')
  return `${d}/${m}/${y}`
}

const TIPO_COLORS = {
  'Vacaciones':'badge-vac','Baja médica':'badge-baja','Permiso retribuido':'badge-perm-r',
  'Permiso no retribuido':'badge-perm-nr','Asuntos propios':'badge-asuntos','Formación':'badge-form','Otros':'badge-otros'
}
const ESTADO_COLORS = {
  'Aprobada':'badge-aprobada','Solicitada':'badge-solicitada','Rechazada':'badge-rechazada','Pendiente de justificar':'badge-pendiente'
}

export default function PendientesView({ ausencias, onApprove, onReject, onEdit }) {
  const list = ausencias
    .filter(a => a.estado === 'Solicitada' || a.estado === 'Pendiente de justificar')
    .sort((a,b) => a.inicio?.localeCompare(b.inicio))

  return (
    <div>
      <div className="section-header">
        <div className="section-title">Pendientes de aprobación</div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Empleado</th><th>Tipo</th><th>Inicio</th><th>Fin</th><th>Días</th><th>Estado</th><th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr><td colSpan={7}><div className="empty-state"><div className="empty-icon">✅</div><div>No hay ausencias pendientes</div></div></td></tr>
            )}
            {list.map(a => (
              <tr key={a.id}>
                <td><strong>{a.emp_nombre}</strong><br/><span style={{fontSize:11,color:'#9e9c96'}}>{a.departamento}</span></td>
                <td><span className={`badge ${TIPO_COLORS[a.tipo]||'badge-otros'}`}>{a.tipo}</span></td>
                <td>{fmtFecha(a.inicio)}</td>
                <td>{fmtFecha(a.fin)}</td>
                <td>{a.dias}</td>
                <td><span className={`badge ${ESTADO_COLORS[a.estado]||'badge-otros'}`}>{a.estado}</span></td>
                <td>
                  <div style={{display:'flex',gap:4}}>
                    <button className="btn btn-sm approve-btn" onClick={() => onApprove(a.id)}>✓ Aprobar</button>
                    <button className="btn btn-sm reject-btn" onClick={() => onReject(a.id)}>✕ Rechazar</button>
                    <button className="btn btn-secondary btn-sm btn-icon" onClick={() => onEdit(a)}>✏️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
