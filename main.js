// Глобальные переменные
let inpValue = 0n; // Больше не нужна isRunning, stepLoopRunning, trajectory и т.д.
let isComputing = false; // Флаг, показывающий, идут ли вычисления в воркере
let computationResult = null; // Храним результат вычислений
let isRunning = false;
let currentStepIndex = 0;



// Worker (предполагается, что он теперь просто вычисляет весь список)
const worker = new Worker('./webWorker/collatz.worker.js');

let visibleItems = [] // Не используется, но оставлена по запросу

// DOM-элементы

// Важные
const inp = document.querySelector('.number-input');
const start = document.querySelector('.start');
const calcArea = document.querySelector('.results-calculation-area');

// Статистика
const currentNumber = document.querySelector('.currentNumber');
const stepsCount = document.querySelector('.stepsCount');
const maxNumber = document.querySelector('.largestNum');
const firstNumberLengthBlock = document.querySelector('.firstNumberLength');
const firstNumberDisplay = document.querySelector('.firstNumber');
const skipThat = document.querySelector('.immediatly');

// Настраиваемые параметры
const speed = document.querySelector('.calc-speed');
let curspeed = document.querySelector('.speed-value');
let chosenSpeed = 300 // Не используется, но оставлена по запросу
let delay = chosenSpeed; // Не используется, но оставлена по запросу

speed.addEventListener('input', () => {
    const map = {
        '5': 1,
        '4': 10,
        '3': 100,
        '2': 300,
        '1': 750
    };
    delay = map[speed.value];
    curspeed.innerText = delay + ' ms';
});



// --- Функция для переключения изображения на кнопке START ---
// Принимает булевое значение: true - отображает play.png, false - stop.png
// Эта функция не используется в текущем коде, но может быть полезна для рефакторинга
function changeMainButtonMode(playMode) {
    if (playMode) {
        return start.innerHTML = '<img src="assets/play.png" class="btn-img">';
    } else {
        return start.innerHTML = '<img src="assets/stop.png" class="btn-img">';
    }
}

const fontSizeSet = document.getElementById('fontSizeSet');
let curFontSize = document.querySelector('.fontRangeArea p');

if (fontSizeSet) {
    fontSizeSet.addEventListener('input', () => {
        calcArea.style.fontSize = fontSizeSet.value + 'px';
        curFontSize.innerText = fontSizeSet.value + 'px';
    });
};

// --- Обработчик клика по кнопке Reset ---
// Устанавливает флаг isResetted. Этот флаг не используется в остальной части кода.
const resetButton = document.querySelector('.controller.reset'); // Исправлен селектор
let isResetted = false; // Перемещена сюда для соответствия группировке
resetButton.addEventListener('click', () => {
    isResetted = true;
});

if (!inp || !start || !calcArea || !currentNumber || !stepsCount || !maxNumber || !firstNumberLengthBlock || !firstNumberDisplay) {
    console.error('Required elements not found!');
}

// --- Worker onmessage (обновлено для нового воркера) ---
// Теперь получает один объект { spisok, steps, max }
worker.onmessage = (e) => {
    computationResult = e.data;

    isComputing = false;
    currentStepIndex = 0;
    visibleItems = [];
    calcArea.innerHTML = '';

    changeMainButtonMode(false); // stop
    isRunning = true;

    processDelayCalc(computationResult.spisok, delay);
};

function renderAllRemaining(list) {
    for (let i = currentStepIndex; i < list.length; i++) {
        const num = list[i];

        const p = document.createElement('p');
        p.textContent = num.toString();
        calcArea.appendChild(p);
    }

    // финальное состояние
    currentStepIndex = list.length;
    visibleItems = list.slice();

    if (list.length > 0) {
        currentNumber.textContent = list[list.length - 1].toString();
    }

    stepsCount.textContent = (list.length - 1).toString();
    maxNumber.textContent = computationResult.max.toString();

    isRunning = false;
    changeMainButtonMode(true);

    calcArea.scrollTop = calcArea.scrollHeight;
};


function processDelayCalc(list) {
    if (!isRunning || currentStepIndex >= list.length) {
        if (currentStepIndex >= list.length) {
            isRunning = false;
            changeMainButtonMode(true);
            return;
        }
        return;
    }

    const currentNum = list[currentStepIndex];
    visibleItems.push(currentNum);

    const p = document.createElement('p');
    p.textContent = currentNum.toString();
    calcArea.appendChild(p);

    currentNumber.textContent = currentNum.toString();
    stepsCount.textContent = currentStepIndex.toString();
    maxNumber.textContent = computationResult.max.toString();

    currentStepIndex++;

    setTimeout(() => {
        processDelayCalc(list);
    }, delay);
}



// --- Обновление inpValue ---
// Обновляет глобальную переменную inpValue на основе значения из поля ввода
// и обновляет отображение длины числа и самого числа.
const updateInpValue = () => {
    inpValue = BigInt(inp.value || '0');
    firstNumberLengthBlock.innerText = String(inpValue).length + ' digits';
    firstNumberDisplay.innerText = String(inpValue);
};
updateInpValue();

// --- Обработчик клика по кнопке Reset (повтор) ---
// Этот обработчик перезаписывает предыдущий. Он отправляет в воркер сообщение 'reset',
// очищает calcArea и меняет изображение кнопки start.
// Сообщение 'reset' не обрабатывается новым воркером.
resetButton.addEventListener('click', () => {
    isRunning = false;
    isComputing = false;

    computationResult = null;
    visibleItems = [];
    currentStepIndex = 0;

    calcArea.innerHTML = '';
    currentNumber.textContent = 'None';
    maxNumber.textContent = 'None';
    stepsCount.textContent = 'None';

    changeMainButtonMode(true);
});


// --- Кнопка старт ---
// Обновлено: теперь отправляет начальное значение в воркер и устанавливает флаг вычислений.
start.addEventListener('click', () => {

    const hasResult = computationResult !== null;
    const isFinished =
        hasResult &&
        currentStepIndex >= computationResult.spisok.length;

    // ▶ PLAY
    if (!isRunning) {
        if (!hasResult || isFinished) {
            // полный сброс
            computationResult = null;
            visibleItems = [];
            currentStepIndex = 0;
            calcArea.innerHTML = '';

            isRunning = true;
            changeMainButtonMode(false); // pause
            worker.postMessage(inpValue);
            return;
        }

        isRunning = true;
        changeMainButtonMode(false); // pause
        processDelayCalc(computationResult.spisok);
        return;
    }

    // ⏸ PAUSE
    isRunning = false;
    changeMainButtonMode(true); // play
});

skipThat.addEventListener('click', () => {
    if (!computationResult) return;

    // остановить пошаговый вывод
    isRunning = false;

    // мгновенно вывести всё
    renderAllRemaining(computationResult.spisok);
});



// Ограничение ввода только цифрами
inp.addEventListener('beforeinput', e => {
    if (e.data && !/^[0-9]+$/.test(e.data)) {
        e.preventDefault();
    }
});
inp.addEventListener('input', updateInpValue);