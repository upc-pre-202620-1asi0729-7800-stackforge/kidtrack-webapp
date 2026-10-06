import { BaseEntity, EntityId } from '../../../shared/domain/model/base-entity';

export type BoardingStatus = 'ABORDADO' | 'EN_ESPERA' | 'AUSENTE';

export const BOARDING_LABEL: Record<BoardingStatus, string> = { ABORDADO: 'Abordado', EN_ESPERA: 'En Espera', AUSENTE: 'Ausente' };
export const BOARDING_SEVERITY: Record<BoardingStatus, 'success' | 'warn' | 'danger'> = {
  ABORDADO: 'success', EN_ESPERA: 'warn', AUSENTE: 'danger',
};

/**
 * Student (child) within the Stakeholder bounded context.
 */
export class Child implements BaseEntity {
  id: EntityId | null;
  name: string;
  grade: string;
  parentId: EntityId | null;
  active: boolean;
  boardingStatus: BoardingStatus;
  hasPhoto: boolean;
  organizationId: string | null;

  constructor({
    id = null, name = '', grade = '', parentId = null, active = true,
    boardingStatus = 'EN_ESPERA', hasPhoto = false, organizationId = null,
  }: Partial<Child> = {}) {
    this.id = id;
    this.name = name;
    this.grade = grade;
    this.parentId = parentId;
    this.active = active;
    this.boardingStatus = boardingStatus;
    this.hasPhoto = hasPhoto;
    this.organizationId = organizationId;
  }
}
