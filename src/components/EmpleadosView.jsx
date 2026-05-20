const AVATAR_COLORS = ['#2c5f8a','#27824b','#c0392b','#6a5acd','#b5651d','#0e7490','#78716c','#1a7a4a','#8b2fc9','#2980b9']

function getInitials(n) { return (n || '').split(' ').map(x=>x[0]).join('').toUpperCase().slice(0,2) }

export default function EmpleadosView({ empleados, ausencias, onEdit }) {
  const year = new Date().getFullYear()

  return (
    <div>
      <div className="section-header">
        <div className="section-title">Vista por empleado · {year}</div>
      </div>
      {empleados.map((e, idx) => {
        const myAbs = ausencias.filter(a => a.emp_id === e.id && (a.inicio?.startsWith(year) || a.fin?.startsWith(year)))
        const totalDias = myAbs.reduce((s,a) => s + (a.dias||0), 0)
        const vacDias = myAbs.filter(a=>a.tipo==='Vacaciones').reduce((s,a)=>s+(a.dias||0),0)
        const bajaDias = myAbs.filter(a=>a.tipo==='Baja médica').reduce((s,a)=>s+(a.dias||0),0)
        const pendiente = myAbs.filter(a=>a.estado==='Solicitada'||a.estado==='Pendiente de justificar').length
        const color = AVATAR_COLORS[idx % AVATAR_COLORS.length]
        return (
          <div key={e.id} className="emp-card">
            <div className="emp-avatar" style={{background:color}}>{getInitials(`${e.nombre} ${e.apellidos||''}`)}</div>
            <div className="emp-info">
              <div className="emp-name">
                {e.nombre} {e.apellidos || ''}
                {pendiente > 0 && <span className="overlap-badge" style={{marginLeft:8,fontSize:11}}>⏳ {pendiente} pendiente{pendiente>1?'s':''}</span>}
              </div>
              <div className="emp-dept">{e.departamento}</div>
            </div>
            <div className="emp-stats">
              <div className="emp-stat"><div className="emp-stat-val" style={{color:'#2c5f8a'}}>{vacDias}</div><div className="emp-stat-lbl">Vacaciones</div></div>
              <div className="emp-stat"><div className="emp-stat-val" style={{color:'#c0392b'}}>{bajaDias}</div><div className="emp-stat-lbl">Bajas</div></div>
              <div className="emp-stat"><div className="emp-stat-val">{totalDias}</div><div className="emp-stat-lbl">Total días</div></div>
              <div className="emp-stat"><div className="emp-stat-val" style={{color:'#6b6860'}}>{myAbs.length}</div><div className="emp-stat-lbl">Registros</div></div>
            </div>
          </div>
        )
      })}
      {empleados.length === 0 && <div className="empty-state"><div className="empty-icon">👥</div><div>Sin empleados</div></div>}
    </div>
  )
}
