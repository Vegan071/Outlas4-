// Клавиатура: состояние движения + делегирование действий обработчикам.

export const input = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  sprint: false,
};

let handlers = {};

export function initInput(actionHandlers) {
  handlers = actionHandlers;
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);
}

/** Сбрасывает зажатые клавиши (например, при паузе), чтобы персонаж не «залипал» */
export function resetInput() {
  input.forward = input.backward = input.left = input.right = input.sprint = false;
}

function onKeyDown(e) {
  switch (e.code) {
    case 'KeyW': input.forward = true; return;
    case 'KeyA': input.left = true; return;
    case 'KeyS': input.backward = true; return;
    case 'KeyD': input.right = true; return;
    case 'ShiftLeft':
    case 'ShiftRight': input.sprint = true; return;
  }
  if (e.repeat) return;
  switch (e.code) {
    case 'Space': e.preventDefault(); handlers.jump?.(); break;
    case 'KeyP': handlers.pause?.(); break;
    case 'KeyF': handlers.flashlight?.(); break;
    case 'KeyR': handlers.flashbang?.(); break;
    case 'KeyQ': handlers.radar?.(); break;
    case 'KeyE': handlers.interact?.(); break;
  }
}

function onKeyUp(e) {
  switch (e.code) {
    case 'KeyW': input.forward = false; break;
    case 'KeyA': input.left = false; break;
    case 'KeyS': input.backward = false; break;
    case 'KeyD': input.right = false; break;
    case 'ShiftLeft':
    case 'ShiftRight': input.sprint = false; break;
  }
}
