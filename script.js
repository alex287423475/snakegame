// 游戏配置
const GRID_SIZE = 20;
const CELL_SIZE = 30;
const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 600;
const GRID_WIDTH = CANVAS_WIDTH / CELL_SIZE;
const GRID_HEIGHT = CANVAS_HEIGHT / CELL_SIZE;

// 速度配置（毫秒，数值越小速度越快）
const SPEED_CONFIG = {
    slow: 250,      // 慢速
    normal: 150,    // 中速（默认）
    fast: 100,      // 快速
    veryFast: 60   // 极速
};

// 游戏状态
let ctx;
let snake = [];
let direction = { x: 1, y: 0 };
let nextDirection = { x: 1, y: 0 };
let food = {};
let score = 0;
let highScore = 0;
let gameRunning = false;
let gamePaused = false;
let gameLoop = null;
let currentSpeed = 'normal'; // 当前速度

// DOM 元素
let scoreElement, highScoreElement, startBtn, pauseBtn, resetBtn, restartBtn;
let gameOverElement, finalScoreElement, canvas;
let speedSlow, speedNormal, speedFast, speedVeryFast;

// 初始化
function init() {
    // 获取 DOM 元素
    scoreElement = document.getElementById('score');
    highScoreElement = document.getElementById('highScore');
    startBtn = document.getElementById('startBtn');
    pauseBtn = document.getElementById('pauseBtn');
    resetBtn = document.getElementById('resetBtn');
    restartBtn = document.getElementById('restartBtn');
    gameOverElement = document.getElementById('gameOver');
    finalScoreElement = document.getElementById('finalScore');
    canvas = document.getElementById('gameCanvas');
    speedSlow = document.getElementById('speedSlow');
    speedNormal = document.getElementById('speedNormal');
    speedFast = document.getElementById('speedFast');
    speedVeryFast = document.getElementById('speedVeryFast');
    
    if (!canvas) {
        console.error('无法找到 canvas 元素');
        return;
    }
    
    ctx = canvas.getContext('2d');
    
    // 从本地存储加载最高分和速度偏好
    highScore = parseInt(localStorage.getItem('snakeHighScore') || '0');
    if (highScoreElement) {
        highScoreElement.textContent = highScore;
    }
    
    // 加载保存的速度设置
    const savedSpeed = localStorage.getItem('snakeSpeed') || 'normal';
    currentSpeed = savedSpeed;
    setSpeed(savedSpeed);
    
    // 初始化蛇
    resetGame();
    
    // 事件监听
    if (startBtn) startBtn.addEventListener('click', startGame);
    if (pauseBtn) pauseBtn.addEventListener('click', togglePause);
    if (resetBtn) resetBtn.addEventListener('click', resetGame);
    if (restartBtn) {
        restartBtn.addEventListener('click', () => {
            if (gameOverElement) gameOverElement.classList.add('hidden');
            resetGame();
            startGame();
        });
    }
    
    // 速度选择器事件监听
    if (speedSlow) speedSlow.addEventListener('change', () => changeSpeed('slow'));
    if (speedNormal) speedNormal.addEventListener('change', () => changeSpeed('normal'));
    if (speedFast) speedFast.addEventListener('change', () => changeSpeed('fast'));
    if (speedVeryFast) speedVeryFast.addEventListener('change', () => changeSpeed('veryFast'));
    
    // 键盘控制
    document.addEventListener('keydown', handleKeyPress);
    
    // 绘制初始状态
    draw();
}

// 重置游戏
function resetGame() {
    snake = [
        { x: 10, y: 10 },
        { x: 9, y: 10 },
        { x: 8, y: 10 }
    ];
    direction = { x: 1, y: 0 };
    nextDirection = { x: 1, y: 0 };
    score = 0;
    if (scoreElement) {
        scoreElement.textContent = score;
    }
    gameRunning = false;
    gamePaused = false;
    generateFood();
    draw();
    
    if (startBtn) {
        startBtn.disabled = false;
    }
    if (pauseBtn) {
        pauseBtn.disabled = true;
        pauseBtn.textContent = '暂停';
    }
}

// 设置速度
function setSpeed(speed) {
    currentSpeed = speed;
    let speedRadio;
    switch(speed) {
        case 'slow':
            speedRadio = speedSlow;
            break;
        case 'normal':
            speedRadio = speedNormal;
            break;
        case 'fast':
            speedRadio = speedFast;
            break;
        case 'veryFast':
            speedRadio = speedVeryFast;
            break;
    }
    if (speedRadio) {
        speedRadio.checked = true;
    }
    // 如果游戏正在运行，需要重新设置间隔
    if (gameRunning && !gamePaused) {
        clearInterval(gameLoop);
        gameLoop = setInterval(update, SPEED_CONFIG[currentSpeed]);
    }
}

// 切换速度
function changeSpeed(speed) {
    if (!['slow', 'normal', 'fast', 'veryFast'].includes(speed)) return;
    
    currentSpeed = speed;
    localStorage.setItem('snakeSpeed', speed);
    
    // 如果游戏正在运行，更新游戏循环速度
    if (gameRunning && !gamePaused) {
        clearInterval(gameLoop);
        gameLoop = setInterval(update, SPEED_CONFIG[currentSpeed]);
    }
}

// 开始游戏
function startGame() {
    if (gameRunning) return;
    
    gameRunning = true;
    gamePaused = false;
    if (startBtn) startBtn.disabled = true;
    if (pauseBtn) pauseBtn.disabled = false;
    
    gameLoop = setInterval(update, SPEED_CONFIG[currentSpeed]);
}

// 暂停/继续游戏
function togglePause() {
    if (!gameRunning || !pauseBtn) return;
    
    gamePaused = !gamePaused;
    
    if (gamePaused) {
        clearInterval(gameLoop);
        pauseBtn.textContent = '继续';
    } else {
        gameLoop = setInterval(update, SPEED_CONFIG[currentSpeed]);
        pauseBtn.textContent = '暂停';
    }
}

// 生成食物
function generateFood() {
    do {
        food = {
            x: Math.floor(Math.random() * GRID_WIDTH),
            y: Math.floor(Math.random() * GRID_HEIGHT)
        };
    } while (snake.some(segment => segment.x === food.x && segment.y === food.y));
}

// 更新游戏状态
function update() {
    if (gamePaused) return;
    
    // 更新方向
    direction = { ...nextDirection };
    
    // 计算新头部位置
    const head = {
        x: snake[0].x + direction.x,
        y: snake[0].y + direction.y
    };
    
    // 检查碰撞
    if (checkCollision(head)) {
        endGame();
        return;
    }
    
    // 添加新头部
    snake.unshift(head);
    
    // 检查是否吃到食物
    if (head.x === food.x && head.y === food.y) {
        score += 10;
        if (scoreElement) scoreElement.textContent = score;
        generateFood();
        
        // 更新最高分
        if (score > highScore) {
            highScore = score;
            if (highScoreElement) highScoreElement.textContent = highScore;
            localStorage.setItem('snakeHighScore', highScore.toString());
        }
    } else {
        // 移除尾部
        snake.pop();
    }
    
    draw();
}

// 检查碰撞
function checkCollision(head) {
    // 检查墙壁碰撞
    if (head.x < 0 || head.x >= GRID_WIDTH || head.y < 0 || head.y >= GRID_HEIGHT) {
        return true;
    }
    
    // 检查自身碰撞
    for (let i = 1; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            return true;
        }
    }
    
    return false;
}

// 结束游戏
function endGame() {
    clearInterval(gameLoop);
    gameRunning = false;
    gamePaused = false;
    if (startBtn) startBtn.disabled = false;
    if (pauseBtn) {
        pauseBtn.disabled = true;
        pauseBtn.textContent = '暂停';
    }
    
    if (finalScoreElement) finalScoreElement.textContent = score;
    if (gameOverElement) gameOverElement.classList.remove('hidden');
}

// 绘制游戏
function draw() {
    if (!ctx || !canvas) {
        return;
    }
    
    // 清空画布
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // 绘制网格
    ctx.strokeStyle = '#16213e';
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_WIDTH; i++) {
        ctx.beginPath();
        ctx.moveTo(i * CELL_SIZE, 0);
        ctx.lineTo(i * CELL_SIZE, CANVAS_HEIGHT);
        ctx.stroke();
    }
    for (let i = 0; i <= GRID_HEIGHT; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * CELL_SIZE);
        ctx.lineTo(CANVAS_WIDTH, i * CELL_SIZE);
        ctx.stroke();
    }
    
    // 绘制食物
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.arc(
        food.x * CELL_SIZE + CELL_SIZE / 2,
        food.y * CELL_SIZE + CELL_SIZE / 2,
        CELL_SIZE / 2 - 2,
        0,
        Math.PI * 2
    );
    ctx.fill();
    
    // 绘制蛇
    snake.forEach((segment, index) => {
        if (index === 0) {
            // 蛇头
            ctx.fillStyle = '#2ecc71';
        } else {
            // 蛇身
            ctx.fillStyle = '#27ae60';
        }
        
        ctx.fillRect(
            segment.x * CELL_SIZE + 2,
            segment.y * CELL_SIZE + 2,
            CELL_SIZE - 4,
            CELL_SIZE - 4
        );
        
        // 蛇头眼睛
        if (index === 0) {
            ctx.fillStyle = '#fff';
            const eyeSize = 4;
            const eyeOffset = 8;
            
            if (direction.x === 1) { // 向右
                ctx.fillRect(segment.x * CELL_SIZE + eyeOffset + 8, segment.y * CELL_SIZE + 8, eyeSize, eyeSize);
                ctx.fillRect(segment.x * CELL_SIZE + eyeOffset + 8, segment.y * CELL_SIZE + 18, eyeSize, eyeSize);
            } else if (direction.x === -1) { // 向左
                ctx.fillRect(segment.x * CELL_SIZE + 8, segment.y * CELL_SIZE + 8, eyeSize, eyeSize);
                ctx.fillRect(segment.x * CELL_SIZE + 8, segment.y * CELL_SIZE + 18, eyeSize, eyeSize);
            } else if (direction.y === -1) { // 向上
                ctx.fillRect(segment.x * CELL_SIZE + 8, segment.y * CELL_SIZE + 8, eyeSize, eyeSize);
                ctx.fillRect(segment.x * CELL_SIZE + 18, segment.y * CELL_SIZE + 8, eyeSize, eyeSize);
            } else if (direction.y === 1) { // 向下
                ctx.fillRect(segment.x * CELL_SIZE + 8, segment.y * CELL_SIZE + 18, eyeSize, eyeSize);
                ctx.fillRect(segment.x * CELL_SIZE + 18, segment.y * CELL_SIZE + 18, eyeSize, eyeSize);
            }
        }
    });
}

// 处理键盘输入
function handleKeyPress(e) {
    if (!gameRunning || gamePaused) return;
    
    const key = e.key;
    
    // 防止反向移动
    switch (key) {
        case 'ArrowUp':
            if (direction.y === 0) {
                nextDirection = { x: 0, y: -1 };
            }
            e.preventDefault();
            break;
        case 'ArrowDown':
            if (direction.y === 0) {
                nextDirection = { x: 0, y: 1 };
            }
            e.preventDefault();
            break;
        case 'ArrowLeft':
            if (direction.x === 0) {
                nextDirection = { x: -1, y: 0 };
            }
            e.preventDefault();
            break;
        case 'ArrowRight':
            if (direction.x === 0) {
                nextDirection = { x: 1, y: 0 };
            }
            e.preventDefault();
            break;
        case ' ':
            togglePause();
            e.preventDefault();
            break;
    }
}

// 页面加载完成后初始化
window.addEventListener('load', init);
