
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'


const SUPABASE_URL = 'https://ssvcasnmvnhmrufueoip.supabase.co'
const SUPABASE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzdmNhc25tdm5obXJ1ZnVlb2lwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5MTE1NjYsImV4cCI6MjA3NzQ4NzU2Nn0.hQ6_8mkJf0wtTP9tl_y5cmOAeNxvlhalzsfCFnSLj-Q'


const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const loginSection = document.getElementById('login-section')
const loginForm = document.getElementById('login-form')
const adminPanel = document.getElementById('admin-panel')
const createForm = document.getElementById('create-form')
const adminRaids = document.getElementById('admin-raids')
const logoutBtn = document.getElementById('logout')


async function init() {
  const { data } = await supabase.auth.getSession()
  if (data.session) {
    showPanel()
    loadAdminRaids()
  } else {
    showLogin()
  }
}
init()

function showLogin() {
  loginSection.classList.remove('hidden')
  adminPanel.classList.add('hidden')
}
function showPanel() {
  loginSection.classList.add('hidden')
  adminPanel.classList.remove('hidden')
}


loginForm.addEventListener('submit', async (e) => {
  e.preventDefault()
  const email = document.getElementById('email').value
  const password = document.getElementById('password').value

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  if (error) {
    alert('Error login: ' + error.message)
    return
  }
  showPanel()
  loadAdminRaids()
})


logoutBtn.addEventListener('click', async () => {
  await supabase.auth.signOut()
  showLogin()
})


createForm.addEventListener('submit', async (e) => {
  e.preventDefault()
  const title = document.getElementById('title').value
  const difficulty = document.getElementById('difficulty').value
  const description = document.getElementById('description').value
  const dateVal = document.getElementById('date').value
  const { data: user } = await supabase.auth.getUser()
  if (!user?.user) {
    alert('No autorizado')
    return
  }

  const payload = {
    user_id: user.user.id,
    title,
    difficulty,
    description,
    date: new Date(dateVal).toISOString(),
    finalizada: false,
  }

  const { error } = await supabase.from('raids').insert([payload])
  if (error) {
    console.error(error)
    alert('Error al publicar')
  } else {
    createForm.reset()
    alert('Raid publicada ✅')
  }
})


async function loadAdminRaids() {
  const { data: raids, error: rErr } = await supabase
    .from('raids')
    .select('*')
    .order('created_at', { ascending: false })
  if (rErr) {
    console.error(rErr)
    return
  }

  const { data: signups, error: sErr } = await supabase
    .from('signups')
    .select('*')
    .order('created_at', { ascending: true })
  if (sErr) {
    console.error(sErr)
    return
  }

  adminRaids.innerHTML = ''
  for (const raid of raids) {
    const card = document.createElement('div')
    card.className = 'raid-card'

    const dateObj = new Date(raid.date)
    const dayName = dateObj.toLocaleDateString('es-ES', { weekday: 'long' })
    const time = dateObj.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    })
    const fullDate = dateObj.toLocaleString('es-ES', {
      dateStyle: 'full',
      timeStyle: 'short',
    })

    const estadoHTML = raid.finalizada
      ? `<span class="status-finalizada">🔴 Finalizada</span>`
      : `<span class="status-activa">🟢 Activa</span>`

    card.innerHTML = `
      <div class="raid-head">
        <h3 class="raid-title">${raid.title} — <span class="raid-time">${
      dayName.charAt(0).toUpperCase() + dayName.slice(1)
    } ${time}</span></h3>
        <span class="raid-difficulty">${raid.difficulty}</span>
      </div>
      <p class="small">Creado: ${new Date(
        raid.created_at
      ).toLocaleString()} · Raid: ${fullDate} · ${estadoHTML}</p>
      <p class="admin-raid-desc">${(raid.description ?? '').replace(/\n/g, '<br>')}</p>

      <div class="admin-signups">
        <strong>Participantes:</strong>
      </div>
      <div class="admin-actions">
        <button class="btn-participantes">Participantes</button>
        ${raid.finalizada ? '' : `<button class="btn-finalizar">Finalizar</button>`}
        <button class="btn-eliminar">Eliminar</button>
      </div>
    `

    const signupsDiv = card.querySelector('.admin-signups')
    const btnParticipantes = card.querySelector('.btn-participantes')

    // Participantes ocultos por defecto
    signupsDiv.style.display = 'none'

    btnParticipantes.addEventListener('click', () => {
      signupsDiv.style.display =
        signupsDiv.style.display === 'none' ? 'block' : 'none'
    })

    const related = signups.filter((s) => s.raid_id === raid.id)

    if (related.length === 0) {
      signupsDiv.innerHTML += '<p class="small muted">Sin inscritos</p>'
    } else {
      const order = { tank: 1, healer: 2, dps: 3 }
      related.sort(
        (a, b) =>
          (order[a.role.toLowerCase()] || 99) -
          (order[b.role.toLowerCase()] || 99)
      )

      const totalTanks = related.filter(
        (s) => s.role.toLowerCase() === 'tank'
      ).length
      const totalHealers = related.filter(
        (s) => s.role.toLowerCase() === 'healer'
      ).length
      const totalDps = related.filter(
        (s) => s.role.toLowerCase() === 'dps'
      ).length

      const roleIcons = {
        tank: 'media/tank_icon.png',
        healer: 'media/healer_icon.png',
        dps: 'media/dps_icon.png',
      }

      const classIcons = {
        warrior: 'media/war_icon.png',
        paladin: 'media/paladin_icon.png',
        hunter: 'media/hunter_icon.png',
        rogue: 'media/rogue_icon.png',
        priest: 'media/sacerdote_icon.png',
        dk: 'media/dk_icon.png',
        shaman: 'media/chaman_icon.png',
        mage: 'media/mago_icon.png',
        warlock: 'media/brujo_icon.png',
        monk: 'media/monk_icon.png',
        druid: 'media/druida_icon.png',
        dh: 'media/dh_icon.png',
        evoker: 'media/evoker_icon.png',
      }

      let table = `
        <div class="role-counts">
          <span><img src="${roleIcons.tank}" alt="Tank" class="role-icon"> ${totalTanks}</span>
          <span><img src="${roleIcons.healer}" alt="Healer" class="role-icon"> ${totalHealers}</span>
          <span><img src="${roleIcons.dps}" alt="DPS" class="role-icon"> ${totalDps}</span>
        </div>
        <table><thead><tr><th>Nombre</th><th>Clase</th><th>Rol</th><th>iLvl</th></tr></thead><tbody>
      `
      related.forEach((s) => {
        const role = s.role.toLowerCase()
        const className = s.class.toLowerCase()
        const roleIcon = roleIcons[role] || ''
        const classIcon = classIcons[className] || ''

        table += `
  <tr>
    <td>${escapeHtml(s.player_name)}</td>
    <td>
      <img src="${classIcon}" alt="${className}" class="class-icon-inline">
      <span class="class-name">${className.charAt(0).toUpperCase() + className.slice(1)}</span>
    </td>
    <td><img src="${roleIcon}" alt="${role}" class="role-icon-inline"></td>
    <td>${s.ilvl}</td>
  </tr>
`
      })
      table += '</tbody></table>'
      signupsDiv.innerHTML += table
    }

    //RVENTOS DE BOTONES
    const btnFinalizar = card.querySelector('.btn-finalizar')
    const btnEliminar = card.querySelector('.btn-eliminar')

    if (btnFinalizar) {
      btnFinalizar.addEventListener('click', async () => {
        if (!confirm('¿Marcar esta raid como finalizada?')) return
        const { error } = await supabase
          .from('raids')
          .update({ finalizada: true })
          .eq('id', raid.id)
        if (error) alert('Error al finalizar')
        else loadAdminRaids()
      })
    }

    btnEliminar.addEventListener('click', async () => {
      if (!confirm('¿Eliminar esta raid permanentemente?')) return
      const { error } = await supabase.from('raids').delete().eq('id', raid.id)
      if (error) alert('Error al eliminar')
      else loadAdminRaids()
    })

    adminRaids.appendChild(card)
  }
}


supabase
  .channel('admin-updates')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'raids' },
    () => loadAdminRaids()
  )
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'signups' },
    () => loadAdminRaids()
  )
  .subscribe()

function escapeHtml(s) {
  return String(s || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

