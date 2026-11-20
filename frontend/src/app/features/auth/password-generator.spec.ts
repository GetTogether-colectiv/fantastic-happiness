import { FormControl } from '@angular/forms';
import { passwordRequirementsValidator } from './auth.validators';
import { generatePassword } from './password-generator';

describe('generatePassword', () => {
  afterEach(() => vi.restoreAllMocks());

  it('uses Web Crypto and produces 16-character passwords accepted by registration', () => {
    const random = vi.spyOn(crypto, 'getRandomValues');

    for (let attempt = 0; attempt < 16; attempt++) {
      const password = generatePassword();
      expect(password).toHaveLength(16);
      expect(passwordRequirementsValidator(new FormControl(password))).toBeNull();
    }

    expect(random).toHaveBeenCalled();
  });
});
