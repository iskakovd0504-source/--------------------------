                            <span>💡 Выберите любой столбик на графике выше, чтобы открыть диалоги сотрудника</span>
                        </div>

                        <!-- Discipline Card -->
                        <div style="display:none; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); border-radius:24px; padding:25px;" class="stat-card-v3">
                            <div style="font-weight:800; font-size:13px; color:#EF4444; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:20px; display:flex; align-items:center; gap:8px;">
                                <span style="font-size:16px;">⚠️</span> Дисциплина ношения бейджа
                            </div>
                            <div style="display:flex; flex-direction:column; gap:12px;">
                                ${e.badgeHistory && e.badgeHistory.length > 0 ? e.badgeHistory.map(h => `
                                    <div onclick="showDisciplineIncident('${h.t}', '${h.d.replace("'", "\\'")}')" style="background:rgba(239,68,68,0.03); border:1px solid rgba(239,68,68,0.1); padding:12px 16px; border-radius:12px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; transition: all 0.2s;" onmouseover="this.style.background='rgba(239,68,68,0.06)'; this.style.borderColor='rgba(239,68,68,0.2)';" onmouseout="this.style.background='rgba(239,68,68,0.03)'; this.style.borderColor='rgba(239,68,68,0.1)';">
                                        <div>
                                            <div style="font-size:13px; font-weight:700; color:#fff;">Отключение устройства (Клик для деталей)</div>
                                            <div style="font-size:11px; color:#A0AEC0; margin-top:2px;">Зафиксировано в ${h.t}</div>
                                        </div>
                                        <div style="font-size:11px; font-weight:800; color:#EF4444; background:rgba(239,68,68,0.1); padding:4px 8px; border-radius:6px; text-transform:uppercase;">
                                            Длительность: ${h.d}
                                        </div>
                                    </div>
                                `).join('') : `
                                    <div style="text-align:center; padding:30px 20px; opacity:0.5; font-size:13px; border:1px dashed rgba(255,255,255,0.08); border-radius:12px;" class="discipline-empty">
                                        ✨ Нарушений ношения бейджа не зафиксировано
                                    </div>
                                `}
                            </div>
                        </div>
                    </div>

                    <!-- Right Column: AI Recommendations & AI Coach -->
                    <div style="display:flex; flex-direction:column; gap:30px;">
                        <!-- AI Recommendations -->
                        <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); border-radius:24px; padding:25px;" class="stat-card-v3">
                            <div style="font-weight:800; font-size:13px; color:#A0AEC0; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:20px;">Рекомендации ИИ</div>
                            <div style="display:flex; flex-direction:column; gap:12px;">
                                <div style="background:rgba(16,185,129,0.04); border:1px solid rgba(16,185,129,0.15); border-left:3px solid #10B981; border-radius:12px; padding:12px 16px; font-size:13px;" class="ai-strength-box">
                                    <div style="font-weight:800; color:#10B981; margin-bottom:4px; text-transform:uppercase; font-size:10px; letter-spacing:0.5px;">✓ Сильная сторона</div>
                                    <span style="color:#fff; line-height:1.4;" class="ai-box-text">${aiStrength}</span>
                                </div>
                                <div style="background:rgba(245,158,11,0.04); border:1px solid rgba(245,158,11,0.15); border-left:3px solid #F59E0B; border-radius:12px; padding:12px 16px; font-size:13px;" class="ai-growth-box">
                                    <div style="font-weight:800; color:#F59E0B; margin-bottom:4px; text-transform:uppercase; font-size:10px; letter-spacing:0.5px;">⚠️ Точка роста</div>
                                    <span style="color:#fff; line-height:1.4;" class="ai-box-text">${aiGrowth}</span>
