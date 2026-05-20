import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function AusenciaModal({ ausencia, empleados, ausencias, onClose, onSaved }) {
  const [empId, setEmpId] = useState('')
  const [dept, setDept] = useState('')
  const [tipo, setTipo] = useState('')
  const [inicio, setInicio] = useState('')
  const [fin, setFin] = useState('')
  const [dias, setDias] = useState('')
  const [estado, setEstado] = useState('Solicitada')
  const [comentarios, setComentarios] = useState('')
  const [docRef, setDocRef] = useState('')
  const [errors, setErrors] = useState({})
  const [overlap, setOverlap] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (ausencia) {
      setEmpId(ausencia.emp_id || '')
      setDept(ausencia.departamento || '')
      setTipo(ausencia.tipo || '')
      setInicio(ausencia.inicio || '')
      setFin(ausencia.fin || '')
      setDias(ausencia.dias || '')
      setEstado(ausencia.estado || 'Solicitada')
      setComentarios(ausencia.comentarios || '')
      setDocRef(ausencia.doc_referencia || '')
    }
  }, [ausencia])

  function calcDias(i, f) {
    if (!i || !f) return
    const a = new Date(i + 'T00:00:00'), b = new Date(f + 'T00:00:00')
    if (b >= a) setDias(Math.round((b - a) / 86400000) + 1)
    else setDias('')
    checkOverlap(i, f)
  }

  function checkOverlap(i, f) {
    if (!empId || !i || !f) { setOverlap(null); return }
    const found = ausencias.filter(a => {
      if (ausencia && a.id === ausencia.id) return false
      if (a.emp_id !== empId) return false
      return !(f < a.inicio || i > a.fin)
    })
    setOverlap(found.length > 0 ? found : null)
  }

  function handleEmpChange(id) {
    setEmpId(id)
    const emp = empleados.find(e => e.id === id)
    if (emp) setDept(emp.departamento || '')
    checkOverlap(inicio, fin)
  }

  function validate() {
    const e = {}
    if (!empId) e.empId = 'Selecciona un empleado'
    if (!tipo) e.tipo = 'Selecciona el tipo'
    if (!inicio) e.inicio = 'Indica la fecha de inicio'
    if (!fin) e.fin = 'Indica la fecha de fin'
    if (inicio && fin && fin < inicio) e.fin = 'La fecha fin debe ser posterior al inicio'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setSaving(true)
    const emp = empleados.find(e => e.id === empId)
    const payload = {
      emp_id: empId,
      emp_nombre: emp ? `${emp.nombre} ${emp.apellidos || ''}`.trim() : empId,
      departamento: dept,
      tipo,
      inicio,
      fin,
      dias: Number(dias) || 1,
      estado,
      comentarios,
      doc_referencia: docRef,
      updated_at: new Date().toISOString()
    }
    if (ausencia) {
      await supabase.from('ausencias').update(payload).eq('id', ausencia.id)
    } else {
      await supabase.from('ausencias').insert(payload)
    }
    setSaving(false)
    onSaved()
  }

  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">{ausencia ? 'Editar ausencia' : 'Nueva ausencia'}</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Empleado <span style={{color:'#c0392b'}}>*</span></label>
              <select className="form-input" value={empId} onChange={e => handleEmpChange(e.target.value)}>
                <option value="">Seleccionar...</option>
                {empleados.map(e => <option key={e.id} value={e.id}>{e.nombre} {e.apellidos || ''}</option>)}
              </select>
              {errors.empId && <div className="form-error">{errors.empId}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Departamento</label>
              <input className="form-input" value={dept} readOnly style={{background:'#f5f4f0',color:'#6b6860'}} />
            </div>
            <div className="form-group form-full">
              <label className="form-label">Tipo de ausencia <span style={{color:'#c0392b'}}>*</span></label>
              <select className="form-input" value={tipo} onChange={e => setTipo(e.target.value)}>
                <option value="">Seleccionar...</option>
                {['Vacaciones','Baja médica','Permiso retribuido','Permiso no retribuido','Asuntos propios','Formación','Otros'].map(t => <option key={t}>{t}</option>)}
              </select>
              {errors.tipo && <div className="form-error">{errors.tipo}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Fecha inicio <span style={{color:'#c0392b'}}>*</span></label>
              <input type="date" className="form-input" value={inicio} onChange={e => { setInicio(e.target.value); calcDias(e.target.value, fin) }} />
              {errors.inicio && <div className="form-error">{errors.inicio}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Fecha fin <span style={{color:'#c0392b'}}>*</span></label>
              <input type="date" className="form-input" value={fin} onChange={e => { setFin(e.target.value); calcDias(inicio, e.target.value) }} />
              {errors.fin && <div className="form-error">{errors.fin}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Nº de días</label>
              <input type="number" className="form-input" value={dias} readOnly style={{background:'#f5f4f0',color:'#6b6860'}} />
            </div>
            <div className="form-group">
              <label className="form-label">Estado</label>
              <select className="form-input" value={estado} onChange={e => setEstado(e.target.value)}>
                {['Solicitada','Aprobada','Rechazada','Pendiente de justificar'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group form-full">
              <label className="form-label">Comentarios</label>
              <textarea className="form-input" value={comentarios} onChange={e => setComentarios(e.target.value)} placeholder="Observaciones opcionales..." />
            </div>
            <div className="form-group form-full">
              <label className="form-label">Referencia documento justificativo</label>
              <input type="text" className="form-input" value={docRef} onChange={e => setDocRef(e.target.value)} placeholder="Ej. IT-2025-014, parte médico..." />
            </div>
            {overlap && (
              <div className="form-full">
                <div className="alert-card alert-warn">
                  ⚠️ Solapamiento detectado con: {overlap.map(o => `${o.tipo} (${o.inicio} – ${o.fin})`).join(', ')}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : (ausencia ? 'Actualizar' : 'Guardar ausencia')}
          </button>
        </div>
      </div>
    </div>
  )
}
