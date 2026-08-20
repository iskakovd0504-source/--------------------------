                        { d: "Пт", v: 71 },
                        { d: "Сб", v: 75 },
                        { d: "Вс", v: 72 }
                    ];
                } else if (selectedStationId === 'tobyl') {
                    chartTotal = "75%";
                    chartBarsData = [
                        { d: "Пн", v: 70 },
                        { d: "Вт", v: 75 },
                        { d: "Ср", v: 73 },
                        { d: "Чт", v: 78 },
                        { d: "Пт", v: 75 },
                        { d: "Сб", v: 80 },
                        { d: "Вс", v: 75 }
                    ];
                }
            }

            const chartTotalEl = document.getElementById('chart-total');
            if (chartTotalEl) chartTotalEl.innerText = "Средний показатель: " + chartTotal;

            const chartBarsEl = document.getElementById('chart-bars');
            if (chartBarsEl) {
                const totalNum = parseInt(totalChecked.toString().replace(/\s/g, '')) || 0;
                
                // Determine the number of days in the current filter period to find average daily volume
                let daysCount = 1;
                if (currentTimePeriod === '7d') {
                    daysCount = 7;
                } else if (currentTimePeriod === 'custom') {
                    if (customDateFrom && customDateTo) {
                        const diffTime = Math.abs(new Date(customDateTo) - new Date(customDateFrom));
                        daysCount = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)));
                    } else {
                        daysCount = 7;
                    }
                }
                
                const baseDailyDialogs = Math.max(1, Math.round(totalNum / daysCount));
                
                chartBarsEl.innerHTML = chartBarsData.map(b => {
                    const barColor = b.v >= 75 ? '#10B981' : (b.v >= 70 ? '#F59E0B' : '#EF4444');
                    const barGlow = b.v >= 75 ? 'rgba(16,185,129,0.25)' : (b.v >= 70 ? 'rgba(245,158,11,0.25)' : 'rgba(239,68,68,0.25)');
                    
                    // Distribute based on realistic base counts per day
                    const dayTotal = Math.max(1, Math.round(baseDailyDialogs * (0.95 + (b.v % 3) * 0.05)));
                    const violations = Math.max(0, Math.round(dayTotal * (100 - b.v) / 100));
                    const complied = dayTotal - violations;
                    
                    return `
                        <div class="chart-bar-v3-container" onclick="goToDialogsFromChartBar('${b.d}')" style="--bar-color: ${barColor}; --bar-color-glow: ${barGlow}; cursor: pointer; transition: transform 0.2s;" onmouseover="this.style.transform='scaleY(1.03)'" onmouseout="this.style.transform=''">
                            <div class="chart-tooltip">
                                <div style="font-weight:800; font-size:12px; margin-bottom:4px; color:${barColor};">${b.d} — Соблюдение: ${b.v}%</div>
                                <div style="opacity:0.8;">Проверено диалогов: ${dayTotal}</div>
                                <div style="opacity:0.8; color:#EF4444; font-weight:bold;">Нарушений: ${violations} (клик для разбора)</div>
                            </div>
                            <span class="chart-bar-v3-value">${b.v}%</span>
                            <div class="chart-bar-v3-fill" style="height: ${b.v}%;"></div>
                        </div>
                    `;
                }).join('');
            }
 
            // Top Employees List
            const topList = document.getElementById('top-list');
            if (topList) {
                let stationEmployees = employees.map(e => getDynamicEmployee(e, currentTimePeriod));
                if (selectedStationId && selectedStationId !== 'all') {
                    stationEmployees = stationEmployees.filter(e => e.stationId === selectedStationId);
                }
                const sortedEmps = [...stationEmployees].sort((a, b) => b.score - a.score);
                topList.innerHTML = sortedEmps.slice(0, 3).map((e, index) => {
                    let awardIcon = e.name[0];
                    let awardStyle = `width:32px; height:32px; border-radius:50%; background:var(--gradient-primary); display:flex; align-items:center; justify-content:center; font-weight:800; font-size:12px;`;
                    if (index === 0) {
                        awardIcon = '🏆';
                        awardStyle = `width:32px; height:32px; border-radius:50%; background:radial-gradient(circle, #FBBF24 0%, #D97706 100%); display:flex; align-items:center; justify-content:center; font-size:16px; box-shadow: 0 0 10px rgba(251, 191, 36, 0.4);`;
                    } else if (index === 1) {
                        awardIcon = '🥈';
                        awardStyle = `width:32px; height:32px; border-radius:50%; background:radial-gradient(circle, #E2E8F0 0%, #94A3B8 100%); display:flex; align-items:center; justify-content:center; font-size:16px; box-shadow: 0 0 10px rgba(148, 163, 184, 0.3);`;
                    } else if (index === 2) {
