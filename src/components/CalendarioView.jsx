import { useState } from 'react'

export default function CalendarioView({ ausencias, typeCalColors }) {
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth())

  const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  const today = new Date()

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  let startDow = firstDay.getDay()
  startDow = startDow === 0 ? 6 : startDow - 1

  const inMonth = ausencias.filter(a => {
    const mStart = `${year}-${String(month+1).padStart(2,'0')}-01`
    const mEnd = `${year}-${String(month+1).padStart(2,'0')}-${String(lastDay.getDate()).padStart(2,'0')}`
    return a.inicio <= mEnd && a.fin >= mStart
  })

  function pad(n) { return String(n).padStart(2,'0') }

  const cells = []
  for (let i = 0; i < startDow; i++) {
    const pd = new Date(year, month, -startDow + i + 1)
    cells.push({ date: null, day: pd.getDate(), otherMonth: true })
  }
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const dateStr = `${year}-${pad(month+1)}-${pad(d)}`
    const dow = new Date(year, month, d).getDay()
    const events = inMonth.filter(a => dateStr >= a.inicio && dateStr <= a.fin)
    cells.push({ date: dateStr, day: d, isWeekend: dow === 0 || dow === 6, isToday: new Date(year,month,d).toDateString() === today.toDateString(), events })
  }
  const total = Math.ceil((startDow + lastDay.getDate()) / 7) * 7
  for (let i = lastDay.getDate() + startDow; i < total; i++) {
    cells.push({ date: null, day: i - lastDay.getDate() - startDow + 1, otherMonth: true })
  }

  return (
    <div>
      <div className="cal-nav">
        <button className="btn btn-secondary btn-sm" onClick={() => { if (month === 0) { setMonth(11); setYear(y => y-1) } else setMonth(m => m-1) }}>← Anterior</button>
        <div className="cal-title">{monthNames[month]} {year}</div>
        <button className="btn btn-secondary btn-sm" onClick={() => { if (month === 11) { setMonth(0); setYear(y => y+1) } else setMonth(m => m+1) }}>Siguiente →</button>
      </div>
      <div className="legend" style={{marginBottom:12}}>
        {Object.entries(typeCalColors).map(([tipo,color]) => (
          <div key={tipo} className="legend-item"><div className="legend-dot" style={{background:color}}></div>{tipo}</div>
        ))}
      </div>
      <div className="cal-grid">
        <div className="cal-days-header">
          {['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(d => <div key={d} className="cal-day-name">{d}</div>)}
        </div>
        <div className="cal-cells">
          {cells.map((cell, i) => (
            <div key={i} className={`cal-cell ${cell.otherMonth ? 'other-month' : ''} ${cell.isWeekend ? 'cal-weekend' : ''} ${cell.isToday ? 'today' : ''}`}>
              <div className="cal-date">{cell.day}</div>
              {cell.events?.slice(0,3).map((a,j) => (
                <div key={j} className="cal-event" style={{background:`${typeCalColors[a.tipo] || '#78716c'}20`, color: typeCalColors[a.tipo] || '#78716c'}} title={`${a.emp_nombre} – ${a.tipo}`}>
                  {a.emp_nombre?.split(' ')[0]}
                </div>
              ))}
              {cell.events?.length > 3 && <div style={{fontSize:10,color:'#9e9c96'}}>+{cell.events.length - 3} más</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
