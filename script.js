function switchMode(mode) {
    document.querySelectorAll('.game-view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    
    const buttons = document.querySelectorAll('.mode-btn');
    if(mode === 'builder') {
        document.getElementById('view-builder').classList.add('active');
        if (buttons[0]) buttons[0].classList.add('active');
    } else {
        document.getElementById('view-minigame').classList.add('active');
        if (buttons[1]) buttons[1].classList.add('active');
        renderKanaCheckboxes();
    }
}

// --- DATOS DEL CONSTRUCTOR ---
let currentTense = 'present';
let vocabData = JSON.parse(localStorage.getItem('vocabData')) || [
    { id: 1, kanji: '皆', furigana: 'みな', romaji: 'mina' },
    { id: 2, kanji: '学生', furigana: 'がくせい', romaji: 'gakusei' },
    { id: 3, kanji: '大学', furigana: 'だいがく', romaji: 'daigaku' },
    { id: 4, kanji: '行く', furigana: 'いく', romaji: 'iku' }
];

let particleData = JSON.parse(localStorage.getItem('particleData')) || [
    { id: 1, kanji: 'は', furigana: 'わ', romaji: 'wa' },
    { id: 2, kanji: 'に', furigana: 'に', romaji: 'ni' },
    { id: 3, kanji: 'で', furigana: 'で', romaji: 'de' },
    { id: 4, kanji: 'が', furigana: 'が', romaji: 'ga' },
    { id: 5, kanji: 'を', furigana: 'お', romaji: 'o' }
];

let draggedData = null;
let feedbackTimeout = null;

function saveToLocalStorage() {
    localStorage.setItem('vocabData', JSON.stringify(vocabData));
    localStorage.setItem('particleData', JSON.stringify(particleData));
}

function setTense(tense) {
    currentTense = tense;
    document.querySelectorAll('.tense-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`btn-${tense}`).classList.add('active');
    updateOutput();
}

function renderLists() {
    const vocabContainer = document.getElementById('vocab-list');
    const particleContainer = document.getElementById('particle-list');
    
    if (!vocabContainer || !particleContainer) return;

    vocabContainer.innerHTML = '';
    particleContainer.innerHTML = '';

    vocabData.forEach(item => {
        vocabContainer.innerHTML += `
            <div class="draggable-item" id="item-vocab-${item.id}" draggable="true" 
                 ondragstart="startDrag(event, '${item.kanji}', '${item.furigana}', '${item.romaji}', 'vocab')"
                 onclick="togglePlacementMenu(${item.id}, 'vocab', event)">
                <div class="item-info">
                    <div class="item-number">${item.id}</div>
                    <div class="item-text">
                        <ruby>${item.kanji}<rt>${item.furigana}</rt></ruby>
                        <span class="item-romaji">${item.romaji}</span>
                    </div>
                </div>
                <button class="btn-delete" onclick="deleteWord(${item.id}, 'vocab', event)">×</button>
            </div>
        `;
    });

    particleData.forEach(item => {
        let displayHTML = item.furigana ? `<ruby>${item.kanji}<rt>${item.furigana}</rt></ruby>` : `<span style="font-size:15px; font-weight:700;">${item.kanji}</span>`;
        particleContainer.innerHTML += `
            <div class="draggable-item particle-item" id="item-particle-${item.id}" draggable="true" 
                 ondragstart="startDrag(event, '${item.kanji}', '${item.furigana || ''}', '${item.romaji}', 'particle')"
                 onclick="togglePlacementMenu(${item.id}, 'particle', event)">
                <div class="item-info">
                    <div class="item-number">${item.id}</div>
                    <div class="item-text">
                        ${displayHTML}
                        <span class="item-romaji">${item.romaji}</span>
                    </div>
                </div>
                <button class="btn-delete" onclick="deleteWord(${item.id}, 'particle', event)">×</button>
            </div>
        `;
    });
}

document.addEventListener('click', () => {
    document.querySelectorAll('.placement-menu').forEach(m => m.remove());
});

function togglePlacementMenu(id, type, event) {
    event.stopPropagation();
    document.querySelectorAll('.placement-menu').forEach(m => m.remove());
    
    const itemEl = document.getElementById(`item-${type}-${id}`);
    if (!itemEl) return;
    
    const rect = itemEl.getBoundingClientRect();
    
    const menu = document.createElement('div');
    menu.className = 'placement-menu';
    
    menu.style.top = (rect.bottom + window.scrollY + 4) + 'px';
    menu.style.left = (rect.left + window.scrollX) + 'px';
    menu.style.width = rect.width + 'px';
    
    menu.addEventListener('click', (e) => e.stopPropagation());
    
    if (type === 'vocab') {
        menu.innerHTML = `
            <span>S/O/V:</span>
            <button onclick="placeDirect(${id}, 'vocab', 'zone-subject', event)">S</button>
            <button onclick="placeDirect(${id}, 'vocab', 'zone-object', event)">O</button>
            <button onclick="placeDirect(${id}, 'vocab', 'zone-verb', event)">V</button>
        `;
    } else {
        menu.innerHTML = `
            <span>Partícula:</span>
            <button onclick="placeDirect(${id}, 'particle', 'zone-p1', event)">P1</button>
            <button onclick="placeDirect(${id}, 'particle', 'zone-p2', event)">P2</button>
        `;
    }
    
    document.body.appendChild(menu);
}

function placeDirect(id, type, zoneId, event) {
    event.stopPropagation();
    const dataList = type === 'vocab' ? vocabData : particleData;
    const item = dataList.find(i => i.id === id);
    if (!item) return;

    const zone = document.getElementById(zoneId);
    if (!zone) return;
    
    const isParticleZone = zone.classList.contains('particle-zone');
    
    if ((type === 'particle' && !isParticleZone) || (type === 'vocab' && isParticleZone)) {
        alert("⚠ Esa ranura es exclusiva para " + (isParticleZone ? "partículas" : "vocabulario") + ".");
        return;
    }

    let fillClass = isParticleZone ? 'particle-zone filled-particle' : 
                    zoneId === 'zone-subject' ? 'filled-subject' : 
                    zoneId === 'zone-object' ? 'filled-object' : 'filled-verb';

    zone.className = 'drop-zone ' + fillClass;
    
    let displayHTML = item.furigana 
        ? `<ruby>${item.kanji}<rt>${item.furigana}</rt></ruby>` 
        : `<div style="font-size: 16px; font-weight:bold;">${item.kanji}</div>`;

    zone.innerHTML = `
        <button class="zone-delete-btn" onclick="clearSingleZone('${zoneId}', event)">×</button>
        <div class="dropped-content">
            ${displayHTML}
            <div style="font-size: 10px; color:#555;">${item.romaji}</div>
        </div>
    `;
    
    zone.setAttribute('data-kanji', item.kanji);
    zone.setAttribute('data-furigana', item.furigana || '');
    zone.setAttribute('data-romaji', item.romaji);
    updateOutput();

    document.querySelectorAll('.placement-menu').forEach(m => m.remove());
}

function addWord(type) {
    if (type === 'vocab') {
        const k = document.getElementById('v-kanji').value.trim();
        const f = document.getElementById('v-furigana').value.trim();
        const r = document.getElementById('v-romaji').value.trim();
        if (!k || !f || !r) return alert("Llena todos los campos (Kanji, Furigana y Romaji)");
        
        const newId = vocabData.length > 0 ? Math.max(...vocabData.map(i => i.id)) + 1 : 1;
        vocabData.push({ id: newId, kanji: k, furigana: f, romaji: r });
        document.getElementById('v-kanji').value = '';
        document.getElementById('v-furigana').value = '';
        document.getElementById('v-romaji').value = '';
    } else {
        const k = document.getElementById('p-kanji').value.trim();
        const f = document.getElementById('p-furigana').value.trim();
        const r = document.getElementById('p-romaji').value.trim();
        if (!k || !r) return alert("Llena al menos Kanji y Romaji");
        
        const newId = particleData.length > 0 ? Math.max(...particleData.map(i => i.id)) + 1 : 1;
        particleData.push({ id: newId, kanji: k, furigana: f, romaji: r });
        document.getElementById('p-kanji').value = '';
        document.getElementById('p-furigana').value = '';
        document.getElementById('p-romaji').value = '';
    }
    saveToLocalStorage();
    renderLists();
}

function deleteWord(id, type, event) {
    event.stopPropagation();
    if (type === 'vocab') {
        vocabData = vocabData.filter(item => item.id !== id);
    } else {
        particleData = particleData.filter(item => item.id !== id);
    }
    saveToLocalStorage();
    renderLists();
}

function startDrag(e, kanji, furigana, romaji, type) {
    draggedData = { kanji, furigana, romaji, type };
    e.dataTransfer.effectAllowed = "move";
}

const dropZones = document.querySelectorAll('.drop-zone');

dropZones.forEach(zone => {
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', () => { zone.classList.remove('drag-over'); });
    zone.addEventListener('drop', e => {
        e.preventDefault();
        zone.classList.remove('drag-over');

        if (draggedData) {
            const isParticleZone = zone.classList.contains('particle-zone');
            if ((draggedData.type === 'particle' && !isParticleZone) || (draggedData.type === 'vocab' && isParticleZone)) {
                alert("⚠️ Esa ranura es exclusiva para " + (isParticleZone ? "partículas" : "vocabulario") + ".");
                return;
            }

            let fillClass = isParticleZone ? 'particle-zone filled-particle' : 
                            zone.id === 'zone-subject' ? 'filled-subject' : 
                            zone.id === 'zone-object' ? 'filled-object' : 'filled-verb';

            zone.className = 'drop-zone ' + fillClass;
            
            let displayHTML = draggedData.furigana 
                ? `<ruby>${draggedData.kanji}<rt>${draggedData.furigana}</rt></ruby>` 
                : `<div style="font-size: 16px; font-weight:bold;">${draggedData.kanji}</div>`;

            zone.innerHTML = `
                <button class="zone-delete-btn" onclick="clearSingleZone('${zone.id}', event)">×</button>
                <div class="dropped-content">
                    ${displayHTML}
                    <div style="font-size: 10px; color:#555;">${draggedData.romaji}</div>
                </div>
            `;
            
            zone.setAttribute('data-kanji', draggedData.kanji);
            zone.setAttribute('data-furigana', draggedData.furigana || '');
            zone.setAttribute('data-romaji', draggedData.romaji);
            updateOutput();
        }
    });
});

const zoneOrder = ['zone-subject', 'zone-p1', 'zone-object', 'zone-p2', 'zone-verb'];

function conjugateVerb(kanji, romaji) {
    if (!kanji) return { k: '', r: '' };

    let masuKanji = '';
    let masuRomaji = '';

    if (kanji.endsWith('ます') || romaji.endsWith('masu')) {
        masuKanji = kanji;
        masuRomaji = romaji;
    } 
    else if (kanji === 'する' || romaji === 'suru') {
        masuKanji = 'します'; 
        masuRomaji = 'shimasu';
    } else if (kanji === '来る' || kanji === 'くる' || romaji === 'kuru') {
        masuKanji = '来ます'; 
        masuRomaji = 'kimasu';
    } 
    else {
        let r = romaji.toLowerCase();
        let lastChar = r.slice(-1);

        const godanMap = {
            'u': { romaji: 'i', kanji: 'い' },
            'ku': { romaji: 'ki', kanji: 'き' },
            'su': { romaji: 'shi', kanji: 'し' },
            'tsu': { romaji: 'chi', kanji: 'ち' },
            'nu': { romaji: 'ni', kanji: 'ぬ' },
            'bu': { romaji: 'bi', kanji: 'ぶ' },
            'mu': { romaji: 'mi', kanji: 'む' },
            'ru': { romaji: 'ri', kanji: 'る' },
            'gu': { romaji: 'gi', kanji: 'ぐ' },
            'zu': { romaji: 'ji', kanji: 'ず' }
        };

        if ((r.endsWith('iru') || r.endsWith('eru')) && !r.endsWith('kuirue')) {
            let stemKanji = kanji.slice(0, -1);
            let stemRomaji = romaji.slice(0, -2);
            masuKanji = stemKanji + 'ます';
            masuRomaji = stemRomaji + 'masu';
        } else {
            let endingKey = r.endsWith('tsu') ? 'tsu' : lastChar;
            
            if (godanMap[endingKey]) {
                let kanjiStem = kanji.slice(0, -1);
                let romajiStem = romaji.slice(0, -endingKey.length);
                
                const kanaMap = {
                    'う': 'い', 'く': 'き', 'す': 'し', 'つ': 'ち', 
                    'ぬ': 'に', 'ふ': 'ひ', 'ぶ': 'び', 'む': 'み', 
                    'る': 'り', 'ぐ': 'ぎ', 'ず': 'じ'
                };
                
                let lastKanjiChar = kanji.slice(-1);
                let mappedKanji = kanaMap[lastKanjiChar] || lastKanjiChar;

                masuKanji = kanjiStem + mappedKanji + 'ます';
                masuRomaji = romajiStem + godanMap[endingKey].romaji + 'masu';
            } else {
                masuKanji = kanji + 'ます';
                masuRomaji = romaji + 'masu';
            }
        }
    }

    let stemKanji = masuKanji.endsWith('ます') ? masuKanji.slice(0, -2) : masuKanji;
    let stemRomaji = masuRomaji.endsWith('masu') ? masuRomaji.slice(0, -4) : masuRomaji;

    if (currentTense === 'past') {
        return { k: stemKanji + 'ました', r: stemRomaji + 'mashita' };
    } else if (currentTense === 'negative') {
        return { k: stemKanji + 'ません', r: stemRomaji + 'masen' };
    } else {
        return { k: masuKanji, r: masuRomaji };
    }
}

function updateOutput() {
    let kStr = '', rStr = '';
    const breakdownContainer = document.getElementById('output-breakdown');
    if (breakdownContainer) breakdownContainer.innerHTML = '';

    zoneOrder.forEach(id => {
        const zone = document.getElementById(id);
        if (!zone) return;
        let k = zone.getAttribute('data-kanji');
        let f = zone.getAttribute('data-furigana');
        let r = zone.getAttribute('data-romaji');
        
        if (k && r) {
            let tagLetter = '';
            let tagColor = '';
            if (id === 'zone-subject') { tagLetter = 'S'; tagColor = 'var(--primary)'; }
            else if (id === 'zone-object') { tagLetter = 'O'; tagColor = 'var(--success)'; }
            else if (id === 'zone-verb') {
                tagLetter = 'V'; 
                tagColor = '#e07a5f';
                const conjugated = conjugateVerb(k, r);
                k = conjugated.k;
                r = conjugated.r;
                f = ''; 
            } else if (id === 'zone-p1' || id === 'zone-p2') {
                tagLetter = 'P'; tagColor = '#8c7ae6';
            }

            kStr += k;
            rStr += r + ' ';

            if (breakdownContainer) {
                let displayInside = f 
                    ? `<ruby>${k}<rt>${f}</rt></ruby>` 
                    : `<ruby>${k}<rt style="visibility: hidden;">_</rt></ruby>`;
                    
                breakdownContainer.innerHTML += `
                    <div class="output-chip" style="border-color: ${tagColor};">
                        <span class="output-chip-tag" style="color: ${tagColor};">${tagLetter}</span>
                        <div class="output-chip-val">${displayInside}</div>
                    </div>
                `;
            }
        }
    });

    const outKanji = document.getElementById('out-kanji');
    const outRomaji = document.getElementById('out-romaji');
    if (outKanji) outKanji.innerText = kStr;
    if (outRomaji) outRomaji.innerText = rStr.trim();
}

function clearSingleZone(zoneId, event) {
    if (event) event.stopPropagation();
    const zone = document.getElementById(zoneId);
    if (!zone) return;

    const isP = zoneId.includes('p');
    const letter = zoneId === 'zone-subject' ? 'S' : zoneId === 'zone-object' ? 'O' : zoneId === 'zone-verb' ? 'V' : '';
    
    zone.className = 'drop-zone ' + (isP ? 'particle-zone' : '');
    zone.style.borderColor = '';
    zone.style.backgroundColor = '';
    zone.innerHTML = `
        ${letter ? `<div class="zone-label-watermark">${letter}</div>` : ''}
        <span class="zone-text-label">${isP ? 'Particle' : (letter + ' Word')}</span>
    `;
    zone.removeAttribute('data-kanji');
    zone.removeAttribute('data-furigana');
    zone.removeAttribute('data-romaji');
    updateOutput();
}

function clearBoard() {
    zoneOrder.forEach(id => {
        clearSingleZone(id);
    });
    const feedbackBox = document.getElementById('builder-feedback-msg');
    if (feedbackBox) feedbackBox.style.display = 'none';
    if (feedbackTimeout) clearTimeout(feedbackTimeout);
}

function loadExample() {
    const ex = [
        { id: 'zone-subject', k: '皆', f: 'みな', r: 'mina', class: 'filled-subject' },
        { id: 'zone-p1', k: 'は', f: 'わ', r: 'wa', class: 'particle-zone filled-particle' },
        { id: 'zone-object', k: '大学', f: 'だいがく', r: 'daigaku', class: 'filled-object' },
        { id: 'zone-p2', k: 'に', f: 'に', r: 'ni', class: 'particle-zone filled-particle' },
        { id: 'zone-verb', k: '行く', f: 'いく', r: 'iku', class: 'filled-verb' }
    ];

    ex.forEach(item => {
        const zone = document.getElementById(item.id);
        if (!zone) return;
        zone.className = `drop-zone ${item.class}`;
        zone.style.borderColor = '';
        zone.style.backgroundColor = '';
        let displayHTML = item.f ? `<ruby>${item.k}<rt>${item.f}</rt></ruby>` : `<div style="font-size: 16px; font-weight:bold;">${item.k}</div>`;
        zone.innerHTML = `
            <button class="zone-delete-btn" onclick="clearSingleZone('${item.id}', event)">×</button>
            <div class="dropped-content">
                ${displayHTML}
                <div style="font-size: 10px; color:#555;">${item.r}</div>
            </div>
        `;
        zone.setAttribute('data-kanji', item.k);
        zone.setAttribute('data-furigana', item.f || '');
        zone.setAttribute('data-romaji', item.r);
    });
    updateOutput();
}

function checkAnswer() {
    let allFilled = zoneOrder.every(id => {
        const zone = document.getElementById(id);
        return zone && zone.hasAttribute('data-kanji');
    });

    if (!allFilled) {
        triggerFeedback(false, "⚠ Oración incompleta. Revisa que todas las casillas (S, P1, O, P2, V) estén llenas.");
        return;
    }

    const p1Romaji = document.getElementById('zone-p1').getAttribute('data-romaji').toLowerCase();
    const p2Romaji = document.getElementById('zone-p2').getAttribute('data-romaji').toLowerCase();
    const verbRomaji = document.getElementById('zone-verb').getAttribute('data-romaji').toLowerCase();

    const validP1 = ['wa', 'ga'];
    const validP2 = ['o', 'ni', 'de', 'e'];

    const invalidNouns = ['mina', 'gakusei', 'daigaku', 'watashi'];
    const isVerbEnding = verbRomaji.endsWith('u') || verbRomaji.endsWith('ru') || verbRomaji.endsWith('suru') || verbRomaji.endsWith('kuru');
    const isNotNoun = !invalidNouns.includes(verbRomaji) && !verbRomaji.endsWith('i') && !verbRomaji.endsWith('a');

    const isValidVerb = isVerbEnding && isNotNoun;
    const isValidP1 = validP1.includes(p1Romaji);
    const isValidP2 = validP2.includes(p2Romaji);

    if (isValidP1 && isValidP2 && isValidVerb) {
        triggerFeedback(true, "¡Correcto! ¡Estructura gramatical completada con éxito! 🎉");
    } else {
        let msg = "⚠ Estructura incorrecta: ";
        if (!isValidP1) {
            msg += "La partícula 1 (P1) debe ser 'wa' o 'ga'.";
        } else if (!isValidP2) {
            msg += "La partícula 2 (P2) debe ser 'o', 'ni', 'de', etc.";
        } else if (!isValidVerb) {
            msg += "El casillero V debe contener un verbo válido (como 'iku' o 'taberu'), no un sustantivo.";
        }
        triggerFeedback(false, msg);
    }
}

function triggerFeedback(isCorrect, message) {
    if (feedbackTimeout) {
        clearTimeout(feedbackTimeout);
    }

    // Aplicar los colores directamente por JS de manera persistente durante 5s
    zoneOrder.forEach(id => {
        const zone = document.getElementById(id);
        if (zone) {
            zone.classList.remove('shake');
            void zone.offsetWidth;
            
            if (isCorrect) {
                zone.style.borderColor = '#27ae60';
                zone.style.backgroundColor = '#eafaf1';
            } else {
                zone.style.borderColor = '#c0392b';
                zone.style.backgroundColor = '#fde8e8';
                zone.classList.add('shake');
            }
        }
    });

    let feedbackBox = document.getElementById('builder-feedback-msg');
    if (!feedbackBox) {
        feedbackBox = document.createElement('div');
        feedbackBox.id = 'builder-feedback-msg';
        feedbackBox.style.marginTop = '12px';
        feedbackBox.style.padding = '10px 16px';
        feedbackBox.style.borderRadius = '8px';
        feedbackBox.style.textAlign = 'center';
        feedbackBox.style.fontWeight = 'bold';
        feedbackBox.style.fontSize = '14px';
        feedbackBox.style.transition = 'all 0.3s ease';
        
        const verifyBtn = document.querySelector('button[onclick="checkAnswer()"]');
        if (verifyBtn && verifyBtn.parentNode) {
            verifyBtn.parentNode.insertBefore(feedbackBox, verifyBtn.nextSibling);
        } else {
            const outRomaji = document.getElementById('out-romaji');
            if (outRomaji && outRomaji.parentNode) {
                outRomaji.parentNode.appendChild(feedbackBox);
            }
        }
    }

    feedbackBox.style.display = 'block';
    if (isCorrect) {
        feedbackBox.style.backgroundColor = '#eafaf1';
        feedbackBox.style.color = '#27ae60';
        feedbackBox.style.border = '1px solid #27ae60';
        feedbackBox.innerHTML = `✅ ${message}`;
    } else {
        feedbackBox.style.backgroundColor = '#fde8e8';
        feedbackBox.style.color = '#c0392b';
        feedbackBox.style.border = '1px solid #c0392b';
        feedbackBox.innerHTML = `❌ ${message}`;
    }

    // Mantener tanto el texto como los colores de las casillas exactamente durante 5 segundos (5000ms)
    feedbackTimeout = setTimeout(() => {
        if (feedbackBox) {
            feedbackBox.style.display = 'none';
        }
        zoneOrder.forEach(id => {
            const zone = document.getElementById(id);
            if (zone) {
                zone.style.borderColor = '';
                zone.style.backgroundColor = '';
                zone.classList.remove('shake');
            }
        });
    }, 5000);
}

// --- LÓGICA DEL MINIJUEGO KANA ---
const masterHiragana = [
    { kana: 'あ', romaji: 'a' }, { kana: 'い', romaji: 'i' }, { kana: 'う', romaji: 'u' }, { kana: 'え', romaji: 'e' }, { kana: 'お', romaji: 'o' },
    { kana: 'か', romaji: 'ka' }, { kana: 'き', romaji: 'ki' }, { kana: 'く', romaji: 'ku' }, { kana: 'け', romaji: 'ke' }, { kana: 'こ', romaji: 'ko' },
    { kana: 'さ', romaji: 'sa' }, { kana: 'し', romaji: 'shi' }, { kana: 'す', romaji: 'su' }, { kana: 'せ', romaji: 'se' }, { kana: 'そ', romaji: 'so' },
    { kana: 'た', romaji: 'ta' }, { kana: 'ち', romaji: 'chi' }, { kana: 'つ', romaji: 'tsu' }, { kana: 'て', romaji: 'te' }, { kana: 'と', romaji: 'to' },
    { kana: 'な', romaji: 'na' }, { kana: 'に', romaji: 'ni' }, { kana: 'ぬ', romaji: 'nu' }, { kana: 'ね', romaji: 'ne' }, { kana: 'の', romaji: 'no' },
    { kana: 'は', romaji: 'ha' }, { kana: 'ひ', romaji: 'hi' }, { kana: 'ふ', romaji: 'fu' }, { kana: 'へ', romaji: 'he' }, { kana: 'ほ', romaji: 'ho' },
    { kana: 'ま', romaji: 'ma' }, { kana: 'み', romaji: 'mi' }, { kana: 'む', romaji: 'mu' }, { kana: 'め', romaji: 'me' }, { kana: 'も', romaji: 'mo' },
    { kana: 'や', romaji: 'ya' }, { kana: 'ゆ', romaji: 'yu' }, { kana: 'よ', romaji: 'yo' },
    { kana: 'ら', romaji: 'ra' }, { kana: 'り', romaji: 'ri' }, { kana: 'る', romaji: 'ru' }, { kana: 'れ', romaji: 're' }, { kana: 'ろ', romaji: 'ro' },
    { kana: 'わ', romaji: 'wa' }, { kana: 'を', romaji: 'wo' }, { kana: 'ん', romaji: 'n' },
    { kana: 'が', romaji: 'ga' }, { kana: 'ぎ', romaji: 'gi' }, { kana: 'ぐ', romaji: 'gu' }, { kana: 'げ', romaji: 'ge' }, { kana: 'ご', romaji: 'go' },
    { kana: 'ざ', romaji: 'za' }, { kana: 'じ', romaji: 'ji' }, { kana: 'ず', romaji: 'zu' }, { kana: 'ぜ', romaji: 'ze' }, { kana: 'ぞ', romaji: 'zo' },
    { kana: 'だ', romaji: 'da' }, { kana: 'ぢ', romaji: 'ji' }, { kana: 'づ', romaji: 'zu' }, { kana: 'で', romaji: 'de' }, { kana: 'ど', romaji: 'do' },
    { kana: 'ば', romaji: 'ba' }, { kana: 'び', romaji: 'bi' }, { kana: 'ぶ', romaji: 'bu' }, { kana: 'べ', romaji: 'be' }, { kana: 'ぼ', romaji: 'bo' },
    { kana: 'ぱ', romaji: 'pa' }, { kana: 'ぴ', romaji: 'pi' }, { kana: 'ぷ', romaji: 'pu' }, { kana: 'ぺ', romaji: 'pe' }, { kana: 'ぽ', romaji: 'po' },
    { kana: 'っ', romaji: 'tsu' },
    { kana: 'きゃ', romaji: 'kya' }, { kana: 'きゅ', romaji: 'kyu' }, { kana: 'きょ', romaji: 'kyo' },
    { kana: 'しゃ', romaji: 'sha' }, { kana: 'しゅ', romaji: 'shu' }, { kana: 'しょ', romaji: 'sho' },
    { kana: 'ちゃ', romaji: 'cha' }, { kana: 'ちゅ', romaji: 'chu' }, { kana: 'ちょ', romaji: 'cho' },
    { kana: 'にゃ', romaji: 'nya' }, { kana: 'にゅ', romaji: 'nyu' }, { kana: 'にょ', romaji: 'nyo' },
    { kana: 'ひゃ', romaji: 'hya' }, { kana: 'ひゅ', romaji: 'hyu' }, { kana: 'ひょ', romaji: 'hyo' },
    { kana: 'みゃ', romaji: 'mya' }, { kana: 'みゅ', romaji: 'myu' }, { kana: 'みょ', romaji: 'myo' },
    { kana: 'りゃ', romaji: 'rya' }, { kana: 'りゅ', romaji: 'ryu' }, { kana: 'りょ', romaji: 'ryo' },
    { kana: 'ぎゃ', romaji: 'gya' }, { kana: 'ぎゅ', romaji: 'gyu' }, { kana: 'ぎょ', romaji: 'gyo' },
    { kana: 'じゃ', romaji: 'ja' }, { kana: 'じゅ', romaji: 'ju' }, { kana: 'じょ', romaji: 'jo' },
    { kana: 'びゃ', romaji: 'bya' }, { kana: 'びゅ', romaji: 'byu' }, { kana: 'びょ', romaji: 'byo' },
    { kana: 'ぴゃ', romaji: 'pya' }, { kana: 'ぴゅ', romaji: 'pyu' }, { kana: 'ぴょ', romaji: 'pyo' }
];

const masterKatakana = [
    { kana: 'ア', romaji: 'a' }, { kana: 'イ', romaji: 'i' }, { kana: 'ウ', romaji: 'u' }, { kana: 'エ', romaji: 'e' }, { kana: 'オ', romaji: 'o' },
    { kana: 'カ', romaji: 'ka' }, { kana: 'キ', romaji: 'ki' }, { kana: 'ク', romaji: 'ku' }, { kana: 'ケ', romaji: 'ke' }, { kana: 'コ', romaji: 'ko' },
    { kana: 'サ', romaji: 'sa' }, { kana: 'シ', romaji: 'shi' }, { kana: 'ス', romaji: 'su' }, { kana: 'セ', romaji: 'se' }, { kana: 'ソ', romaji: 'so' },
    { kana: 'タ', romaji: 'ta' }, { kana: 'チ', romaji: 'chi' }, { kana: 'ツ', romaji: 'tsu' }, { kana: 'テ', romaji: 'te' }, { kana: 'ト', romaji: 'to' },
    { kana: 'ナ', romaji: 'na' }, { kana: 'ニ', romaji: 'ni' }, { kana: 'ヌ', romaji: 'nu' }, { kana: 'ネ', romaji: 'ne' }, { kana: 'ノ', romaji: 'no' },
    { kana: 'ハ', romaji: 'ha' }, { kana: 'ヒ', romaji: 'hi' }, { kana: 'フ', romaji: 'fu' }, { kana: 'ヘ', romaji: 'he' }, { kana: 'ホ', romaji: 'ho' },
    { kana: 'マ', romaji: 'ma' }, { kana: 'ミ', romaji: 'mi' }, { kana: 'ム', romaji: 'mu' }, { kana: 'メ', romaji: 'me' }, { kana: 'モ', romaji: 'mo' },
    { kana: 'ヤ', romaji: 'ya' }, { kana: 'ユ', romaji: 'yu' }, { kana: 'ヨ', romaji: 'yo' },
    { kana: 'ラ', romaji: 'ra' }, { kana: 'リ', romaji: 'ri' }, { kana: 'ル', romaji: 'ru' }, { kana: 'レ', romaji: 're' }, { kana: 'ロ', romaji: 'ro' },
    { kana: 'ワ', romaji: 'wa' }, { kana: 'ヲ', romaji: 'wo' }, { kana: 'ン', romaji: 'n' },
    { kana: 'ガ', romaji: 'ga' }, { kana: 'ギ', romaji: 'gi' }, { kana: 'グ', romaji: 'gu' }, { kana: 'ゲ', romaji: 'ge' }, { kana: 'ゴ', romaji: 'go' },
    { kana: 'ザ', romaji: 'za' }, { kana: 'ジ', romaji: 'ji' }, { kana: 'ズ', romaji: 'zu' }, { kana: 'ゼ', romaji: 'ze' }, { kana: 'ゾ', romaji: 'zo' },
    { kana: 'ダ', romaji: 'da' }, { kana: 'ぢ', romaji: 'ji' }, { kana: 'づ', romaji: 'zu' }, { kana: 'デ', romaji: 'de' }, { kana: 'ド', romaji: 'do' },
    { kana: 'バ', romaji: 'ba' }, { kana: 'ビ', romaji: 'bi' }, { kana: 'ブ', romaji: 'bu' }, { kana: 'ベ', romaji: 'be' }, { kana: 'ボ', romaji: 'bo' },
    { kana: 'パ', romaji: 'pa' }, { kana: 'ぴ', romaji: 'pi' }, { kana: 'ぷ', romaji: 'pu' }, { kana: 'ペ', romaji: 'pe' }, { kana: 'ぽ', romaji: 'po' },
    { kana: 'ッ', romaji: 'tsu' },
    { kana: 'きゃ', romaji: 'kya' }, { kana: 'きゅ', romaji: 'kyu' }, { kana: 'きょ', romaji: 'kyo' },
    { kana: 'しゃ', romaji: 'sha' }, { kana: 'しゅ', romaji: 'shu' }, { kana: 'しょ', romaji: 'sho' },
    { kana: 'ちゃ', romaji: 'cha' }, { kana: 'ちゅ', romaji: 'chu' }, { kana: 'ちょ', romaji: 'cho' },
    { kana: 'にゃ', romaji: 'nya' }, { kana: 'にゅ', romaji: 'nyu' }, { kana: 'にょ', romaji: 'nyo' },
    { kana: 'ひゃ', romaji: 'hya' }, { kana: 'ひゅ', romaji: 'hyu' }, { kana: 'ひょ', romaji: 'hyo' },
    { kana: 'りゃ', romaji: 'rya' }, { kana: 'りゅ', romaji: 'ryu' }, { kana: 'りょ', romaji: 'ryo' },
    { kana: 'ぎゃ', romaji: 'gya' }, { kana: 'ぎゅ', romaji: 'gyu' }, { kana: 'ぎょ', romaji: 'gyo' },
    { kana: 'じゃ', romaji: 'ja' }, { kana: 'ジュ', romaji: 'ju' }, { kana: 'ジョ', romaji: 'jo' },
    { kana: 'びゃ', romaji: 'bya' }, { kana: 'びゅ', romaji: 'byu' }, { kana: 'びょ', romaji: 'byo' },
    { kana: 'ぴゃ', romaji: 'pya' }, { kana: 'ぴゅ', romaji: 'pyu' }, { kana: 'ぴょ', romaji: 'pyo' }
];

const kanaRows = [
    { id: 'row-a', label: 'Vocales (A, I, U, E, O)', romajis: ['a', 'i', 'u', 'e', 'o'] },
    { id: 'row-k', label: 'Fila K (Ka, Ki, Ku, Ke, Ko)', romajis: ['ka', 'ki', 'ku', 'ke', 'ko'] },
    { id: 'row-s', label: 'Fila S (Sa, Shi, Su, Se, So)', romajis: ['sa', 'shi', 'su', 'se', 'so'] },
    { id: 'row-t', label: 'Fila T (Ta, Chi, Tsu, Te, To)', romajis: ['ta', 'chi', 'tsu', 'te', 'to'] },
    { id: 'row-n', label: 'Fila N (Na, Ni, Nu, Ne, No)', romajis: ['na', 'ni', 'nu', 'ne', 'no'] },
    { id: 'row-h', label: 'Fila H (Ha, Hi, Fu, He, Ho)', romajis: ['ha', 'hi', 'fu', 'he', 'ho'] },
    { id: 'row-m', label: 'Fila M (Ma, Mi, Mu, Me, Mo)', romajis: ['ma', 'mi', 'mu', 'me', 'mo'] },
    { id: 'row-y', label: 'Fila Y (Ya, Yu, Yo)', romajis: ['ya', 'yu', 'yo'] },
    { id: 'row-r', label: 'Fila R (Ra, Ri, Ru, Re, Ro)', romajis: ['ra', 'ri', 'ru', 're', 'ro'] },
    { id: 'row-w', label: 'Fila W / N (Wa, Wo, N)', romajis: ['wa', 'wo', 'n'] },
    { id: 'row-g', label: 'Dakuten: Fila G (Ga, Gi, Gu, Ge, Go)', romajis: ['ga', 'gi', 'gu', 'ge', 'go'] },
    { id: 'row-z', label: 'Dakuten: Fila Z (Za, Ji, Zu, Ze, Zo)', romajis: ['za', 'ji', 'zu', 'ze', 'zo'] },
    { id: 'row-d', label: 'Dakuten: Fila D (Da, Ji, Zu, De, Do)', romajis: ['da', 'ji', 'zu', 'de', 'do'] },
    { id: 'row-b', label: 'Dakuten: Fila B (Ba, Bi, Bu, Be, Bo)', romajis: ['ba', 'bi', 'bu', 'be', 'bo'] },
    { id: 'row-p', label: 'Handakuten: Fila P (Pa, Pi, Pu, Pe, Po)', romajis: ['pa', 'pi', 'pu', 'pe', 'po'] },
    { id: 'row-sokuon', label: 'Especial: Tsu pequeño (ッ)', romajis: ['tsu'] },
    { id: 'row-yoon-k', label: 'Yōon: Kya, Kyu, Kyo', romajis: ['kya', 'kyu', 'kyo'] },
    { id: 'row-yoon-s', label: 'Yōon: Sha, Shu, Sho', romajis: ['sha', 'shu', 'sho'] },
    { id: 'row-yoon-t', label: 'Yōon: Cha, Chu, Cho', romajis: ['cha', 'chu', 'cho'] },
    { id: 'row-yoon-n', label: 'Yōon: Nya, Nyu, Nyo', romajis: ['nya', 'nyu', 'nyo'] },
    { id: 'row-yoon-h', label: 'Yōon: Hya, Hyu, Hyo', romajis: ['hya', 'hyu', 'hyo'] },
    { id: 'row-yoon-m', label: 'Yōon: Mya, Myu, Myo', romajis: ['mya', 'myu', 'myo'] },
    { id: 'row-yoon-r', label: 'Yōon: Rya, Ryu, Ryo', romajis: ['rya', 'ryu', 'ryo'] },
    { id: 'row-yoon-g', label: 'Dakuten Yōon: Gya, Gyu, Gyo', romajis: ['gya', 'gyu', 'gyo'] },
    { id: 'row-yoon-j', label: 'Dakuten Yōon: Ja, Ju, Jo', romajis: ['ja', 'ju', 'jo'] },
    { id: 'row-yoon-b', label: 'Dakuten Yōon: Bya, Byu, Byo', romajis: ['bya', 'byu', 'byo'] },
    { id: 'row-yoon-p', label: 'Handakuten Yōon: Pya, Pyu, Pyo', romajis: ['pya', 'pyu', 'pyo'] }
];

let sessionQueue = [];
let retryQueue = [];
let errorLog = [];
let currentActiveKana = null;
let correctCount = 0;
let errorCount = 0;
let gameStreak = 0;
let timerInterval = null;
let secondsElapsed = 0;

function renderKanaCheckboxes() {
    const checkedScriptType = document.querySelector('input[name="script-type"]:checked');
    const scriptType = checkedScriptType ? checkedScriptType.value : 'hiragana';
    const container = document.getElementById('kana-groups-container');
    if (!container) return;
    container.innerHTML = '';

    kanaRows.forEach(group => {
        let groupHtml = `
            <div style="background: #faf8f5; border: 1px solid var(--border-color); border-radius: 8px; padding: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; border-bottom: 1px solid var(--border-color); padding-bottom: 4px;">
                    <span style="font-size: 11px; font-weight: bold; color: #555;">${group.label}</span>
                    <button type="button" onclick="toggleRow('${group.id}')" style="font-size: 10px; cursor: pointer; padding: 2px 6px; background: #f0ebe4; border: 1px solid var(--border-color); border-radius: 4px; color: var(--text-muted); font-weight:600;">Alternar Fila</button>
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(85px, 1fr)); gap: 4px;">
        `;

        group.romajis.forEach(rom => {
            if (scriptType === 'hiragana' || scriptType === 'both') {
                let item = masterHiragana.find(i => i.romaji === rom);
                if (item) {
                    groupHtml += `
                        <label class="kana-checkbox-item">
                            <input type="checkbox" class="kana-chk ${group.id}" value="${item.kana}" data-romaji="${item.romaji}" checked>
                            <span>${item.kana} (${item.romaji})</span>
                        </label>
                    `;
                }
            }
            if (scriptType === 'katakana' || scriptType === 'both') {
                let item = masterKatakana.find(i => i.romaji === rom);
                if (item) {
                    groupHtml += `
                        <label class="kana-checkbox-item">
                            <input type="checkbox" class="kana-chk ${group.id}" value="${item.kana}" data-romaji="${item.romaji}" checked>
                            <span style="color: #4a6fa5;">${item.kana} (${item.romaji})</span>
                        </label>
                    `;
                }
            }
        });

        groupHtml += `</div></div>`;
        container.innerHTML += groupHtml;
    });
}

function toggleRow(rowClass) {
    const checkboxes = document.querySelectorAll(`.${rowClass}`);
    if (checkboxes.length === 0) return;
    const allChecked = Array.from(checkboxes).every(chk => chk.checked);
    checkboxes.forEach(chk => chk.checked = !allChecked);
}

function toggleAllKana(select) {
    document.querySelectorAll('.kana-chk').forEach(chk => chk.checked = select);
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function startKanaGame() {
    let selected = [];
    document.querySelectorAll('.kana-chk:checked').forEach(chk => {
        selected.push({ kana: chk.value, romaji: chk.getAttribute('data-romaji') });
    });

    if (selected.length === 0) {
        alert("Por favor selecciona al menos un carácter para jugar.");
        return;
    }

    sessionQueue = shuffleArray([...selected]);
    retryQueue = [];
    errorLog = [];
    correctCount = 0;
    errorCount = 0;
    gameStreak = 0;
    secondsElapsed = 0;

    const configScr = document.getElementById('kana-config-screen');
    const summaryScr = document.getElementById('kana-summary-screen');
    const playScr = document.getElementById('kana-play-screen');

    if (configScr) configScr.style.display = 'none';
    if (summaryScr) summaryScr.style.display = 'none';
    if (playScr) playScr.style.display = 'flex';

    updateGameStats();
    startTimer();
    nextKana();
}

function startTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        secondsElapsed++;
        const timerEl = document.getElementById('game-timer');
        if (timerEl) timerEl.innerText = `⏱ ${secondsElapsed}s`;
    }, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
}

function backToConfig() {
    stopTimer();
    const configScr = document.getElementById('kana-config-screen');
    const summaryScr = document.getElementById('kana-summary-screen');
    const playScr = document.getElementById('kana-play-screen');

    if (playScr) playScr.style.display = 'none';
    if (summaryScr) summaryScr.style.display = 'none';
    if (configScr) configScr.style.display = 'flex';
}

function nextKana() {
    if (sessionQueue.length === 0) {
        if (retryQueue.length > 0) {
            sessionQueue = shuffleArray([...retryQueue]);
            retryQueue = [];
        } else {
            endKanaGame();
            return;
        }
    }

    currentActiveKana = sessionQueue.shift();
    const targetBox = document.getElementById('kana-target');
    if (!targetBox) return;
    
    targetBox.innerText = currentActiveKana.kana;
    targetBox.classList.remove('shake', 'error-flash', 'success-flash');

    if (currentActiveKana.kana.length > 1) {
        targetBox.style.fontSize = '70px';
        targetBox.style.whiteSpace = 'nowrap';
    } else {
        targetBox.style.fontSize = '90px';
        targetBox.style.whiteSpace = 'normal';
    }

    const inputEl = document.getElementById('kana-input');
    if (inputEl) {
        inputEl.value = '';
        inputEl.focus();
    }
}

function handleKanaInput(e) {
    if (e.key === 'Enter') {
        const inputEl = document.getElementById('kana-input');
        if (!inputEl || !currentActiveKana) return;
        
        const val = inputEl.value.trim().toLowerCase();
        const targetRomaji = currentActiveKana.romaji;
        const targetBox = document.getElementById('kana-target');

        if (val === targetRomaji) {
            correctCount += 1;
            gameStreak += 1;
            
            if (targetBox) {
                targetBox.classList.remove('shake', 'error-flash');
                targetBox.classList.add('success-flash');
            }
            updateGameStats();

            setTimeout(() => { nextKana(); }, 250);
        } else {
            gameStreak = 0;
            errorCount += 1;
            
            errorLog.push({ kana: currentActiveKana.kana, expected: targetRomaji, typed: val });
            retryQueue.push(currentActiveKana);

            if (targetBox) {
                targetBox.classList.remove('success-flash');
                targetBox.classList.add('shake', 'error-flash');
            }
            updateGameStats();

            setTimeout(() => { nextKana(); }, 350);
        }
    }
}

function updateGameStats() {
    const cEl = document.getElementById('game-correct');
    const eEl = document.getElementById('game-errors-count');
    const sEl = document.getElementById('game-streak');

    if (cEl) cEl.innerText = correctCount;
    if (eEl) eEl.innerText = errorCount;
    if (sEl) sEl.innerText = gameStreak;
}

function endKanaGame() {
    stopTimer();
    const playScr = document.getElementById('kana-play-screen');
    const summaryScr = document.getElementById('kana-summary-screen');

    if (playScr) playScr.style.display = 'none';
    if (summaryScr) summaryScr.style.display = 'flex';

    const timeEl = document.getElementById('summary-time');
    const correctEl = document.getElementById('summary-correct');
    const errorEl = document.getElementById('summary-errors');

    if (timeEl) timeEl.innerText = `${secondsElapsed} segundos`;
    if (correctEl) correctEl.innerText = correctCount;
    if (errorEl) errorEl.innerText = errorCount;

    const mistakesContainer = document.getElementById('summary-mistakes');
    if (!mistakesContainer) return;
    mistakesContainer.innerHTML = '';

    if (errorLog.length === 0) {
        mistakesContainer.innerHTML = '<div style="color: #5a8a52; font-weight: 600; padding: 10px;">¡Impecable! No cometiste ningún error en esta ronda. 🎉</div>';
    } else {
        errorLog.forEach(err => {
            mistakesContainer.innerHTML += `
                <div style="background: #faf8f5; border: 1px solid var(--border-color); border-radius: 8px; padding: 8px 10px; font-size: 11px; display: flex; justify-content: space-between; align-items: center;">
                    <span>Kana: <b>${err.kana}</b> (Esperado: <b>${err.expected}</b>)</span>
                    <span style="color: #d17a7a;">Escribiste: <b>${err.typed || '(vacío)'}</b></span>
                </div>
            `;
        });
    }
}

renderLists();