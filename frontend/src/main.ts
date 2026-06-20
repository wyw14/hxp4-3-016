import { Game } from './game';
import type { LevelData } from './types';
import { healthCheck } from './api';
import { accessibilityManager } from './accessibility';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const game = new Game(canvas);

const levelNumEl = document.getElementById('level-num')!;
const creatureNameEl = document.getElementById('creature-name')!;
const connectedCountEl = document.getElementById('connected-count')!;
const totalCountEl = document.getElementById('total-count')!;
const progressFillEl = document.getElementById('progress-fill')!;
const hintTitleEl = document.getElementById('hint-title')!;
const hintTextEl = document.getElementById('hint-text')!;
const completeModal = document.getElementById('complete-modal')!;
const modalTitleEl = document.getElementById('modal-title')!;
const modalDescEl = document.getElementById('modal-desc')!;

const btnUndo = document.getElementById('btn-undo') as HTMLButtonElement;
const btnReset = document.getElementById('btn-reset') as HTMLButtonElement;
const btnHint = document.getElementById('btn-hint') as HTMLButtonElement;
const btnNext = document.getElementById('btn-next') as HTMLButtonElement;

const accessibilityBtn = document.getElementById('accessibility-btn') as HTMLButtonElement;
const accessibilityPanel = document.getElementById('accessibility-panel') as HTMLDivElement;
const toggleHighContrast = document.getElementById('toggle-highContrast') as HTMLDivElement;
const toggleColorBlind = document.getElementById('toggle-colorBlindFriendly') as HTMLDivElement;
const toggleReduceRotation = document.getElementById('toggle-reduceRotation') as HTMLDivElement;
const toggleReduceFlicker = document.getElementById('toggle-reduceFlicker') as HTMLDivElement;

const MAX_LEVELS = 3;

function updateToggleUI(): void {
  const settings = accessibilityManager.getSettings();
  toggleHighContrast.classList.toggle('active', settings.highContrast);
  toggleColorBlind.classList.toggle('active', settings.colorBlindFriendly);
  toggleReduceRotation.classList.toggle('active', settings.reduceRotation);
  toggleReduceFlicker.classList.toggle('active', settings.reduceFlicker);
}

function applyAccessibilitySettings(): void {
  const settings = accessibilityManager.getSettings();
  game.setAccessibility(settings);
  updateToggleUI();
}

accessibilityBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  accessibilityPanel.classList.toggle('show');
});

document.addEventListener('click', (e) => {
  if (!accessibilityPanel.contains(e.target as Node) && e.target !== accessibilityBtn) {
    accessibilityPanel.classList.remove('show');
  }
});

toggleHighContrast.addEventListener('click', (e) => {
  e.stopPropagation();
  const current = accessibilityManager.getSettings().highContrast;
  accessibilityManager.set('highContrast', !current);
});

toggleColorBlind.addEventListener('click', (e) => {
  e.stopPropagation();
  const current = accessibilityManager.getSettings().colorBlindFriendly;
  accessibilityManager.set('colorBlindFriendly', !current);
});

toggleReduceRotation.addEventListener('click', (e) => {
  e.stopPropagation();
  const current = accessibilityManager.getSettings().reduceRotation;
  accessibilityManager.set('reduceRotation', !current);
});

toggleReduceFlicker.addEventListener('click', (e) => {
  e.stopPropagation();
  const current = accessibilityManager.getSettings().reduceFlicker;
  accessibilityManager.set('reduceFlicker', !current);
});

accessibilityManager.subscribe(() => {
  applyAccessibilitySettings();
});

applyAccessibilitySettings();

game.setCallbacks({
  onLevelChange: (level: LevelData) => {
    levelNumEl.textContent = String(level.id);
    creatureNameEl.textContent = level.creatureName;
    totalCountEl.textContent = String(level.edges.length);
    connectedCountEl.textContent = '0';
    progressFillEl.style.width = '0%';
    completeModal.classList.remove('show');

    hintTitleEl.textContent = `关卡 ${level.id}: ${level.name}`;
    hintTextEl.textContent = '寻找闪烁频率成倍数关系的恒星，从一颗星拖动到另一颗星连接它们';
  },
  onProgressChange: (current: number, total: number) => {
    connectedCountEl.textContent = String(current);
    const pct = total > 0 ? (current / total) * 100 : 0;
    progressFillEl.style.width = `${pct}%`;

    if (current < total) {
      if (current === 0) {
        hintTitleEl.textContent = '观察星空';
        hintTextEl.textContent = '仔细观察星星的闪烁节奏，找到频率相同或成倍数的恒星';
      } else if (current < total * 0.3) {
        hintTitleEl.textContent = '初见端倪';
        hintTextEl.textContent = '做得好！继续寻找，你会发现恒星间的谐波共振关系';
      } else if (current < total * 0.6) {
        hintTitleEl.textContent = '星脉初现';
        hintTextEl.textContent = '神话生物的轮廓正在浮现，耐心连接剩余的星脉';
      } else if (current < total) {
        hintTitleEl.textContent = '即将完成';
        hintTextEl.textContent = '只剩最后几颗星了！神话生物即将显现';
      }
    }
  },
  onComplete: (desc: string) => {
    hintTitleEl.textContent = '✨ 星座完成 ✨';
    hintTextEl.textContent = '星界神话生物已显现！仔细欣赏它的光辉吧';

    modalTitleEl.textContent = `✨ ${creatureNameEl.textContent} 降临 ✨`;
    modalDescEl.textContent = desc;
    completeModal.classList.add('show');

    if (game.getCurrentLevel() >= MAX_LEVELS) {
      btnNext.textContent = '重新开始';
    } else {
      btnNext.textContent = '下一关';
    }
  }
});

btnUndo.addEventListener('click', () => {
  game.undoLastConnection();
});

btnReset.addEventListener('click', () => {
  if (confirm('确定要重置本关吗？所有连线将被清除。')) {
    game.resetLevel();
  }
});

btnHint.addEventListener('click', () => {
  const showing = game.toggleFrequencies();
  btnHint.textContent = showing ? '隐藏频率' : '显示频率';
});

btnNext.addEventListener('click', async () => {
  const nextLevel = game.getCurrentLevel() >= MAX_LEVELS
    ? 1
    : game.getCurrentLevel() + 1;

  completeModal.classList.remove('show');
  btnHint.textContent = '显示频率';
  await game.loadLevel(nextLevel);
});

async function init(): Promise<void> {
  hintTitleEl.textContent = '加载中...';
  hintTextEl.textContent = '正在连接星界数据库...';

  try {
    const backendOk = await healthCheck();
    if (!backendOk) {
      console.warn('后端未启动，尝试使用嵌入数据...');
    }
  } catch {
    console.warn('后端健康检查失败');
  }

  const loaded = await game.loadLevel(1);
  if (!loaded) {
    hintTitleEl.textContent = '⚠️ 加载失败';
    hintTextEl.textContent = '无法加载关卡数据，请确保后端服务器已启动 (npm run dev:backend)';
    return;
  }

  game.start();
}

init().catch(err => {
  console.error('初始化失败:', err);
  hintTitleEl.textContent = '错误';
  hintTextEl.textContent = String(err);
});
