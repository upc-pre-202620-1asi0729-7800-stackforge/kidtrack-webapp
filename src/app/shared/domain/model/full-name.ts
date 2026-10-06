/**
 * Shared value object representing a full name with first and last name.
 */
export class FullName {
  constructor(
    public readonly firstName: string = '',
    public readonly lastName: string = '',
  ) {}

  /** Splits a single "First Last" string — the last word is taken as the last name. */
  static fromText(text: string): FullName {
    const parts = (text || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length <= 1) return new FullName(parts[0] ?? '', '');
    return new FullName(parts.slice(0, -1).join(' '), parts[parts.length - 1]);
  }

  getFullName(): string {
    return `${this.firstName} ${this.lastName}`.trim();
  }

  /** Two-letter initials used by the avatar badges. */
  getInitials(): string {
    return this.getFullName()
      .split(' ')
      .filter(Boolean)
      .map(w => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }
}
