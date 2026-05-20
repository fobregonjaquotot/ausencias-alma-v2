import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'

export default function SolicitudModal({ empleados, ausencias, onClose, onSaved }) {
  const { empId } = useAuth()
  const [tipo, setTipo] = useState('')
  const [inicio, setInicio] = useState('')
  const [fin, setFin] = useState('')
  const [dias, setDias] = useState('')
  const [comentarios, setComentarios] = useState('')
  const [errors, setErrors] = useState({})
  const [overlap, setOverlap] = useState(null)
  const [saving, setSaving] = useState(false)

  const emp = empleados.find(e => e.id === empId)

  function calcDias(i, f) {
    if (!i || !f) return
    const a = new Date(i + 'T00:00:00'), b = new Date(f + 'T00:00:00')
    if (b >= a) {
      const d = Math.round((b - a) / 86400000) + 1
      setDias(d)
      checkOverlap(i, f)
    } else setDias('')
  }

  function checkOverlap(i, f) {
    if (!i || !f) { setOverlap(null); return }
    const found = ausencias.filter(a => {
      if (a.emp_id !== empId) return false
      return !(f < a.inicio || i > a.fin)
    })
    setOverlap(found.length > 0 ? found : null)
  }

  function validate() {
    const e = {}
    if (!tipo) e.tipo = 'Selecciona el tipo de ausencia'
    if (!inicio) e.inicio = 'Indica la fecha de inicio'
    if (!fin) e.fin = 'Indica la fecha de fin'
    if (inicio && fin && fin < inicio) e.fin = 'La fecha fin debe ser posterior al inicio'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setSaving(true)
    const payload = {
      emp_id: empId,
      emp_nombre: emp ? `${emp.nombre} ${emp.apellidos || ''}`.trim() : empId,
      departamento: emp?.departamento || '',
      tipo,
      inicio,
      fin,
      dias: Number(dias) || 1,
      estado: 'Solicitada',
      comentarios,
      doc_referencia: '',
      updated_at: new Date().toISOString()
    }
    await supabase.from('ausencias').insert(payload)
    setSaving(false)
    onSaved()
  }

  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">Solicitar ausencia</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div style={{background:'#e8f0f7',borderRadius:8,padding:'10px 14px',marginBottom:16,fontSize:13,color:'#2c5f8a'}}>
            Tu solicitud quedará en estado <strong>Solicitada</strong> hasta que el responsable la apruebe.
          </div>
          <div className="form-grid">
            <div className="form-group form-full">
              <label className="form-label">Empleado</label>
              <input className="form-input" value={emp ? `${emp.nombre} ${emp.apellidos || ''}` : ''} readOnly style={{background:'#f5f4f0',color:'#6b6860'}} />
            </div>
            <div className="form-group form-full">
              <label className="form-label">Tipo de ausencia <span style={{color:'#c0392b'}}>*</span></label>
              <select className="form-input" value={tipo} onChange={e => setTipo(e.target.value)}>
                <option value="">Seleccionar...</option>
                {['Vacaciones','Permiso retribuido','Permiso no retribuido','Asuntos propios','Formación','Otros'].map(t => <option key={t}>{t}</option>)}
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
            <div className="form-group form-full">
              <label className="form-label">Comentarios</label>
              <textarea className="form-input" value={comentarios} onChange={e => setComentarios(e.target.value)} placeholder="Motivo o comentarios adicionales..." />
            </div>
            {overlap && (
              <div className="form-full">
                <div className="alert-card alert-warn">
                  ⚠️ Ya tienes una ausencia registrada en esas fechas: {overlap.map(o => `${o.tipo} (${o.inicio} – ${o.fin})`).join(', ')}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Enviando...' : 'Enviar solicitud'}
          </button>
        </div>
      </div>
    </div>
  )
}
