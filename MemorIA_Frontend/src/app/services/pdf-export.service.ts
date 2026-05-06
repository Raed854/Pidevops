import { Injectable } from '@angular/core';
import { Patient } from '../models/patient.model';
import { Reminder, ReminderStatus, ReminderType } from '../models/reminder.model';
import { AdherenceMetrics } from '../models/doctor-planning.model';

@Injectable({ providedIn: 'root' })
export class PdfExportService {

  // ── Palette MemoriA ───────────────────────────────────────────────
  private readonly VIOLET   = '#541A75';
  private readonly GREEN    = '#00635D';
  private readonly RED      = '#CB1527';
  private readonly GREY     = '#7E7F9A';
  private readonly TEAL_BG  = '#C0E0DE';

  /**
   * Exporte le rapport complet du patient au format PDF via impression navigateur.
   * Crée un iframe caché avec un HTML stylisé médical, puis déclenche window.print().
   */
  exportPatientReport(
    patient: Patient,
    reminders: Reminder[],
    stats: AdherenceMetrics | null,
    month: Date
  ): void {
    const html = this.buildReportHtml(patient, reminders, stats, month);
    this.printHtml(html, `rapport_${patient.nom}_${patient.prenom}`);
  }

  // ─────────────────────────────────────────────────────────────────
  // Construction du HTML du rapport
  // ─────────────────────────────────────────────────────────────────
  private buildReportHtml(
    patient: Patient,
    reminders: Reminder[],
    stats: AdherenceMetrics | null,
    month: Date
  ): string {

    const today = new Date().toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric'
    });
    const monthLabel = month.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    const stageLabels: Record<string, string> = {
      LEGER: 'Léger', MODERE: 'Modéré', AVANCE: 'Avancé'
    };

    // ── Grouper les rappels par date ─────────────────────────────
    const grouped = this.groupByDate(reminders);
    const sortedDates = Object.keys(grouped).sort();

    // ── Stats résumé ─────────────────────────────────────────────
    const total     = reminders.length;
    const confirmed = reminders.filter(r => r.status === ReminderStatus.CONFIRMED || r.status === ReminderStatus.CONFIRMED_LATE).length;
    const missed    = reminders.filter(r => r.status === ReminderStatus.MISSED).length;
    const pending   = reminders.filter(r => r.status === ReminderStatus.PENDING || r.status === ReminderStatus.PLANNED).length;
    const adherence = total > 0 ? Math.round(confirmed * 100 / total) : 0;

    return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Rapport Patient – ${patient.prenom} ${patient.nom}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    font-size: 11px;
    color: #1a1a2e;
    background: #fff;
  }

  /* ── En-tête ── */
  .header {
    background: linear-gradient(135deg, ${this.VIOLET} 0%, #3d1357 100%);
    color: #fff;
    padding: 20px 28px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .header-logo { display:flex; align-items:center; gap:10px; }
  .header-logo-icon {
    width:44px; height:44px; border-radius:12px;
    background:rgba(255,255,255,0.15);
    display:flex; align-items:center; justify-content:center;
    font-size:22px;
  }
  .header-brand { font-size:22px; font-weight:700; letter-spacing:1px; }
  .header-brand span { color:${this.TEAL_BG}; }
  .header-meta { text-align:right; font-size:10px; opacity:0.85; }
  .header-meta strong { display:block; font-size:12px; margin-bottom:2px; }

  /* ── Fiche patient ── */
  .patient-card {
    background: ${this.TEAL_BG};
    border-left: 5px solid ${this.VIOLET};
    margin: 16px 28px;
    padding: 14px 18px;
    border-radius: 8px;
    display: flex;
    gap: 24px;
    align-items: flex-start;
  }
  .patient-avatar {
    width:54px; height:54px; border-radius:50%;
    background:${this.VIOLET}; color:#fff;
    display:flex; align-items:center; justify-content:center;
    font-size:20px; font-weight:700; flex-shrink:0;
  }
  .patient-info { flex:1; }
  .patient-name { font-size:17px; font-weight:700; color:${this.VIOLET}; }
  .patient-details { margin-top:5px; color:#333; line-height:1.7; }
  .patient-details span { margin-right:16px; }
  .badge-stage {
    display:inline-block; padding:2px 10px; border-radius:20px;
    font-size:10px; font-weight:600;
    background:${this.VIOLET}; color:#fff;
  }
  .badge-stage.leger  { background:#00635D; }
  .badge-stage.modere { background:#F59E0B; color:#fff; }
  .badge-stage.avance { background:${this.RED}; }

  /* ── Section titre ── */
  .section-title {
    background:${this.VIOLET}; color:#fff;
    padding:7px 16px; font-size:12px; font-weight:600;
    margin:14px 28px 0;
    border-radius:6px 6px 0 0;
    display:flex; align-items:center; gap:8px;
  }

  /* ── Stats cards ── */
  .stats-grid {
    display:grid; grid-template-columns:repeat(4,1fr);
    gap:10px; margin:0 28px 14px;
    background:#f8f6fb; padding:12px; border-radius:0 0 8px 8px;
    border:1px solid #e0d6ec; border-top:none;
  }
  .stat-card {
    background:#fff; border-radius:8px; padding:10px 12px;
    text-align:center; border:1px solid #e8e0f0;
  }
  .stat-number { font-size:22px; font-weight:700; }
  .stat-label  { font-size:9px; color:${this.GREY}; margin-top:2px; text-transform:uppercase; letter-spacing:.5px; }
  .color-violet { color:${this.VIOLET}; }
  .color-green  { color:${this.GREEN}; }
  .color-red    { color:${this.RED}; }
  .color-orange { color:#F59E0B; }

  /* ── Barre observance ── */
  .adherence-bar-wrap {
    margin: 0 28px 14px;
    background:#f0eaf7; border-radius:0 0 8px 8px;
    border:1px solid #e0d6ec; border-top:none;
    padding:10px 16px;
  }
  .adherence-label { font-size:10px; color:${this.GREY}; margin-bottom:4px; }
  .adherence-bar {
    height:12px; background:#e0d6ec; border-radius:6px; overflow:hidden;
  }
  .adherence-fill {
    height:100%; border-radius:6px;
    background: linear-gradient(90deg, ${this.GREEN} 0%, #00a896 100%);
    transition: width .3s;
  }
  .adherence-pct { font-size:13px; font-weight:700; color:${this.GREEN}; margin-top:4px; }

  /* ── Tableau rappels par jour ── */
  .day-block {
    margin: 0 28px 10px;
    border:1px solid #e0d6ec; border-radius:8px; overflow:hidden;
  }
  .day-header {
    background:#f0eaf7; padding:6px 14px;
    font-weight:600; font-size:11px; color:${this.VIOLET};
    border-bottom:1px solid #e0d6ec;
  }
  table {
    width:100%; border-collapse:collapse; font-size:10px;
  }
  th {
    background:#f8f6fb; padding:5px 10px;
    text-align:left; color:${this.GREY};
    font-weight:600; text-transform:uppercase;
    font-size:9px; letter-spacing:.4px;
    border-bottom:1px solid #e0d6ec;
  }
  td { padding:5px 10px; border-bottom:1px solid #f0eaf7; }
  tr:last-child td { border-bottom:none; }
  tr:hover td { background:#faf8fd; }

  /* ── Badges statut ── */
  .status-pill {
    display:inline-block; padding:2px 8px;
    border-radius:12px; font-size:9px; font-weight:600;
  }
  .s-confirmed    { background:#d1fae5; color:#065f46; }
  .s-confirmed_late { background:#d1fae5; color:#065f46; }
  .s-pending      { background:#fef3c7; color:#92400e; }
  .s-planned      { background:#e0e7ff; color:#3730a3; }
  .s-missed       { background:#fee2e2; color:#991b1b; }
  .s-rescheduled  { background:#f3e8ff; color:#6b21a8; }
  .s-canceled     { background:#f3f4f6; color:#6b7280; }

  /* ── Badges priorité ── */
  .prio-urgent  { color:${this.RED}; font-weight:700; }
  .prio-high    { color:#F59E0B; font-weight:600; }
  .prio-normal  { color:${this.GREY}; }
  .prio-low     { color:#9CA3AF; }

  /* ── Icônes type ── */
  .type-icon { margin-right:4px; }

  /* ── Pied de page ── */
  .footer {
    margin:18px 28px 0;
    padding:10px 0;
    border-top:2px solid ${this.VIOLET};
    text-align:center;
    font-size:9px;
    color:${this.GREY};
  }
  .footer strong { color:${this.VIOLET}; }

  /* ── Impression ── */
  @media print {
    body { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    .no-print { display:none; }
    .day-block { page-break-inside: avoid; }
  }

  .empty-block {
    text-align:center; padding:20px;
    color:${this.GREY}; font-style:italic;
  }
  .tag-recurrent {
    font-size:8px; padding:1px 6px;
    background:#ede9fe; color:#7c3aed;
    border-radius:10px; margin-left:4px;
  }
</style>
</head>
<body>

<!-- ══ EN-TÊTE ══════════════════════════════════════════════════ -->
<div class="header">
  <div class="header-logo">
    <div class="header-logo-icon">🧠</div>
    <div>
      <div class="header-brand">Memori<span>A</span></div>
      <div style="font-size:10px;opacity:.8">Application de suivi Alzheimer</div>
    </div>
  </div>
  <div class="header-meta">
    <strong>Rapport de Planning Patient</strong>
    Période : ${monthLabel}<br>
    Généré le : ${today}
  </div>
</div>

<!-- ══ FICHE PATIENT ═════════════════════════════════════════════ -->
<div class="section-title">👤 Fiche Patient</div>
<div class="patient-card">
  <div class="patient-avatar">${(patient.prenom[0] + patient.nom[0]).toUpperCase()}</div>
  <div class="patient-info">
    <div class="patient-name">${patient.prenom} ${patient.nom}</div>
    <div class="patient-details">
      <span>🎂 <strong>${patient.age} ans</strong></span>
      <span>🏥 Stade : <span class="badge-stage ${(patient.stage || '').toLowerCase()}">${stageLabels[patient.stage] || patient.stage}</span></span>
      ${patient.dateNaissance ? `<span>📅 Né(e) le : ${new Date(patient.dateNaissance).toLocaleDateString('fr-FR')}</span>` : ''}
      ${patient.sexe ? `<span>⚧ Sexe : ${patient.sexe === 'M' ? 'Masculin' : 'Féminin'}</span>` : ''}
    </div>
    <div class="patient-details" style="margin-top:4px">
      ${patient.groupeSanguin ? `<span>🩸 Groupe sanguin : <strong>${patient.groupeSanguin}</strong></span>` : ''}
      ${patient.mutuelle ? `<span>🏢 Mutuelle : ${patient.mutuelle}</span>` : ''}
      ${patient.adresse ? `<span>📍 ${patient.adresse}${patient.ville ? ', ' + patient.ville : ''}</span>` : ''}
    </div>
  </div>
</div>

<!-- ══ STATISTIQUES ══════════════════════════════════════════════ -->
<div class="section-title">📊 Statistiques d'Observance — ${monthLabel}</div>
<div class="stats-grid">
  <div class="stat-card">
    <div class="stat-number color-violet">${total}</div>
    <div class="stat-label">Total rappels</div>
  </div>
  <div class="stat-card">
    <div class="stat-number color-green">${confirmed}</div>
    <div class="stat-label">Confirmés</div>
  </div>
  <div class="stat-card">
    <div class="stat-number color-red">${missed}</div>
    <div class="stat-label">Manqués</div>
  </div>
  <div class="stat-card">
    <div class="stat-number color-orange">${pending}</div>
    <div class="stat-label">En attente</div>
  </div>
</div>

<div class="section-title" style="margin-top:0;border-radius:0">📈 Taux d'observance global</div>
<div class="adherence-bar-wrap">
  <div class="adherence-label">Observance sur la période (rappels confirmés / total)</div>
  <div class="adherence-bar">
    <div class="adherence-fill" style="width:${adherence}%"></div>
  </div>
  <div class="adherence-pct">${adherence}%
    ${adherence >= 80 ? ' ✅ Excellent' : adherence >= 60 ? ' ⚠️ Acceptable' : ' 🔴 Insuffisant'}
  </div>
</div>

${stats ? this.buildStatsSection(stats) : ''}

<!-- ══ PLANNING DÉTAILLÉ ═════════════════════════════════════════ -->
<div class="section-title" style="margin-top:14px">📅 Planning Détaillé des Rappels</div>

${sortedDates.length === 0
  ? `<div class="empty-block" style="margin:0 28px;border:1px solid #e0d6ec;border-radius:0 0 8px 8px;padding:20px">
      Aucun rappel enregistré pour cette période.
     </div>`
  : sortedDates.map(date => this.buildDayBlock(date, grouped[date])).join('')
}

<!-- ══ PIED DE PAGE ══════════════════════════════════════════════ -->
<div class="footer">
  <strong>MemoriA</strong> — Application de suivi Alzheimer &nbsp;|&nbsp;
  Rapport confidentiel généré automatiquement le ${today} &nbsp;|&nbsp;
  Patient : ${patient.prenom} ${patient.nom} (ID: ${patient.id})
</div>

</body>
</html>`;
  }

  // ── Section stats avancées ────────────────────────────────────────
  private buildStatsSection(stats: AdherenceMetrics): string {
    const overall  = stats.period30days?.overallRate ?? 0;
    const byType   = stats.period30days?.byType ?? [];

    if (byType.length === 0) return '';

    const rows = byType.map((t: any) => `
      <tr>
        <td>${this.getTypeIcon(t.type)} ${this.getTypeLabel(t.type)}</td>
        <td>${t.total ?? 0}</td>
        <td>${t.completed ?? 0}</td>
        <td style="font-weight:600;color:${(t.rate ?? 0) >= 70 ? this.GREEN : this.RED}">${Math.round(t.rate ?? 0)}%</td>
      </tr>`).join('');

    return `
<div class="section-title" style="margin-top:0;border-radius:0">💊 Observance par Catégorie (30 derniers jours)</div>
<div style="margin:0 28px 14px;border:1px solid #e0d6ec;border-radius:0 0 8px 8px;overflow:hidden">
  <table>
    <thead>
      <tr>
        <th>Catégorie</th>
        <th>Total</th>
        <th>Confirmés</th>
        <th>Taux</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</div>`;
  }

  // ── Bloc jour ─────────────────────────────────────────────────────
  private buildDayBlock(dateStr: string, reminders: Reminder[]): string {
    const date = new Date(dateStr);
    const dayLabel = date.toLocaleDateString('fr-FR', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
    });
    const doneCount = reminders.filter(r =>
      r.status === ReminderStatus.CONFIRMED || r.status === ReminderStatus.CONFIRMED_LATE
    ).length;

    const rows = reminders
      .sort((a, b) => (a.reminderTime || '').localeCompare(b.reminderTime || ''))
      .map(r => `
        <tr>
          <td><strong>${r.reminderTime ? r.reminderTime.substring(0,5) : '--:--'}</strong></td>
          <td>${this.getTypeIcon(r.type)} ${this.getTypeLabel(r.type)}${r.isRecurring ? '<span class="tag-recurrent">↻</span>' : ''}</td>
          <td>${r.title}</td>
          <td>${r.description || r.notes || '—'}</td>
          <td><span class="status-pill s-${(r.status || '').toLowerCase()}">${this.getStatusLabel(r.status)}</span></td>
          <td><span class="prio-${(r.priority || 'normal').toLowerCase()}">${this.getPriorityLabel(r.priority)}</span></td>
          <td>${r.durationMinutes ? r.durationMinutes + ' min' : '—'}</td>
        </tr>`).join('');

    return `
<div class="day-block">
  <div class="day-header">
    📅 ${dayLabel}
    <span style="float:right;font-weight:normal;font-size:9px;color:${this.GREY}">
      ${reminders.length} rappel(s) · ${doneCount} confirmé(s)
    </span>
  </div>
  <table>
    <thead>
      <tr>
        <th>Heure</th>
        <th>Type</th>
        <th>Titre</th>
        <th>Description</th>
        <th>Statut</th>
        <th>Priorité</th>
        <th>Durée</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</div>`;
  }

  // ── Helpers labels ────────────────────────────────────────────────
  private getStatusLabel(status: ReminderStatus | string): string {
    const m: Record<string, string> = {
      CONFIRMED: 'Confirmé', CONFIRMED_LATE: 'Confirmé tard',
      PENDING: 'En attente', PLANNED: 'Planifié',
      MISSED: 'Manqué', RESCHEDULED: 'Reporté',
      CANCELED: 'Annulé'
    };
    return m[(status || '').toUpperCase()] || status || '—';
  }

  private getPriorityLabel(priority: any): string {
    const m: Record<string, string> = {
      URGENT: '🔴 Urgent', HIGH: '🟠 Haute',
      NORMAL: '🔵 Normal', LOW: '⚪ Basse'
    };
    return m[(priority || 'NORMAL').toUpperCase()] || priority || 'Normal';
  }

  private getTypeLabel(type: ReminderType | string): string {
    const m: Record<string, string> = {
      MEDICATION: 'Médicament', MEDICATION_VITAL: 'Médicament vital',
      MEAL: 'Repas', PHYSICAL_ACTIVITY: 'Activité physique',
      HYGIENE: 'Hygiène', MEDICAL_APPOINTMENT: 'RDV médical',
      VITAL_SIGNS: 'Signes vitaux', COGNITIVE_TEST: 'Test cognitif',
      FAMILY_CALL: 'Appel famille', WALK: 'Promenade',
      SLEEP_ROUTINE: 'Sommeil', HYDRATION: 'Hydratation', OTHER: 'Autre'
    };
    return m[(type || '').toUpperCase()] || type || 'Autre';
  }

  private getTypeIcon(type: ReminderType | string): string {
    const m: Record<string, string> = {
      MEDICATION: '💊', MEDICATION_VITAL: '💉', MEAL: '🍽',
      PHYSICAL_ACTIVITY: '🏃', HYGIENE: '🚿', MEDICAL_APPOINTMENT: '🏥',
      VITAL_SIGNS: '❤️', COGNITIVE_TEST: '🧠', FAMILY_CALL: '📞',
      WALK: '🚶', SLEEP_ROUTINE: '😴', HYDRATION: '💧', OTHER: '📋'
    };
    return m[(type || '').toUpperCase()] || '📋';
  }

  // ── Grouper reminders par date ────────────────────────────────────
  private groupByDate(reminders: Reminder[]): Record<string, Reminder[]> {
    const groups: Record<string, Reminder[]> = {};
    for (const r of reminders) {
      const key = r.reminderDate || 'unknown';
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    }
    return groups;
  }

  // ── Déclenchement impression ──────────────────────────────────────
  private printHtml(html: string, filename: string): void {
    const iframe = document.createElement('iframe');
    iframe.style.position  = 'fixed';
    iframe.style.right     = '0';
    iframe.style.bottom    = '0';
    iframe.style.width     = '0';
    iframe.style.height    = '0';
    iframe.style.border    = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;
    doc.open();
    doc.write(html);
    doc.close();

    iframe.contentWindow?.focus();
    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 2000);
    }, 500);
  }
}


