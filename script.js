document.addEventListener('DOMContentLoaded', () => {
    // --- State Management ---
    let appData = JSON.parse(localStorage.getItem('ecopulse_data')) || {
        points: 0,
        badges: [],
        lastFootprint: null,
        history: [],
        completedSuggestions: []
    };

    // Ensure backwards compatibility if user already has data in localStorage
    if (!appData.completedSuggestions) {
        appData.completedSuggestions = [];
    }

    // --- DOM Elements ---
    const form = document.getElementById('footprint-form');
    const resetBtn = document.getElementById('reset-btn');
    
    // Display elements
    const totalCo2Display = document.getElementById('total-co2-display');
    const co2Status = document.getElementById('co2-status');
    const navPoints = document.getElementById('nav-points');
    const totalPoints = document.getElementById('total-points');
    const badgesContainer = document.getElementById('badges-container');
    const breakdownContainer = document.getElementById('breakdown-container');
    const suggestionsContainer = document.getElementById('suggestions-container');
    const suggestionsSection = document.getElementById('suggestions');

    // Bars
    const bars = {
        energy: { fill: document.getElementById('energy-bar'), pct: document.getElementById('energy-pct') },
        travel: { fill: document.getElementById('travel-bar'), pct: document.getElementById('travel-pct') },
        food: { fill: document.getElementById('food-bar'), pct: document.getElementById('food-pct') },
        plastic: { fill: document.getElementById('plastic-bar'), pct: document.getElementById('plastic-pct') }
    };

    // --- Initialization ---
    updateDashboard();

    // --- Event Listeners ---
    form.addEventListener('submit', handleCalculate);
    resetBtn.addEventListener('click', handleReset);

    // Smooth scroll for nav
    document.querySelectorAll('nav a').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelectorAll('nav a').forEach(a => a.classList.remove('active'));
            this.classList.add('active');
            const targetId = this.getAttribute('href');
            document.querySelector(targetId).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });

    // --- Logic Functions ---

    function handleCalculate(e) {
        e.preventDefault();

        // Get Input Values
        const energyKwh = parseFloat(document.getElementById('energy-usage').value) || 0;
        const travelKm = parseFloat(document.getElementById('travel-usage').value) || 0;
        const dietType = document.getElementById('food-diet').value;
        const plasticItems = parseFloat(document.getElementById('plastic-usage').value) || 0;

        // Calculate Annual CO2 (in kg)
        // Energy: ~0.4 kg CO2 per kWh * 12 months
        const energyCo2 = energyKwh * 12 * 0.4;
        
        // Travel: ~0.2 kg CO2 per km * 52 weeks
        const travelCo2 = travelKm * 52 * 0.2;
        
        // Plastic: ~0.1 kg CO2 per item * 52 weeks
        const plasticCo2 = plasticItems * 52 * 0.1;
        
        // Food: Based on diet
        let foodCo2 = 2500; // default average
        switch(dietType) {
            case 'vegan': foodCo2 = 1500; break;
            case 'vegetarian': foodCo2 = 1700; break;
            case 'pescatarian': foodCo2 = 1900; break;
            case 'average': foodCo2 = 2500; break;
            case 'meat-heavy': foodCo2 = 3300; break;
        }

        const totalCo2 = energyCo2 + travelCo2 + plasticCo2 + foodCo2;
        const breakdown = { energy: energyCo2, travel: travelCo2, food: foodCo2, plastic: plasticCo2 };

        // Award initial points & badges
        awardPoints(totalCo2);
        checkBadges(totalCo2);

        // Update state
        appData.lastFootprint = { total: totalCo2, breakdown: breakdown };
        appData.history.push({ date: new Date().toISOString(), total: totalCo2 });
        saveData();

        // Update UI
        updateDashboard();

        // Scroll to top dashboard smoothly
        document.getElementById('dashboard').scrollIntoView({ behavior: 'smooth' });
    }

    function awardPoints(totalCo2) {
        // Base points for calculating
        let newPoints = 10;
        
        // Bonus points for lower footprints
        if (totalCo2 < 3000) newPoints += 50;
        else if (totalCo2 < 5000) newPoints += 30;
        else if (totalCo2 < 7000) newPoints += 10;

        appData.points += newPoints;
        
        // Simple scale effect on points badge
        const pointsBadge = document.querySelector('.points-badge');
        if (pointsBadge) {
            pointsBadge.style.transform = 'scale(1.15)';
            setTimeout(() => pointsBadge.style.transform = 'scale(1)', 300);
        }
    }

    function checkBadges(totalCo2) {
        const potentialBadges = [];
        
        if (totalCo2 < 3000) {
            potentialBadges.push({ id: 'earth-guardian', icon: 'ri-earth-fill', title: 'Earth Guardian', color: '#10b981' });
        }
        if (totalCo2 < 5000) {
            potentialBadges.push({ id: 'eco-warrior', icon: 'ri-sword-fill', title: 'Eco Warrior', color: '#3b82f6' });
        }
        if (totalCo2 < 8000) {
            potentialBadges.push({ id: 'carbon-conscious', icon: 'ri-leaf-fill', title: 'Carbon Conscious', color: '#f59e0b' });
        }

        // Add new badges if not already earned
        potentialBadges.forEach(badge => {
            if (!appData.badges.find(b => b.id === badge.id)) {
                appData.badges.push(badge);
            }
        });
    }

    function updateDashboard() {
        navPoints.textContent = appData.points;
        totalPoints.textContent = appData.points;

        if (appData.lastFootprint) {
            const { total, breakdown } = appData.lastFootprint;
            
            // Total display with animation
            animateValue(totalCo2Display, 0, total, 1000);

            // Status Badge
            co2Status.className = 'status-badge';
            if (total < 4000) {
                co2Status.textContent = "Excellent! Below Average.";
                co2Status.classList.add('good');
            } else if (total < 7000) {
                co2Status.textContent = "Average Footprint.";
                co2Status.classList.add('average');
            } else {
                co2Status.textContent = "High! Needs Improvement.";
                co2Status.classList.add('bad');
            }

            // Breakdown Bars
            breakdownContainer.style.display = 'block';
            for (const [key, value] of Object.entries(breakdown)) {
                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                setTimeout(() => {
                    bars[key].fill.style.width = `${percentage}%`;
                    bars[key].pct.textContent = `${percentage}%`;
                }, 100); // slight delay for animation
            }

            generateSuggestions(breakdown);
        } else {
            breakdownContainer.style.display = 'none';
        }

        // Render Badges
        renderBadges();
    }

    function renderBadges() {
        if (appData.badges.length === 0) {
            badgesContainer.innerHTML = `<div class="empty-state">Complete a calculation to earn badges</div>`;
            return;
        }

        badgesContainer.innerHTML = '';
        appData.badges.forEach(badge => {
            const bEl = document.createElement('div');
            bEl.className = 'badge fade-in';
            bEl.title = badge.title;
            bEl.innerHTML = `<i class="${badge.icon}" style="color: ${badge.color};"></i>`;
            badgesContainer.appendChild(bEl);
        });
    }

    function generateSuggestions(breakdown) {
        suggestionsSection.style.display = 'block';
        suggestionsContainer.innerHTML = '';

        // Find highest contributor
        let maxCategory = Object.keys(breakdown).reduce((a, b) => breakdown[a] > breakdown[b] ? a : b);

        const allSuggestions = {
            energy: [
                { id: 'sug-renewables', category: 'energy', icon: 'ri-sun-line', title: 'Switch to Renewables', text: 'Consider changing your electricity tariff to a 100% renewable energy provider.', reward: 25 },
                { id: 'sug-unplug', category: 'energy', icon: 'ri-plug-line', title: 'Unplug Devices', text: 'Vampire power can account for up to 10% of your energy bill. Unplug when not in use.', reward: 15 }
            ],
            travel: [
                { id: 'sug-transit', category: 'travel', icon: 'ri-bus-line', title: 'Public Transit', text: 'Try replacing just two car trips a week with public transit or cycling to cut emissions heavily.', reward: 25 },
                { id: 'sug-carpool', category: 'travel', icon: 'ri-car-washing-line', title: 'Carpooling', text: 'Share your commute! Carpooling reduces your travel footprint by half.', reward: 20 }
            ],
            food: [
                { id: 'sug-plant-based', category: 'food', icon: 'ri-plant-line', title: 'Plant-Based Days', text: 'Introduce Meatless Mondays! Eating plant-based just one day a week saves significant CO2.', reward: 20 },
                { id: 'sug-local', category: 'food', icon: 'ri-shopping-basket-line', title: 'Local Produce', text: 'Buy locally sourced seasonal food to reduce transportation emissions.', reward: 15 }
            ],
            plastic: [
                { id: 'sug-reusable', category: 'plastic', icon: 'ri-cup-line', title: 'Reusable Items', text: 'Invest in a high-quality reusable water bottle and coffee cup.', reward: 15 },
                { id: 'sug-tote', category: 'plastic', icon: 'ri-shopping-bag-line', title: 'Tote Bags', text: 'Keep a few cloth bags in your car or backpack so you never need plastic ones.', reward: 15 }
            ]
        };

        const generalSugs = [
            { id: 'sug-tree', category: 'general', icon: 'ri-tree-line', title: 'Plant a Tree', text: 'Offset your remaining carbon footprint by supporting reforestation projects.', reward: 30 }
        ];

        // Combine category-specific and general suggestions
        const topSugs = allSuggestions[maxCategory] || [];
        const displaySugs = [...topSugs, generalSugs[0]];

        displaySugs.forEach((sug, index) => {
            const isCompleted = appData.completedSuggestions.includes(sug.id);
            const el = document.createElement('div');
            el.className = `suggestion-card fade-in ${sug.category} ${isCompleted ? 'completed' : ''}`;
            el.style.animationDelay = `${index * 0.1}s`;
            
            const btnHtml = isCompleted 
                ? `<button class="btn-complete" disabled><i class="ri-checkbox-circle-fill"></i> Completed</button>`
                : `<button class="btn-complete" data-id="${sug.id}"><i class="ri-checkbox-blank-circle-line"></i> Mark Done</button>`;

            el.innerHTML = `
                <div class="sug-header">
                    <span class="sug-category-tag ${sug.category}">${sug.category}</span>
                    <h4><i class="${sug.icon}"></i> ${sug.title}</h4>
                </div>
                <p>${sug.text}</p>
                <div class="suggestion-action">
                    <span class="points-reward"><i class="ri-copper-coin-line"></i> +${sug.reward} pts</span>
                    ${btnHtml}
                </div>
            `;
            
            if (!isCompleted) {
                const btn = el.querySelector('.btn-complete');
                btn.addEventListener('click', () => completeSuggestion(sug.id, sug.reward));
            }
            
            suggestionsContainer.appendChild(el);
        });
    }

    function completeSuggestion(id, reward) {
        if (appData.completedSuggestions.includes(id)) return;
        
        appData.completedSuggestions.push(id);
        appData.points += reward;
        saveData();
        
        // Animate coin counter scale bump
        const totalPointsEl = document.querySelector('.points-circle');
        const pointsBadge = document.querySelector('.points-badge');
        
        if (totalPointsEl) {
            totalPointsEl.style.transform = 'scale(1.2)';
            setTimeout(() => totalPointsEl.style.transform = 'scale(1)', 300);
        }
        if (pointsBadge) {
            pointsBadge.style.transform = 'scale(1.2)';
            setTimeout(() => pointsBadge.style.transform = 'scale(1)', 300);
        }
        
        updateDashboard();
    }

    function handleReset() {
        if(confirm("Are you sure you want to clear your data, points, and challenges?")) {
            localStorage.removeItem('ecopulse_data');
            appData = { points: 0, badges: [], lastFootprint: null, history: [], completedSuggestions: [] };
            
            form.reset();
            totalCo2Display.textContent = "0.0";
            co2Status.textContent = "Awaiting calculation";
            co2Status.className = "status-badge neutral";
            
            Object.values(bars).forEach(b => {
                b.fill.style.width = '0%';
                b.pct.textContent = '0%';
            });
            
            suggestionsSection.style.display = 'none';
            updateDashboard();
        }
    }

    function saveData() {
        localStorage.setItem('ecopulse_data', JSON.stringify(appData));
    }

    // Number animation utility
    function animateValue(obj, start, end, duration) {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            obj.innerHTML = (progress * (end - start) + start).toFixed(1);
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }
});
