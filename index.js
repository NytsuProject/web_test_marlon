// index.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/* === CONFIGURA ESTO === */
const SUPABASE_URL = 'https://ssvcasnmvnhmrufueoip.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzdmNhc25tdm5obXJ1ZnVlb2lwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5MTE1NjYsImV4cCI6MjA3NzQ4NzU2Nn0.hQ6_8mkJf0wtTP9tl_y5cmOAeNxvlhalzsfCFnSLj-Q'
/* ======================= */

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
const board = document.getElementById('board')
const raidTemplate = document.getElementById('raid-template')

/* === Inicialización === */
async function loadRaids() {
  const { data: raids, error } = await supabase
    .from('raids')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error(error)
    board.innerHTML = '<p class="error">Error al cargar las raids.</p>'
    return
  }

  board.innerHTML = ''
  for (const raid of raids) {
    const raidEl = raidTemplate.content.cloneNode(true)
    const raidTitleEl = raidEl.querySelector('.raid-title')
    const dateObj = new Date(raid.date)
    const dayName = dateObj.toLocaleDateString('es-ES', { weekday: 'long' })
    const time = dateObj.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    raidTitleEl.textContent = `${raid.title} — ${dayName.charAt(0).toUpperCase() + dayName.slice(1)} ${time}`

    raidEl.querySelector('.raid-difficulty').textContent = raid.difficulty
    raidEl.querySelector('.raid-meta').textContent =
      `🕒 ${new Date(raid.date).toLocaleString()} | Publicado: ${new Date(raid.created_at).toLocaleDateString()}`
    raidEl.querySelector('.raid-desc').textContent = raid.description ?? ''
    

    const signupArea = raidEl.querySelector('.signup-area')
    const form = raidEl.querySelector('.signup-form')
    const toggleBtn = raidEl.querySelector('.toggle-signup')
    const classSelect = raidEl.querySelector('select[name="class"]')
    const publicSignupsDiv = raidEl.querySelector('.public-signups')

    // Llenar clases
    const classes = ['Warrior', 'Paladin', 'Hunter', 'Rogue', 'Priest', 'DK', 'Shaman', 'Mage', 'Warlock', 'Monk', 'Druid', 'DH', 'Evoker']
    classSelect.innerHTML = classes.map(c => `<option>${c}</option>`).join('')

    toggleBtn.addEventListener('click', () => form.classList.toggle('hidden'))

    // Si la raid está finalizada, desactivar formulario y mostrar estado
    if (raid.finalizada) {
      signupArea.innerHTML = `
        <p class="status-finalizada">🔴 Raid finalizada</p>
        <div class="public-signups"></div>
      `
      const publicDiv = signupArea.querySelector('.public-signups')
      await loadSignups(raid.id, publicDiv, true) // <- mostrar solo conteo
      board.appendChild(raidEl)
      continue
    }

    // Enviar participación
    form.addEventListener('submit', async (e) => {
      e.preventDefault()
      const formData = new FormData(form)
      const payload = {
        raid_id: raid.id,
        player_name: formData.get('player_name'),
        class: formData.get('class'),
        role: formData.get('role'),
        ilvl: parseInt(formData.get('ilvl')),
      }
      const { error } = await supabase.from('signups').insert([payload])
      if (error) alert('❌ Error al registrar: ' + error.message)
      else {
        form.reset()
        form.classList.add('hidden')
        alert('✅ Registrado correctamente')
      }
    })

    // Cargar inscritos
    await loadSignups(raid.id, publicSignupsDiv, false)
    board.appendChild(raidEl)
  }
}

/* === Cargar inscritos de una raid === */
async function loadSignups(raidId, container, soloConteo = false) {
  const { data: signups, error } = await supabase
    .from('signups')
    .select('*')
    .eq('raid_id', raidId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error(error)
    container.innerHTML = '<p class="small muted">Error al cargar participantes</p>'
    return
  }

  const totalTanks = signups.filter(s => s.role.toLowerCase() === 'tank').length
  const totalHealers = signups.filter(s => s.role.toLowerCase() === 'healer').length
  const totalDps = signups.filter(s => s.role.toLowerCase() === 'dps').length

  const roleIcons = {
    tank: 'media/tank_icon.png',
    healer: 'media/healer_icon.png',
    dps: 'media/dps_icon.png'
  }

  // Solo mostrar conteo
  if (soloConteo) {
    container.innerHTML = `
      <div class="role-counts">
        <span><img src="${roleIcons.tank}" class="role-icon" alt="Tank"> ${totalTanks}</span>
        <span><img src="${roleIcons.healer}" class="role-icon" alt="Healer"> ${totalHealers}</span>
        <span><img src="${roleIcons.dps}" class="role-icon" alt="DPS"> ${totalDps}</span>
      </div>
    `
    return
  }

  if (signups.length === 0) {
    container.innerHTML = '<p class="small muted">Aún no hay inscritos</p>'
    return
  }

  // Ordenar: tanks → healers → dps
  const order = { tank: 1, healer: 2, dps: 3 }
  signups.sort((a, b) => (order[a.role.toLowerCase()] || 99) - (order[b.role.toLowerCase()] || 99))

  let table = `
    <div class="role-counts">
      <span><img src="${roleIcons.tank}" class="role-icon" alt="Tank"> ${totalTanks}</span>
      <span><img src="${roleIcons.healer}" class="role-icon" alt="Healer"> ${totalHealers}</span>
      <span><img src="${roleIcons.dps}" class="role-icon" alt="DPS"> ${totalDps}</span>
    </div>
    <table class="public-table">
      <thead><tr><th>Nombre</th><th>Clase</th><th>Rol</th><th>iLvl</th></tr></thead>
      <tbody>
  `
  for (const s of signups) {
    table += `
      <tr>
        <td>${escapeHtml(s.player_name)}</td>
        <td>${escapeHtml(s.class)}</td>
        <td>${escapeHtml(s.role)}</td>
        <td>${s.ilvl}</td>
      </tr>
    `
  }
  table += '</tbody></table>'
  container.innerHTML = table
}

/* === Realtime actualizaciones === */
supabase
  .channel('public-updates')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'signups' }, () => loadRaids())
  .on('postgres_changes', { event: '*', schema: 'public', table: 'raids' }, () => loadRaids())
  .subscribe()

loadRaids()

/* === Sanitizador === */
function escapeHtml(s) {
  return String(s || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}
