const PASSWORD_LENGTH = 16;
const CHARACTER_GROUPS = [
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  'abcdefghijklmnopqrstuvwxyz',
  '0123456789',
  '!@#$%^&*+-=?',
];
const ALPHABET = CHARACTER_GROUPS.join('');
const BYTE_RANGE = 256;

export function generatePassword(): string {
  const characters = CHARACTER_GROUPS.map(randomCharacter);
  while (characters.length < PASSWORD_LENGTH) {
    characters.push(randomCharacter(ALPHABET));
  }

  for (let index = characters.length - 1; index > 0; index--) {
    const otherIndex = randomIndex(index + 1);
    [characters[index], characters[otherIndex]] = [characters[otherIndex], characters[index]];
  }
  return characters.join('');
}

function randomCharacter(alphabet: string): string {
  return alphabet[randomIndex(alphabet.length)];
}

function randomIndex(size: number): number {
  const limit = BYTE_RANGE - (BYTE_RANGE % size);
  const byte = new Uint8Array(1);
  do {
    crypto.getRandomValues(byte);
  } while (byte[0] >= limit);
  return byte[0] % size;
}
