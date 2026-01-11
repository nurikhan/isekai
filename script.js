/* script.js */

// 전역 변수: 재시도(Re-roll) 횟수
let rerollCount = 0;
let currentLang = 'ko'; // 기본 언어 (한국어)

// 0. 언어 설정 함수
function setLanguage(lang) {
    currentLang = lang;
    const ui = database[lang].ui;

    // 1. 버튼 스타일 변경
    document.querySelectorAll('.lang-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active'); // 클릭한 버튼 활성화

    // 2. UI 텍스트 업데이트
    document.title = ui.title.replace('<br>', ' '); // 브라우저 탭 제목
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
    // 키값 순서대로 옵션 생성 (money, people, work...)
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
}

// 1. 초기 실행 (기본 한국어 설정)
window.onload = function() {
    // 스트레스 옵션 초기 세팅을 위해 한 번 실행
    // HTML onclick에서 this 전달을 위해 가짜 이벤트 객체 처리 필요하지만,
    // 여기선 단순히 초기화만 하므로 직접 호출
    const ui = database['ko'].ui;
    const stressSelect = document.getElementById('stress-cause');
    for (const [key, value] of Object.entries(ui.stressOptions)) {
        const option = document.createElement('option');
        option.value = key;
        option.innerText = value;
        stressSelect.appendChild(option);
    }
};

// 2. 성별 선택
function selectGender(gender, btn) {
    document.getElementById('selected-gender').value = gender;
    
    // 버튼 스타일 초기화 및 적용
    const buttons = document.querySelectorAll('.gender-btn');
    buttons.forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
}

// 3. 티켓 발급 메인 함수
function issueTicket() {
    // [추가] iOS 13+ 기기에서 자이로 센서 권한 요청
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
        DeviceMotionEvent.requestPermission()
            .then(response => {
                if (response === 'granted') {
                    // 권한 허용됨
                }
            })
            .catch(console.error);
    }

    const name = document.getElementById('user-name').value.trim();
    const gender = document.getElementById('selected-gender').value;
    const stress = document.getElementById('stress-cause').value;

    if (!name || !gender) {
        alert("Please enter name and gender!"); // 간단한 공통 알림
        return;
    }

    // [추가] 트럭 소리 재생 (사용자 클릭 시점에 재생해야 브라우저가 안 막음)
    const truckAudio = document.getElementById('sfx-truck');
    if(truckAudio) {
        truckAudio.volume = 0.5; // 소리 크기 조절 (0.0 ~ 1.0)
        truckAudio.play().catch(e => console.log(e)); // 에러 방지
    }

    // 화면 전환 및 로딩 시작
    document.getElementById('intro-screen').classList.add('hidden');
    document.getElementById('loading-screen').classList.remove('hidden');

    // 3초 후 결과 표시
    setTimeout(() => {
        calculateResult(name, gender, stress);

        // [추가] 결과 효과음 재생
        const resultAudio = document.getElementById('sfx-result');
        if(resultAudio) {
            resultAudio.volume = 0.6;
            resultAudio.play().catch(e => console.log(e));
        }

        document.getElementById('loading-screen').classList.add('hidden');
        document.getElementById('result-screen').classList.remove('hidden');
    }, 2500); // 2.5초 로딩
}

// 4. 결과 계산 (알고리즘 핵심)
function calculateResult(name, gender, stress) {
    // 시드 생성 (이름 + 성별 + 스트레스 + 리롤횟수)
    const seedStr = name + gender + stress + rerollCount;
    const seed = stringToHash(seedStr);

    // 랜덤 함수 (Deterministic)
    const rng = new seededRandom(seed);

    // ★ 현재 선택된 언어의 데이터를 가져옵니다.
    const db = database[currentLang];

    // --- (1) 세계관 결정 ---
    // 남성: 남성향(20) + 공통(70) + 여성향(10, 반전)
    // 여성: 여성향(20) + 공통(70) + 남성향(10, 반전)
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

    // --- (2) 캐릭터 결정 (성별에 따라 리스트 분기) ---
    const rankRoll = rng.nextFloat() * 100;
    let targetTier = 'B';
    
    // 확률 설정 (SSS: 5%, S: 15%, A: 20%, B: 40%, F: 20%)
    if (rankRoll < 5) targetTier = 'SSS';
    else if (rankRoll < 20) targetTier = 'S';
    else if (rankRoll < 40) targetTier = 'A';
    else if (rankRoll < 80) targetTier = 'B';
    else targetTier = 'F';

    // ★ 성별에 맞는 캐릭터 목록 가져오기 (핵심 수정!)
    let targetCharList = (gender === 'male') ? db.characters.male : db.characters.female;

    // 해당 등급의 캐릭터만 필터링해서 뽑기
    const charPool = targetCharList.filter(c => c.tier === targetTier);

    // 만약 데이터가 없으면(오류 방지) 첫 번째 캐릭터 선택
    const character = charPool[Math.floor(rng.nextFloat() * charPool.length)] || targetCharList[0];

    // --- (3) 능력 결정 ---
    const skillPool = db.skills.filter(s => s.tier === targetTier); // 캐릭터 등급과 비슷하게 감
    // 혹은 능력을 완전 랜덤으로 하려면 필터링을 빼도 됨 (재미를 위해 등급 맞춤)
    const skill = skillPool.length > 0 ? skillPool[Math.floor(rng.nextFloat() * skillPool.length)] : db.skills[0];

    // --- (4) 기타 ---
    const reason = db.reasons[Math.floor(rng.nextFloat() * db.reasons.length)];
    const partner = db.partners[Math.floor(rng.nextFloat() * db.partners.length)];
    const awaken = db.awakenSkills[Math.floor(rng.nextFloat() * db.awakenSkills.length)];

    // 4. UI 업데이트 - 이미지 연결 코드 추가
    document.getElementById('res-user-name').innerText = name;
    document.getElementById('res-char-name').innerText = character.name;
    document.getElementById('res-rank').innerText = `RANK ${character.tier}`;
    
    document.getElementById('res-world').innerText = `${world.text}\n(${world.desc})`;
    
    document.getElementById('res-skill-rank').innerText = `[${skill.tier}]`;
    document.getElementById('res-skill-name').innerText = skill.name;
    document.getElementById('res-skill-desc').innerText = skill.desc;
    
    document.getElementById('res-reason').innerText = reason;
    
    // 복귀 확률 (F급일수록 낮게, SSS급일수록 낮게 -> 그냥 랜덤 재미)
    document.getElementById('prob-value').innerText = (rng.nextFloat() * 1).toFixed(4) + "%";

    // 히든 데이터 (공유 시 보여줄 것 미리 세팅)
    document.getElementById('res-partner').innerText = partner.name;
    document.getElementById('res-partner-desc').innerText = partner.desc;
    document.getElementById('res-awake-skill').innerText = awaken.name;
    document.getElementById('res-awake-desc').innerText = awaken.desc;

    // ★ 이미지 업데이트 (여기가 핵심!)
    // data.js에 적힌 img 경로를 가져와서 배경 이미지로 깔아주는 코드입니다.
    
    // 1. 배경 이미지 (world.img가 있다면 적용)
    if (world.img) {
        document.getElementById('bg-layer').style.backgroundImage = `url('${world.img}')`;
    } else {
        document.getElementById('bg-layer').style.background = '#333'; // 이미지 없으면 회색
    }

    // 2. 캐릭터 이미지 (character.img가 있다면 적용)
    if (character.img) {
        document.getElementById('char-layer').style.backgroundImage = `url('${character.img}')`;
    }
    
    // 3. 파트너 이미지 (partner.img가 있다면 적용)
    if (partner.img) {
        // 파트너는 div 배경이 아니라 <img> 태그나 div 배경으로 처리
        // html의 .partner-img-placeholder 요소를 활용
        const partnerDiv = document.querySelector('.partner-img-placeholder');
        partnerDiv.innerText = ""; // 물음표 텍스트 지우기
        partnerDiv.style.backgroundImage = `url('${partner.img}')`;
        partnerDiv.style.backgroundSize = "cover";
    }

    // 네온 효과 및 이미지 적용
    // 1. 티켓 프레임 요소 가져오기
    const ticketFrame = document.querySelector('.ticket-frame');
    
    // 2. 기존 등급 클래스 모두 제거 (초기화)
    ticketFrame.classList.remove('rank-sss', 'rank-s', 'rank-a', 'rank-b', 'rank-f');
    
    // 3. 현재 뽑힌 캐릭터 등급(character.tier)에 맞춰 클래스 추가
    if (character.tier === 'SSS') ticketFrame.classList.add('rank-sss');
    else if (character.tier === 'S') ticketFrame.classList.add('rank-s');
    else if (character.tier === 'A') ticketFrame.classList.add('rank-a');
    else if (character.tier === 'B') ticketFrame.classList.add('rank-b');
    else ticketFrame.classList.add('rank-f'); // F급

    if (world.img) document.getElementById('bg-layer').style.backgroundImage = `url('${world.img}')`;
    else document.getElementById('bg-layer').style.background = '#333';

    if (character.img) document.getElementById('char-layer').style.backgroundImage = `url('${character.img}')`;
    
    if (partner.img) {
        const partnerDiv = document.querySelector('.partner-img-placeholder');
        partnerDiv.innerText = "";
        partnerDiv.style.backgroundImage = `url('${partner.img}')`;
        partnerDiv.style.backgroundSize = "cover";
    }
}

// 유틸: 문자열을 정수 해시값으로 변환 (djb2 알고리즘)
function stringToHash(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash) + str.charCodeAt(i); /* hash * 33 + c */
    }
    return Math.abs(hash);
}

// 유틸: 시드 기반 랜덤 클래스 (항상 같은 순서로 난수 발생)
class seededRandom {
    constructor(seed) {
        this.seed = seed;
    }
    nextFloat() {
        var x = Math.sin(this.seed++) * 10000;
        return x - Math.floor(x);
    }
}

// 5. 공유하기 기능
function shareResult() {
    // 1. 공유 시도 (클립보드 복사 or 네이티브 공유)
    let sharePromise;
    
    if (navigator.share) {
        // 모바일 등 공유 기능 지원 시
        sharePromise = navigator.share({
            title: '이세계 티켓 발급소',
            text: `내 이세계 등급은 ${document.getElementById('res-rank').innerText}입니다!`,
            url: window.location.href,
        });
    } else {
        // PC 등 미지원 시 클립보드 복사
        sharePromise = navigator.clipboard.writeText(window.location.href)
            .then(() => alert("주소가 복사되었습니다! 친구에게 붙여넣기(Ctrl+V) 하세요."));
    }

    // 2. '공유 확인 중...' 연출 (핵심: 약간의 지연 시간 주기)
    // 실제로 공유를 했는지 안 했는지는 알 수 없지만, 
    // 유저가 공유 창을 닫고 돌아왔을 때쯤 열리도록 시간차를 둡니다.
    
    Promise.resolve(sharePromise).finally(() => {
        // 공유 창이 닫히거나 복사가 끝난 후
        const hiddenArea = document.getElementById('hidden-area');
        const lockMsg = document.querySelector('.locked-msg');
        
        // 이미 열려있으면 패스
        if (!hiddenArea.classList.contains('blur')) return;

        // "확인 중..." 메시지로 변경 (연기)
        lockMsg.innerHTML = "📡<br>공유 확인 중...";
        
        // 10초 뒤에 잠금 해제
        setTimeout(() => {
            unlockHidden();
        }, 10000); 
    });
}

function unlockHidden() {
    document.getElementById('hidden-area').classList.remove('blur');
}

// 6. 다시 하기
function retry() {
    rerollCount++; // 카운트 증가 -> 시드값 변경됨 -> 다른 결과 나옴
    document.getElementById('result-screen').classList.add('hidden');
    document.getElementById('hidden-area').classList.add('blur'); // 히든 다시 잠금
    issueTicket(); // 바로 다시 발급
}

// 티켓 이미지로 저장하기
function saveTicket() {
    const ticketElement = document.querySelector(".ticket-frame");

    // 저장 중이라는 표시 (버튼 글씨 변경 등)
    const btn = document.querySelector(".save-btn");
    const originalText = btn.innerText;
    btn.innerText = "이미지 생성 중...";

    html2canvas(ticketElement, {
        scale: 2, // 고화질로 저장
        backgroundColor: "#1e1e24", // 배경색 지정
        useCORS: true // 외부 이미지 허용
    }).then(canvas => {
        // 캔버스를 이미지 링크로 변환
        const link = document.createElement("a");
        link.download = `isekai_ticket_${new Date().getTime()}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();

        btn.innerText = "저장 완료! 📁";
        setTimeout(() => btn.innerText = originalText, 2000);
    });
}

/* 3D 홀로그램 효과 */

const ticket = document.querySelector('.ticket-frame');
const holo = document.querySelector('.holo-overlay');

// 1. 움직임 계산 함수 (공통)
function applyEffect(x, y) {
    // 1. 카드 회전(3D 왜곡) 효과는 삭제! (사용자 요청 반영)
    // ticket.style.transform = ... (이 부분 제거)
    // 대신 미세한 스케일링만 둬서 '살아있는' 느낌만 줌 (선택 사항)
    // ticket.style.transform = `scale3d(1.0, 1.0, 1.0)`; 

    // 2. 홀로그램 빛 반사 효과만 이동
    if (holo && getComputedStyle(holo).opacity !== '0') {
        // x, y 값(-1 ~ 1)을 퍼센트(%)로 변환
        // 중앙(50%)을 기준으로 빛이 넓게 움직이도록 범위 설정
        const bgPosX = 50 + (x * 60); // 좌우로 60% 정도 더 움직임
        const bgPosY = 50 + (y * 60); // 상하로 60% 정도 더 움직임
        
        // 홀로그램 위치 이동
        holo.style.backgroundPosition = `${bgPosX}% ${bgPosY}%`;
        
        // (옵션) 폰을 많이 기울이면 빛이 더 강해짐
        // holo.style.filter = `brightness(${100 + Math.abs(x * 30)}%)`; 
    }
}

// 2. PC: 마우스 움직임 감지
document.addEventListener('mousemove', (e) => {
    // 결과 화면이 보일 때만 작동
    if (document.getElementById('result-screen').classList.contains('hidden')) return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    
    // 마우스 위치를 -1 ~ 1 사이 값으로 변환
    const x = (e.clientX / width - 0.5) * 2;
    const y = (e.clientY / height - 0.5) * 2;

    requestAnimationFrame(() => applyEffect(x, y));
});

// 3. 모바일: 자이로 센서 감지
window.addEventListener('deviceorientation', (e) => {
    if (document.getElementById('result-screen').classList.contains('hidden')) return;

    // 베타(앞뒤), 감마(좌우) 기울기
    // 보통 -90 ~ 90 범위를 가짐
    let x = e.gamma / 45; // -1 ~ 1 범위로 조정
    let y = e.beta / 45;

    // 범위 제한 (-1 ~ 1을 넘어가지 않게)
    if (x > 1) x = 1; if (x < -1) x = -1;
    if (y > 1) y = 1; if (y < -1) y = -1;

    requestAnimationFrame(() => applyEffect(x, y));
});

// 4. (중요) 아이폰(iOS 13+) 권한 요청 처리
// 아이폰은 버튼을 눌러서 '동작 및 방향 접근' 권한을 얻어야 센서가 작동합니다.
// 따라서 '티켓 발급하기' 버튼을 누를 때 권한을 요청하도록 issueTicket 함수를 수정해야 합니다.

