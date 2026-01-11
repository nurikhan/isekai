// 전역 변수
let rerollCount = 0;
let currentLang = 'ko'; // 기본 언어

// 0. 언어 설정 함수
function setLanguage(lang) {
    currentLang = lang;
    const ui = database[lang].ui;

    // [수정된 부분 1] 버튼 스타일 변경 로직 (에러 해결)
    // event.target 대신, 현재 lang과 일치하는 버튼을 찾아서 활성화합니다.
    const buttons = document.querySelectorAll('.lang-btn');
    buttons.forEach(btn => {
        btn.classList.remove('active'); // 일단 모두 끄고
        // 버튼의 onclick 속성에 해당 언어 코드가 들어있는지 확인
        if (btn.getAttribute('onclick').includes(`'${lang}'`)) {
            btn.classList.add('active'); // 맞는 버튼만 켭니다
        }
    });

    // 2. UI 텍스트 업데이트
    document.title = ui.title.replace('<br>', ' '); 
    document.getElementById('ui-title').innerHTML = ui.title;
    document.getElementById('ui-subtitle').innerText = ui.subtitle;
    
    document.getElementById('ui-label-name').innerText = ui.labelName;
    document.getElementById('user-name').placeholder = ui.placeholderName;
    
    document.getElementById('ui-label-gender').innerText = ui.labelGender;
    document.getElementById('btn-male').innerText = ui.btnMale;
    document.getElementById('btn-female').innerText = ui.btnFemale;
    
    document.getElementById('ui-label-stress').innerText = ui.labelStress;
    
    // 스트레스 옵션 다시 그리기
    const stressSelect = document.getElementById('stress-cause');
    stressSelect.innerHTML = '';
    const opts = ui.stressOptions;
    for (const [key, value] of Object.entries(opts)) {
        const option = document.createElement('option');
        option.value = key;
        option.innerText = value;
        stressSelect.appendChild(option);
    }

    document.getElementById('ui-btn-submit').innerText = ui.btnSubmit;
    document.getElementById('loading-text').innerText = ui.loading;

    // 결과창 UI 라벨 업데이트
    document.getElementById('ui-res-name').innerText = ui.resName;
    document.getElementById('ui-res-world').innerText = ui.resWorld;
    document.getElementById('ui-res-skill').innerText = ui.resSkill;
    document.getElementById('ui-res-reason').innerText = ui.resReason;
    document.getElementById('ui-res-prob').innerText = ui.resProb;
    
    document.getElementById('ui-locked-msg').innerHTML = ui.lockedMsg;
    document.getElementById('ui-hidden-title').innerText = ui.hiddenTitle;
    
    document.getElementById('ui-btn-save').innerText = ui.btnSave;
    document.getElementById('ui-btn-share').innerText = ui.btnShare;
    document.getElementById('ui-btn-retry').innerText = ui.btnRetry;

    // [FAQ 및 가이드 텍스트 업데이트] - 여기가 작동 안 했던 부분
    if (document.getElementById('ui-guide-title')) {
        document.getElementById('ui-guide-title').innerText = ui.guideTitle;
        document.getElementById('ui-guide-q1').innerText = ui.guideQ1;
        document.getElementById('ui-guide-a1').innerText = ui.guideA1;
        document.getElementById('ui-guide-q2').innerText = ui.guideQ2;
        document.getElementById('ui-guide-a2').innerText = ui.guideA2;
        document.getElementById('ui-guide-q3').innerText = ui.guideQ3;
        document.getElementById('ui-guide-a3').innerText = ui.guideA3;
    }
    // [추가] 가이드 & 세계관 다국어 적용 (innerHTML 사용 필수!)
    if (document.getElementById('ui-guide-main-title')) {
        document.getElementById('ui-guide-main-title').innerText = ui.guideSectionTitle;
        
        document.getElementById('ui-faq-title').innerText = ui.faqTitle;
        document.getElementById('ui-faq-content').innerHTML = ui.faqContent; // HTML 태그 적용
        
        document.getElementById('ui-lore-title').innerText = ui.loreTitle;
        document.getElementById('ui-lore-content').innerHTML = ui.loreContent;
        
        document.getElementById('ui-rank-title').innerText = ui.rankTitle;
        document.getElementById('ui-rank-content').innerHTML = ui.rankContent;
    }
}

// 1. 초기 실행 (페이지 로드 시 무조건 한국어로 세팅)
window.onload = function() {
    setLanguage('ko'); 
    console.log("Isekai Ticket Agency Loaded! 🚚");
};


// 2. 성별 선택
function selectGender(gender, btn) {
    document.getElementById('selected-gender').value = gender;
    const buttons = document.querySelectorAll('.gender-btn');
    buttons.forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
}

// 3. 티켓 발급 메인 함수
function issueTicket() {
    // iOS 자이로 권한 요청
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
        DeviceMotionEvent.requestPermission()
            .then(response => { if (response === 'granted') {} })
            .catch(console.error);
    }

    const name = document.getElementById('user-name').value.trim();
    const gender = document.getElementById('selected-gender').value;
    const stress = document.getElementById('stress-cause').value;

    if (!name || !gender) {
        alert(database[currentLang].ui.alertName); 
        return;
    }

    const truckAudio = document.getElementById('sfx-truck');
    if(truckAudio) {
        truckAudio.volume = 0.5;
        truckAudio.play().catch(e => {});
    }

    document.getElementById('intro-screen').classList.add('hidden');
    document.getElementById('loading-screen').classList.remove('hidden');

    setTimeout(() => {
        calculateResult(name, gender, stress);
        
        const resultAudio = document.getElementById('sfx-result');
        if(resultAudio) {
            resultAudio.volume = 0.6;
            resultAudio.play().catch(e => {});
        }

        document.getElementById('loading-screen').classList.add('hidden');
        document.getElementById('result-screen').classList.remove('hidden');
    }, 2500); 
}

// 4. 결과 계산
function calculateResult(name, gender, stress) {
    const seedStr = name + gender + stress + rerollCount;
    const seed = stringToHash(seedStr);
    const rng = new seededRandom(seed);
    const db = database[currentLang];

    // 세계관 결정
    let worldList = [];
    const worldRoll = rng.nextFloat() * 100;
    if (gender === 'male') {
        if (worldRoll < 10) worldList = db.worlds.female;
        else if (worldRoll < 30) worldList = db.worlds.male;
        else worldList = db.worlds.common;
    } else {
        if (worldRoll < 10) worldList = db.worlds.male;
        else if (worldRoll < 30) worldList = db.worlds.female;
        else worldList = db.worlds.common;
    }
    const world = worldList[Math.floor(rng.nextFloat() * worldList.length)] || db.worlds.common[0];

    // 캐릭터 결정
    const rankRoll = rng.nextFloat() * 100;
    let targetTier = 'B';
    if (rankRoll < 5) targetTier = 'SSS';
    else if (rankRoll < 20) targetTier = 'S';
    else if (rankRoll < 40) targetTier = 'A';
    else if (rankRoll < 80) targetTier = 'B';
    else targetTier = 'F';

    let targetCharList = (gender === 'male') ? db.characters.male : db.characters.female;
    const charPool = targetCharList.filter(c => c.tier === targetTier);
    const character = charPool[Math.floor(rng.nextFloat() * charPool.length)] || targetCharList[0];

    // 능력, 사유, 파트너, 히든스킬
    const skillPool = db.skills.filter(s => s.tier === targetTier);
    const skill = skillPool.length > 0 ? skillPool[Math.floor(rng.nextFloat() * skillPool.length)] : db.skills[0];
    const reason = db.reasons[Math.floor(rng.nextFloat() * db.reasons.length)];
    const partner = db.partners[Math.floor(rng.nextFloat() * db.partners.length)];
    const awaken = db.awakenSkills[Math.floor(rng.nextFloat() * db.awakenSkills.length)];

    // UI 업데이트
    document.getElementById('res-user-name').innerText = name;
    document.getElementById('res-char-name').innerText = character.name;
    document.getElementById('res-rank').innerText = `RANK ${character.tier}`;
    document.getElementById('res-world').innerText = `${world.text}\n(${world.desc})`;
    document.getElementById('res-skill-rank').innerText = `[${skill.tier}]`;
    document.getElementById('res-skill-name').innerText = skill.name;
    document.getElementById('res-skill-desc').innerText = skill.desc;
    document.getElementById('res-reason').innerText = reason;
    document.getElementById('prob-value').innerText = (rng.nextFloat() * 1).toFixed(4) + "%";
    document.getElementById('res-partner').innerText = partner.name;
    document.getElementById('res-partner-desc').innerText = partner.desc;
    document.getElementById('res-awake-skill').innerText = awaken.name;
    document.getElementById('res-awake-desc').innerText = awaken.desc;

    // 이미지 업데이트
    if (world.img) document.getElementById('bg-layer').style.backgroundImage = `url('${world.img}')`;
    else document.getElementById('bg-layer').style.background = '#333';

    if (character.img) document.getElementById('char-layer').style.backgroundImage = `url('${character.img}')`;
    
    if (partner.img) {
        const partnerDiv = document.querySelector('.partner-img-placeholder');
        partnerDiv.innerText = "";
        partnerDiv.style.backgroundImage = `url('${partner.img}')`;
        partnerDiv.style.backgroundSize = "cover";
    }

    // 네온 효과
    const ticketFrame = document.querySelector('.ticket-frame');
    ticketFrame.classList.remove('rank-sss', 'rank-s', 'rank-a', 'rank-b', 'rank-f');
    if (character.tier === 'SSS') ticketFrame.classList.add('rank-sss');
    else if (character.tier === 'S') ticketFrame.classList.add('rank-s');
    else if (character.tier === 'A') ticketFrame.classList.add('rank-a');
    else if (character.tier === 'B') ticketFrame.classList.add('rank-b');
    else ticketFrame.classList.add('rank-f');
}

// 유틸 함수들
function stringToHash(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) hash = ((hash << 5) + hash) + str.charCodeAt(i);
    return Math.abs(hash);
}

class seededRandom {
    constructor(seed) { this.seed = seed; }
    nextFloat() { var x = Math.sin(this.seed++) * 10000; return x - Math.floor(x); }
}

function shareResult() {
    let sharePromise;
    if (navigator.share) {
        sharePromise = navigator.share({
            title: '이세계 티켓 발급소',
            text: `내 이세계 등급은 ${document.getElementById('res-rank').innerText}입니다!`,
            url: window.location.href,
        });
    } else {
        sharePromise = navigator.clipboard.writeText(window.location.href)
            .then(() => alert("주소가 복사되었습니다!"));
    }

    Promise.resolve(sharePromise).finally(() => {
        const hiddenArea = document.getElementById('hidden-area');
        const lockMsg = document.querySelector('.locked-msg');
        if (!hiddenArea.classList.contains('blur')) return;
        lockMsg.innerHTML = "📡<br>공유 확인 중...";
        setTimeout(() => { unlockHidden(); }, 3000); // 3초로 단축 (너무 길면 지루함)
    });
}

function unlockHidden() {
    document.getElementById('hidden-area').classList.remove('blur');
}

function retry() {
    rerollCount++;
    document.getElementById('result-screen').classList.add('hidden');
    document.getElementById('hidden-area').classList.add('blur');
    issueTicket();
}

function saveTicket() {
    const ticketElement = document.querySelector(".ticket-frame");
    const btn = document.getElementById("ui-btn-save");
    const hiddenArea = document.getElementById('hidden-area');
    const isLocked = hiddenArea.classList.contains('blur');
    const hiddenContent = document.querySelector('.unlocked-content');

    // 잠금 상태일 때 내용물 숨기기 (깔끔하게)
    if (isLocked) hiddenContent.style.visibility = 'hidden';

    // 1. 버튼 텍스트 변경
    const originalText = btn.innerText;
    btn.innerText = database[currentLang].ui.saving;

    // ★ [핵심 추가] CSS에 신호 보내기: "지금 저장 중이니까 홀로그램 꺼!"
    ticketElement.classList.add('saving');

    // 2. 캡처 시작
    html2canvas(ticketElement, { scale: 2, backgroundColor: "#1e1e24", useCORS: true }).then(canvas => {
        const link = document.createElement("a");
        link.download = `isekai_ticket_${new Date().getTime()}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();

        // 3. 뒷정리
        btn.innerText = "Done! 📁";
        
        // ★ [핵심 추가] 캡처 끝났으니 다시 홀로그램 켜기
        ticketElement.classList.remove('saving');

        setTimeout(() => btn.innerText = originalText, 2000);

        if (isLocked) hiddenContent.style.visibility = 'visible';
    });
}

// 3D 홀로그램 및 자이로 효과
const holo = document.querySelector('.holo-overlay');

function applyEffect(x, y) {
    if (holo && getComputedStyle(holo).opacity !== '0') {
        const movementRange = 25; 
        const bgPosX = 50 + (x * movementRange);
        const bgPosY = 50 + (y * movementRange);
        holo.style.backgroundPosition = `${bgPosX}% ${bgPosY}%`;
        holo.style.opacity = 0.8 + (Math.abs(x) * 0.2);
    }
}

document.addEventListener('mousemove', (e) => {
    if (document.getElementById('result-screen').classList.contains('hidden')) return;
    const x = (e.clientX / window.innerWidth - 0.5) * 2;
    const y = (e.clientY / window.innerHeight - 0.5) * 2;
    requestAnimationFrame(() => applyEffect(x, y));
});

window.addEventListener('deviceorientation', (e) => {
    if (document.getElementById('result-screen').classList.contains('hidden')) return;
    let x = e.gamma / 45; 
    let y = e.beta / 45;
    if (x > 1) x = 1; if (x < -1) x = -1;
    if (y > 1) y = 1; if (y < -1) y = -1;
    requestAnimationFrame(() => applyEffect(x, y));
});