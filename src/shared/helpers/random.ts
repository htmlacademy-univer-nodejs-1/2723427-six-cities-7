export function getRandomInt(min: number, max: number): number {
  const lower = Math.ceil(min);
  const upper = Math.floor(max);
  return Math.floor(Math.random() * (upper - lower + 1)) + lower;
}

export function getRandomFloat(min: number, max: number, digits = 1): number {
  const value = Math.random() * (max - min) + min;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function getRandomBoolean(): boolean {
  return Math.random() < 0.5;
}

export function getRandomItem<T>(items: readonly T[]): T {
  if (items.length === 0) {
    throw new Error('Нельзя выбрать случайный элемент из пустого массива');
  }

  return items[getRandomInt(0, items.length - 1)];
}

export function getRandomItems<T>(items: readonly T[], count: number = getRandomInt(1, items.length)): T[] {
  const result = [...items];

  for (let index = result.length - 1; index > 0; index--) {
    const randomIndex = getRandomInt(0, index);
    [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
  }

  return result.slice(0, Math.min(count, result.length));
}
